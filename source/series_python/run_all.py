"""Run the examples; every metric is computed, never a hard-coded target."""
import argparse
import importlib
import json
import os
from pathlib import Path
import platform
import time

os.environ.setdefault('OPENBLAS_NUM_THREADS','1')
os.environ.setdefault('OMP_NUM_THREADS','1')
os.environ.setdefault('MPLCONFIGDIR','/tmp/ai-toy-matplotlib')

MODULES = {
    't01':'t01_linear','t02':'t02_logistic','t03':'t03_mlp','t04':'t04_cnn',
    't05':'t05_residual','t06':'t06_rnn','t07':'t07_attention',
    't08':'t08_transformer','t09':'t09_memory','t10':'t10_mdl',
}


def main():
    parser=argparse.ArgumentParser(description='运行十个 AI 机制演示')
    parser.add_argument('--only',nargs='+',choices=MODULES,default=list(MODULES))
    parser.add_argument('--seed',type=int,default=42)
    parser.add_argument('--output',default='outputs')
    args=parser.parse_args()
    import numpy as np
    import matplotlib
    root=Path(args.output);root.mkdir(parents=True,exist_ok=True)
    report={'environment':{'python':platform.python_version(),'numpy':np.__version__,
            'matplotlib':matplotlib.__version__,'platform':platform.platform()},'seed':args.seed,'examples':{}}
    for key in args.only:
        print(f'Running {key}...',flush=True)
        start=time.perf_counter()
        module=importlib.import_module('toys.'+MODULES[key])
        report['examples'][key]={'seconds':time.perf_counter()-start,'metrics':module.demo(root/key,seed=args.seed)}
        report['examples'][key]['seconds']=time.perf_counter()-start
        print(f'{key}: complete ({report["examples"][key]["seconds"]:.2f}s)',flush=True)
    destination=root/'run_report.json'
    destination.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    print(f'Saved {destination}')


if __name__=='__main__':main()
