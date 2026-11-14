# 机制来源与原创范围

核查日期：2026-11-13。

1. [InstructGPT，§3.1、§3.5](https://arxiv.org/html/2203.02155v1#S3.SS1)：监督示范训练与后续偏好、强化学习阶段分开。本文的答案区间掩码是自设机制例子，单条复制序列不复现论文完整训练流程。
2. [GPT-2 官方 model.py](https://github.com/openai/gpt-2/blob/master/src/model.py)：`attn` 中 K/V 历史拼接、`past`/`present` 及 `positions_for` 的偏移是缓存实现参照。实验使用本仓库 T08 的单层模型，不声称复现 GPT-2。
3. [Mixtral，§2.1](https://arxiv.org/html/2401.04088v1#S2.SS1)：从多个专家中选择部分输出并按路由权重组合。四专家线性矩阵、输入、路由分数为原创构造；区别于论文的八专家前馈模块。

实现调用本仓库 `series_python/toys` 中的 NumPy 类和函数。每次结果记录这些核心文件 SHA-256，以便判断代码是否变化。未复制外部图像、数据或训练权重。
