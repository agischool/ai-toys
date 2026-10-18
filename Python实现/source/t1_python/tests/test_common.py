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
