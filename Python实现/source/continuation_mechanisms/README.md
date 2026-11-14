# 训练、缓存与稀疏路由机制实验

为长文第 21—23 期提供三个小型数值实验：答案区间损失和一次参数更新、因果模型的 K/V 增量缓存、四个专家中选择两个并合并输出。全部使用构造输入，没有模型服务或付费 API 调用。

## 运行

需要 Python 3.11+ 及本仓库现有 Python 实验依赖 NumPy、Matplotlib。Matplotlib 由 T08 共用模块导入，本实验不生成图；不需要 PyTorch、GPU 或下载模型。下面从仓库根目录运行，uv 可建立临时环境：

```sh
uv run --python 3.13 --with numpy==2.5.4 --with matplotlib==3.11.2 python Python实现/source/continuation_mechanisms/run_all.py --output /tmp/continuation-mechanisms-my-run
```

输出目录必须尚不存在；目录存在时立即退出，不覆盖历史结果。失败运行保留新建目录，下次换一个目录名。成功后在 `result.json` 查看输入、计算结果、环境和引用核心文件哈希。

```sh
uv run --python 3.13 --with numpy==2.5.4 --with matplotlib==3.11.2 python -m unittest discover -s Python实现/source/continuation_mechanisms/tests -v
```

## 结果能说明什么

| 字段 | 计算 | 边界 |
| --- | --- | --- |
| `sft_loss_mask` | `<abcd\|abcd>` 中只对答案及结束符计损失，实际执行一次梯度下降，记录参数变化 | 单条复制任务的训练机制；不是自然语言指令模型微调，也没有能力提升测评；输入仍能经注意力影响答案 |
| `kv_cache` | 同一 T08 模型、固定输入，对照每个前缀与逐位置缓存的 logits；用错误位置偏移作负对照 | 两个随机模型及可用的随包历史权重；没有计时或加速主张。投影计数对 K、V 分别统计，缓存字节只计数组逻辑负载 |
| `moe` | 给出全部路由分数、概率、专家矩阵、选中输出与重新归一权重，得到 `[2.4, 4.8]` | 未训练路由器或专家；参数计数只覆盖专家矩阵，不能据此推断完整模型速度或显存 |

缓存模型读取 [T08](../series_python/toys/t08_transformer.py) 并复用 [T07 注意力](../series_python/toys/t07_attention.py) 的真实数值实现；不改动核心代码或历史权重。随包历史权重缺失时，仍检查两个固定种子的随机模型，结果会记录实际模型数。

## 材料

- [参考结果](outputs/reference/result.json)：一次本地运行，保存完整计算字段。
- [来源与设计边界](SOURCES.md)。
- [机制实现](mechanisms.py)、[运行入口](run_all.py)、[检查](tests/test_mechanisms.py)。

这些结果验证实现的数值性质，不等于独立数据上的泛化评估。正式原理图可按结果绘制，不把玩具计算写成完整产品训练或性能复现。
