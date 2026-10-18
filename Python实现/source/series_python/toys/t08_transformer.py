"""T08: a one-block causal Transformer, including every backward pass in NumPy."""
from __future__ import annotations
import argparse
import itertools
import json
import numpy as np
from .common import Adam, cross_entropy, gradcheck, plt, output_path, save_result
from .t07_attention import init_attention, attention_forward, attention_backward

VOCAB = "<abcde|>"


def layer_norm(x, gain, bias, eps=1e-5):
    mean = x.mean(axis=-1, keepdims=True)
    centered = x - mean
    invstd = 1.0 / np.sqrt((centered * centered).mean(axis=-1, keepdims=True) + eps)
    normalized = centered * invstd
    return normalized * gain + bias, (normalized, invstd, gain)


def layer_norm_backward(dout, cache):
    normalized, invstd, gain = cache
    axes = tuple(range(dout.ndim - 1))
    dgain = (dout * normalized).sum(axis=axes)
    dbias = dout.sum(axis=axes)
    dn = dout * gain
    dx = invstd * (dn - dn.mean(axis=-1, keepdims=True)
                    - normalized * (dn * normalized).mean(axis=-1, keepdims=True))
    return dx, dgain, dbias


class TinyTransformer:
    """Pre-LN decoder block. Input token IDs shape (batch,time), logits (B,T,V)."""
    def __init__(self, vocab_size=len(VOCAB), dim=16, ff_dim=32, max_len=14,
                 seed=42, use_attention=True):
        self.use_attention = use_attention
        rng = np.random.default_rng(seed)
        self.params = {
            "embedding": rng.normal(0, .2, (vocab_size, dim)),
            "position": rng.normal(0, .2, (max_len, dim)),
            "ln1_gain": np.ones(dim), "ln1_bias": np.zeros(dim),
            **{"attn_"+k: v for k, v in init_attention(dim, rng).items()},
            "ln2_gain": np.ones(dim), "ln2_bias": np.zeros(dim),
            "ff_W1": rng.normal(0, np.sqrt(2.0 / dim), (dim, ff_dim)),
            "ff_b1": np.zeros(ff_dim),
            "ff_W2": rng.normal(0, .1, (ff_dim, dim)),
            "ff_b2": np.zeros(dim),
            "head_W": rng.normal(0, .2, (dim, vocab_size)),
            "head_b": np.zeros(vocab_size),
        }

    def _attention_params(self):
        return {k: self.params["attn_"+k] for k in ("Wq", "Wk", "Wv", "Wo")}

    def forward(self, ids):
        ids = np.asarray(ids)
        p = self.params
        if ids.ndim != 2 or not np.issubdtype(ids.dtype, np.integer):
            raise ValueError("ids must be an integer array shaped (batch, time)")
        if ids.shape[1] < 1 or ids.shape[1] > len(p["position"]):
            raise ValueError("sequence length outside positional embedding range")
        if np.any(ids < 0) or np.any(ids >= len(p["embedding"])):
            raise ValueError("token id outside vocabulary")
        x = p["embedding"][ids] + p["position"][:ids.shape[1]][None, :, :]
        n1, c1 = layer_norm(x, p["ln1_gain"], p["ln1_bias"])
        if self.use_attention:
            a, ca = attention_forward(n1, self._attention_params(), causal=True)
        else:
            a, ca = np.zeros_like(x), None
        u = x + a
        n2, c2 = layer_norm(u, p["ln2_gain"], p["ln2_bias"])
        pre = n2 @ p["ff_W1"] + p["ff_b1"]
        activated = np.maximum(pre, 0.)
        h = u + activated @ p["ff_W2"] + p["ff_b2"]
        logits = h @ p["head_W"] + p["head_b"]
        return logits, dict(ids=ids, n1=n1, c1=c1, ca=ca, n2=n2, c2=c2,
                            pre=pre, activated=activated, h=h)

    def backward(self, dlogits, cache):
        p = self.params
        g = {k: np.zeros_like(v) for k, v in p.items()}
        c = cache
        dim = p["embedding"].shape[1]
        flat = lambda x: x.reshape(-1, x.shape[-1])
        g["head_W"] = flat(c["h"]).T @ flat(dlogits)
        g["head_b"] = dlogits.sum(axis=(0, 1))
        dh = dlogits @ p["head_W"].T
        g["ff_W2"] = flat(c["activated"]).T @ flat(dh)
        g["ff_b2"] = dh.sum(axis=(0, 1))
        dpre = (dh @ p["ff_W2"].T) * (c["pre"] > 0)
        g["ff_W1"] = flat(c["n2"]).T @ flat(dpre)
        g["ff_b1"] = dpre.sum(axis=(0, 1))
        dn2 = dpre @ p["ff_W1"].T
        dln2, g["ln2_gain"], g["ln2_bias"] = layer_norm_backward(dn2, c["c2"])
        du = dh + dln2
        dx = du.copy()
        if self.use_attention:
            dn1, ag = attention_backward(du, c["ca"], self._attention_params())
            for name, value in ag.items():
                g["attn_"+name] = value
            dln1, g["ln1_gain"], g["ln1_bias"] = layer_norm_backward(dn1, c["c1"])
            dx += dln1
        # Repeated tokens contribute repeatedly; ordinary fancy-index += is wrong.
        np.add.at(g["embedding"], c["ids"].ravel(), dx.reshape(-1, dim))
        g["position"][:c["ids"].shape[1]] = dx.sum(axis=0)
        return g

    def loss_and_grads(self, ids, targets):
        logits, cache = self.forward(ids)
        loss, dlogits = cross_entropy(logits, targets)
        return loss, self.backward(dlogits, cache)

    def save(self, path):
        np.savez(path, **self.params, use_attention=np.array(int(self.use_attention)))

    @classmethod
    def load(cls, path):
        with np.load(path, allow_pickle=False) as data:
            model = cls(vocab_size=data["embedding"].shape[0], dim=data["embedding"].shape[1],
                        ff_dim=data["ff_W1"].shape[1], max_len=data["position"].shape[0],
                        use_attention=bool(data["use_attention"]))
            model.params = {name: data[name].copy() for name in model.params}
        return model


def encode(text):
    return np.array([VOCAB.index(c) for c in text], dtype=np.int64)


def decode(ids):
    return "".join(VOCAB[int(i)] for i in ids)


def copy_dataset(seed=42, train_size=400, test_size=100):
    """Split unique complete sequences before forming next-token input/targets."""
    all_text = ["<"+"".join(chars)+"|"+"".join(chars)+">"
                for chars in itertools.product("abcde", repeat=4)]
    if train_size + test_size > len(all_text):
        raise ValueError("requested split exceeds 625 unique sequences")
    order = np.random.default_rng(seed).permutation(len(all_text))
    train = [all_text[i] for i in order[:train_size]]
    test = [all_text[i] for i in order[train_size:train_size+test_size]]
    assert set(train).isdisjoint(test)
    return np.stack([encode(s) for s in train]), np.stack([encode(s) for s in test])


def evaluate(model, sequences):
    logits, _ = model.forward(sequences[:, :-1])
    labels = sequences[:, 1:]
    loss, _ = cross_entropy(logits, labels)
    pred = logits.argmax(axis=-1)
    # Prompt indices 0..5 = <abcd|; logit at index 5 predicts first copied char.
    return {"loss": loss, "token_accuracy": float(np.mean(pred == labels)),
            "copy_token_accuracy": float(np.mean(pred[:, 5:9] == labels[:, 5:9]))}


def generate(model, prompt, max_new_tokens=5):
    ids = encode(prompt).tolist()
    for _ in range(max_new_tokens):
        if len(ids) > len(model.params["position"]):
            break
        logits, _ = model.forward(np.array([ids], dtype=np.int64))
        nxt = int(np.argmax(logits[0, -1]))
        ids.append(nxt)
        if VOCAB[nxt] == ">":
            break
    return decode(ids)


def generation_metrics(model, sequences):
    rows = []
    for seq in sequences:
        expected = decode(seq)
        prompt = expected[:6]
        generated = generate(model, prompt)
        rows.append(dict(prompt=prompt, expected=expected, generated=generated,
                         exact_match=generated == expected))
    return float(np.mean([r["exact_match"] for r in rows])), rows


def fit(model, train, test, steps=1600, batch_size=32, lr=.003, seed=42):
    rng = np.random.default_rng(seed)
    optimizer = Adam(model.params, lr=lr)
    history = []
    for step in range(steps + 1):
        if step % 100 == 0 or step == steps:
            tr, te = evaluate(model, train), evaluate(model, test)
            history.append(dict(step=step, train_loss=tr["loss"], test_loss=te["loss"],
                                train_copy_accuracy=tr["copy_token_accuracy"],
                                test_copy_accuracy=te["copy_token_accuracy"]))
        if step == steps:
            break
        batch = train[rng.integers(0, len(train), size=batch_size)]
        _, grads = model.loss_and_grads(batch[:, :-1], batch[:, 1:])
        norm = np.sqrt(sum(np.sum(g*g) for g in grads.values()))
        if norm > 1.0:
            grads = {k: g / norm for k, g in grads.items()}
        optimizer.step(model.params, grads)
    return history


def model_gradient_report(seed=42):
    model = TinyTransformer(vocab_size=5, dim=4, ff_dim=6, max_len=4, seed=seed)
    ids = np.array([[0, 1, 0], [2, 1, 3]])
    targets = np.array([[1, 0, 2], [1, 3, 4]])
    _, grads = model.loss_and_grads(ids, targets)
    report = {}
    for name in model.params:
        report[name] = gradcheck(lambda: cross_entropy(model.forward(ids)[0], targets)[0],
                                  {name: model.params[name]}, {name: grads[name]}, samples=1000)
    return report


def _plots(outdir, history, baseline_history, examples, ood):
    fig, axes = plt.subplots(1, 2, figsize=(10, 3.7))
    for h, style, name in ((history, "-", "完整模型"), (baseline_history, "--", "无注意力")):
        x = [r["step"] for r in h]
        axes[0].plot(x, [r["train_loss"] for r in h], style, label=name+" / 训练")
        axes[0].plot(x, [r["test_loss"] for r in h], style, label=name+" / 测试")
        axes[1].plot(x, [r["test_copy_accuracy"] for r in h], style, label=name)
    axes[0].set(title="所有下一字符的交叉熵", xlabel="更新步数", ylabel="nats / token")
    axes[1].set(title="留出集：复制部分准确率", xlabel="更新步数", ylabel="准确率", ylim=(0, 1.03))
    for ax in axes:
        ax.legend(fontsize=8)
        ax.grid(alpha=.2)
    fig.tight_layout()
    fig.savefig(outdir/"training_curves.png")
    plt.close(fig)

    fig, ax = plt.subplots(figsize=(11, 2.8))
    ax.set(xlim=(0, 11), ylim=(0, 2.8))
    ax.axis("off")
    boxes = [(1, "token + position\nD = 16"), (3.3, "LayerNorm\n因果单头注意力"),
             (5.7, "残差相加\nLayerNorm"), (8, "FFN 16→32→16\nReLU + 残差"),
             (10, "输出头\n8 个 logits")]
    for x, text in boxes:
        ax.text(x, 1.5, text, ha="center", va="center", fontsize=10,
                bbox=dict(boxstyle="round,pad=.6", fc="#e5eefb", ec="#4874a6"))
    for (x, _), (nx, _) in zip(boxes, boxes[1:]):
        ax.annotate("", (nx-.95, 1.5), (x+.9, 1.5), arrowprops=dict(arrowstyle="->"))
    ax.text(5.5, .35, "一个 decoder-only block；全部参数反向传播由 NumPy 显式计算", ha="center")
    fig.savefig(outdir/"structure.png", bbox_inches="tight")
    plt.close(fig)

    rows = examples + ood[:2]
    fig, ax = plt.subplots(figsize=(10, max(3, .75*len(rows)+1.3)))
    ax.axis("off")
    ax.set_title("贪心生成实测：完整留出序列与分布外长度", loc="left", fontsize=13)
    for i, row in enumerate(rows):
        status = "成功" if row["exact_match"] else "失败"
        tag = row.get("distribution", "留出集")
        line = f'{tag} / {status}  提示 {row["prompt"]}   生成 {row["generated"]}   目标 {row["expected"]}'
        ax.text(.01, .90-i/(len(rows)+.5), line, va="top", fontsize=10,
                color="#155b41" if row["exact_match"] else "#a33131")
    fig.savefig(outdir/"generations.png", bbox_inches="tight")
    plt.close(fig)


def demo(output_dir="outputs/t08", seed=42):
    outdir = output_path(output_dir)
    train, test = copy_dataset(seed)
    model = TinyTransformer(seed=seed)
    baseline = TinyTransformer(seed=seed, use_attention=False)
    history = fit(model, train, test, seed=seed)
    baseline_history = fit(baseline, train, test, seed=seed)
    exact, generations = generation_metrics(model, test)
    baseline_exact, _ = generation_metrics(baseline, test)
    model.save(outdir/"parameters.npz")
    baseline.save(outdir/"parameters_no_attention.npz")
    restored = TinyTransformer.load(outdir/"parameters.npz")
    reference = model.forward(test[:3, :-1])[0]
    reloaded = restored.forward(test[:3, :-1])[0]
    altered = test[:3, :-1].copy()
    altered[:, 7:] = (altered[:, 7:] + 1) % len(VOCAB)
    prefix_error = float(np.max(np.abs(model.forward(altered)[0][:, :7] - reference[:, :7])))
    grad_report = model_gradient_report(seed)
    # Shorter/longer payloads shift positional roles; these are honest OOD probes.
    ood = []
    for payload in ("abc", "edc", "abcde", "edcba"):
        prompt, expected = "<"+payload+"|", "<"+payload+"|"+payload+">"
        generated = generate(model, prompt, len(payload)+1)
        ood.append(dict(prompt=prompt, expected=expected, generated=generated,
                        exact_match=generated == expected, distribution="分布外长度"))
    examples = [r for r in generations if r["exact_match"]][:3]
    examples += [r for r in generations if not r["exact_match"]][:2]
    metrics = {"seed": seed, "dtype": "float64", "architecture": "D16, FF32, one pre-LN causal single-head block",
               "parameter_count": int(sum(v.size for v in model.params.values())),
               "dataset": {"train_sequences": len(train), "test_sequences": len(test),
                           "unique_complete_sequence_overlap": len(set(map(tuple, train)) & set(map(tuple, test))),
                           "complete_sequence_length": 11, "vocabulary": VOCAB,
                           "split_before_next_token_slicing": True},
               "training": {"steps": 1600, "batch_size": 32, "learning_rate": .003, "clip_global_norm": 1.0,
                            "checkpoint_selection": "fixed final step; no test-based checkpoint selection"},
               "train": evaluate(model, train), "test": evaluate(model, test),
               "test_free_generation_exact_match": exact,
               "ablation_no_attention": {**evaluate(baseline, test), "free_generation_exact_match": baseline_exact,
                                         "same_initialization_data_steps_and_minibatch_seed": True},
               "gradient_check_per_parameter": grad_report,
               "gradient_check_max_abs_error": max(v["max_abs_error"] for v in grad_report.values()),
               "causal_prefix_max_error": prefix_error,
               "reload_logits_bitwise_equal": bool(np.array_equal(reference, reloaded)),
               "generation_examples": examples, "out_of_distribution_examples": ood,
               "loss_interpretation": "Random four-character prompts are intrinsically unpredictable; uniform prompt lower bound ≈4*ln(5)/10=0.644 nats/token. Held-out finite-split correlations can differ."}
    np.savez(outdir/"dataset.npz", train=train, test=test)
    (outdir/"history.json").write_text(json.dumps({"full": history, "no_attention": baseline_history}, indent=2)+"\n")
    (outdir/"generations.json").write_text(json.dumps(generations, ensure_ascii=False, indent=2)+"\n")
    _plots(outdir, history, baseline_history, examples, ood)
    return save_result(outdir, metrics)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", default="outputs/t08")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    print(json.dumps(demo(args.output_dir, args.seed), ensure_ascii=False, indent=2))
