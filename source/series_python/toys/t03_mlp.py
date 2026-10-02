"""T3: 2→4→1 multilayer perceptron with explicit chain-rule gradients."""
import argparse
import numpy as np
from .common import plt, output_path, save_result, gradcheck, Adam
from .t02_logistic import sigmoid


def initialize(seed=42):
    rng=np.random.default_rng(seed)
    return {'W1':rng.normal(0,.35,(2,4)), 'b1':np.zeros(4), 'W2':rng.normal(0,.25,(4,1)), 'b2':np.zeros(1)}


def forward(x,params,nonlinear=True):
    a=x@params['W1']+params['b1']
    h=np.tanh(a) if nonlinear else a
    z=(h@params['W2']+params['b2']).reshape(-1)
    return z,(x,h)


def loss_and_grads(x,y,params,nonlinear=True):
    z,(x,h)=forward(x,params,nonlinear)
    loss=np.mean(np.logaddexp(0.,z)-y*z)
    dz=((sigmoid(z)-y)/len(y))[:,None]
    dh=dz@params['W2'].T
    da=dh*(1-h*h) if nonlinear else dh
    grads={'W1':x.T@da,'b1':da.sum(axis=0),'W2':h.T@dz,'b2':dz.sum(axis=0)}
    return float(loss),grads


def make_data(seed,n=128,noise=.22):
    rng=np.random.default_rng(seed)
    bits=rng.integers(0,2,(n,2));x=2.*bits-1.+rng.normal(0,noise,(n,2))
    y=(bits[:,0]!=bits[:,1]).astype(float)
    return x,y


def train(x,y,xv,yv,seed=42,steps=1200,nonlinear=True,init_scale=1.):
    p=initialize(seed)
    p['W1']*=init_scale; p['W2']*=init_scale
    opt=Adam(p,lr=.03);history=[]
    for step in range(steps):
        loss,g=loss_and_grads(x,y,p,nonlinear);opt.step(p,g)
        if step%10==0 or step==steps-1:
            history.append([step,loss,loss_and_grads(xv,yv,p,nonlinear)[0]])
    return p,np.asarray(history)


def demo(output_dir='outputs/t03',seed=42):
    out=output_path(output_dir)
    x,y=make_data(seed);xv,yv=make_data(seed+1000);xt,yt=make_data(seed+2000)
    p,h=train(x,y,xv,yv,seed);linear,lh=train(x,y,xv,yv,seed,nonlinear=False)
    check_params=initialize(seed+7);_,g=loss_and_grads(x[:5],y[:5],check_params)
    check=gradcheck(lambda:loss_and_grads(x[:5],y[:5],check_params)[0],check_params,g,samples=100)
    corners=np.array([[-1.,-1],[-1,1],[1,-1],[1,1]]); labels=np.array([0.,1,1,0])
    exact,eh=train(corners,labels,corners,labels,seed)
    probs=sigmoid(forward(xt,p)[0]);np.savez(out/'parameters.npz',**p)
    with np.load(out/'parameters.npz') as q:reload_error=float(np.max(abs(probs-sigmoid(forward(xt,q)[0]))))
    fig,axs=plt.subplots(1,3,figsize=(14,4),constrained_layout=True)
    gx,gy=np.meshgrid(np.linspace(-2,2,150),np.linspace(-2,2,150));xx=np.c_[gx.ravel(),gy.ravel()]
    for ax,params,nonlinear,title in [(axs[0],p,True,'tanh：弯曲的分界'),(axs[1],linear,False,'去掉非线性：仍然只是直线')]:
        pp=sigmoid(forward(xx,params,nonlinear)[0]).reshape(gx.shape)
        ax.contourf(gx,gy,pp,levels=np.linspace(0,1,21),cmap='coolwarm',alpha=.6)
        ax.scatter(xt[:,0],xt[:,1],c=yt,cmap='coolwarm',edgecolors='black',s=15)
        wrong=(sigmoid(forward(xt,params,nonlinear)[0])>=.5)!=yt
        ax.scatter(xt[wrong,0],xt[wrong,1],facecolors='none',edgecolors='gold',s=70)
        ax.set(title=title,xlabel='x1',ylabel='x2')
    axs[2].semilogy(h[:,0],h[:,1],label='训练');axs[2].semilogy(h[:,0],h[:,2],label='验证')
    axs[2].semilogy(lh[:,0],lh[:,2],label='线性版验证',linestyle='--');axs[2].legend()
    axs[2].set(title='曲线来自本次真实运行',xlabel='更新次数',ylabel='二元交叉熵')
    fig.savefig(out/'nonlinearity_and_loss.png');plt.close(fig)
    fig,ax=plt.subplots(figsize=(10,3),constrained_layout=True);ax.axis('off')
    for pos,txt in [(0.1,'输入 x=2'),(.35,'权重 w=3\nz=xw=6'),(.63,'目标 t=4\nL=(z−t)²=4'),(.90,'更新 w=2.2\nL=0.16')]:
        ax.text(pos,.65,txt,ha='center',va='center',bbox=dict(boxstyle='round,pad=.5',facecolor='#e4f0ff'),transform=ax.transAxes)
    for a,b in [(.17,.27),(.43,.54),(.74,.82)]:ax.annotate('',xy=(b,.65),xytext=(a,.65),xycoords='axes fraction',arrowprops=dict(arrowstyle='->'))
    ax.text(.5,.15,'反向：∂L/∂z = 4 → ∂z/∂w = 2 → ∂L/∂w = 8；步长 0.1',ha='center',transform=ax.transAxes)
    fig.savefig(out/'chain_rule.png');plt.close(fig)
    # Intentionally difficult distribution shift: noisy points may cross clusters.
    xs,ys=make_data(seed+3000,n=128,noise=.9)
    shift_probs=sigmoid(forward(xs,p)[0]);wrong=np.where((shift_probs>=.5)!=ys)[0]
    larger_init,_=train(x,y,xv,yv,seed,init_scale=2.)
    fig,ax=plt.subplots(figsize=(6,4),constrained_layout=True)
    pp=sigmoid(forward(xx,p)[0]).reshape(gx.shape)
    ax.contourf(gx,gy,pp,levels=np.linspace(0,1,21),cmap='coolwarm',alpha=.6)
    ax.scatter(xs[:,0],xs[:,1],c=ys,cmap='coolwarm',edgecolors='black',s=18)
    ax.scatter(xs[wrong,0],xs[wrong,1],facecolors='none',edgecolors='gold',s=80,label='误判')
    ax.set(title='增大噪声后的失败点：金色圈',xlabel='x1',ylabel='x2');ax.legend()
    fig.savefig(out/'shifted_noise_failures.png');plt.close(fig)
    return save_result(out,{'seed':seed,'architecture':[2,4,1],'parameter_count':sum(v.size for v in p.values()),'train_n':128,'validation_n':128,'test_n':128,
        'steps':1200,'learning_rate':.03,'train_loss':loss_and_grads(x,y,p)[0],'validation_loss':loss_and_grads(xv,yv,p)[0],
        'test_loss':loss_and_grads(xt,yt,p)[0],'test_accuracy':float(np.mean((probs>=.5)==yt)),
        'linear_ablation_test_accuracy':float(np.mean((sigmoid(forward(xt,linear,False)[0])>=.5)==yt)),
        'larger_initialization_train_loss':loss_and_grads(x,y,larger_init)[0],
        'larger_initialization_test_accuracy':float(np.mean((sigmoid(forward(xt,larger_init)[0])>=.5)==yt)),
        'exact_four_xor_probabilities':sigmoid(forward(corners,exact)[0]).tolist(),
        'shifted_noise_test_accuracy':float(np.mean((shift_probs>=.5)==ys)),
        'shifted_noise_failure_examples':[{'x':xs[i].tolist(),'true':int(ys[i]),'probability':float(shift_probs[i])} for i in wrong[:4]],
        'gradient_check':check,'reload_max_abs_error':reload_error})


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',default='outputs/t03');p.add_argument('--seed',type=int,default=42)
    a=p.parse_args();print(demo(a.output,a.seed))
