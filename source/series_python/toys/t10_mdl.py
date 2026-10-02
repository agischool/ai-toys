"""T10: a lossless, deterministic literal-or-periodic-rule byte codec.

The shortest member of a finite candidate family is chosen. This is a toy
minimum-description-length comparison, not optimal general compression or
Kolmogorov complexity. See docs/T10_MDL.md for the exact wire format.
"""
from __future__ import annotations

import argparse
from collections import Counter
from dataclasses import dataclass
import json

import numpy as np

from .common import output_path, plt, save_result


MAGIC = b"MDL1"
MAX_PERIOD = 16
MAX_INTEGER = (1 << 63) - 1


class CodecError(ValueError):
    """The byte stream is malformed or exceeds an explicit decode limit."""


def _utf8(text):
    # surrogatepass makes even isolated Python surrogate characters reversible.
    return text.encode("utf-8", errors="surrogatepass")


def _text(blob):
    try:
        return blob.decode("utf-8", errors="surrogatepass")
    except UnicodeDecodeError as error:
        raise CodecError("invalid UTF-8 payload") from error


def _uvarint(value):
    """Canonical unsigned base-128, least-significant group first."""
    if not isinstance(value, int) or not 0 <= value <= MAX_INTEGER:
        raise ValueError("integer is outside the supported 63-bit unsigned range")
    out = bytearray()
    while value >= 128:
        out.append((value & 127) | 128)
        value >>= 7
    out.append(value)
    return bytes(out)


class _Reader:
    def __init__(self, blob):
        self.blob, self.offset = blob, 0

    def take(self, size):
        if size < 0 or size > len(self.blob) - self.offset:
            raise CodecError("truncated byte stream")
        start = self.offset
        self.offset += size
        return self.blob[start:self.offset]

    def integer(self):
        start, value = self.offset, 0
        for shift in range(0, 63, 7):
            byte = self.take(1)[0]
            value |= (byte & 127) << shift
            if byte < 128:
                if _uvarint(value) != self.blob[start:self.offset]:
                    raise CodecError("noncanonical integer encoding")
                return value
        raise CodecError("integer exceeds the 63-bit format limit")

    def finish(self):
        if self.offset != len(self.blob):
            raise CodecError("unexpected trailing bytes")


@dataclass(frozen=True)
class Candidate:
    name: str
    period: int | None
    blob: bytes
    header_bytes: int
    model_bytes: int
    residual_bytes: int
    exceptions: int

    @property
    def total_bytes(self):
        return len(self.blob)

    def costs(self):
        return {"name": self.name, "period": self.period, "total_bytes": self.total_bytes,
                "header_bytes": self.header_bytes, "model_bytes": self.model_bytes,
                "residual_bytes": self.residual_bytes, "exceptions": self.exceptions}


def literal_candidate(text):
    if not isinstance(text, str):
        raise TypeError("encode expects a str")
    payload = _utf8(text)
    header = MAGIC + b"L" + _uvarint(len(payload))
    return Candidate("literal", None, header + payload, len(header), 0, len(payload), 0)


def _rule_candidate(text, period):
    # Exactly one model per period. Ties use Unicode code-point ordering.
    # This modal heuristic does not search every possible periodic model.
    pattern = "".join(min(Counter(text[offset::period]).items(), key=lambda pair: (-pair[1], pair[0]))[0]
                      for offset in range(period))
    exceptions = [(position, char) for position, char in enumerate(text)
                  if char != pattern[position % period]]
    pattern_bytes = _utf8(pattern)
    prefix = MAGIC + b"R" + _uvarint(len(text))
    model = _uvarint(len(pattern_bytes)) + pattern_bytes
    count = _uvarint(len(exceptions))
    residual = bytearray()
    for position, char in exceptions:
        char_bytes = _utf8(char)
        residual.extend(_uvarint(position))
        residual.extend(_uvarint(len(char_bytes)))
        residual.extend(char_bytes)
    blob = prefix + model + count + residual
    return Candidate(f"rule-p{period}", period, blob, len(prefix) + len(count), len(model),
                     len(residual), len(exceptions))


def candidate_encodings(text):
    """Literal, then one modal periodic model for each p=1..min(16,len(text))."""
    candidates = [literal_candidate(text)]
    candidates.extend(_rule_candidate(text, period) for period in range(1, min(MAX_PERIOD, len(text)) + 1))
    return candidates


def select_candidate(text):
    # Stable minimum: ties favor literal, then the smaller period.
    return min(candidate_encodings(text), key=lambda candidate: candidate.total_bytes)


def encode(text: str) -> bytes:
    """Losslessly encode a Python str; deterministic ties favor the literal."""
    return select_candidate(text).blob


def decode(blob: bytes, *, max_output_chars=None) -> str:
    """Decode a complete stream or raise CodecError; trailing bytes are errors.

    Optional max_output_chars bounds expansion for untrusted streams. There is
    no arbitrary default size limit; compressed runs can expand substantially.
    This format is not authenticated and has no corruption-detection checksum.
    """
    if not isinstance(blob, bytes):
        raise TypeError("decode expects bytes")
    if max_output_chars is not None and (not isinstance(max_output_chars, int) or max_output_chars < 0):
        raise ValueError("max_output_chars must be a nonnegative integer or None")
    reader = _Reader(blob)
    if reader.take(4) != MAGIC:
        raise CodecError("invalid magic or unsupported version")
    mode = reader.take(1)
    if mode == b"L":
        text = _text(reader.take(reader.integer()))
        reader.finish()
        if max_output_chars is not None and len(text) > max_output_chars:
            raise CodecError("decoded string exceeds max_output_chars")
        return text
    if mode != b"R":
        raise CodecError("unknown encoding mode")
    length = reader.integer()
    if length == 0:
        raise CodecError("a periodic rule requires a nonempty output")
    if max_output_chars is not None and length > max_output_chars:
        raise CodecError("decoded string exceeds max_output_chars")
    pattern = _text(reader.take(reader.integer()))
    if not 1 <= len(pattern) <= min(MAX_PERIOD, length):
        raise CodecError("invalid periodic model length")
    count = reader.integer()
    if count > length:
        raise CodecError("too many exceptions")
    exceptions = []
    previous = -1
    for _ in range(count):
        position = reader.integer()
        if not previous < position < length:
            raise CodecError("exception indices must be increasing and in range")
        char = _text(reader.take(reader.integer()))
        if len(char) != 1:
            raise CodecError("each exception must contain exactly one Unicode code point")
        if char == pattern[position % len(pattern)]:
            raise CodecError("redundant exception")
        exceptions.append((position, char))
        previous = position
    reader.finish()
    # Validate all records before expansion, rather than allocating from an
    # unvalidated length immediately after reading the header.
    chars = list((pattern * ((length + len(pattern) - 1) // len(pattern)))[:length])
    for position, char in exceptions:
        chars[position] = char
    return "".join(chars)


def demo(output_dir="outputs/t10", seed=42):
    path = output_path(output_dir)
    rng = np.random.default_rng(seed)
    length = 256
    base = "AB" * (length // 2)
    order = rng.permutation(length)
    replacements = rng.choice(list("CDEFGH"), size=length)
    noise_counts = [0, 1, 2, 4, 8, 16, 32, 64, 96, 128, 192, 256]
    noise_records = []
    noisy_texts = []
    for count in noise_counts:
        chars = list(base)
        for index in order[:count]:
            chars[index] = str(replacements[index])
        text = "".join(chars)
        noisy_texts.append(text)
        candidates = candidate_encodings(text)
        selected = min(candidates, key=lambda candidate: candidate.total_bytes)
        noise_records.append({"noise_count": count, "noise_fraction": count / length,
                              "literal_bytes": candidates[0].total_bytes,
                              "best_rule_bytes": min(candidate.total_bytes for candidate in candidates[1:]),
                              "selected": selected.costs(), "roundtrip": decode(selected.blob) == text})
    examples = {"empty": "", "single": "界", "short_repeat": "ABABABAB",
                "short_exception": "ABABABAC", "repeat_256": base,
                "four_exceptions": noisy_texts[3], "noisy_256": noisy_texts[-1],
                "unicode_repeat": "春🌱\n" * 48, "literal_special": "L|R:4\\AB\n零\x00🙂"}
    exact = []
    for name, text in examples.items():
        candidates = candidate_encodings(text)
        selected = select_candidate(text)
        reconstructed = decode(selected.blob)
        exact.append({"example": name, "text": text, "encoded_hex": selected.blob.hex(),
                      "decoded": reconstructed, "roundtrip": reconstructed == text,
                      "raw_utf8_bytes": len(_utf8(text)), "selected": selected.costs(),
                      "candidates": [candidate.costs() for candidate in candidates]})
    (path / "exact_examples.json").write_text(json.dumps(exact, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (path / "noise_costs.json").write_text(json.dumps(noise_records, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    fig, ax = plt.subplots(figsize=(9, 5), constrained_layout=True)
    fractions = [record["noise_fraction"] for record in noise_records]
    ax.plot(fractions, [record["literal_bytes"] for record in noise_records], "--", label="字面量：含完整头部")
    ax.plot(fractions, [record["best_rule_bytes"] for record in noise_records], "o-", label="最佳周期规则：含例外")
    ax.plot(fractions, [record["selected"]["total_bytes"] for record in noise_records], "s-", label="实际选择：候选中最短")
    ax.set(xlabel="替换比例（替换字符来自 C–H，原序列为 AB×128）", ylabel="真实编码长度 / byte",
           title="固定长度 256 字符：比较噪声下的编码代价，字面量提供上界")
    ax.legend()
    ax.grid(alpha=.2)
    fig.savefig(path / "cost_vs_noise.png", dpi=150)
    plt.close(fig)

    selected_examples = [exact[i] for i in [2, 4, 5, 6, 7]]
    labels = ["短重复\n8 字符", "长重复\n256 字符", "4 个替换\n256 字符", "高噪声\n256 字符", "Unicode 重复\n144 码点"]
    fig, ax = plt.subplots(figsize=(10, 5), constrained_layout=True)
    bottom = np.zeros(len(selected_examples))
    for field, label, color in [("header_bytes", "头部 / 计数字段", "#507cba"),
                               ("model_bytes", "周期模型", "#3da58e"),
                               ("residual_bytes", "例外记录 / 字面量数据", "#df9a4c")]:
        values = [item["selected"][field] for item in selected_examples]
        ax.bar(labels, values, bottom=bottom, label=label, color=color)
        bottom += values
    for i, item in enumerate(selected_examples):
        ax.text(i, bottom[i] + 3, f'{int(bottom[i])} B\n{item["selected"]["name"]}', ha="center", va="bottom", fontsize=9)
    ax.set(ylabel="真实编码长度 / byte", title="每一字节都计入：头部 + 模型 + 剩余数据", ylim=(0, max(bottom) * 1.24))
    ax.legend(loc="upper left")
    fig.savefig(path / "cost_breakdown.png", dpi=150)
    plt.close(fig)

    metrics = {"toy": "T10", "seed": seed, "codec": "MDL1", "max_candidate_period": MAX_PERIOD,
               "candidate_family": "literal plus one modal pattern per period, deterministic ties",
               "all_examples_roundtrip": all(item["roundtrip"] for item in exact),
               "all_noise_roundtrip": all(item["roundtrip"] for item in noise_records),
               "examples": {item["example"]: {"raw_utf8_bytes": item["raw_utf8_bytes"], **item["selected"]} for item in exact},
               "noise_selected_bytes": [record["selected"]["total_bytes"] for record in noise_records],
               "noise_counts": noise_counts,
               "plots": ["cost_vs_noise.png", "cost_breakdown.png"]}
    return save_result(path, metrics)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", default="outputs/t10")
    parser.add_argument("--seed", type=int, default=42)
    args = parser.parse_args()
    print(json.dumps(demo(args.output_dir, args.seed), ensure_ascii=False, indent=2))
