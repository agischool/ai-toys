"""T09: external memory mechanisms with a fixed, hand-written controller.

This is not a trained neural Turing machine and does not implement RAG.
The public operations also accept two-slot memories for hand calculations.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np

from .common import output_path, plt, save_result, softmax


def _matrix(memory):
    value = np.asarray(memory, dtype=np.float64)
    if value.ndim != 2 or min(value.shape) < 1 or not np.isfinite(value).all():
        raise ValueError("memory must be a finite, nonempty [slots, width] matrix")
    return value


def _vector(value, width, name):
    value = np.asarray(value, dtype=np.float64)
    if value.shape != (width,) or not np.isfinite(value).all():
        raise ValueError(f"{name} must have shape ({width},) and be finite")
    return value


def _weights(value, slots):
    value = _vector(value, slots, "weights")
    if np.any(value < 0) or np.any(value > 1) or value.sum() > 1 + 1e-12:
        raise ValueError("weights must be nonnegative with total mass at most one")
    return value


def _unit_rows(value):
    """Normalize without overflowing the norm; zero vectors remain zero."""
    scale = np.max(np.abs(value), axis=-1, keepdims=True)
    scaled = np.divide(value, scale, out=np.zeros_like(value), where=scale != 0)
    norm = np.sqrt(np.sum(scaled * scaled, axis=-1, keepdims=True))
    return np.divide(scaled, norm, out=np.zeros_like(scaled), where=norm != 0)


def content_address(memory, key, beta=8.0):
    """Return softmax(beta * cosine(row, key)); zero-vector cosine is zero.

    beta is a finite, nonnegative sharpness. Zero keys or all-zero memory
    therefore produce uniform weights, rather than an arbitrary one-hot slot.
    """
    memory = _matrix(memory)
    key = _vector(key, memory.shape[1], "key")
    beta = float(beta)
    if not np.isfinite(beta) or beta < 0:
        raise ValueError("beta must be finite and nonnegative")
    similarities = np.clip(_unit_rows(memory) @ _unit_rows(key[None, :])[0], -1, 1)
    # Center before multiplying so an enormous finite beta cannot make +inf.
    with np.errstate(over="ignore"):
        logits = beta * (similarities - similarities.max())
    return softmax(logits)


def weighted_read(memory, weights):
    """r = sum_i w_i M_i; an all-zero weight vector reads a zero vector."""
    memory = _matrix(memory)
    return _weights(weights, len(memory)) @ memory


def erase_add(memory, weights, erase, add):
    """Return M * (1 - w[:, None] * erase) + w[:, None] * add.

    The input is not mutated. A zero weight preserves that entire slot.
    erase is elementwise in [0, 1]; add may contain any finite real value.
    """
    memory = _matrix(memory)
    weights = _weights(weights, len(memory))
    erase = _vector(erase, memory.shape[1], "erase")
    add = _vector(add, memory.shape[1], "add")
    if np.any(erase < 0) or np.any(erase > 1):
        raise ValueError("erase coordinates must lie in [0, 1]")
    result = memory * (1 - weights[:, None] * erase) + weights[:, None] * add
    if not np.isfinite(result).all():
        raise ValueError("write overflowed the finite memory representation")
    return result


class ExternalMemory:
    """Small serializable state holder; it contains no learned controller."""

    def __init__(self, slots=6, width=3, *, matrix=None):
        if matrix is None:
            if not isinstance(slots, int) or not isinstance(width, int) or min(slots, width) < 1:
                raise ValueError("slots and width must be positive integers")
            matrix = np.zeros((slots, width), dtype=np.float64)
        self.matrix = _matrix(matrix).copy()

    def address(self, key, beta=8.0):
        return content_address(self.matrix, key, beta)

    def read(self, weights):
        return weighted_read(self.matrix, weights)

    def write(self, weights, erase, add):
        self.matrix = erase_add(self.matrix, weights, erase, add)
        return self.matrix.copy()

    def save(self, path):
        Path(path).write_text(json.dumps({"format": "toy-memory-v1", "matrix": self.matrix.tolist()},
                                        allow_nan=False, indent=2) + "\n", encoding="utf-8")

    @classmethod
    def load(cls, path):
        data = json.loads(Path(path).read_text(encoding="utf-8"))
        if not isinstance(data, dict) or set(data) != {"format", "matrix"} or data["format"] != "toy-memory-v1":
            raise ValueError("invalid or unsupported memory file")
        return cls(matrix=data["matrix"])


def demo(output_dir="outputs/t09", seed=42):
    """Run a reproducible fixed-controller copy/overwrite/misaddressing trace."""
    path = output_path(output_dir)
    memory = ExternalMemory(6, 3)
    tokens = np.eye(3)
    weights = np.eye(6)
    snapshots = [memory.matrix.copy()]
    labels = ["初始：全零"]
    trace = []
    for index, token in enumerate(tokens):
        memory.write(weights[index], np.ones(3), token)
        snapshots.append(memory.matrix.copy())
        labels.append(f"写入 {chr(65 + index)} → 槽 {index + 1}")
        trace.append({"operation": "write", "slot_1based": index + 1, "add": token.tolist()})
    copied = np.stack([memory.read(weights[index]) for index in range(3)])
    before = memory.matrix.copy()
    correct_soft_weights = memory.address(tokens[1])
    wrong_key_weights = memory.address(tokens[2])
    replacement = np.array([2., 3., 0.])
    memory.write(weights[1], np.ones(3), replacement)
    snapshots.append(memory.matrix.copy())
    labels.append("准确覆盖槽 2：写 [2,3,0]")
    correct_write = memory.matrix.copy()
    mis_weights = np.array([.6, .4, 0, 0, 0, 0])
    wrong_write = erase_add(before, mis_weights, np.ones(3), replacement)
    snapshots.append(wrong_write)
    labels.append("错误覆盖（从写 C 后分支）")
    memory.save(path / "memory.json")
    restored = ExternalMemory.load(path / "memory.json")
    trace.extend([
        {"operation": "copy_read", "read_weights": weights[:3].tolist(), "output": copied.tolist()},
        {"operation": "overwrite", "slot_1based": 2, "add": replacement.tolist()},
        {"operation": "counterfactual_misaddress_write", "weights": mis_weights.tolist(), "add": replacement.tolist()},
    ])
    (path / "trajectory.json").write_text(json.dumps({"controller": "fixed hand-written",
        "steps": trace, "labels": labels, "snapshots": [m.tolist() for m in snapshots]},
        ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    fig, axes = plt.subplots(2, 3, figsize=(12, 7), constrained_layout=True)
    for axis, matrix, label in zip(axes.flat, snapshots, labels):
        im = axis.imshow(matrix, vmin=0, vmax=3, cmap="Blues", aspect="auto")
        axis.set(title=label, xticks=range(3), xticklabels=["维度 1", "维度 2", "维度 3"],
                 yticks=range(6), yticklabels=[f"槽 {i+1}" for i in range(6)])
        for i in range(6):
            for j in range(3):
                axis.text(j, i, f"{matrix[i, j]:g}", ha="center", va="center",
                          color="white" if matrix[i, j] > 1.6 else "black", fontsize=9)
    fig.colorbar(im, ax=list(axes.flat), label="记忆值", shrink=.85)
    fig.suptitle("固定控制器的记忆轨迹：复制、覆盖与错误寻址（未训练）")
    fig.savefig(path / "memory_trajectory.png", dpi=150)
    plt.close(fig)

    fig, axes = plt.subplots(1, 2, figsize=(11, 4), constrained_layout=True)
    xs = np.arange(6)
    axes[0].bar(xs - .18, correct_soft_weights, .36, label="正确键 B")
    axes[0].bar(xs + .18, wrong_key_weights, .36, label="错误键 C")
    axes[0].set(xticks=xs, xticklabels=[f"槽 {i+1}" for i in xs], ylabel="读取权重",
                title="内容寻址：cosine + softmax，β=8")
    axes[0].legend()
    error_by_slot = np.linalg.norm(wrong_write - correct_write, axis=1)
    axes[1].bar(xs, error_by_slot, color="#c55346")
    axes[1].set(xticks=xs, xticklabels=[f"槽 {i+1}" for i in xs], ylabel="相对正确覆盖的 L2 误差",
                title="错误写权重同时污染槽 1、槽 2")
    fig.savefig(path / "addressing_failure.png", dpi=150)
    plt.close(fig)

    metrics = {
        "toy": "T09", "seed": seed, "controller": "fixed, not trained", "slots": 6, "width": 3,
        "copy_max_abs_error": float(np.max(np.abs(copied - tokens))),
        "manual_read": weighted_read(np.eye(2), [.25, .75]).tolist(),
        "manual_overwrite": erase_add(np.eye(2), [0, 1], [1, 1], [2, 3]).tolist(),
        "overwrite_slot_2": memory.matrix[1].tolist(),
        "untouched_slots_max_abs_change": float(np.max(np.abs(memory.matrix[[0, 2, 3, 4, 5]] - before[[0, 2, 3, 4, 5]]))),
        "correct_key_target_weight": float(correct_soft_weights[1]),
        "correct_key_read_l2_error": float(np.linalg.norm(weighted_read(before, correct_soft_weights) - tokens[1])),
        "wrong_key_read_l2_error": float(np.linalg.norm(weighted_read(before, wrong_key_weights) - tokens[1])),
        "misaddress_write_frobenius_error": float(np.linalg.norm(wrong_write - correct_write)),
        "serialization_max_abs_error": float(np.max(np.abs(restored.matrix - memory.matrix))),
        "zero_key_weights": content_address(before, np.zeros(3)).tolist(),
        "plots": ["memory_trajectory.png", "addressing_failure.png"],
    }
    return save_result(path, metrics)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", default="outputs/t09")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    print(json.dumps(demo(args.output_dir, args.seed), ensure_ascii=False, indent=2))
