import json
from pathlib import Path
import tempfile
import unittest

import numpy as np

from toys.t09_memory import ExternalMemory, content_address, erase_add, weighted_read


class TestExternalMemory(unittest.TestCase):
    def test_manual_read(self):
        np.testing.assert_array_equal(weighted_read(np.eye(2), [.25, .75]), [.25, .75])

    def test_manual_overwrite(self):
        np.testing.assert_array_equal(erase_add(np.eye(2), [0, 1], [1, 1], [2, 3]), [[1, 0], [2, 3]])

    def test_one_hot_read(self):
        matrix = np.arange(18).reshape(6, 3)
        for slot in range(6):
            np.testing.assert_array_equal(weighted_read(matrix, np.eye(6)[slot]), matrix[slot])

    def test_erasing_to_zero(self):
        matrix = np.arange(12).reshape(4, 3)
        result = erase_add(matrix, [0, 1, 0, 0], np.ones(3), np.zeros(3))
        np.testing.assert_array_equal(result[1], np.zeros(3))
        np.testing.assert_array_equal(result[[0, 2, 3]], matrix[[0, 2, 3]])

    def test_identity_noops(self):
        matrix = np.arange(12).reshape(4, 3)
        np.testing.assert_array_equal(erase_add(matrix, np.zeros(4), np.ones(3), np.ones(3)), matrix)
        np.testing.assert_array_equal(erase_add(matrix, [.1, .2, .3, .4], np.zeros(3), np.zeros(3)), matrix)

    def test_untouched_zero_slots(self):
        result = erase_add(np.zeros((6, 3)), [0, 0, 1, 0, 0, 0], np.ones(3), [2, 3, 4])
        np.testing.assert_array_equal(result[[0, 1, 3, 4, 5]], np.zeros((5, 3)))

    def test_zero_norms_and_zero_weights_are_finite(self):
        for matrix, key in [(np.zeros((6, 3)), [1, 2, 3]), (np.eye(3), np.zeros(3))]:
            result = content_address(matrix, key)
            self.assertTrue(np.isfinite(result).all())
            np.testing.assert_allclose(result, np.full(len(matrix), 1 / len(matrix)))
        np.testing.assert_array_equal(weighted_read(np.ones((6, 3)), np.zeros(6)), np.zeros(3))

    def test_beta_zero_and_large_finite_inputs(self):
        np.testing.assert_allclose(content_address(np.eye(3), [1, 0, 0], beta=0), np.ones(3) / 3)
        result = content_address([[1e308, 1e308], [-1e308, -1e308], [0, 0]], [1e308, 1e308], beta=1e308)
        self.assertTrue(np.isfinite(result).all())
        self.assertEqual(float(result.sum()), 1.)
        self.assertEqual(result.argmax(), 0)

    def test_content_address_prefers_matching_slot(self):
        result = content_address(np.eye(3), [0, 1, 0])
        self.assertEqual(result.argmax(), 1)
        self.assertAlmostEqual(result.sum(), 1.)

    def test_soft_write_is_exact_formula_and_not_in_place(self):
        matrix = np.array([[1., 2.], [3., 4.]])
        original = matrix.copy()
        result = erase_add(matrix, [.25, .75], [.5, 1], [2, -1])
        expected = matrix * (1 - np.array([.25, .75])[:, None] * [.5, 1]) + np.array([.25, .75])[:, None] * [2, -1]
        np.testing.assert_array_equal(result, expected)
        np.testing.assert_array_equal(matrix, original)

    def test_serialization(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / "state.json"
            memory = ExternalMemory(matrix=[[0, -1, 2.5], [3, 4, 5]])
            memory.save(path)
            restored = ExternalMemory.load(path)
            np.testing.assert_array_equal(restored.matrix, memory.matrix)
            restored.matrix[0, 0] = 9
            self.assertEqual(memory.matrix[0, 0], 0)
            path.write_text(json.dumps({"format": "unknown", "matrix": [[1]]}))
            with self.assertRaises(ValueError):
                ExternalMemory.load(path)

    def test_invalid_inputs(self):
        operations = [
            lambda: content_address([[0, float("nan")]], [0, 1]),
            lambda: content_address(np.eye(2), [1]),
            lambda: content_address(np.eye(2), [1, 0], beta=-1),
            lambda: weighted_read(np.eye(2), [-.1, .5]),
            lambda: weighted_read(np.eye(2), [1, 1]),
            lambda: erase_add(np.eye(2), [1, 0], [1.1, 0], [0, 0]),
            lambda: erase_add(np.eye(2), [1, 0], [0, 0], [float("inf"), 0]),
        ]
        for operation in operations:
            with self.subTest(operation=operation), self.assertRaises(ValueError):
                operation()


if __name__ == "__main__":
    unittest.main()
