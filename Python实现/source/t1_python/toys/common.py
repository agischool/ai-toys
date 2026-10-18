"""Shared numerical utilities. All training arrays use float64."""
from pathlib import Path
import json
import os
import numpy as np

os.environ.setdefault("MPLCONFIGDIR", "/tmp/ai-toy-matplotlib")
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager

_font = Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc")
if _font.exists():
    font_manager.fontManager.addfont(str(_font))
    plt.rcParams["font.family"] = font_manager.FontProperties(fname=str(_font)).get_name()
plt.rcParams["axes.unicode_minus"] = False
plt.rcParams["figure.dpi"] = 120


def softmax(x, axis=-1):
    z = x - np.max(x, axis=axis, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=axis, keepdims=True)


def cross_entropy(logits, labels):
    """Mean CE and derivative w.r.t. logits; labels shape logits.shape[:-1]."""
    flat = logits.reshape(-1, logits.shape[-1])
    y = np.asarray(labels).reshape(-1)
    z = flat - flat.max(axis=-1, keepdims=True)
    logp = z - np.log(np.exp(z).sum(axis=-1, keepdims=True))
    loss = -logp[np.arange(len(y)), y].mean()
    grad = np.exp(logp)
    grad[np.arange(len(y)), y] -= 1
    return float(loss), (grad / len(y)).reshape(logits.shape)


class Adam:
    def __init__(self, params, lr=0.01):
        self.lr, self.t = lr, 0
        self.m = {k: np.zeros_like(v) for k, v in params.items()}
        self.v = {k: np.zeros_like(v) for k, v in params.items()}

    def step(self, params, grads):
        self.t += 1
        for k in params:
            g = grads[k]
            self.m[k] = .9*self.m[k] + .1*g
            self.v[k] = .999*self.v[k] + .001*g*g
            params[k] -= self.lr*(self.m[k]/(1-.9**self.t)) / (np.sqrt(self.v[k]/(1-.999**self.t)) + 1e-8)


def gradcheck(loss_fn, params, grads, eps=1e-5, samples=20, seed=123):
    """Centered finite differences. Return largest absolute/normalized errors."""
    if set(params) != set(grads):
        raise ValueError("parameter and gradient names must match")
    if not np.isfinite(eps) or eps <= 0 or not isinstance(samples, int) or samples < 1:
        raise ValueError("eps must be finite and positive; samples must be a positive integer")
    for name, value in params.items():
        if value.shape != grads[name].shape:
            raise ValueError(f"gradient shape mismatch: {name}")
        if not np.isfinite(value).all() or not np.isfinite(grads[name]).all():
            raise ValueError(f"nonfinite parameter or analytic gradient: {name}")
    rng = np.random.default_rng(seed)
    absolute = relative = 0.0
    checked = 0
    for name, value in params.items():
        indices = rng.choice(value.size, min(samples, value.size), replace=False)
        for index in indices:
            old = value.flat[index]
            try:
                value.flat[index] = old + eps
                plus = float(loss_fn())
                value.flat[index] = old - eps
                minus = float(loss_fn())
            finally:
                value.flat[index] = old
            if not np.isfinite(plus) or not np.isfinite(minus):
                raise ValueError(f"nonfinite objective while checking {name}[{index}]")
            numeric = (plus-minus)/(2*eps)
            analytic = grads[name].flat[index]
            if not np.isfinite(numeric):
                raise ValueError(f"nonfinite numerical gradient: {name}[{index}]")
            error = abs(numeric-analytic)
            absolute = max(absolute, error)
            relative = max(relative, error/max(1e-8, abs(numeric)+abs(analytic)))
            checked += 1
    return {"max_abs_error": float(absolute), "max_relative_error": float(relative), "checked": checked}


def save_result(output_dir, metrics):
    path = Path(output_dir)
    path.mkdir(parents=True, exist_ok=True)
    (path / "metrics.json").write_text(json.dumps(metrics, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    return metrics


def output_path(output_dir):
    p = Path(output_dir)
    p.mkdir(parents=True, exist_ok=True)
    return p
