"""T1 sample chapter v1: deterministic data fixtures and browser reference results.

The original toys/t01_linear.py is preserved. This extension adds selectable
sample counts only. NumPy RNG is run here, never emulated by browser randomness.
"""
import argparse
import json
from pathlib import Path
import numpy as np
from toys.t01_linear import truth, loss_and_grads, make_data, train

SEEDS = (7, 42, 2026)
COUNTS = (8, 16, 32, 64, 128)
MAX_STEPS = 200
STOP_MSE = 1e8


def make_extended_data(seed=42, noise=.08, n=32):
    if seed not in SEEDS or n not in COUNTS or not np.isfinite(noise) or not 0 <= noise <= .4:
        raise ValueError('Unsupported sample settings')
    rng = np.random.default_rng(seed)
    test_rng = np.random.default_rng(seed + 1000)
    x = rng.uniform(-1, 1, n)
    xt = test_rng.uniform(-1, 1, 16)
    return x, truth(x) + rng.normal(0, noise, n), xt, truth(xt) + test_rng.normal(0, noise, 16)


def reference_run(x, y, xt, yt, lr=.1, steps=MAX_STEPS):
    if not np.isfinite(lr) or not 0 <= lr <= 1.2 or not isinstance(steps, int) or not 0 <= steps <= MAX_STEPS:
        raise ValueError('Invalid training settings')
    p = {'w': np.zeros(1), 'b': np.zeros(1)}
    history = [loss_and_grads(x, y, p)[0]]
    reason = 'complete'
    for _ in range(steps):
        _, g = loss_and_grads(x, y, p)
        candidate = {name: p[name] - lr*g[name] for name in p}
        mse = loss_and_grads(x, y, candidate)[0]
        if not np.isfinite(mse):
            reason = 'nonfinite'; break
        p = candidate
        history.append(mse)
        if mse > STOP_MSE:
            reason = 'diverged'; break
    return {'w':float(p['w'][0]), 'b':float(p['b'][0]), 'steps':len(history)-1,
            'train_mse':history[-1], 'test_mse':loss_and_grads(xt, yt, p)[0],
            'initial_mse':history[0], 'reason':reason}


def build_fixtures():
    datasets = {}
    references = []
    for seed in SEEDS:
        tests = np.random.default_rng(seed+1000)
        xt = tests.uniform(-1, 1, 16)
        zt = tests.normal(0, 1, 16)
        rows = {}
        for n in COUNTS:
            rng = np.random.default_rng(seed)
            x = rng.uniform(-1, 1, n)
            z = rng.normal(0, 1, n)
            rows[str(n)] = {'x':x.tolist(), 'z':z.tolist()}
            for lr in (0, .01, .1, .4, 1.1, 1.2):
                for noise in (0, .08, .4):
                    result = reference_run(x,truth(x)+noise*z,xt,truth(xt)+noise*zt,lr)
                    references.append({'seed':seed, 'n':n, 'noise':noise, 'lr':lr, **result})
        datasets[str(seed)] = {'train':rows, 'test':{'x':xt.tolist(), 'z':zt.tolist()}}
    return {'version':'t1-sample-v1', 'seeds':SEEDS, 'counts':COUNTS, 'datasets':datasets, 'references':references}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--fixtures', type=Path, help='Write deterministic JSON fixtures')
    parser.add_argument('--seed',type=int,default=42)
    parser.add_argument('--noise',type=float,default=.08)
    parser.add_argument('--samples',type=int,default=32)
    parser.add_argument('--lr',type=float,default=.1)
    args = parser.parse_args()
    if args.fixtures:
        args.fixtures.write_text(json.dumps(build_fixtures(),ensure_ascii=False,separators=(',',':'))+'\n',encoding='utf-8')
    else:
        arrays = make_extended_data(args.seed,args.noise,args.samples)
        print(json.dumps(reference_run(*arrays,args.lr),indent=2))
