import unittest
import numpy as np
from sample_v1 import make_extended_data, build_fixtures, reference_run
from toys.t01_linear import make_data, train, loss_and_grads

class SampleV1Tests(unittest.TestCase):
    def test_default_data_exactly_matches_original(self):
        for a,b in zip(make_extended_data(),make_data()):
            np.testing.assert_array_equal(a,b)

    def test_default_final_parameters_match_original(self):
        x,y,xt,yt = make_data()
        p,_ = train(x,y)
        r = reference_run(x,y,xt,yt)
        self.assertEqual(r['steps'],200)
        self.assertEqual(r['w'],float(p['w'][0]))
        self.assertEqual(r['b'],float(p['b'][0]))
        self.assertAlmostEqual(r['train_mse'],loss_and_grads(x,y,p)[0],places=14)

    def test_fixture_reproducibility_and_independence(self):
        a = build_fixtures(); b = build_fixtures()
        self.assertEqual(a,b)
        for group in a['datasets'].values():
            for train_group in group['train'].values():
                self.assertFalse(set(train_group['x']) & set(group['test']['x']))

    def test_zero_rate_and_guard(self):
        arrays = make_data()
        r = reference_run(*arrays,lr=0)
        self.assertEqual((r['w'],r['b']),(0,0))
        r = reference_run(*arrays,lr=1.2)
        self.assertEqual(r['reason'],'diverged')
        self.assertLess(r['steps'],200)

    def test_invalid_inputs(self):
        for kwargs in ({'n':9},{'noise':float('nan')},{'noise':-.1},{'seed':2}):
            with self.assertRaises(ValueError): make_extended_data(**kwargs)
        for kwargs in ({'lr':float('nan')},{'lr':-1},{'steps':201}):
            with self.assertRaises(ValueError): reference_run(*make_data(),**kwargs)

if __name__ == '__main__': unittest.main()
