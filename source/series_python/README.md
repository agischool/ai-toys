# 十个 AI 机制的小实现

一组可独立运行、可逐项核对的中文科普代码。每篇从手算例子开始，再看真正运行的曲线，最后交代模型做不到什么。完整算法使用 NumPy 显式实现，未使用 PyTorch、TensorFlow 或自动求导；不下载模型，不调用API。

## 从这里开始

已经附上运行图表和实测结果，不运行代码也能先阅读 `docs/`。需要复现时，在本目录打开终端：

```bash
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows PowerShell 改用: .venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
python run_all.py
```

实测环境为 Python 3.12.14、NumPy 2.3.5、Matplotlib 3.10.8，CPU、float64。建议 Python 3.11–3.13。只需要 NumPy 和 Matplotlib，测试使用标准库 unittest。若已有上述依赖，可直接执行最后两条命令；运行示例不需要联网。

首次运行会生成中文图。当前环境使用 Noto Sans CJK；其他电脑若没有中文字体，数值结果不受影响，但绘图可能缺字。可以在系统安装常用中文字体后，在 `toys/common.py` 中指定 Matplotlib 字体。脚本只在临时目录保存字体缓存，不更改系统设置。

## 主题与入口

| 编号 | 机制 | 单独运行 | 阅读 |
|---|---|---|---|
| T1 | 线性回归、解析梯度 | `python -m toys.t01_linear` | [直线调参数](docs/T01_线性回归.md) |
| T2 | 逻辑回归、概率与阈值 | `python -m toys.t02_logistic` | [两种小点](docs/T02_逻辑回归.md) |
| T3 | 多层网络、手写反向传播 | `python -m toys.t03_mlp` | [反向传播](docs/T03_反向传播.md) |
| T4 | 互相关、共享滤波器、CNN | `python -m toys.t04_cnn` | [迷你CNN](docs/T04_CNN.md) |
| T5 | 残差通道、梯度路径 | `python -m toys.t05_residual` | [残差网络](docs/T05_残差网络.md) |
| T6 | 循环状态、BPTT | `python -m toys.t06_rnn` | [RNN](docs/T06_RNN.md) |
| T7 | Q/K/V、自注意力、遮罩 | `python -m toys.t07_attention` | [注意力](docs/T07_注意力.md) |
| T8 | 迷你因果Transformer | `python -m toys.t08_transformer` | [Transformer](docs/T08_Transformer.md) |
| T9 | 外部记忆寻址、读取与写入 | `python -m toys.t09_memory` | [外部记忆](docs/T09_外部记忆.md) |
| T10 | 可逆编码、总描述长度 | `python -m toys.t10_mdl` | [MDL](docs/T10_MDL.md) |

只跑某几篇：`python run_all.py --only t01 t02 t03`。换种子：`python run_all.py --seed 7 --output outputs_seed7`。默认输出目录里的图表会被本次运行替换；文中引用的数字对应随包的种子42记录，改种子后不应照抄。

## 文件说明

- `toys/`：核心算法和每篇示例；`common.py` 只有数值、优化器和绘图工具
- `tests/`：手算、梯度、形状、有限值、因果遮罩、数据分离、保存读取等检查
- `docs/`：十篇中文机制说明，带图表相对链接
- `outputs/tXX/`：该篇PNG图、JSON实测结果，适用时包含参数文件
- `outputs/run_report.json`：运行环境、各篇耗时与实测结果汇总
- `VERIFICATION.md`：本次验证范围与结果；`SOURCES.md`：机制的延伸阅读

## 怎样理解结果

数据都很小，任务有意简单。100%是某个有限合成测试集上的比例，不是现实能力保证。训练、验证、测试按独立观测或完整序列分开；不能把同一条序列的重叠片段拆成两组来冒充泛化。有限差分检查验证的是局部导数，不能替代全部软件验证。

T8是单块、单头、微型decoder-only模型，训练和梯度全部展开；不是原始Transformer全部架构，也不是ChatGPT复刻。T9采用固定规则控制器，完整演示读写机制，没有端到端训练NTM。T10在明确限定的编码规则族内比较完整字节数，不宣称求出真实Kolmogorov复杂度。

这是一套自足的演示，不需要读者提交作业或反馈才能得到结论，也没有公开发布、部署或推送任何仓库。
