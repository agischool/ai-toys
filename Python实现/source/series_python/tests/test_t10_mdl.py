import random
import unittest

from toys.t10_mdl import (CodecError, MAGIC, candidate_encodings, decode, encode,
                         literal_candidate, select_candidate, _uvarint)


def rule(length, pattern, records=()):
    payload = pattern.encode("utf-8", errors="surrogatepass")
    blob = MAGIC + b"R" + _uvarint(length) + _uvarint(len(payload)) + payload + _uvarint(len(records))
    for index, char in records:
        char_bytes = char.encode("utf-8", errors="surrogatepass")
        blob += _uvarint(index) + _uvarint(len(char_bytes)) + char_bytes
    return blob


class TestMDLCodec(unittest.TestCase):
    def test_edge_cases(self):
        examples = ["", "A", "界", "🌍", "abcdefghijk", "ABABABAB", "ABABABAC",
                    "\x00\n\r\t|:;\\LR1234", "你好，世界🙂\n" * 9, "e\u0301é", "\ud800\udfff",
                    "".join(chr(index) for index in range(256))]
        for text in examples:
            with self.subTest(text=repr(text)):
                self.assertEqual(decode(encode(text)), text)

    def test_many_random_unicode_strings(self):
        rng = random.Random(20261001)
        alphabet = list("ABLR012|:;\\\n\r\t\x00界é") + ["🌱", "🙂", "\u0301", "\ud800", "\udfff"]
        for _ in range(450):
            size = rng.randrange(0, 220)
            if rng.random() < .5:
                text = "".join(rng.choice(alphabet) for _ in range(size))
            else:
                # Sample across all Python code points, including surrogates.
                text = "".join(chr(rng.randrange(0x110000)) for _ in range(size))
            self.assertEqual(decode(encode(text)), text)

    def test_all_candidates_roundtrip_and_accounting(self):
        rng = random.Random(88)
        examples = ["", "A", "AB" * 128, "春🌱\n" * 50]
        examples += ["".join(rng.choice("AB界🙂\n") for _ in range(rng.randrange(1, 90))) for _ in range(80)]
        for text in examples:
            candidates = candidate_encodings(text)
            self.assertEqual(len(candidates), 1 + min(16, len(text)))
            for candidate in candidates:
                self.assertEqual(decode(candidate.blob), text)
                self.assertEqual(candidate.total_bytes, candidate.header_bytes + candidate.model_bytes + candidate.residual_bytes)

    def test_minimum_candidate_and_literal_baseline(self):
        for text in ["", "AB" * 128, "A" * 1000, "distinct!", "春🌱" * 72, "ABABABAC"]:
            candidates = candidate_encodings(text)
            result = encode(text)
            self.assertEqual(len(result), min(map(lambda c: c.total_bytes, candidates)))
            self.assertLessEqual(len(result), literal_candidate(text).total_bytes)
            self.assertEqual(result, min(candidates, key=lambda c: c.total_bytes).blob)

    def test_known_lengths_include_headers(self):
        self.assertEqual(len(encode("")), 6)
        self.assertEqual(literal_candidate("ABABABAB").total_bytes, 14)
        self.assertEqual(len(encode("ABABABAB")), 10)
        self.assertEqual(len(encode("AB" * 128)), 11)
        unicode = literal_candidate("界🌱")
        self.assertEqual(unicode.residual_bytes, 7)
        self.assertEqual(unicode.total_bytes, 13)

    def test_repeat_exceptions_and_nondivisible_lengths(self):
        self.assertEqual(decode(rule(7, "AB")), "ABABABA")
        self.assertEqual(decode(rule(8, "AB", [(7, "C")])), "ABABABAC")
        self.assertEqual(decode(rule(5, "界🌱", [(1, "\n"), (4, "🙂")])), "界\n界🌱🙂")

    def test_deterministic_modal_ties(self):
        for text in ["BA", "界🌱界🌱", "AB" * 200, "\n|\\\x00"]:
            self.assertEqual(encode(text), encode(text))
        candidate = candidate_encodings("BA")[1]
        # p=1 selects A rather than B when character frequencies tie.
        self.assertEqual(candidate.blob, rule(2, "A", [(0, "B")]))
        # Literal and p=1 both cost 9 bytes, so the literal wins the tie.
        self.assertEqual(encode("AAA"), literal_candidate("AAA").blob)

    def test_all_truncations_are_invalid(self):
        for blob in [literal_candidate("中文\n").blob, rule(12, "AB", [(4, "界"), (11, "🙂")])]:
            for end in range(len(blob)):
                with self.subTest(end=end), self.assertRaises(CodecError):
                    decode(blob[:end])

    def test_invalid_streams(self):
        invalid = [b"", b"WRONG", MAGIC + b"Q", MAGIC + b"L\x80\x00",
                   MAGIC + b"L" + b"\x80" * 9 + b"\x00",
                   MAGIC + b"L\x01\xff", MAGIC + b"L\x02\xc0\x80",
                   encode("abc") + b"extra", rule(0, "A"), rule(3, ""), rule(1, "AB"),
                   rule(20, "abcdefghijklmnopq"), rule(3, "A", [(3, "B")]),
                   rule(3, "A", [(1, "B"), (1, "C")]), rule(3, "A", [(2, "B"), (1, "C")]),
                   rule(3, "A", [(1, "")]), rule(3, "A", [(1, "BC")]), rule(3, "A", [(1, "A")]),
                   MAGIC + b"R\x01\x01A\x02"]
        for blob in invalid:
            with self.subTest(blob=blob), self.assertRaises(CodecError):
                decode(blob)

    def test_optional_expansion_limit(self):
        blob = encode("AB" * 100)
        with self.assertRaises(CodecError):
            decode(blob, max_output_chars=199)
        self.assertEqual(decode(blob, max_output_chars=200), "AB" * 100)
        with self.assertRaises(CodecError):
            decode(literal_candidate("abc").blob, max_output_chars=2)
        self.assertEqual(decode(encode(""), max_output_chars=0), "")

    def test_types(self):
        with self.assertRaises(TypeError):
            encode(b"abc")
        with self.assertRaises(TypeError):
            decode("abc")
        with self.assertRaises(ValueError):
            decode(encode("abc"), max_output_chars=-1)


if __name__ == "__main__":
    unittest.main()
