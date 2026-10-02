import tempfile
import unittest
from pathlib import Path
import numpy as np
from toys.common import gradcheck
from toys import t05_residual as residual


class TestResidual(unittest.TestCase):
    def test_manual_linear_branch(self):
        x, a = 2., .5
        self.assertEqual(x+a*x, 3.)
        eps = 1e-5
        numeric = ((x+eps)+a*(x+eps)-((x-eps)+a*(x-eps)))/(2*eps)
        self.assertAlmostEqual(numeric, 1+a, places=9)

    def test_zero_branch_identity_and_gradient(self):
        params = residual.initialize(7)
        for i in range(3):
            params[f"w2_{i}"][:] = 0
            params[f"b2_{i}"][:] = 0
        rng = np.random.default_rng(8)
        x, upstream = rng.normal(size=(4, 8)), rng.normal(size=(4, 8))
        y, cache = residual.forward(x, params)
        _, dx, norms = residual.backward(upstream, params, cache)
        np.testing.assert_array_equal(x, y)
        np.testing.assert_array_equal(upstream, dx)
        np.testing.assert_array_equal(norms, [np.linalg.norm(upstream)]*4)

    def test_equal_parameter_count_and_shapes(self):
        params = residual.initialize()
        self.assertEqual(sum(v.size for v in params.values()), 432)
        for mode in (True, False):
            x = np.zeros((5, 8))
            output, cache = residual.forward(x, params, mode)
            grads, dx, norms = residual.backward(np.ones_like(output), params, cache, mode)
            self.assertEqual(output.shape, x.shape)
            self.assertEqual(dx.shape, x.shape)
            self.assertEqual(set(grads), set(params))
            self.assertEqual(len(norms), 4)

    def test_full_gradient_both_paths(self):
        for mode in (True, False):
            with self.subTest(residual=mode):
                rng = np.random.default_rng(9)
                x, target = rng.normal(size=(3, 3)), rng.normal(size=(3, 3))
                params = residual.initialize(10, width=3, blocks=2)
                _, grads, dx, _ = residual.loss_and_grad(x, target, params, mode)
                result = gradcheck(lambda: residual.loss_and_grad(x, target, params, mode)[0],
                                   {**params, "x": x}, {**grads, "x": dx}, samples=100)
                self.assertLess(result["max_abs_error"], 1e-8)

    def test_save_reload_both_modes_exact(self):
        params = residual.initialize(11)
        x = np.random.default_rng(12).normal(size=(3, 8))
        for mode in (True, False):
            with tempfile.TemporaryDirectory() as tmp:
                path = Path(tmp)/"model.npz"
                residual.save_model(path, params, mode)
                loaded, loaded_mode = residual.load_model(path)
                self.assertEqual(loaded_mode, mode)
                np.testing.assert_array_equal(residual.forward(x, params, mode)[0], residual.forward(x, loaded, loaded_mode)[0])

    def test_paired_initialization_and_train_improves(self):
        x, y, test_x, test_y = residual.make_data()
        self.assertEqual(x.shape, (96, 8))
        self.assertEqual(test_x.shape, (128, 8))
        for mode in (True, False):
            _, history = residual.train(x, y, seed=42, residual=mode, epochs=40)
            self.assertLess(history["loss"][-1], history["loss"][0])
            self.assertTrue(np.isfinite(history["parameter_grad_norm"]).all())
        p1, p2 = residual.initialize(42), residual.initialize(42)
        for name in p1:
            np.testing.assert_array_equal(p1[name], p2[name])


if __name__ == "__main__":
    unittest.main()
