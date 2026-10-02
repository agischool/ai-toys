"""T04: a NumPy-only CNN, including explicit valid-correlation derivatives."""
import argparse
import json
from pathlib import Path
import numpy as np
from .common import Adam, cross_entropy, gradcheck, output_path, plt, save_result, softmax


def correlate2d(x, filters):
    """Valid cross-correlation: (N,H,W) x (F,KH,KW) -> (N,F,OH,OW).

    Spatial positions are deliberately written as two loops. No kernel reversal.
    The batch, filter and patch reductions inside each position use NumPy.
    """
    x = np.asarray(x, dtype=np.float64)
    filters = np.asarray(filters, dtype=np.float64)
    if x.ndim != 3 or filters.ndim != 3:
        raise ValueError("expected x[N,H,W] and filters[F,KH,KW]")
    n, height, width = x.shape
    count, kh, kw = filters.shape
    oh, ow = height-kh+1, width-kw+1
    if min(oh, ow) < 1:
        raise ValueError("filter must fit inside input")
    out = np.zeros((n, count, oh, ow), dtype=np.float64)
    for i in range(oh):
        for j in range(ow):
            patch = x[:, i:i+kh, j:j+kw]
            out[:, :, i, j] = np.einsum("nhw,fhw->nf", patch, filters)
    return out


def correlate2d_backward(x, filters, dout):
    """Return gradients for both images and shared filters; overlaps add."""
    n, height, width = x.shape
    count, kh, kw = filters.shape
    oh, ow = height-kh+1, width-kw+1
    if dout.shape != (n, count, oh, ow):
        raise ValueError("upstream gradient has wrong shape")
    dx = np.zeros_like(x, dtype=np.float64)
    dw = np.zeros_like(filters, dtype=np.float64)
    for i in range(oh):
        for j in range(ow):
            upstream = dout[:, :, i, j]
            patch = x[:, i:i+kh, j:j+kw]
            dw += np.einsum("nf,nhw->fhw", upstream, patch)
            dx[:, i:i+kh, j:j+kw] += np.einsum("nf,fhw->nhw", upstream, filters)
    return dx, dw


def initialize(seed=42, n_filters=6):
    rng = np.random.default_rng(seed)
    return {"filters": rng.normal(0, .25, (n_filters, 3, 3)),
            "conv_bias": np.zeros(n_filters, dtype=np.float64),
            "head": rng.normal(0, .25, (n_filters, 2)),
            "head_bias": np.zeros(2, dtype=np.float64)}


def forward(x, params):
    z = correlate2d(x, params["filters"]) + params["conv_bias"][None, :, None, None]
    activation = np.tanh(z)
    pooled = activation.mean(axis=(2, 3))
    logits = pooled @ params["head"] + params["head_bias"]
    return logits, (x, activation, pooled)


def backward(dlogits, params, cache):
    x, activation, pooled = cache
    grads = {"head": pooled.T @ dlogits, "head_bias": dlogits.sum(axis=0)}
    dpool = dlogits @ params["head"].T
    area = activation.shape[2] * activation.shape[3]
    dz = dpool[:, :, None, None] / area * (1-activation**2)
    dx, grads["filters"] = correlate2d_backward(x, params["filters"], dz)
    grads["conv_bias"] = dz.sum(axis=(0, 2, 3))
    return grads, dx


def loss_and_grad(x, labels, params):
    logits, cache = forward(x, params)
    loss, dlogits = cross_entropy(logits, labels)
    grads, dx = backward(dlogits, params, cache)
    return loss, grads, dx


def make_data(n=128, seed=42, positions=(2, 3, 4, 5), noise=.10):
    """Balanced 8x8 horizontal (0)/vertical (1) six-pixel lines + Gaussian noise.

    Labels and line positions are independently shuffled. No test image is used
    in the training loop. Position choices define the distribution, not a split.
    """
    if n < 2 or not positions or any(p < 0 or p > 7 for p in positions):
        raise ValueError("need >=2 examples and valid pixel positions")
    rng = np.random.default_rng(seed)
    labels = np.arange(n) % 2
    rng.shuffle(labels)
    x = rng.normal(0, noise, (n, 8, 8)).astype(np.float64)
    for k, label in enumerate(labels):
        p = rng.choice(positions)
        if label == 0:
            x[k, p, 1:7] += 1
        else:
            x[k, 1:7, p] += 1
    return x, labels


def evaluate(x, labels, params):
    logits, _ = forward(x, params)
    loss, _ = cross_entropy(logits, labels)
    return {"loss": loss, "accuracy": float(np.mean(logits.argmax(axis=1) == labels)),
            "n": int(len(labels))}


def save_model(path, params):
    np.savez(path, **params)


def load_model(path):
    with np.load(path, allow_pickle=False) as data:
        return {name: data[name].copy() for name in ("filters", "conv_bias", "head", "head_bias")}


def demo(output_dir="outputs/t04", seed=42):
    path = output_path(output_dir)
    train_x, train_y = make_data(128, seed+100)
    sets = {"test": make_data(128, seed+200),
            "shifted": make_data(128, seed+300, (1, 6)),
            "noisy": make_data(128, seed+400, noise=.35),
            "border": make_data(128, seed+500, (0, 7))}
    params = initialize(seed)
    initial = evaluate(train_x, train_y, params)
    optimizer = Adam(params, lr=.025)
    history = []
    for _ in range(200):
        loss, grads, _ = loss_and_grad(train_x, train_y, params)
        history.append(loss)
        optimizer.step(params, grads)
    history.append(evaluate(train_x, train_y, params)["loss"])
    small_x, small_y = make_data(4, seed+600)
    _, grads, dx = loss_and_grad(small_x, small_y, params)
    checked = {**params, "input": small_x}
    analytic = {**grads, "input": dx}
    check = gradcheck(lambda: loss_and_grad(small_x, small_y, params)[0], checked, analytic)
    vertical = np.zeros((3, 3)); vertical[:, 1] = 1
    horizontal = np.zeros((3, 3)); horizontal[1, :] = 1
    manual = {"vertical_dot": float((vertical*vertical).sum()),
              "horizontal_dot": float((horizontal*vertical).sum())}
    save_model(path / "parameters.npz", params)
    restored = load_model(path / "parameters.npz")
    reload_error = float(np.max(np.abs(forward(sets["test"][0], params)[0]-forward(sets["test"][0], restored)[0])))
    metrics = {"toy": "T04 tinyCNN", "seed": seed, "dtype": "float64", "epochs": 200,
               "learning_rate": .025, "parameter_count": sum(p.size for p in params.values()),
               "input_shape": list(train_x.shape), "feature_shape": [128, 6, 6, 6],
               "initial_train": initial, "train": evaluate(train_x, train_y, params),
               **{name: evaluate(x, y, params) for name, (x, y) in sets.items()},
               "manual": manual, "gradient_check": check, "reload_max_abs_error": reload_error,
               "loss_history": history,
               "protocol": "Train: 128 central lines, noise=0.10. Independently generated test: 128 per split. Shifted=positions 1,6; noisy=0.35; border=positions 0,7. Fixed hyperparameters; no test-driven tuning."}
    fig, ax = plt.subplots(figsize=(6.4, 3.8))
    ax.plot(history, color="#176b88")
    ax.set(xlabel="更新次数", ylabel="训练交叉熵", title="T04：卷积核也由梯度学习")
    ax.grid(alpha=.2); fig.tight_layout(); fig.savefig(path / "loss.png"); plt.close(fig)
    fig, axes = plt.subplots(2, 6, figsize=(11, 5.2))
    limit = max(abs(params["filters"].min()), abs(params["filters"].max()))
    example = sets["test"][0][0:1]
    _, (_, activations, _) = forward(example, params)
    for j in range(6):
        axes[0, j].imshow(params["filters"][j], cmap="coolwarm", vmin=-limit, vmax=limit)
        axes[0, j].set_title(f"核 {j+1}")
        axes[1, j].imshow(activations[0, j], cmap="coolwarm", vmin=-1, vmax=1)
        axes[1, j].set_title("同一输入的响应")
        for i in range(2): axes[i, j].set(xticks=[], yticks=[])
    fig.suptitle("T04：共享的 3×3 参数与 6×6 特征图（色标：上行共享，下行 ±1）")
    fig.tight_layout(pad=1.5, h_pad=3.0); fig.savefig(path / "filters_features.png"); plt.close(fig)
    fig, axes = plt.subplots(2, 4, figsize=(9, 6.2))
    for j, (name, (x, labels)) in enumerate(sets.items()):
        probs = softmax(forward(x, params)[0])
        for label in range(2):
            # Show the least-confident true-label example: failures remain visible.
            candidates = np.flatnonzero(labels == label)
            k = candidates[np.argmin(probs[candidates, label])]
            axes[label, j].imshow(x[k], cmap="gray", vmin=-.5, vmax=1.5)
            pred = int(probs[k].argmax())
            axes[label, j].set_title(f"{name}: 真 {label}/预测 {pred}\np(真)={probs[k,label]:.2f}")
            axes[label, j].set(xticks=[], yticks=[])
    fig.suptitle("T04：各组最难样本；0=横线，1=竖线")
    fig.tight_layout(pad=1.5, h_pad=3.0); fig.savefig(path / "stress_examples.png"); plt.close(fig)
    return save_result(path, metrics)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", default="outputs/t04")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    results = demo(args.output_dir, args.seed)
    print(json.dumps({k: v for k, v in results.items() if k != "loss_history"}, ensure_ascii=False, indent=2))
