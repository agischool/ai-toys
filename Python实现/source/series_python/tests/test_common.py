import unittest
import numpy as np
from toys.common import gradcheck, cross_entropy, softmax


class TestNumericalUtilities(unittest.TestCase):
    def test_gradient_nan_is_rejected(self):
        p={'x':np.array([1.])}
        with self.assertRaises(ValueError):
            gradcheck(lambda:float(p['x'][0]**2),p,{'x':np.array([np.nan])})

    def test_objective_nan_is_rejected_and_parameter_restored(self):
        p={'x':np.array([1.])}
        with self.assertRaises(ValueError):
            gradcheck(lambda:float('nan'),p,{'x':np.array([2.])})
        np.testing.assert_array_equal(p['x'],[1.])

    def test_objective_exception_restores_parameter(self):
        p={'x':np.array([1.])}
        def broken():raise RuntimeError('test failure')
        with self.assertRaises(RuntimeError):gradcheck(broken,p,{'x':np.array([2.])})
        np.testing.assert_array_equal(p['x'],[1.])

    def test_shape_and_steps_rejected(self):
        p={'x':np.array([1.])}
        with self.assertRaises(ValueError):gradcheck(lambda:1.,p,{'x':np.zeros(2)})
        with self.assertRaises(ValueError):gradcheck(lambda:1.,p,{'x':np.zeros(1)},eps=0)

    def test_scalar_quadratic_check(self):
        p={'x':np.array([1.])}
        result=gradcheck(lambda:float(p['x'][0]**2),p,{'x':np.array([2.])})
        self.assertLess(result['max_abs_error'],1e-9)

    def test_extreme_softmax_cross_entropy(self):
        logits=np.array([[1000.,-1000.],[-1000.,1000.]])
        loss,g=cross_entropy(logits,np.array([1,0]))
        self.assertEqual(loss,2000.);self.assertTrue(np.isfinite(g).all())
        np.testing.assert_array_equal(softmax(logits),[[1.,0.],[0.,1.]])

    def test_cross_entropy_rejects_mismatched_label_shape(self):
        logits = np.array([[1., 2.], [3., 4.]])
        for labels in (np.array([1]), np.array([0, 1, 0]), np.array([[0, 1]])):
            with self.subTest(shape=labels.shape), self.assertRaises(ValueError):
                cross_entropy(logits, labels)

    def test_cross_entropy_rejects_invalid_label_type_and_range(self):
        logits = np.array([[1., 2.], [3., 4.]])
        for labels in ([0., 1.], [False, True], [-1, 0], [0, 2]):
            with self.subTest(labels=labels), self.assertRaises(ValueError):
                cross_entropy(logits, labels)

    def test_cross_entropy_rejects_empty_or_scalar_logits(self):
        for logits, labels in ((np.array(1.), np.array(0)),
                               (np.empty((0, 2)), np.array([], dtype=int)),
                               (np.empty((2, 0)), np.array([0, 0]))):
            with self.subTest(shape=logits.shape), self.assertRaises(ValueError):
                cross_entropy(logits, labels)

    def test_cross_entropy_sequence_gradient_matches_loss(self):
        logits = np.random.default_rng(7).normal(size=(2, 3, 4))
        labels = np.array([[0, 1, 2], [3, 0, 1]])
        loss, grads = cross_entropy(logits, labels)
        flat_loss, flat_grads = cross_entropy(logits.reshape(-1, 4), labels.ravel())
        self.assertEqual(loss, flat_loss)
        np.testing.assert_array_equal(grads.reshape(-1, 4), flat_grads)
        report = gradcheck(lambda: cross_entropy(logits, labels)[0],
                           {'logits': logits}, {'logits': grads}, samples=100)
        self.assertLess(report['max_abs_error'], 1e-9)
        np.testing.assert_allclose(grads.sum(axis=-1), 0., atol=1e-15)

    def test_cross_entropy_single_prediction(self):
        loss, grads = cross_entropy(np.array([0., 0.]), np.array(1))
        self.assertAlmostEqual(loss, np.log(2.))
        np.testing.assert_array_equal(grads, [.5, -.5])
