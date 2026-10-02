"""T06: tanh RNN, explicit BPTT, delayed recall and next-character modeling.

No autodiff: Wxh, Whh, bh, Why, by are differentiated in loss_and_grads.
Training examples are complete, unique strings of length 8--16.
"""
from __future__ import annotations

import argparse
import json
from typing import Sequence

import numpy as np

from .common import Adam, cross_entropy, gradcheck, output_path, plt, save_result

VOCAB = "ABxy?"
CHAR_TO_ID = {char: index for index, char in enumerate(VOCAB)}
LABELS = "AB"


def scalar_example() -> list[float]:
    """Worked recurrence h_t = tanh(x_t + 0.5 h_(t-1)), h_0 = 0."""
    state = 0.0
    result = []
    for value in (1.0, 0.0):
        state = float(np.tanh(value + 0.5 * state))
        result.append(state)
    return result


def make_dataset(seed: int = 42, per_length: int = 96):
    """Return stratified train/validation whole strings; all strings are unique.

    The first character A/B is the answer. Six to fourteen independent x/y
    distractors and a final question mark give total context lengths 8--16.
    Each length/answer cell has 3/4 train and 1/4 validation examples.
    """
    if per_length < 8 or per_length > 128 or per_length % 8:
        raise ValueError("per_length must be a multiple of 8 between 8 and 128")
    rng = np.random.default_rng(seed)
    train, validation = [], []
    for length in range(8, 17):
        filler_length = length - 2
        for opening in LABELS:
            # Sampling integer encodings without replacement prevents duplicates.
            codes = rng.choice(2 ** filler_length, per_length // 2, replace=False)
            sequences = [opening + "".join("y" if (int(code) >> bit) & 1 else "x"
                                         for bit in range(filler_length)) + "?"
                         for code in codes]
            cutoff = 3 * len(sequences) // 4
            train.extend(sequences[:cutoff])
            validation.extend(sequences[cutoff:])
    rng.shuffle(train)
    rng.shuffle(validation)
    assert not set(train).intersection(validation)
    return train, validation


def encode(sequences: Sequence[str]):
    """Pad with an arbitrary ID; lengths ensure padded steps do not affect h."""
    if not sequences or any(len(s) == 0 for s in sequences):
        raise ValueError("encode requires nonempty sequences")
    lengths = np.array([len(s) for s in sequences], dtype=np.int64)
    inputs = np.zeros((len(sequences), int(lengths.max())), dtype=np.int64)
    for row, sequence in enumerate(sequences):
        inputs[row, :len(sequence)] = [CHAR_TO_ID[char] for char in sequence]
    labels = np.array([LABELS.index(s[0]) for s in sequences], dtype=np.int64)
    return inputs, lengths, labels


class TanhRNN:
    """Batch-first RNN. Calls always start from zero unless h0 is explicit.

    Wxh[index] equals multiplying a one-hot input by Wxh, without allocating
    the one-hot matrix. All trainable values and hidden states are float64.
    """
    def __init__(self, vocab_size: int = len(VOCAB), hidden_size: int = 16,
                 output_size: int = 2, seed: int = 42):
        rng = np.random.default_rng(seed)
        self.params = {
            "Wxh": rng.normal(0.0, 0.25, (vocab_size, hidden_size)),
            "Whh": rng.normal(0.0, 0.5 / np.sqrt(hidden_size),
                              (hidden_size, hidden_size)),
            "bh": np.zeros(hidden_size, dtype=np.float64),
            "Why": rng.normal(0.0, 0.25, (hidden_size, output_size)),
            "by": np.zeros(output_size, dtype=np.float64),
        }

    def forward(self, inputs, lengths=None, h0=None):
        inputs = np.asarray(inputs)
        if inputs.ndim != 2 or inputs.shape[1] == 0:
            raise ValueError("inputs must have shape (batch, positive time)")
        if not np.issubdtype(inputs.dtype, np.integer):
            raise ValueError("input IDs must be integers")
        if np.any(inputs < 0) or np.any(inputs >= self.params["Wxh"].shape[0]):
            raise ValueError("input ID outside vocabulary")
        batch, time = inputs.shape
        if batch == 0:
            raise ValueError("batch must be nonempty")
        if lengths is None:
            lengths = np.full(batch, time, dtype=np.int64)
        lengths = np.asarray(lengths)
        if (lengths.shape != (batch,) or not np.issubdtype(lengths.dtype, np.integer)
                or np.any(lengths < 1) or np.any(lengths > time)):
            raise ValueError("lengths must contain one valid integer per sequence")
        hidden_size = self.params["bh"].size
        state = np.zeros((batch, hidden_size), dtype=np.float64)
        if h0 is not None:
            initial = np.asarray(h0, dtype=np.float64)
            if initial.shape != state.shape:
                raise ValueError("h0 must have shape (batch, hidden_size)")
            state[:] = initial
        states = [state]
        p = self.params
        for t in range(time):
            candidate = np.tanh(p["Wxh"][inputs[:, t]] + state @ p["Whh"] + p["bh"])
            active = (t < lengths)[:, None]
            state = np.where(active, candidate, state)
            states.append(state)
        logits = state @ p["Why"] + p["by"]
        return logits, (inputs, lengths, states)

    def loss_and_grads(self, inputs, labels, lengths=None):
        logits, (inputs, lengths, states) = self.forward(inputs, lengths)
        loss, dlogits = cross_entropy(logits, labels)
        p = self.params
        grads = {name: np.zeros_like(value) for name, value in p.items()}
        grads["Why"] = states[-1].T @ dlogits
        grads["by"] = dlogits.sum(axis=0)
        dh = dlogits @ p["Why"].T
        # Reverse traversal is backpropagation through time, not autodiff.
        for t in reversed(range(inputs.shape[1])):
            active = (t < lengths)[:, None]
            dz = dh * (1.0 - states[t + 1] ** 2) * active
            np.add.at(grads["Wxh"], inputs[:, t], dz)
            grads["Whh"] += states[t].T @ dz
            grads["bh"] += dz.sum(axis=0)
            # Padded steps copy the state, so their derivative is identity.
            dh = dz @ p["Whh"].T + dh * (~active)
        return loss, grads

    def predict(self, inputs, lengths=None):
        return self.forward(inputs, lengths)[0].argmax(axis=-1)

    def sequence_forward(self, inputs, lengths=None):
        """Reuse the same recurrence; return one vocabulary logit vector per step."""
        _, cache = self.forward(inputs, lengths)
        states = np.stack(cache[2][1:], axis=1)
        return states @ self.params["Why"] + self.params["by"], cache

    def sequence_loss_and_grads(self, inputs, targets, lengths=None):
        """Mean next-token CE over real tokens only, with full explicit BPTT."""
        logits, (inputs, lengths, states) = self.sequence_forward(inputs, lengths)
        targets = np.asarray(targets)
        if targets.shape != inputs.shape:
            raise ValueError("targets must match input shape")
        active_mask = np.arange(inputs.shape[1])[None, :] < lengths[:, None]
        loss, active_grad = cross_entropy(logits[active_mask], targets[active_mask])
        dlogits = np.zeros_like(logits)
        dlogits[active_mask] = active_grad
        p = self.params
        grads = {name: np.zeros_like(value) for name, value in p.items()}
        dh = np.zeros_like(states[0])
        for t in reversed(range(inputs.shape[1])):
            grads["Why"] += states[t+1].T @ dlogits[:, t]
            grads["by"] += dlogits[:, t].sum(axis=0)
            # Every real step has its own loss, as well as future losses via h.
            dh += dlogits[:, t] @ p["Why"].T
            active = (t < lengths)[:, None]
            dz = dh * (1.0 - states[t+1] ** 2) * active
            np.add.at(grads["Wxh"], inputs[:, t], dz)
            grads["Whh"] += states[t].T @ dz
            grads["bh"] += dz.sum(axis=0)
            dh = dz @ p["Whh"].T + dh * (~active)
        return loss, grads

    def save(self, path):
        np.savez(path, **self.params)

    @classmethod
    def load(cls, path):
        with np.load(path, allow_pickle=False) as saved:
            model = cls(vocab_size=saved["Wxh"].shape[0],
                        hidden_size=saved["Wxh"].shape[1],
                        output_size=saved["Why"].shape[1])
            model.params = {name: saved[name].copy() for name in model.params}
        return model


def clip_gradients(grads, max_norm: float = 1.0):
    """Return copied gradients, original global L2 norm, and clipping scale."""
    if not np.isfinite(max_norm) or max_norm <= 0:
        raise ValueError("max_norm must be finite and positive")
    norm = float(np.sqrt(sum(float(np.sum(g * g)) for g in grads.values())))
    if not np.isfinite(norm):
        raise FloatingPointError("non-finite gradient norm")
    scale = min(1.0, max_norm / max(norm, np.finfo(np.float64).tiny))
    return {name: grad * scale for name, grad in grads.items()}, norm, scale


def evaluate(model, sequences):
    inputs, lengths, labels = encode(sequences)
    logits, _ = model.forward(inputs, lengths)
    loss, _ = cross_entropy(logits, labels)
    predictions = logits.argmax(axis=-1)
    return {"loss": float(loss), "accuracy": float(np.mean(predictions == labels))}


def gradient_checks(seed=42):
    """Check every scalar in every named tensor on a short, padded sequence."""
    model = TanhRNN(hidden_size=3, seed=seed)
    inputs = np.array([[0, 2, 4], [1, 4, 3]], dtype=np.int64)
    lengths, labels = np.array([3, 2]), np.array([0, 1])
    _, grads = model.loss_and_grads(inputs, labels, lengths)
    checks = {}
    for name in model.params:
        checks[name] = gradcheck(
            lambda: model.loss_and_grads(inputs, labels, lengths)[0],
            {name: model.params[name]}, {name: grads[name]},
            samples=model.params[name].size, seed=seed)
    return checks


LM_VOCAB = "ABxy01>"


def make_language_dataset(seed=42):
    """Mode A: x0/y1; mode B: x1/y0. Unique lengths 8,10,...,16."""
    import itertools
    rng = np.random.default_rng(seed)
    train, validation = [], []
    for pairs in range(3, 8):
        for mode in "AB":
            examples = []
            for chars in itertools.product("xy", repeat=pairs):
                body = "".join(c + str(int(c == "y") ^ int(mode == "B")) for c in chars)
                examples.append(mode + body + ">")
            order = rng.permutation(len(examples))
            cutoff = 3 * len(examples) // 4
            train.extend(examples[i] for i in order[:cutoff])
            validation.extend(examples[i] for i in order[cutoff:])
    rng.shuffle(train)
    rng.shuffle(validation)
    assert set(train).isdisjoint(validation)
    return train, validation


def encode_language(sequences):
    if not sequences or any(len(s) < 2 for s in sequences):
        raise ValueError("language examples need at least two characters")
    lengths = np.array([len(s)-1 for s in sequences], dtype=np.int64)
    x = np.zeros((len(sequences), int(lengths.max())), dtype=np.int64)
    y = np.zeros_like(x)
    for i, sequence in enumerate(sequences):
        ids = [LM_VOCAB.index(char) for char in sequence]
        x[i, :lengths[i]], y[i, :lengths[i]] = ids[:-1], ids[1:]
    return x, y, lengths


def evaluate_language(model, sequences):
    x, y, lengths = encode_language(sequences)
    logits, _ = model.sequence_forward(x, lengths)
    mask = np.arange(x.shape[1])[None, :] < lengths[:, None]
    loss, _ = cross_entropy(logits[mask], y[mask])
    digit_mask = mask & np.isin(y, [LM_VOCAB.index("0"), LM_VOCAB.index("1")])
    pred = logits.argmax(-1)
    return {"loss": loss, "token_accuracy": float(np.mean(pred[mask] == y[mask])),
            "conditional_digit_accuracy": float(np.mean(pred[digit_mask] == y[digit_mask]))}


def generate_language(model, prompt, max_new_tokens=12):
    if not prompt:
        raise ValueError("prompt must be nonempty")
    ids = [LM_VOCAB.index(char) for char in prompt]
    for _ in range(max_new_tokens):
        logits, _ = model.sequence_forward(np.array([ids], dtype=np.int64))
        nxt = int(logits[0, -1].argmax())
        ids.append(nxt)
        if LM_VOCAB[nxt] == ">":
            break
    return "".join(LM_VOCAB[i] for i in ids)


def language_gradient_checks(seed=42):
    model = TanhRNN(vocab_size=7, hidden_size=3, output_size=7, seed=seed)
    x, y, lengths = encode_language(["Ax0>", "By0x1>"])
    _, grads = model.sequence_loss_and_grads(x, y, lengths)
    return {name: gradcheck(lambda: model.sequence_loss_and_grads(x, y, lengths)[0],
                            {name: value}, {name: grads[name]}, samples=value.size)
            for name, value in model.params.items()}


def language_demo(path, seed=42):
    train, validation = make_language_dataset(seed)
    model = TanhRNN(vocab_size=7, hidden_size=16, output_size=7, seed=seed)
    optimizer = Adam(model.params, lr=.007)
    rng = np.random.default_rng(seed+2)
    history = []
    for epoch in range(101):
        if epoch:
            order = rng.permutation(len(train))
            for start in range(0, len(train), 32):
                batch = [train[i] for i in order[start:start+32]]
                x, y, lengths = encode_language(batch)
                _, grads = model.sequence_loss_and_grads(x, y, lengths)
                grads, _, _ = clip_gradients(grads)
                optimizer.step(model.params, grads)
        if epoch % 5 == 0:
            tr, va = evaluate_language(model, train), evaluate_language(model, validation)
            history.append(dict(epoch=epoch, train_loss=tr["loss"], validation_loss=va["loss"],
                                validation_digit_accuracy=va["conditional_digit_accuracy"]))
    examples = []
    for prompt in ("A", "B", "Ax0y1x", "By0x1y"):
        for budget in (7, 11, 15):
            generated = generate_language(model, prompt, budget)
            body = generated[1:-1] if generated.endswith(">") else generated[1:]
            mode = int(generated[0] == "B")
            digit_ok = all(body[i] in "xy" and body[i+1] == str(int(body[i] == "y") ^ mode)
                           for i in range(0, len(body)-1, 2))
            examples.append(dict(prompt=prompt, max_new_tokens=budget, generated=generated,
                                 ended=generated.endswith(">"), completed_pairs_obey_mode=digit_ok))
    model.save(path/"language_parameters.npz")
    restored = TanhRNN.load(path/"language_parameters.npz")
    probe, _, lengths = encode_language(validation[:4])
    reload_exact = bool(np.array_equal(model.sequence_forward(probe, lengths)[0],
                                       restored.sequence_forward(probe, lengths)[0]))
    (path/"language_split_sequences.json").write_text(json.dumps(
        dict(train=train, validation=validation), indent=2)+"\n", encoding="utf-8")
    fig, axes = plt.subplots(1, 2, figsize=(10, 3.6))
    axes[0].plot([r["epoch"] for r in history], [r["train_loss"] for r in history], label="train")
    axes[0].plot([r["epoch"] for r in history], [r["validation_loss"] for r in history], label="validation")
    axes[0].set(xlabel="Epoch", ylabel="Nats / real token", title="Next-character loss at every position")
    axes[0].legend()
    axes[1].plot([r["epoch"] for r in history], [r["validation_digit_accuracy"] for r in history])
    axes[1].set(xlabel="Epoch", ylabel="Accuracy", ylim=(0, 1.04), title="Mode-conditioned digit prediction")
    fig.tight_layout()
    fig.savefig(path/"language_curves.png")
    plt.close(fig)
    return {"task": "per-position next-character language modeling", "vocabulary": LM_VOCAB,
            "train_sequences": len(train), "validation_sequences": len(validation),
            "complete_sequence_lengths": sorted({len(s) for s in train}),
            "duplicate_sequences_across_splits": len(set(train)&set(validation)),
            "epochs": 100, "batch_size": 32, "learning_rate": .007,
            "selection_policy": "fixed last epoch; no validation-based checkpoint selection",
            "train": evaluate_language(model, train), "validation": evaluate_language(model, validation),
            "generation_examples": examples, "gradient_checks": language_gradient_checks(seed),
            "reload_logits_bitwise_equal": reload_exact, "history": history,
            "limitations": "Random x/y choices and variable stopping are not exactly predictable. Greedy generation can loop or end at a length outside 8-16; budget exhaustion is not EOS."}


def demo(output_dir="outputs/t06", seed=42):
    path = output_path(output_dir)
    train, validation = make_dataset(seed)
    model = TanhRNN(seed=seed)
    optimizer = Adam(model.params, lr=0.007)
    rng = np.random.default_rng(seed + 1)
    initial = evaluate(model, validation)
    history = {"epoch": [], "train_loss": [], "validation_loss": [],
               "validation_accuracy": []}
    clipped_steps, total_steps, max_observed_norm = 0, 0, 0.0
    epochs, batch_size, clip_norm = 80, 48, 1.0
    for epoch in range(epochs + 1):
        if epoch > 0:
            order = rng.permutation(len(train))
            for start in range(0, len(order), batch_size):
                sequences = [train[int(i)] for i in order[start:start + batch_size]]
                inputs, lengths, labels = encode(sequences)
                _, grads = model.loss_and_grads(inputs, labels, lengths)
                grads, norm, scale = clip_gradients(grads, clip_norm)
                optimizer.step(model.params, grads)
                total_steps += 1
                clipped_steps += int(scale < 1.0)
                max_observed_norm = max(max_observed_norm, norm)
        training = evaluate(model, train)
        held_out = evaluate(model, validation)
        history["epoch"].append(epoch)
        history["train_loss"].append(training["loss"])
        history["validation_loss"].append(held_out["loss"])
        history["validation_accuracy"].append(held_out["accuracy"])
    final = evaluate(model, validation)
    # Counterfactual pairs use the same filler with the opening symbol flipped.
    flipped = [("B" if s[0] == "A" else "A") + s[1:] for s in validation]
    flipped_result = evaluate(model, flipped)
    inputs, lengths, labels = encode(validation)
    # Remove the very information the network should remember; chance is 50%.
    erased = inputs.copy()
    erased[:, 0] = CHAR_TO_ID["x"]
    erased_accuracy = float(np.mean(model.predict(erased, lengths) == labels))
    by_length = {str(length): evaluate(model, [s for s in validation if len(s) == length])
                 for length in range(8, 17)}
    checks = gradient_checks(seed)
    metrics = {
        "toy": "T06 tanh RNN / explicit BPTT", "seed": seed,
        "dtype": "float64", "task": "delayed first-character recall at ?",
        "vocabulary": VOCAB, "hidden_size": 16,
        "train_sequences": len(train), "validation_sequences": len(validation),
        "context_lengths": [8, 16], "duplicate_sequences_across_splits": 0,
        "unique_sequences": len(set(train + validation)),
        "validation_policy": "fixed final epoch; validation never selects parameters",
        "epochs": epochs, "batch_size": batch_size, "learning_rate": 0.007,
        "clip_norm": clip_norm, "clipped_steps": clipped_steps,
        "total_steps": total_steps, "maximum_unclipped_gradient_norm": max_observed_norm,
        "initial_validation": initial, "final_train": training,
        "final_validation": final, "validation_by_length": by_length,
        "flipped_first_character_accuracy": flipped_result["accuracy"],
        "erased_first_character_accuracy": erased_accuracy,
        "counterfactual_note": "flipped strings are diagnostic, not an independent holdout",
        "scalar_example": scalar_example(), "gradient_checks": checks,
        "examples": [{"context": s, "expected": s[0],
                      "predicted": LABELS[int(model.predict(*encode([s])[:2])[0])]}
                     for s in validation[:8]],
        "history": history,
    }
    model.save(path / "parameters.npz")
    restored = TanhRNN.load(path / "parameters.npz")
    probe, probe_lengths, _ = encode(validation[:4])
    metrics["reload_logits_bitwise_equal"] = bool(np.array_equal(
        model.forward(probe, probe_lengths)[0], restored.forward(probe, probe_lengths)[0]))
    (path / "split_sequences.json").write_text(json.dumps(
        {"train": train, "validation": validation}, indent=2) + "\n", encoding="utf-8")
    fig, axes = plt.subplots(1, 2, figsize=(10, 3.6))
    axes[0].plot(history["epoch"], history["train_loss"], label="train")
    axes[0].plot(history["epoch"], history["validation_loss"], label="validation")
    axes[0].set(xlabel="Epoch", ylabel="Cross entropy", title="RNN learns delayed recall")
    axes[0].legend()
    axes[1].plot(history["epoch"], history["validation_accuracy"], label="validation")
    axes[1].axhline(.5, color="gray", linestyle="--", label="chance")
    axes[1].set(xlabel="Epoch", ylabel="Accuracy", ylim=(0, 1.04), title="Unique held-out strings")
    axes[1].legend()
    fig.tight_layout()
    fig.savefig(path / "learning_curves.png")
    plt.close(fig)
    sample = validation[0]
    x, lengths, _ = encode([sample])
    _, (_, _, states) = model.forward(x, lengths)
    activations = np.stack(states[1:], axis=0)[:, 0, :].T
    fig, ax = plt.subplots(figsize=(8, 3.6))
    plot = ax.imshow(activations, aspect="auto", vmin=-1, vmax=1, cmap="coolwarm")
    ax.set_xticks(range(len(sample)), list(sample))
    ax.set(xlabel="Input character", ylabel="Hidden unit",
           title=f"Hidden states across time; target: {sample[0]}")
    fig.colorbar(plot, ax=ax, label="tanh activation")
    fig.tight_layout()
    fig.savefig(path / "hidden_states.png")
    plt.close(fig)
    metrics["next_character_model"] = language_demo(path, seed)
    return save_result(path, metrics)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", default="outputs/t06")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    metrics = demo(args.output_dir, args.seed)
    print(json.dumps({k: metrics[k] for k in ("final_validation", "clipped_steps", "gradient_checks")},
                     indent=2))


if __name__ == "__main__":
    main()
