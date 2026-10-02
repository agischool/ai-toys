import unittest
import numpy as np
from toys.common import gradcheck
from toys.t07_attention import (scaled_dot_product, scaled_dot_product_backward,
                                init_attention, attention_forward, attention_backward)


class AttentionTests(unittest.TestCase):
    def test_manual_average_and_causal(self):
        q = k = np.zeros((1, 2, 3))
        v = np.array([[[2.], [6.]]])
        out, c = scaled_dot_product(q, k, v)
        np.testing.assert_array_equal(c['weights'], np.full((1, 2, 2), .5))
        np.testing.assert_array_equal(out, np.full((1, 2, 1), 4.))
        out, c = scaled_dot_product(q, k, v, np.tril(np.ones((2, 2), dtype=bool)))
        self.assertEqual(out[0, 0, 0], 2.)
        self.assertEqual(out[0, 1, 0], 4.)

    def test_qkv_gradient(self):
        rng = np.random.default_rng(5)
        p = {'q': rng.normal(size=(2, 3, 2)), 'k': rng.normal(size=(2, 4, 2)),
             'v': rng.normal(size=(2, 4, 3))}
        mask = np.ones((3, 4), dtype=bool)
        mask[0, 2:] = False
        out, c = scaled_dot_product(**p, mask=mask)
        upstream = rng.normal(size=out.shape)
        grads = dict(zip(('q', 'k', 'v'), scaled_dot_product_backward(upstream, c)))
        result = gradcheck(lambda: (scaled_dot_product(**p, mask=mask)[0]*upstream).sum(),
                           p, grads, samples=50)
        self.assertLess(result['max_abs_error'], 2e-8)

    def test_projection_and_input_gradients(self):
        rng = np.random.default_rng(10)
        x = rng.normal(size=(2, 4, 3))
        p = init_attention(3, rng)
        out, c = attention_forward(x, p)
        upstream = rng.normal(size=out.shape)
        dx, g = attention_backward(upstream, c, p)
        result = gradcheck(lambda: (attention_forward(x, p)[0]*upstream).sum(),
                           dict(p, input=x), dict(g, input=dx), samples=50)
        self.assertLess(result['max_abs_error'], 2e-8)

    def test_causality_masked_zero_and_row_sum(self):
        rng = np.random.default_rng(12)
        x = rng.normal(size=(2, 5, 4))
        p = init_attention(4, rng)
        out, c = attention_forward(x, p)
        np.testing.assert_allclose(c['weights'].sum(-1), 1, atol=1e-15)
        forbidden = np.broadcast_to(~np.tril(np.ones((5, 5), dtype=bool)), c['weights'].shape)
        np.testing.assert_array_equal(c['weights'][forbidden], 0.)
        x[:, 3:] += 20
        changed, _ = attention_forward(x, p)
        np.testing.assert_array_equal(out[:, :3], changed[:, :3])

    def test_all_masked_rejected(self):
        q = k = v = np.zeros((1, 3, 2))
        with self.assertRaisesRegex(ValueError, 'at least one'):
            scaled_dot_product(q, k, v, np.zeros((3, 3), dtype=bool))
        with self.assertRaisesRegex(ValueError, 'boolean'):
            scaled_dot_product(q, k, v, np.ones((3, 3)))

    def test_large_scores_stable(self):
        q = k = np.full((1, 3, 2), 1e5)
        v = np.arange(6, dtype=float).reshape(1, 3, 2)
        out, c = scaled_dot_product(q, k, v)
        self.assertTrue(np.isfinite(out).all())
        np.testing.assert_allclose(c['weights'].sum(-1), 1.)


if __name__ == '__main__':
    unittest.main()
