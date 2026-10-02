import tempfile
import unittest
from pathlib import Path
import numpy as np
from toys import t02_logistic as m
from toys.common import gradcheck


class TestLogistic(unittest.TestCase):
    def test_manual_probabilities(self):
        np.testing.assert_allclose(m.sigmoid(np.array([-1.,1.])),[.26894142137,.73105857863])
        self.assertEqual(float(m.sigmoid(0.)),.5)

    def test_extreme_logits_finite(self):
        x=np.array([[-1000.,0],[1000.,0]]);y=np.array([1.,0]);p={'w':np.array([1.,0]),'b':np.zeros(1)}
        loss,g=m.loss_and_grads(x,y,p)
        self.assertTrue(np.isfinite(loss));self.assertAlmostEqual(loss,1000.)
        for value in g.values():self.assertTrue(np.isfinite(value).all())
        np.testing.assert_array_equal(m.sigmoid(np.array([-1000.,1000.])),[0.,1.])

    def test_gradients(self):
        x,y=m.make_data(7,n=9);p={'w':np.array([.2,-.3]),'b':np.array([.1])}
        _,g=m.loss_and_grads(x,y,p)
        for k in p:self.assertEqual(g[k].shape,p[k].shape)
        c=gradcheck(lambda:m.loss_and_grads(x,y,p)[0],p,g)
        self.assertLess(c['max_abs_error'],1e-8)

    def test_confusion_and_threshold(self):
        y=np.array([0,0,1,1]);p=np.array([.1,.6,.7,.9])
        np.testing.assert_array_equal(m.confusion(y,p,.5),[[1,1],[0,2]])
        np.testing.assert_array_equal(m.confusion(y,p,.8),[[2,0],[1,1]])

    def test_train_independence_reload(self):
        x,y=m.make_data(42);xt,yt=m.make_data(1042,n=120)
        self.assertFalse(np.any(np.all(x[:,None,:]==xt[None,:,:],axis=-1)))
        p,h=m.train(x,y);prob=m.sigmoid(xt@p['w']+p['b'])
        self.assertGreater(np.mean((prob>=.5)==yt),.8);self.assertLess(h[-1],h[0])
        with tempfile.TemporaryDirectory() as d:
            np.savez(Path(d)/'p.npz',**p)
            with np.load(Path(d)/'p.npz') as q:np.testing.assert_array_equal(prob,m.sigmoid(xt@q['w']+q['b']))
