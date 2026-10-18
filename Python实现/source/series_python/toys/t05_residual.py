"""T05: explicit residual and equal-parameter plain stacks; NumPy only."""
import argparse
import json
import numpy as np
from .common import Adam, gradcheck, output_path, plt, save_result


def initialize(seed=42, width=8, blocks=3):
    if width < 1 or blocks < 1:
        raise ValueError("width and blocks must be positive")
    rng = np.random.default_rng(seed)
    params = {}
    for block in range(blocks):
        for layer in (1, 2):
            params[f"w{layer}_{block}"] = rng.normal(0, .7/np.sqrt(width), (width, width))
            params[f"b{layer}_{block}"] = np.zeros(width, dtype=np.float64)
    return params


def forward(x, params, residual=True):
    """Each block uses F(h)=tanh(h W1+b1) W2+b2, optionally adding h."""
    h = np.asarray(x, dtype=np.float64)
    cache = []
    blocks = len(params)//4
    for i in range(blocks):
        hidden = np.tanh(h @ params[f"w1_{i}"] + params[f"b1_{i}"])
        branch = hidden @ params[f"w2_{i}"] + params[f"b2_{i}"]
        cache.append((h, hidden))
        h = h + branch if residual else branch
    return h, cache


def backward(doutput, params, cache, residual=True):
    """The residual identity route contributes the *unchanged* upstream dh."""
    dh = doutput.copy()
    grads = {}
    # Norms refer to d(mean squared error)/dh at all block boundaries.
    norms = [float(np.linalg.norm(dh))]
    for i in reversed(range(len(cache))):
        h, hidden = cache[i]
        grads[f"w2_{i}"] = hidden.T @ dh
        grads[f"b2_{i}"] = dh.sum(axis=0)
        dz = (dh @ params[f"w2_{i}"].T) * (1-hidden**2)
        grads[f"w1_{i}"] = h.T @ dz
        grads[f"b1_{i}"] = dz.sum(axis=0)
        branch_dh = dz @ params[f"w1_{i}"].T
        dh = branch_dh + dh if residual else branch_dh
        norms.append(float(np.linalg.norm(dh)))
    return grads, dh, list(reversed(norms))


def loss_and_grad(x, target, params, residual=True):
    pred, cache = forward(x, params, residual)
    error = pred-target
    loss = float(np.mean(error**2))
    grads, dx, norms = backward(2*error/error.size, params, cache, residual)
    return loss, grads, dx, norms


def make_data(seed=1042, n_train=96, n_test=128, width=8):
    """A known smooth, partly identity-like regression target, fixed per demo."""
    rng = np.random.default_rng(seed)
    teacher = rng.normal(0, 1/np.sqrt(width), (width, width))
    train_x = rng.uniform(-1.5, 1.5, (n_train, width))
    test_x = rng.uniform(-1.5, 1.5, (n_test, width))
    def target(x):
        return .6*x + .4*np.tanh(x @ teacher)
    return train_x, target(train_x), test_x, target(test_x)


def train(x, target, seed=42, residual=True, epochs=300, lr=.01, width=8, blocks=3):
    params = initialize(seed, width, blocks)
    optimizer = Adam(params, lr)
    losses, parameter_norms, input_norms = [], [], []
    initial_boundary_norms = None
    for _ in range(epochs):
        loss, grads, _, norms = loss_and_grad(x, target, params, residual)
        if initial_boundary_norms is None:
            initial_boundary_norms = norms
        losses.append(loss)
        parameter_norms.append(float(np.sqrt(sum(np.sum(g*g) for g in grads.values()))))
        input_norms.append(norms[0])
        optimizer.step(params, grads)
    loss, grads, _, norms = loss_and_grad(x, target, params, residual)
    losses.append(loss)
    parameter_norms.append(float(np.sqrt(sum(np.sum(g*g) for g in grads.values()))))
    input_norms.append(norms[0])
    return params, {"loss": losses, "parameter_grad_norm": parameter_norms,
                    "input_grad_norm": input_norms,
                    "initial_boundary_grad_norm": initial_boundary_norms,
                    "final_boundary_grad_norm": norms}


def save_model(path, params, residual=True):
    np.savez(path, **params, residual=np.asarray(residual))


def load_model(path):
    with np.load(path, allow_pickle=False) as data:
        residual = bool(data["residual"])
        return {name: data[name].copy() for name in data.files if name != "residual"}, residual


def demo(output_dir="outputs/t05", seed=42):
    path = output_path(output_dir)
    train_x, train_y, test_x, test_y = make_data(seed+1000)
    records = []
    first_params = {}
    for run_seed in (seed, seed+1, seed+2):
        record = {"seed": run_seed}
        for mode, residual in (("residual", True), ("plain", False)):
            params, history = train(train_x, train_y, run_seed, residual)
            test_loss = float(np.mean((forward(test_x, params, residual)[0]-test_y)**2))
            filename = f"parameters_seed{run_seed}_{mode}.npz"
            save_model(path / filename, params, residual)
            reloaded, reloaded_mode = load_model(path / filename)
            reload_error = float(np.max(np.abs(forward(test_x, params, residual)[0]-forward(test_x, reloaded, reloaded_mode)[0])))
            record[mode] = {"train_mse": history["loss"][-1], "test_mse": test_loss,
                            "initial_train_mse": history["loss"][0],
                            "reload_max_abs_error": reload_error, "history": history}
            if run_seed == seed:
                first_params[mode] = params
        records.append(record)
    save_model(path / "parameters.npz", first_params["residual"], True)
    save_model(path / "parameters_plain.npz", first_params["plain"], False)
    checks = {}
    for mode, residual in (("residual", True), ("plain", False)):
        params = initialize(seed+100, width=3, blocks=2)
        x = np.random.default_rng(seed+101).normal(size=(3, 3))
        target = np.random.default_rng(seed+102).normal(size=(3, 3))
        _, grads, dx, _ = loss_and_grad(x, target, params, residual)
        checks[mode] = gradcheck(lambda: loss_and_grad(x, target, params, residual)[0],
                                {**params, "input": x}, {**grads, "input": dx})
    zero_params = initialize(seed)
    for i in range(3):
        zero_params[f"w2_{i}"][:] = 0
        zero_params[f"b2_{i}"][:] = 0
    identity_error = float(np.max(np.abs(forward(test_x, zero_params, True)[0]-test_x)))
    summary = {}
    for mode in ("residual", "plain"):
        values = np.asarray([r[mode]["test_mse"] for r in records])
        summary[mode] = {"test_mse_mean": float(values.mean()),
                         "test_mse_std_population": float(values.std()),
                         "test_mse_min": float(values.min()), "test_mse_max": float(values.max())}
    metrics = {"toy": "T05 residual", "seed": seed, "dtype": "float64", "width": 8,
               "blocks": 3, "epochs": 300, "learning_rate": .01, "n_train": 96, "n_test": 128,
               "parameter_count_each": sum(p.size for p in first_params["residual"].values()),
               "manual": {"x": 2.0, "a": .5, "y": 3.0, "dy_dx": 1.5},
               "zero_branch_identity_max_abs_error": identity_error, "gradient_check": checks,
               "summary": summary, "runs": records,
               "protocol": "Paired identical initial branch parameters and shared fixed train/test data for seeds [seed,seed+1,seed+2]; width=8, 3 two-layer blocks, Adam 0.01, 300 full-batch updates. No best-seed selection. Target y=0.6*x+0.4*tanh(x*A) deliberately contains an identity-like component."}
    fig, axes = plt.subplots(1, 3, figsize=(12, 3.6))
    colors = {"residual": "#176b88", "plain": "#dd7925"}
    labels = {"residual": "残差", "plain": "普通"}
    for index, record in enumerate(records):
        for mode in ("residual", "plain"):
            axes[0].semilogy(record[mode]["history"]["loss"], color=colors[mode], alpha=.7,
                             label=labels[mode] if index == 0 else None)
            axes[1].semilogy(record[mode]["history"]["parameter_grad_norm"], color=colors[mode], alpha=.7)
            axes[2].semilogy(record[mode]["history"]["initial_boundary_grad_norm"], "o-", color=colors[mode], alpha=.7)
    axes[0].set(title="三颗种子的训练损失", xlabel="更新次数", ylabel="均方误差")
    axes[0].legend()
    axes[1].set(title="训练中的参数梯度范数", xlabel="更新次数", ylabel="全参数 L2 范数")
    axes[2].set(title="初始化：跨块边界的梯度", xlabel="边界（0=输入，3=输出）", ylabel="梯度的 L2 范数", xticks=range(4))
    for ax in axes: ax.grid(alpha=.2)
    fig.tight_layout(); fig.savefig(path / "comparison.png"); plt.close(fig)
    fig, ax = plt.subplots(figsize=(6.4, 3.8))
    positions = np.arange(3)
    for offset, mode in ((-.18, "residual"), (.18, "plain")):
        ax.bar(positions+offset, [r[mode]["test_mse"] for r in records], width=.34,
               label=labels[mode], color=colors[mode])
    ax.set(xticks=positions, xticklabels=[str(r["seed"]) for r in records], xlabel="随机种子", ylabel="独立测试 MSE", title="T05：全部配对运行，不挑最好的一次")
    ax.legend(); fig.tight_layout(); fig.savefig(path / "test_seeds.png"); plt.close(fig)
    return save_result(path, metrics)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", default="outputs/t05")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    result = demo(args.output_dir, args.seed)
    print(json.dumps({k: v for k, v in result.items() if k != "runs"}, ensure_ascii=False, indent=2))
