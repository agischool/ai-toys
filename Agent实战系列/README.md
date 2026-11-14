# Agent 实战系列：基于 Andrej Karpathy 的开源项目

**以 Karpathy 的原始仓库为主线，读懂并逐步复现从模型训练底座到 Agent 自动实验的过程。总篇数待定，由源码工作量、学习依赖和实际复现结果决定。**

核心案例是 [autoresearch](https://github.com/karpathy/autoresearch) 的自动训练实验流程，训练底座参照 [nanochat](https://github.com/karpathy/nanochat)。原帖中的其余 Karpathy 仓库作为前置基础或进阶支线，按需要选入；不把七个仓库等同于七篇文章，也不把它们全部称为 Agent 项目。

当前完成的是 [课程策划](课程策划.md) 与 [原仓库核查](源仓库核查/README.md)，文章、代码改编及本项目复现实验尚待制作。系列名称为本仓库暂定名，不表示 Karpathy 官方课程或作者背书。

## 原仓库怎样进入系列

| Karpathy 原仓库 | 在本系列中的位置 |
| --- | --- |
| [autoresearch](https://github.com/karpathy/autoresearch) | Agent 主项目：外部编程 Agent 怎样读实验协议、修改训练代码、运行实验、比较指标和保留／撤回改动 |
| [nanochat](https://github.com/karpathy/nanochat) | 训练底座：分词、数据、训练、评测、微调与推理，帮助读懂自动实验正在改进什么 |
| [micrograd](https://github.com/karpathy/micrograd) | 按需前置：自动微分与参数更新；已理解这些机制可跳过 |
| [minbpe](https://github.com/karpathy/minbpe) | 按需前置：分词器训练、编码与解码，解释训练输入与评测计量 |
| [nn-zero-to-hero](https://github.com/karpathy/nn-zero-to-hero) | 课程和练习入口：与 micrograd、minbpe 去重，不重复制作相同内容 |
| [nanoGPT](https://github.com/karpathy/nanoGPT) | 旧版实现对照：按需要阅读简洁训练代码；当前 README 已推荐迁移关注 nanochat，不作为默认新项目底座 |
| [llm.c](https://github.com/karpathy/llm.c) | 进阶支线：C/CUDA 训练实现与数值对照，不要求所有读者先学完 |

原帖是选题线索；文章中的具体机制要对应原仓库的固定提交、文件与函数。CS329Z 的作业只补充评测和执行边界的对照，不决定本系列主项目与篇目。

## 谁适合读

面向会基础 Python、愿意阅读训练代码并检查实验记录的开发者。进入训练主线还需要逐步理解张量、损失与参数更新；C/CUDA 不作为共同前提。需要原理入门时，可选读 [青少年 AI 科普连载](../青少年AI科普连载/README.md)，两套系列的受众与交付独立。

代码阅读、小算例与真实训练分别安排。nanochat 的 CPU 缩小路径不等于完整训练复现，autoresearch 原版也不能据此说成在普通笔记本上即可直接跑通；硬件、外部 Agent、数据、时间与费用条件会在制作前核查。

## 如何确定篇数

先按源码整理工作包，再选一个有独立结果的基线实验，实际跑通后写样篇。每篇只讲清一个可验证的问题：需要多次独立实验或引入新的先修知识时再拆；只是同一过程的设置、执行和日志时优先合并。

因此，此时不承诺总篇数、不预设文章编号，也不创建一批空目录。正式目录随着已核实的工作包、复现证据和试读反馈逐步确定，具体方法见 [课程策划](课程策划.md)。
