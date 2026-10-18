import tempfile
import unittest
from pathlib import Path
import numpy as np
from toys import t01_linear as m
from toys.common import gradcheck


class TestLinear(unittest.TestCase):
    def test_manual_example(self):
        p={'w':np.array([1.]),'b':np.array([0.])}
        loss,g=m.loss_and_grads(np.array([2.]),np.array([5.]),p)
        self.assertEqual(loss,9.); self.assertEqual(g['w'][0],-12.);self.assertEqual(g['b'][0],-6.)
        for k in p:p[k]-=.1*g[k]
        np.testing.assert_allclose(m.predict(np.array([2.]),p),[5.])

    def test_gradient_shapes_finite(self):
        x,y,*_=m.make_data(21);p={'w':np.array([.3]),'b':np.array([-.2])}
        _,g=m.loss_and_grads(x,y,p)
        for k in p:self.assertEqual(p[k].shape,g[k].shape);self.assertTrue(np.isfinite(g[k]).all())
        c=gradcheck(lambda:m.loss_and_grads(x,y,p)[0],p,g)
        self.assertLess(c['max_abs_error'],1e-8)

    def test_zero_learning_rate(self):
        x,y,*_=m.make_data();p,h=m.train(x,y,lr=0)
        for value in p.values():np.testing.assert_array_equal(value,0.)
        np.testing.assert_array_equal(h,np.full(len(h),h[0]))

    def test_independent_reproducible_data(self):
        a=m.make_data(42);b=m.make_data(42)
        for x,y in zip(a,b):np.testing.assert_array_equal(x,y)
        self.assertEqual(np.intersect1d(a[0],a[2]).size,0)

    def test_train_and_serialization(self):
        x,y,xt,yt=m.make_data();p,h=m.train(x,y)
        self.assertLess(m.loss_and_grads(xt,yt,p)[0],.04)
        self.assertLess(h[-1],h[0]/10)
        with tempfile.TemporaryDirectory() as d:
            np.savez(Path(d)/'p.npz',**p)
            with np.load(Path(d)/'p.npz') as q:np.testing.assert_array_equal(m.predict(xt,p),m.predict(xt,q))
