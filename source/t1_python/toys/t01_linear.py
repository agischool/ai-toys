"""T1: analytic gradients for a line, with honest extrapolation limits."""
import argparse
import numpy as np
from .common import plt, output_path, save_result, gradcheck


def predict(x, params):
    return params['w']*x + params['b']


def loss_and_grads(x, y, params):
    error = predict(x, params)-y
    return float(np.mean(error**2)), {'w': np.array([2*np.mean(error*x)]),
                                    'b': np.array([2*np.mean(error)])}


def train(x, y, lr=.1, steps=200):
    params = {'w': np.zeros(1), 'b': np.zeros(1)}
    history = []
    for _ in range(steps):
        loss, grads = loss_and_grads(x, y, params)
        history.append(loss)
        for name in params:
            params[name] -= lr*grads[name]
    return params, np.asarray(history)


def truth(x):
    return 1.7*x+.4+.18*x*x


def make_data(seed=42, noise=.08):
    # Independent RNG streams; never split repeated copies of the same points.
    train_rng = np.random.default_rng(seed)
    test_rng = np.random.default_rng(seed+1000)
    x = train_rng.uniform(-1, 1, 32)
    xt = test_rng.uniform(-1, 1, 16)
    return x, truth(x)+train_rng.normal(0, noise, len(x)), xt, truth(xt)+test_rng.normal(0, noise, len(xt))


def demo(output_dir='outputs/t01', seed=42):
    out = output_path(output_dir)
    x, y, xt, yt = make_data(seed)
    params, history = train(x, y)
    check_params = {'w': np.array([.3]), 'b': np.array([-.2])}
    _, grads = loss_and_grads(x, y, check_params)
    check = gradcheck(lambda: loss_and_grads(x,y,check_params)[0], check_params, grads)
    np.savez(out/'parameters.npz', **params)
    with np.load(out/'parameters.npz') as loaded:
        reload_error = float(np.max(abs(predict(xt,params)-predict(xt,loaded))))
    learning_rates = {str(lr): train(x,y,lr,80)[1] for lr in [0., .05, .4, 1.1]}
    noise_results = {}
    for noise in [.02,.08,.25]:
        a,b,c,d = make_data(seed,noise)
        p,_ = train(a,b)
        noise_results[str(noise)] = {'train_mse':loss_and_grads(a,b,p)[0], 'test_mse':loss_and_grads(c,d,p)[0]}
    fig, axes = plt.subplots(1,3,figsize=(14,4),constrained_layout=True)
    grid = np.linspace(-1.1,1.1,150)
    axes[0].scatter(x,y,label='训练点 32',s=24)
    axes[0].scatter(xt,yt,marker='x',label='独立测试点 16')
    axes[0].plot(grid,np.zeros_like(grid),'--',label='更新前')
    axes[0].plot(grid,predict(grid,params),label='更新后')
    axes[0].set(title='直线怎样靠近数据',xlabel='x',ylabel='y'); axes[0].legend(fontsize=8)
    axes[1].semilogy(history); axes[1].set(title='真实训练曲线',xlabel='更新次数',ylabel='均方误差')
    axes[2].scatter(xt,predict(xt,params)-yt); axes[2].axhline(0,color='gray')
    axes[2].set(title='独立测试残差',xlabel='x',ylabel='预测 − 观测')
    fig.savefig(out/'fit_loss_residual.png'); plt.close(fig)
    fig, axes = plt.subplots(1,2,figsize=(10,4),constrained_layout=True)
    for lr, losses in learning_rates.items():
        axes[0].semilogy(losses,label=f'步长 {lr}')
    axes[0].legend(); axes[0].set(title='步长过大也可能越走越远',xlabel='更新次数',ylabel='均方误差')
    wide = np.linspace(-1,3,150)
    axes[1].plot(wide,truth(wide),label='生成数据的真实函数')
    axes[1].plot(wide,predict(wide,params),label='学到的直线')
    axes[1].axvspan(-1,1,alpha=.12,color='green',label='训练范围')
    axes[1].set(title='范围内看似合适，范围外偏差变大',xlabel='x',ylabel='y'); axes[1].legend(fontsize=8)
    fig.savefig(out/'steps_extrapolation.png'); plt.close(fig)
    return save_result(out, {'seed':seed,'train_n':len(x),'test_n':len(xt),'steps':200,'learning_rate':.1,
        'w':float(params['w'][0]),'b':float(params['b'][0]), 'initial_train_mse':float(history[0]),
        'train_mse':loss_and_grads(x,y,params)[0], 'test_mse':loss_and_grads(xt,yt,params)[0],
        'gradient_check':check,'reload_max_abs_error':reload_error,'noise_comparison':noise_results,
        'extrapolation_x':3.,'extrapolation_prediction':float(predict(np.array([3.]),params)[0]),
        'extrapolation_true_noiseless':float(truth(3.)),
        'note':'生成函数包含轻微二次项；训练和测试在[-1,1]，范围外不是同分布评估。'})


if __name__ == '__main__':
    parser=argparse.ArgumentParser(); parser.add_argument('--output',default='outputs/t01'); parser.add_argument('--seed',type=int,default=42)
    args=parser.parse_args(); print(demo(args.output,args.seed))
