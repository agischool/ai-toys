"""T2: stable sigmoid, binary cross entropy and hand-written gradients."""
import argparse
import numpy as np
from .common import plt, output_path, save_result, gradcheck


def sigmoid(z):
    z=np.asarray(z,dtype=np.float64)
    return np.exp(-np.logaddexp(0.,-z))


def loss_and_grads(x,y,params):
    z=x@params['w']+params['b']
    loss=np.mean(np.logaddexp(0.,z)-y*z)
    dz=(sigmoid(z)-y)/len(y)
    return float(loss),{'w':x.T@dz,'b':np.array([dz.sum()])}


def make_data(seed,n=160,overlap=.8,positive_fraction=.5):
    rng=np.random.default_rng(seed)
    y=(rng.random(n)<positive_fraction).astype(float)
    x=rng.normal(0,overlap,(n,2))+(2*y-1)[:,None]*np.array([.9,.55])
    return x,y


def train(x,y,steps=500,lr=.15):
    params={'w':np.zeros(x.shape[1]),'b':np.zeros(1)}; history=[]
    for _ in range(steps):
        loss,grads=loss_and_grads(x,y,params); history.append(loss)
        for k in params: params[k]-=lr*grads[k]
    return params,np.array(history)


def confusion(y,prob,threshold=.5):
    # Rows true class, columns predicted class.
    return np.bincount(2*y.astype(int)+(prob>=threshold).astype(int),minlength=4).reshape(2,2)


def demo(output_dir='outputs/t02',seed=42):
    out=output_path(output_dir)
    x,y=make_data(seed); xt,yt=make_data(seed+1000,n=120)
    params,history=train(x,y); prob=sigmoid(xt@params['w']+params['b'])
    check_params={'w':np.array([.2,-.3]),'b':np.array([.1])}
    _,g=loss_and_grads(x,y,check_params)
    check=gradcheck(lambda:loss_and_grads(x,y,check_params)[0],check_params,g)
    np.savez(out/'parameters.npz',**params)
    with np.load(out/'parameters.npz') as q: reload_error=float(np.max(abs(prob-sigmoid(xt@q['w']+q['b']))))
    fig,axs=plt.subplots(1,3,figsize=(14,4),constrained_layout=True)
    gx,gy=np.meshgrid(np.linspace(-3,3,150),np.linspace(-3,3,150)); points=np.c_[gx.ravel(),gy.ravel()]
    p=sigmoid(points@params['w']+params['b']).reshape(gx.shape)
    axs[0].contourf(gx,gy,p,levels=np.linspace(0,1,21),cmap='coolwarm',alpha=.7)
    axs[0].contour(gx,gy,p,levels=[.5,.8],colors=['black','green'],linestyles=['-','--'])
    axs[0].scatter(xt[:,0],xt[:,1],c=yt,cmap='coolwarm',edgecolors='black',s=18)
    changed=(prob>=.5)!=(prob>=.8)
    axs[0].scatter(xt[changed,0],xt[changed,1],facecolors='none',edgecolors='gold',s=80,label='改变阈值后改判')
    axs[0].set(title='独立测试点与概率底色\n黑线0.5，绿虚线0.8',xlabel='x1',ylabel='x2'); axs[0].legend(fontsize=7)
    for ax,threshold in zip(axs[1:],[.5,.8]):
        cm=confusion(yt,prob,threshold); ax.imshow(cm,cmap='Blues')
        for (i,j),v in np.ndenumerate(cm):ax.text(j,i,str(v),ha='center',va='center',fontsize=20,color='white' if v>cm.max()*.55 else 'black')
        ax.set(xticks=[0,1],yticks=[0,1],xlabel='预测类别',ylabel='真实类别',title=f'阈值 {threshold} 的混淆统计')
    fig.savefig(out/'probability_threshold.png');plt.close(fig)
    comparisons={}
    for name,overlap,fraction in [('较少重叠',.45,.5),('明显重叠',1.2,.5),('正类较少',.8,.2)]:
        a,b=make_data(seed,overlap=overlap,positive_fraction=fraction)
        c,d=make_data(seed+1000,n=120,overlap=overlap,positive_fraction=fraction)
        q,_=train(a,b); pp=sigmoid(c@q['w']+q['b'])
        comparisons[name]={'test_accuracy':float(np.mean((pp>=.5)==d)),'positive_fraction_requested':fraction,'confusion':confusion(d,pp).tolist()}
    fig,ax=plt.subplots(figsize=(6,4),constrained_layout=True);ax.plot(history);ax.set(title='逻辑回归的训练损失',xlabel='更新次数',ylabel='二元交叉熵')
    fig.savefig(out/'loss.png');plt.close(fig)
    return save_result(out,{'seed':seed,'train_n':len(x),'test_n':len(xt),'steps':500,'learning_rate':.15,
        'train_loss':loss_and_grads(x,y,params)[0],'test_loss':loss_and_grads(xt,yt,params)[0],
        'test_accuracy':float(np.mean((prob>=.5)==yt)),'confusion_at_0.5':confusion(yt,prob,.5).tolist(),
        'confusion_at_0.8':confusion(yt,prob,.8).tolist(),'changed_decisions':int(changed.sum()),
        'gradient_check':check,'reload_max_abs_error':reload_error,'data_comparisons':comparisons})


if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',default='outputs/t02');p.add_argument('--seed',type=int,default=42)
    a=p.parse_args();print(demo(a.output,a.seed))
