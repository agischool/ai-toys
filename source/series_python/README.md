# 十个 AI 机制的小实现

一套配有可运行代码的中文机制说明：从两个参数的直线开始，逐步读到卷积、残差、RNN、注意力与微型 Transformer，最后用外部记忆和无损编码观察另外两类机制。每篇都有手算、实现对应关系、实测图表和适用边界。

适合会读基础 Python、希望把公式与代码接起来的读者。前几篇会解释损失和梯度；后几篇需要矩阵乘法与数组形状的基础。所有核心算法都用 NumPy 显式实现，没有 PyTorch、TensorFlow 或自动求导；运行示例不下载模型，也不调用外部 API。

## 从这里开始

随包已经包含图表与测量记录，可以直接阅读下面的文章。需要运行时，在本目录打开终端，使用 Python 3.11–3.13 创建环境：

```bash
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows PowerShell 改用: .venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
python run_all.py --output outputs_local
```

最后一条命令将本机结果另存到 `outputs_local/`，不会覆盖文章引用的随包图表。只运行部分示例可用 `python run_all.py --only t01 t02 t03 --output outputs_local`；换种子可用 `python run_all.py --seed 7 --output outputs_seed7`。各篇列出的单独运行命令默认写入 `outputs/tXX/`，会替换该篇已有产物；`python run_all.py` 则会覆盖全部默认输出及运行报告。

依赖只需 NumPy 和 Matplotlib，测试使用标准库 unittest。安装依赖通常需要联网，安装完成后运行示例不需要网络。出现 `No module named ...` 时，先确认已激活虚拟环境，并在同一个 Python 环境安装 `requirements.txt`。

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

初次阅读可按 T1→T2→T3 建立训练基础。T4 与 T5 分别观察参数共享和梯度分支；T6 看状态递推；T7→T8 看注意力怎样接进完整模型。T8 会复用 T5 的残差概念和 T7 的算子。T9、T10 可以独立阅读，不是前面训练成绩的延续。

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
