# Karpathy 原仓库核查索引

核查日期：2026-11-13。以下七个仓库来自用户最初提供的 Karpathy 项目清单，作为当前策划的原始依据。版本为本次从原仓库取得并读取的固定提交；工作包与文章之间不作一对一绑定。

| 原仓库 | 固定提交 | 策划位置 | 核查记录 |
| --- | --- | --- | --- |
| [karpathy/autoresearch](https://github.com/karpathy/autoresearch/tree/228791fb499afffb54b46200aca536f79142f117) | `228791fb` | Agent 自动实验主项目 | [源码、协议、指标及资源](autoresearch.md) |
| [karpathy/nanochat](https://github.com/karpathy/nanochat/tree/92d63d4e8bb4df75c3b71618f31ddde2378b2bcd) | `92d63d4e` | 主训练底座参照 | [训练底座](训练底座.md) |
| [karpathy/micrograd](https://github.com/karpathy/micrograd/tree/7bc720e951fe422b8f8814aa5aa1b64121d26b4c) | `7bc720e9` | 梯度与更新前置 | [前置基础](前置基础.md) |
| [karpathy/minbpe](https://github.com/karpathy/minbpe/tree/1acefe89412b20245db5a22d2a02001e547dc602) | `1acefe89` | 分词前置 | [前置基础](前置基础.md) |
| [karpathy/nn-zero-to-hero](https://github.com/karpathy/nn-zero-to-hero/tree/73c3fcc741f0ec104ca850b1fb0df90e7e8d4cde) | `73c3fcc7` | 课程及练习，去重使用 | [前置基础](前置基础.md) |
| [karpathy/nanoGPT](https://github.com/karpathy/nanoGPT/tree/3adf61e154c3fe3fca428ad6bc3818b27a3b8291) | `3adf61e1` | 旧版实现对照 | [训练底座](训练底座.md) |
| [karpathy/llm.c](https://github.com/karpathy/llm.c/tree/f1e2ace651495b74ae22d45d1723443fd00ecd3a) | `f1e2ace6` | C/CUDA 进阶支线 | [训练底座](训练底座.md) |

本次读取 README、目录、相关源码与实际存在的许可证文件，未运行模型、训练、数据下载或外部 Agent。autoresearch 的此提交未见独立 LICENSE，只有 README 的 MIT 声明；其余六个仓库的 MIT 文件已读取。具体核查范围与未验证事项以分组记录为准。

## 对策划已经产生的影响

- 自动实验循环对应外部 Agent 与 `program.md`，不能把 `train.py` 说成自带循环执行器；保留代码提交与保存训练权重是不同动作。
- 训练计时、进程总时长、Agent 会话时间分别核对；不能拿 README 的五分钟或费用算例推导统一完成时限与价格。
- nanochat 的运行脚本与 README 示例可能有版本差异，以所选提交的实际配方为准；CPU 教育路径单列。
- nanoGPT 作为旧版对照；llm.c 不作为所有人的必修前置。
- Zero to Hero 与 micrograd、minbpe 有重合，课程 README 的外链不能冒充仓库里已经存在的脚本。
- 篇数留待源码工作包、最小复现和样篇拆并后确定，不以仓库个数或既定十篇反推内容。

返回 [系列说明](../README.md) · [当前策划](../课程策划.md)
