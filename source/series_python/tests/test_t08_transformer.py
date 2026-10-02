import tempfile
import unittest
from pathlib import Path
import numpy as np
from toys.common import gradcheck
from toys.t08_transformer import (TinyTransformer, layer_norm, layer_norm_backward,
                                  copy_dataset, model_gradient_report, encode, decode)


class TransformerTests(unittest.TestCase):
    def test_layernorm_input_gain_bias_gradient(self):
        rng = np.random.default_rng(8)
        p = {'x': rng.normal(size=(2, 3, 4)), 'gain': rng.normal(size=4),
             'bias': rng.normal(size=4)}
        out, c = layer_norm(**p)
        upstream = rng.normal(size=out.shape)
        dx, dg, db = layer_norm_backward(upstream, c)
        report = gradcheck(lambda: (layer_norm(**p)[0]*upstream).sum(), p,
                           dict(x=dx, gain=dg, bias=db), samples=50)
        self.assertLess(report['max_abs_error'], 2e-8)

    def test_fullmodel_every_named_parameter_gradient(self):
        report = model_gradient_report()
        expected = set(TinyTransformer().params)
        self.assertEqual(set(report), expected)
        for name, result in report.items():
            with self.subTest(parameter=name):
                self.assertGreater(result['checked'], 0)
                self.assertLess(result['max_abs_error'], 2e-7)

    def test_shape_finiteness_and_float64(self):
        m = TinyTransformer()
        ids = np.array([[0, 1, 2], [0, 2, 3]])
        logits, c = m.forward(ids)
        self.assertEqual(logits.shape, (2, 3, 8))
        self.assertEqual(logits.dtype, np.float64)
        loss, grads = m.loss_and_grads(ids, ids)
        self.assertTrue(np.isfinite(loss))
        for name, value in m.params.items():
            self.assertEqual(grads[name].shape, value.shape)
            self.assertEqual(value.dtype, np.float64)
            self.assertTrue(np.isfinite(grads[name]).all())

    def test_causal_future_perturbation(self):
        m = TinyTransformer()
        ids = np.array([encode('<abcd|abcd')])
        reference, _ = m.forward(ids)
        changed = ids.copy()
        changed[:, 6:] = (changed[:, 6:] + 2) % 8
        perturbed, _ = m.forward(changed)
        np.testing.assert_array_equal(reference[:, :6], perturbed[:, :6])
        self.assertFalse(np.array_equal(reference[:, 6:], perturbed[:, 6:]))

    def test_exact_save_reload_both_modes(self):
        ids = np.array([encode('<abc')])
        for active in (True, False):
            model = TinyTransformer(use_attention=active)
            with tempfile.TemporaryDirectory() as tmp:
                path = Path(tmp)/'parameters.npz'
                model.save(path)
                restored = TinyTransformer.load(path)
                self.assertEqual(restored.use_attention, active)
                np.testing.assert_array_equal(model.forward(ids)[0], restored.forward(ids)[0])
                for key in model.params:
                    np.testing.assert_array_equal(model.params[key], restored.params[key])

    def test_unique_complete_sequence_split(self):
        train, test = copy_dataset()
        self.assertEqual(train.shape, (400, 11))
        self.assertEqual(test.shape, (100, 11))
        self.assertEqual(len(set(map(tuple, train))), len(train))
        self.assertEqual(len(set(map(tuple, test))), len(test))
        self.assertFalse(set(map(tuple, train)) & set(map(tuple, test)))
        for s in np.concatenate((train, test)):
            text = decode(s)
            self.assertEqual(text[1:5], text[6:10])

    def test_noattention_no_context_access(self):
        m = TinyTransformer(use_attention=False)
        a = np.array([encode('<abcd|')])
        b = np.array([encode('<eeee|')])
        np.testing.assert_array_equal(m.forward(a)[0][:, -1], m.forward(b)[0][:, -1])

    def test_invalid_inputs_rejected(self):
        m = TinyTransformer(max_len=3)
        for ids in (np.zeros((1, 4), dtype=int), np.zeros((1, 3)), np.array([[-1]])):
            with self.assertRaises(ValueError):
                m.forward(ids)


if __name__ == '__main__':
    unittest.main()
