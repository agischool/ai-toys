"""T07: single-head scaled dot-product attention, explicit NumPy backward."""
from __future__ import annotations
import argparse
import json
import numpy as np
from .common import softmax, gradcheck, plt, output_path, save_result


def scaled_dot_product(q, k, v, mask=None):
    """Q/K/V: (..., query/key time, width); boolean mask True means allowed."""
    q, k, v = (np.asarray(a, dtype=np.float64) for a in (q, k, v))
    if q.ndim < 2 or k.ndim != q.ndim or v.ndim != q.ndim:
        raise ValueError("Q, K, V need matching ranks, at least two")
    if q.shape[-1] != k.shape[-1] or k.shape[-2] != v.shape[-2]:
        raise ValueError("Q/K widths and K/V sequence lengths must match")
    if q.shape[:-2] != k.shape[:-2] or k.shape[:-2] != v.shape[:-2]:
        raise ValueError("Q, K, V batch shapes must match")
    scale = 1.0 / np.sqrt(q.shape[-1])
    scores = (q @ np.swapaxes(k, -1, -2)) * scale
    allowed = np.ones(scores.shape, dtype=bool)
    if mask is not None:
        if np.asarray(mask).dtype != bool:
            raise ValueError("mask must be boolean; True means allowed")
        allowed = np.broadcast_to(mask, scores.shape)
    if not np.all(allowed.any(axis=-1)):
        raise ValueError("Every query row must allow at least one key")
    weights = softmax(np.where(allowed, scores, -np.inf), axis=-1)
    out = weights @ v
    return out, dict(q=q, k=k, v=v, weights=weights, allowed=allowed, scale=scale)


def scaled_dot_product_backward(dout, cache):
    q, k, v, weights = (cache[n] for n in ("q", "k", "v", "weights"))
    dv = np.swapaxes(weights, -1, -2) @ dout
    dw = dout @ np.swapaxes(v, -1, -2)
    # Softmax Jacobian-vector product, without a T x T x T tensor.
    ds = weights * (dw - np.sum(dw * weights, axis=-1, keepdims=True))
    ds = np.where(cache["allowed"], ds, 0.0)
    dq = (ds @ k) * cache["scale"]
    dk = (np.swapaxes(ds, -1, -2) @ q) * cache["scale"]
    return dq, dk, dv


def init_attention(dim, rng):
    return {name: rng.normal(0, 1 / np.sqrt(dim), (dim, dim))
            for name in ("Wq", "Wk", "Wv", "Wo")}


def attention_forward(x, params, causal=True, mask=None):
    x = np.asarray(x, dtype=np.float64)
    if x.ndim != 3:
        raise ValueError("x must have shape (batch, time, dim)")
    t = x.shape[1]
    allowed = np.ones((t, t), dtype=bool)
    if causal:
        allowed = np.tril(allowed)
    if mask is not None:
        if np.asarray(mask).dtype != bool:
            raise ValueError("mask must be boolean; True means allowed")
        allowed = allowed & np.asarray(mask)
    q, k, v = (x @ params[n] for n in ("Wq", "Wk", "Wv"))
    mixed, inner = scaled_dot_product(q, k, v, allowed)
    out = mixed @ params["Wo"]
    return out, dict(x=x, mixed=mixed, inner=inner, weights=inner["weights"])


def attention_backward(dout, cache, params):
    x, mixed = cache["x"], cache["mixed"]
    d = x.shape[-1]
    grads = {"Wo": mixed.reshape(-1, d).T @ dout.reshape(-1, d)}
    dq, dk, dv = scaled_dot_product_backward(dout @ params["Wo"].T, cache["inner"])
    dx = np.zeros_like(x)
    for name, dz in zip(("Wq", "Wk", "Wv"), (dq, dk, dv)):
        grads[name] = x.reshape(-1, d).T @ dz.reshape(-1, d)
        dx += dz @ params[name].T
    return dx, grads


def demo(output_dir="outputs/t07", seed=42):
    outdir = output_path(output_dir)
    rng = np.random.default_rng(seed)
    q = np.zeros((1, 2, 2))
    k = np.zeros_like(q)
    v = np.array([[[2.0], [6.0]]])
    manual, mc = scaled_dot_product(q, k, v)
    causal, cc = scaled_dot_product(q, k, v, np.tril(np.ones((2, 2), dtype=bool)))
    x = rng.normal(size=(2, 4, 3))
    params = init_attention(3, rng)
    output, cache = attention_forward(x, params)
    upstream = rng.normal(size=output.shape)
    dx, grads = attention_backward(upstream, cache, params)
    report = gradcheck(lambda: np.sum(attention_forward(x, params)[0] * upstream),
                       dict(params, input=x), dict(grads, input=dx), samples=20)
    changed = x.copy()
    changed[:, 3, :] += 100
    early_error = float(np.max(np.abs(attention_forward(changed, params)[0][:, :3] - output[:, :3])))
    masked_max = float(np.max(np.abs(cache["weights"][:, np.triu_indices(4, 1)[0], np.triu_indices(4, 1)[1]])))
    metrics = {"seed": seed, "dtype": "float64", "manual_equal_weights": mc["weights"][0, 0].tolist(),
               "manual_average": float(manual[0, 0, 0]), "manual_causal_first": float(causal[0, 0, 0]),
               "gradient_check": report, "causal_prefix_max_error": early_error,
               "row_sum_max_error": float(np.max(abs(cache["weights"].sum(-1)-1))),
               "masked_weight_max": masked_max,
               "note": "Attention operator demonstration; no trained-model accuracy is claimed."}
    fig, axes = plt.subplots(1, 2, figsize=(9, 3.8))
    for ax, weights, title in zip(axes, [mc["weights"][0], cc["weights"][0]],
                                  ["相同分数：各取一半", "因果掩码：不能看未来"]):
        im = ax.imshow(weights, vmin=0, vmax=1, cmap="Blues")
        for i in range(2):
            for j in range(2):
                ax.text(j, i, f"{weights[i,j]:.2f}", ha="center", va="center")
        ax.set(xlabel="被读取的位置 (key)", ylabel="当前位置 (query)", title=title,
               xticks=[0, 1], yticks=[0, 1])
    fig.colorbar(im, ax=axes.ravel().tolist(), label="权重", shrink=.8)
    fig.savefig(outdir / "attention_weights.png", bbox_inches="tight")
    plt.close(fig)
    np.savez(outdir / "parameters.npz", **params)
    return save_result(outdir, metrics)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", default="outputs/t07")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    print(json.dumps(demo(args.output_dir, args.seed), ensure_ascii=False, indent=2))
