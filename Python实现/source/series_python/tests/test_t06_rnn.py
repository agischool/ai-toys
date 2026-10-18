"""Numerical and data-integrity tests for the explicit-BPTT toy."""
import unittest
import tempfile
from pathlib import Path

import numpy as np

from toys.common import Adam
from toys.t06_rnn import (TanhRNN, clip_gradients, encode, evaluate,
                          gradient_checks, make_dataset, scalar_example,
                          make_language_dataset, encode_language, language_gradient_checks,
                          evaluate_language, generate_language)


class TestTanhRNN(unittest.TestCase):
    def test_manual_scalar_recurrence(self):
        first, second = scalar_example()
        self.assertAlmostEqual(first, 0.7615941559557649, places=14)
        self.assertAlmostEqual(second, np.tanh(0.5 * first), places=14)
        self.assertAlmostEqual(second, 0.363, places=3)

    def test_every_parameter_finite_difference(self):
        checks = gradient_checks()
        self.assertEqual(set(checks), {"Wxh", "Whh", "bh", "Why", "by"})
        for name, check in checks.items():
            with self.subTest(parameter=name):
                self.assertGreater(check["checked"], 0)
                self.assertLess(check["max_abs_error"], 1e-8)
                self.assertLess(check["max_relative_error"], 1e-5)

    def test_reset_repeatability(self):
        model = TanhRNN(hidden_size=5, seed=9)
        inputs, lengths, _ = encode(["Axyxyxy?", "Byyyyyy?"])
        first, _ = model.forward(inputs, lengths)
        model.forward(inputs[:, ::-1], lengths, h0=np.ones((2, 5)))
        repeated, _ = model.forward(inputs, lengths)
        np.testing.assert_array_equal(first, repeated)
        same_seed = TanhRNN(hidden_size=5, seed=9)
        np.testing.assert_array_equal(first, same_seed.forward(inputs, lengths)[0])

    def test_padding_matches_unpadded_states_and_gradients(self):
        model = TanhRNN(hidden_size=4, seed=3)
        sequences = ["Axyxyxy?", "Bxyxyxyxyxy?"]
        x, lengths, labels = encode(sequences)
        logits, _ = model.forward(x, lengths)
        batch_loss, batch_grads = model.loss_and_grads(x, labels, lengths)
        single_losses, single_grads = [], []
        for i, sequence in enumerate(sequences):
            sx, sl, sy = encode([sequence])
            np.testing.assert_allclose(logits[i], model.forward(sx, sl)[0][0], atol=1e-14)
            loss, grads = model.loss_and_grads(sx, sy, sl)
            single_losses.append(loss)
            single_grads.append(grads)
        self.assertAlmostEqual(batch_loss, np.mean(single_losses), places=14)
        for name, grad in batch_grads.items():
            np.testing.assert_allclose(grad, (single_grads[0][name] + single_grads[1][name]) / 2,
                                       atol=1e-14)

    def test_whole_sequence_split_is_unique_balanced_varied(self):
        train, validation = make_dataset()
        self.assertEqual(len(train + validation), len(set(train + validation)))
        self.assertFalse(set(train) & set(validation))
        for split in (train, validation):
            self.assertEqual({len(s) for s in split}, set(range(8, 17)))
            self.assertEqual(sum(s[0] == "A" for s in split), sum(s[0] == "B" for s in split))
            self.assertTrue(all(s[-1] == "?" and set(s[1:-1]) <= {"x", "y"} for s in split))
        self.assertEqual((train, validation), make_dataset())

    def test_clip_global_norm_preserves_direction_without_mutation(self):
        grads = {"a": np.array([3., 4.]), "b": np.array([12.])}
        clipped, norm, scale = clip_gradients(grads, max_norm=2.)
        self.assertEqual(norm, 13.)
        self.assertAlmostEqual(scale, 2. / 13.)
        self.assertAlmostEqual(np.sqrt(sum(np.sum(g*g) for g in clipped.values())), 2.)
        np.testing.assert_array_equal(grads["a"], [3., 4.])
        for name in grads:
            np.testing.assert_allclose(clipped[name], grads[name] * scale)
        with self.assertRaises(ValueError):
            clip_gradients(grads, 0.)
        with self.assertRaises(FloatingPointError):
            clip_gradients({"bad": np.array([np.inf])})

    def test_float64_parameters_and_state(self):
        model = TanhRNN()
        logits, (_, _, states) = model.forward(np.array([[0, 2, 4]]))
        for value in list(model.params.values()) + [logits] + states:
            self.assertEqual(value.dtype, np.float64)

    def test_training_reduces_loss(self):
        model = TanhRNN(hidden_size=8, seed=6)
        sequences = ["Axyxyxy?", "Byxyxyx?", "Axxxxxx?", "Byyyyyy?"]
        x, lengths, labels = encode(sequences)
        before = evaluate(model, sequences)["loss"]
        optimizer = Adam(model.params, lr=0.02)
        for _ in range(100):
            _, grads = model.loss_and_grads(x, labels, lengths)
            clipped, _, _ = clip_gradients(grads)
            optimizer.step(model.params, clipped)
        after = evaluate(model, sequences)
        self.assertLess(after["loss"], before * 0.2)
        self.assertEqual(after["accuracy"], 1.0)

    def test_saved_reloaded_logits_exact_for_both_objectives(self):
        for output_size in (2, 7):
            model = TanhRNN(vocab_size=7, hidden_size=4, output_size=output_size)
            inputs = np.array([[0, 2, 4], [1, 3, 5]])
            with tempfile.TemporaryDirectory() as tmp:
                path = Path(tmp)/"weights.npz"
                model.save(path)
                restored = TanhRNN.load(path)
                np.testing.assert_array_equal(model.forward(inputs)[0], restored.forward(inputs)[0])
                np.testing.assert_array_equal(model.sequence_forward(inputs)[0],
                                              restored.sequence_forward(inputs)[0])

    def test_next_character_all_parameter_gradients(self):
        checks = language_gradient_checks()
        self.assertEqual(set(checks), {"Wxh", "Whh", "bh", "Why", "by"})
        for name, check in checks.items():
            with self.subTest(parameter=name):
                self.assertLess(check["max_abs_error"], 1e-8)
                self.assertGreater(check["checked"], 0)

    def test_next_character_sequence_split(self):
        train, validation = make_language_dataset()
        self.assertEqual((len(train), len(validation)), (372, 124))
        self.assertFalse(set(train) & set(validation))
        self.assertEqual(len(set(train+validation)), 496)
        for split in (train, validation):
            self.assertEqual({len(s) for s in split}, {8, 10, 12, 14, 16})
            for text in split:
                self.assertEqual(text[-1], ">")
                mode = int(text[0] == "B")
                for i in range(1, len(text)-1, 2):
                    self.assertEqual(text[i+1], str(int(text[i] == "y") ^ mode))

    def test_next_character_padding_has_no_loss_or_gradient(self):
        model = TanhRNN(vocab_size=7, hidden_size=4, output_size=7)
        examples = ["Ax0>", "By0x1>"]
        x, y, lengths = encode_language(examples)
        loss, gradients = model.sequence_loss_and_grads(x, y, lengths)
        losses, individual = [], []
        for text in examples:
            sx, sy, sl = encode_language([text])
            single_loss, single_grad = model.sequence_loss_and_grads(sx, sy, sl)
            losses.append(single_loss)
            individual.append(single_grad)
        weights = lengths / lengths.sum()
        self.assertAlmostEqual(loss, sum(w*l for w,l in zip(weights, losses)), places=14)
        for name in gradients:
            np.testing.assert_allclose(gradients[name],
                sum(w*g[name] for w,g in zip(weights, individual)), atol=1e-14)
        y[0, lengths[0]:] = 6
        changed_loss, changed_gradient = model.sequence_loss_and_grads(x, y, lengths)
        self.assertEqual(loss, changed_loss)
        for name in gradients:
            np.testing.assert_array_equal(gradients[name], changed_gradient[name])

    def test_next_character_training_and_generation_interface(self):
        model = TanhRNN(vocab_size=7, hidden_size=8, output_size=7, seed=4)
        examples = ["Ax0y1>", "By0x1>"]
        x, y, lengths = encode_language(examples)
        before = evaluate_language(model, examples)["loss"]
        opt = Adam(model.params, lr=.02)
        for _ in range(100):
            _, grads = model.sequence_loss_and_grads(x, y, lengths)
            opt.step(model.params, clip_gradients(grads)[0])
        self.assertLess(evaluate_language(model, examples)["loss"], before*.2)
        self.assertEqual(generate_language(model, "A", 5), "Ax0y1>")
        self.assertEqual(generate_language(model, "B", 5), "By0x1>")
        with self.assertRaises(ValueError):
            generate_language(model, "")

    def test_invalid_inputs_fail_clearly(self):
        model = TanhRNN()
        for inputs, lengths in [(np.array([[0]]), [0]), (np.array([[9]]), [1]),
                                (np.array([[0.0]]), [1]), (np.array([[0]]), [1.5])]:
            with self.assertRaises(ValueError):
                model.forward(inputs, lengths)


if __name__ == "__main__":
    unittest.main()
