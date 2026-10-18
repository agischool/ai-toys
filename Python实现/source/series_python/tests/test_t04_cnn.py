import tempfile
import unittest
from pathlib import Path
import numpy as np
from toys.common import gradcheck
from toys import t04_cnn as cnn


class TestCNN(unittest.TestCase):
    def test_manual_and_shape(self):
        vertical = np.zeros((3, 3)); vertical[:, 1] = 1
        horizontal = np.zeros((3, 3)); horizontal[1, :] = 1
        result = cnn.correlate2d(np.stack([vertical, horizontal]), vertical[None])
        np.testing.assert_array_equal(result[:, 0, 0, 0], [3, 1])
        self.assertEqual(result.shape, (2, 1, 1, 1))
        self.assertEqual(cnn.correlate2d(np.zeros((2, 8, 8)), np.zeros((6, 3, 3))).shape, (2, 6, 6, 6))
        with self.assertRaises(ValueError):
            cnn.correlate2d(np.zeros((1, 2, 2)), np.zeros((1, 3, 3)))

    def test_not_reversed_and_overlaps_accumulate(self):
        x = np.arange(9, dtype=np.float64).reshape(1, 3, 3)
        weights = np.array([[[1., 2.], [3., 4.]]])
        expected = np.array([[[[27., 37.], [57., 67.]]]])
        np.testing.assert_array_equal(cnn.correlate2d(x, weights), expected)
        dx, _ = cnn.correlate2d_backward(np.ones((1, 3, 3)), np.ones((1, 2, 2)), np.ones((1, 1, 2, 2)))
        np.testing.assert_array_equal(dx, [[[1, 2, 1], [2, 4, 2], [1, 2, 1]]])

    def test_correlation_input_and_filter_gradient(self):
        rng = np.random.default_rng(4)
        x = rng.normal(size=(2, 4, 5))
        weights = rng.normal(size=(3, 2, 3))
        upstream = rng.normal(size=(2, 3, 3, 3))
        dx, dw = cnn.correlate2d_backward(x, weights, upstream)
        result = gradcheck(lambda: np.sum(cnn.correlate2d(x, weights)*upstream),
                           {"x": x, "weights": weights}, {"x": dx, "weights": dw}, samples=100)
        self.assertLess(result["max_abs_error"], 1e-8)

    def test_full_classifier_gradient(self):
        x, labels = cnn.make_data(4, 83)
        params = cnn.initialize(5, n_filters=2)
        _, grads, dx = cnn.loss_and_grad(x, labels, params)
        result = gradcheck(lambda: cnn.loss_and_grad(x, labels, params)[0],
                           {**params, "x": x}, {**grads, "x": dx}, samples=30)
        self.assertLess(result["max_abs_error"], 1e-8)

    def test_data_reproducibility_and_independence(self):
        x, labels = cnn.make_data(seed=9)
        other_x, other_labels = cnn.make_data(seed=9)
        np.testing.assert_array_equal(x, other_x)
        np.testing.assert_array_equal(labels, other_labels)
        self.assertEqual(x.dtype, np.float64)
        self.assertEqual(np.bincount(labels).tolist(), [64, 64])
        self.assertFalse(np.array_equal(x, cnn.make_data(seed=10)[0]))

    def test_save_reload_exact(self):
        params = cnn.initialize(17)
        x, _ = cnn.make_data(4, 18)
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/"parameters.npz"
            cnn.save_model(path, params)
            restored = cnn.load_model(path)
            np.testing.assert_array_equal(cnn.forward(x, params)[0], cnn.forward(x, restored)[0])
            for name in params:
                self.assertEqual(restored[name].dtype, np.float64)

    def test_training_reduces_loss(self):
        from toys.common import Adam
        x, labels = cnn.make_data(32, 20)
        params = cnn.initialize(21)
        start = cnn.evaluate(x, labels, params)["loss"]
        optimizer = Adam(params, lr=.025)
        for _ in range(40):
            _, grads, _ = cnn.loss_and_grad(x, labels, params)
            optimizer.step(params, grads)
        self.assertLess(cnn.evaluate(x, labels, params)["loss"], start*.8)


if __name__ == "__main__":
    unittest.main()
