"""续篇21—23的NumPy机制演示；无外部模型调用。"""
from pathlib import Path
import json
import sys
import numpy as np

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "Python实现/source/series_python"))
from toys.common import cross_entropy, softmax
from toys.t07_attention import scaled_dot_product
from toys.t08_transformer import TinyTransformer, encode, layer_norm


def masked_loss_check():
    model = TinyTransformer(dim=4, ff_dim=8, seed=7)
    seq = encode("<abcd|abcd>")[None, :]
    ids, labels = seq[:, :-1], seq[:, 1:]
    # logit at index 5 (the | position) predicts the first answer character.
    keep = np.zeros(labels.shape, dtype=bool)
    keep[:, 5:] = True
    logits, cache = model.forward(ids)
    before, selected_grad = cross_entropy(logits[keep], labels[keep])
    grad = np.zeros_like(logits)
    grad[keep] = selected_grad
    grads = model.backward(grad, cache)
    original = {k: p.copy() for k, p in model.params.items()}
    for name in model.params:
        model.params[name] -= .01 * grads[name]
    after = cross_entropy(model.forward(ids)[0][keep], labels[keep])[0]
    delta = sum(float(np.square(model.params[k] - p).sum())
                for k, p in original.items()) ** .5
    assert np.all(grad[~keep] == 0) and after < before and delta > 0
    return {"selected_target_positions": np.where(keep[0])[0].tolist(),
            "masked_logit_gradient_max": float(abs(grad[~keep]).max()),
            "one_step_loss_before": before, "one_step_loss_after": after,
            "parameter_delta_l2": delta,
            "boundary": "单条构造复制样本、一次真实参数更新；没有独立能力测评。输入位置仍可经注意力影响答案梯度。"}


def cached_step(model, token, offset, keys, values):
    p = model.params
    x = p["embedding"][[[int(token)]]] + p["position"][offset][None, None, :]
    n, _ = layer_norm(x, p["ln1_gain"], p["ln1_bias"])
    q, k, v = (n @ p["attn_" + key] for key in ("Wq", "Wk", "Wv"))
    keys.append(k)
    values.append(v)
    a, _ = scaled_dot_product(q, np.concatenate(keys, axis=1),
                              np.concatenate(values, axis=1))
    u = x + a @ p["attn_Wo"]
    n2, _ = layer_norm(u, p["ln2_gain"], p["ln2_bias"])
    h = u + np.maximum(n2 @ p["ff_W1"] + p["ff_b1"], 0) @ p["ff_W2"] + p["ff_b2"]
    return h @ p["head_W"] + p["head_b"]


def cache_check():
    errors, bad_errors = [], []
    models = [TinyTransformer(seed=3), TinyTransformer(seed=19)]
    checkpoint = ROOT / "Python实现/source/series_python/outputs/t08/parameters.npz"
    if checkpoint.exists():
        models.append(TinyTransformer.load(checkpoint))
    for model in models:
        ids = encode("<abcde|edcba")
        keys, values, wrong_keys, wrong_values = [], [], [], []
        for position, token in enumerate(ids):
            full = model.forward(ids[None, :position + 1])[0][:, -1:, :]
            cached = cached_step(model, token, position, keys, values)
            wrong = cached_step(model, token, 0, wrong_keys, wrong_values)
            errors.append(float(abs(full - cached).max()))
            bad_errors.append(float(abs(full - wrong).max()))
    n = len(ids)
    maximum = max(errors)
    assert maximum < 1e-10 and max(bad_errors) > 1e-8
    return {"models_checked": len(models), "prefixes_per_model": n,
            "float64_max_logit_error": maximum,
            "wrong_position_negative_control_error": max(bad_errors),
            "full_prefix_kv_token_projections": n * (n + 1) // 2,
            "incremental_kv_token_projections": n,
            "cache_components": {"K": {"tokens": n, "width": 16}, "V": {"tokens": n, "width": 16}, "bytes_per_scalar": 8},
            "final_kv_cache_bytes_per_model": 2 * n * 16 * 8,
            "boundary": "单层因果模型固定输入、逐位置数值对照；未测墙钟加速，不是产品KV缓存实现。"}


def moe_check():
    x = np.array([1., 2.])
    experts = np.array([np.eye(2), np.eye(2) * 2, np.eye(2) * 3, np.eye(2) * 4])
    logits = np.array([0., np.log(3), np.log(2), -2.])
    selected = np.argsort(-logits, kind="stable")[:2]
    weights = softmax(logits[selected])
    outputs = np.stack([x @ experts[i] for i in selected])
    result = weights @ outputs
    # Selected experts multiply by 2 and 3; normalized weights are .6 and .4.
    assert selected.tolist() == [1, 2]
    np.testing.assert_allclose(weights, [.6, .4], atol=1e-14)
    np.testing.assert_allclose(result, [2.4, 4.8], atol=1e-14)
    return {"selected_expert_ids_zero_based": selected.tolist(),
            "router_logits": logits.tolist(), "router_probabilities": softmax(logits).tolist(),
            "renormalized_weights": weights.tolist(), "selected_expert_outputs": outputs.tolist(),
            "all_expert_matrices": experts.tolist(), "input": x.tolist(), "output": result.tolist(),
            "expert_parameters_stored": int(experts.size),
            "expert_parameters_used_for_this_token": int(experts[selected].size),
            "boundary": "固定路由分数和未训练线性专家；统计只含专家矩阵，不含路由器、共享层及真实推理资源。"}
