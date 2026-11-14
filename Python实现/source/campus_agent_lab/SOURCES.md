# 来源与证据范围

制作日期：2026-11-13。实验只使用 Python 标准库；没有复制第三方作业实现，没有导入外部邮件或校园数据，没有真实模型调用。

## 教学与技术参考

- 本仓库《后续内容策划》第 17—20 期制作卡：校园工具请求、步骤限制、坡道条件、结果验收与证据分层。资料、函数、固定规则、人工摘要、故障注入和 12 个案例均为本项目原创教学设计。
- [CS329Z Assignment 1 的 adapters.py](https://github.com/cs329z/assignment1-harness/blob/95f4cb7bfe28a27a7cf5bcb1eccb1aaaf1385eb3/cs329z_hw1/adapters.py)：参考工具注册、参数校验、错误返回与 Agent 循环的职责区分。本实验不是这份作业答案，不沿用其邮件资料、完整协议或评测阈值。
- [CS329Z Assignment 2 README](https://github.com/cs329z/assignment2-evals/blob/3a649d8da0dc6cb0422e6ce7ce7068c3b98be1db/README.md) 与 [作业讲义](https://github.com/cs329z/assignment2-evals/blob/3a649d8da0dc6cb0422e6ce7ce7068c3b98be1db/cs329z_assignment2_evaluation.pdf)：参考任务要求、执行环境、结果验证的分工。本地规则检查没有运行 Harbor、Docker 或 mini-SWE-agent，也不是课程模型评测的复现。

## 结果怎样复核

`outputs/reference/episode17/result.json` 至 `episode20/result.json` 是当前规则程序对构造资料的执行输出。`test_lab.py` 对全部四份结果作精确重现检查，同时用故障和条件变更检查验收逻辑。

第 17 期固定回答由规则选择；第 18 期动作顺序由规则固定；第 19 期摘要由人工编写；第 20 期坏策略由代码故意构造。没有任何一项可以归因于语言模型的自主能力。

小样本、公开题目与确定性规则不足以支持真实使用中的泛化或可靠性结论。独立保留测试、真实模型重复运行、成本测量与目标读者试读须在未来分别开展。
