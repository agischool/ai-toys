# Python 实现

十个 AI 机制的手写 NumPy 实现，配套中文说明、测试、历史实测输出和浏览器互动实验。计算与训练在本地进行，不依赖预训练模型或网络 API。

[返回三个项目总览](../README.md) · [打开项目网页](index.html) · [完整 Python 系列说明](source/series_python/README.md) · [互动实验目录](docs/chapters.html)

## 内容与目录

T1 线性回归、T2 逻辑回归、T3 多层网络、T4 CNN、T5 残差、T6 RNN、T7 注意力、T8 微型 Transformer、T9 外部记忆、T10 最小描述长度。

| 路径 | 用途 |
| --- | --- |
| [source/series_python/](source/series_python/README.md) | 十个完整实现、文章、测试和历史实测输出 |
| [source/t1_python/](source/t1_python/README.md) | T1 独立样章、数值夹具和测试 |
| [source/web/](source/web/) | 浏览器页面、交互控制器与数值引擎 |
| [docs/](docs/chapters.html) | 生成的互动实验站及两个 Python 下载包 |
| [tests/](tests/README.md) | 数值、交互状态、科学边界、链接、下载完整性与浏览器检查 |
| [scripts/build.py](scripts/build.py) | 本项目的独立构建脚本 |
| [MANIFEST.sha256](MANIFEST.sha256) | Python 项目源码、测试、构建脚本、说明和产物的校验值 |

浏览器部分使用缩小模型、固定参数或算子演示，不能视为完整 Python 训练结果的复现。各章区别见[测试与科学边界](tests/README.md#机制与结论的边界)。

## 运行 Python

以下命令均在 `Python实现/` 目录执行。建议使用 Python 3.11–3.13，在独立环境中安装固定版本的 NumPy 和 Matplotlib：

```sh
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r source/series_python/requirements.txt
(cd source/series_python && OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python3 -m unittest discover -s tests -v)
python3 source/series_python/run_all.py --seed 42 --output outputs_local
```

上面是 macOS / Linux 命令。Windows PowerShell 使用 `.venv\Scripts\Activate.ps1` 激活环境，并按 PowerShell 语法设置环境变量。

重跑结果写入本项目的 `outputs_local/`。保留 `source/series_python/outputs/` 中文章引用的实测数据；历史环境、测量结果与已知跨平台差异见 [Python 核验记录](source/series_python/VERIFICATION.md)。

## 运行互动实验

需要 Python 3.11+ 和 Node.js 18+，无需 `npm install`：

```sh
npm run build
npm test
npm run serve
```

打开 <http://127.0.0.1:4173/chapters.html>。互动实验使用 ES modules，需通过 HTTP 打开。也可从仓库根目录运行 `npm run serve`，在三个项目的首页进入实验。

修改 `source/web/` 后重新构建，提交源码和 `docs/` 产物。本项目的 `npm run build` 生成实验站、下载包和项目校验清单；仓库根目录的构建还会更新三个项目的入口页与总校验清单。

## 下载与检查

- [完整 Python 下载包](docs/ai-toys-python.zip)
- [T1 独立样章下载包](docs/t1-sample-python.zip)
- [测试方法与结论范围](tests/README.md)

网页为纯静态 HTML、CSS 和 JavaScript，没有外部运行时依赖。`docs/` 是发布产物，`outputs/` 是随包实测材料，均需保留。
