# 测试与科学边界

本文说明如何检查当前源码，以及各实验结论的适用范围。原始 Python 实测数字和跨平台差异保留在 [Python 核验记录](../source/series_python/VERIFICATION.md) 中。

## 基本检查

在仓库根目录执行：

```sh
npm run build
npm test
```

这些检查无需安装 npm 依赖：

| 检查 | 覆盖范围 |
| --- | --- |
| `numerical.mjs` | T1 的 270 组 NumPy / JavaScript 参数与损失对照 |
| `dom-behavior.mjs` | T1 暂停、继续、单步、重置、取消、零学习率和发散处理 |
| `chapters.mjs` 及其调用的章节测试 | T2–T10 数值、梯度差分、状态转换、非法输入、注意力遮罩、记忆读写、编码往返等 |
| `native-select.mjs`，由章节测试使用 | 模拟原生单选框的精确字符串匹配，防止默认值与选项不匹配 |
| `site-integrity.py` | 11 页的链接、锚点、资源、表单标签、唯一 ID、源码与产物一致性，以及两个 ZIP 的 CRC 和内容字节一致性 |

校验根目录清单（macOS / Linux）：

```sh
shasum -a 256 -c MANIFEST.sha256
```

清单由构建脚本生成，覆盖 `source/`、`tests/`、`scripts/`、`docs/` 和根目录的项目说明、配置，不包含 `wechat/`、本地环境和缓存。生成清单仅记录当前字节，不能替代数值测试或内容审核。

## 完整 Python 与独立科学检查

按[根目录说明](../README.md#运行-python-实现)创建环境并安装固定依赖，再执行：

```sh
(cd source/series_python && OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python3 -m unittest discover -s tests -v)
python3 tests/science-review.py
```

独立科学检查需要 Node.js、NumPy 和 Matplotlib，包含：

- T3：非线性和线性两种模式，共 34 个标量梯度的中央差分检查。
- T5：20 组普通与残差路径的链式灵敏度检查。
- T6：12 组长延时灵敏度检查。
- T8：因果前缀隔离，禁止关注的未来位置权重为零。
- T10：103 个 Unicode 字符串、1,709 个候选编码与 Python 逐字节对照及无损往返，包含中文、emoji、换行、NUL 和 BOM。

需要重新训练时，使用独立输出目录：

```sh
python3 source/series_python/run_all.py --seed 42 --output outputs_local
```

不要覆盖 `source/series_python/outputs/`。数值差异应记录运行环境后单独比较，不能用新结果悄悄替换文章中的历史测量。

## 浏览器检查

`npm test` 的 DOM 检查使用模拟环境，真实浏览器检查由 `browser-smoke.cjs` 执行。先启动 `npm run serve`，再在另一个终端运行：

```sh
npm run test:browser
```

运行环境需能解析 `playwright` 包并安装 Chromium。脚本默认使用 `/usr/bin/chromium`；其他位置通过 `CHROMIUM_PATH` 指定。例如 macOS 已安装 Google Chrome 时：

```sh
CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run test:browser
```

`SITE_URL` 可指定服务地址（默认 `http://127.0.0.1:4173/`），`QA_DIR` 可指定报告和截图目录（默认 `/tmp/ai-toys-browser-qa`）。脚本检查 1280px 和 390px 视窗、页面错误、请求失败、外部请求、横向溢出及控件操作。

本地检查不代表公网部署、真实手机或公众号粘贴后的排版验收。浏览器检查需报告本次实际结果；旧报告中的环境阻塞或通过记录不能代替本次运行。

## 机制与结论的边界

| 章节 | 需要保留的解释边界 |
| --- | --- |
| T1 线性回归 | 合成数据上的拟合不能保证外推准确 |
| T2 逻辑回归 | 阈值改变判定，不改变训练参数；浏览器与 Python 的随机数据不同 |
| T3 多层网络 | 浏览器为 2→4→1、17 参数模型；四点 XOR 训练结果不代表泛化成绩 |
| T4 CNN | 使用不翻核的 valid 互相关；浏览器手设单滤波器与 Python 训练的六滤波器 CNN 不同 |
| T5 残差 | 输出灵敏度与损失梯度范数不同；接近恒等映射的任务及三个种子的对照不能推广为普遍优势 |
| T6 RNN | 浏览器固定标量递推与 Python 训练的 16 单元 RNN 不同；延迟回忆、下一字符、验证集和独立测试分别解释 |
| T7 注意力 | 展示缩放点积、softmax、遮罩与值混合；热图不是因果解释或理解程度评分 |
| T8 Transformer | 浏览器为固定、未训练的 D4/FF6 单头 pre-LN 解码器；Python 的 D16/FF32 复制训练需区分教师强制准确率、自由生成和分布外样例，不能等同于 ChatGPT |
| T9 外部记忆 | 余弦寻址、读取、擦除和写入由固定控制器执行，未训练 NTM，也不是 RAG |
| T10 最小描述长度 | 按实际 MDL1 字节计费，在字面量和周期不超过 16 的有限启发式候选中选择；不宣称最优压缩或求出 Kolmogorov 复杂度 |

T10 还需保留 Unicode 码点与字节的区别、代理码点限制、资源上限和缺少校验和的说明。测试通过只验证覆盖范围内的行为，不证明任意输入、硬件或依赖版本均无错误。
