import tempfile
import unittest
from pathlib import Path
import numpy as np
from toys import t03_mlp as m
from toys.common import gradcheck
from toys.t02_logistic import sigmoid


class TestMLP(unittest.TestCase):
    def test_manual_chain_rule(self):
        x,w,t=2.,3.,4.;z=x*w
        self.assertEqual((z-t)**2,4.);g=2*(z-t)*x
        self.assertEqual(g,8.);self.assertAlmostEqual(((w-.1*g)*x-t)**2,.16)

    def test_all_parameter_gradients(self):
        x,y=m.make_data(7,n=7);p=m.initialize(17);_,g=m.loss_and_grads(x,y,p)
        for k in p:self.assertEqual(p[k].shape,g[k].shape);self.assertTrue(np.isfinite(g[k]).all())
        c=gradcheck(lambda:m.loss_and_grads(x,y,p)[0],p,g,samples=100)
        self.assertEqual(c['checked'],17);self.assertLess(c['max_abs_error'],1e-8)

    def test_linear_ablation_gradients(self):
        x,y=m.make_data(7,n=5);p=m.initialize(17);_,g=m.loss_and_grads(x,y,p,False)
        c=gradcheck(lambda:m.loss_and_grads(x,y,p,False)[0],p,g,samples=100)
        self.assertLess(c['max_abs_error'],1e-8)

    def test_data_independent_reproducible(self):
        sets=[m.make_data(s)[0] for s in [42,1042,2042]]
        for i in range(3):
            for j in range(i):self.assertFalse(np.any(np.all(sets[i][:,None,:]==sets[j][None,:,:],axis=-1)))
        np.testing.assert_array_equal(sets[0],m.make_data(42)[0])

    def test_xor_and_saved_reload(self):
        x=np.array([[-1.,-1],[-1,1],[1,-1],[1,1]]);y=np.array([0.,1,1,0])
        p,h=m.train(x,y,x,y,steps=800);pred=sigmoid(m.forward(x,p)[0])
        np.testing.assert_array_equal(pred>=.5,y.astype(bool));self.assertLess(h[-1,1],.01)
        with tempfile.TemporaryDirectory() as d:
            np.savez(Path(d)/'p.npz',**p)
            with np.load(Path(d)/'p.npz') as q:np.testing.assert_array_equal(m.forward(x,p)[0],m.forward(x,q)[0])

    def test_seed_repeatability(self):
        x,y=m.make_data(11,n=20)
        p,a=m.train(x,y,x,y,seed=77,steps=12);q,b=m.train(x,y,x,y,seed=77,steps=12)
        np.testing.assert_array_equal(a,b)
        for k in p:np.testing.assert_array_equal(p[k],q[k])
