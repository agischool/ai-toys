# 看得见的 AI

这里存放两套公众号发布材料，以及配套的十个互动实验和 NumPy 实现。

## 从哪里开始

| 想做什么 | 入口 |
| --- | --- |
| 发布「少年 AI 观察室」 | [16 期图文发布材料](wechat/少年AI观察室/README.md)，每期 5 张正文图、标题和描述 |
| 发布「青少年 AI 科普连载」 | [16 篇长文章](wechat/青少年AI科普连载/README.md)，含排版 HTML、Markdown、配图和摘要 |
| 了解公众号复制、粘贴方式 | [公众号发布说明](wechat/README.md) |
| 体验互动实验 | [网页目录](https://agischool.github.io/ai-toys/chapters.html) · [T1 线性回归](https://agischool.github.io/ai-toys/) |
| 阅读或运行完整 Python 实现 | [Python 系列说明](source/series_python/README.md) |
| 修改网站或检查结果 | 下方本地运行说明 · [测试与科学边界](tests/README.md) |

公众号长文章使用 `公众号_排版.html` 复制排版正文，使用 `正文.md` 改稿；标题、描述和摘要从 `发布文案.md` 的文本块复制。公众号的 16 期内容与互动实验的 T1–T10 分别编号。

## 仓库结构

| 路径 | 用途 |
| --- | --- |
| [wechat/](wechat/README.md) | 两套公众号系列，各 16 个发布文件夹 |
| [source/web/](source/web/) | 网站页面、交互控制器与数值引擎；网站修改从这里开始 |
| [source/t1_python/](source/t1_python/) | T1 独立样章、数值夹具和测试 |
| [source/series_python/](source/series_python/README.md) | 十个完整 Python 实现、文章、测试和历史实测输出 |
| [docs/](docs/) | 生成的静态站点及两个 Python 下载包，用于 GitHub Pages |
| [scripts/build.py](scripts/build.py) | 生成网站、下载包和根目录校验清单 |
| [tests/](tests/README.md) | 数值、交互状态、链接、下载完整性与浏览器检查 |
| [MANIFEST.sha256](MANIFEST.sha256) | 网站、Python 源码、测试、构建脚本和根目录说明的文件校验值 |

`docs/` 是发布产物，仍需保留并随源码提交。`source/series_python/outputs/` 是文章引用的历史实测数据，不作缓存清理。临时环境、缓存和本地重跑输出由 `.gitignore` 排除。

## 本地运行网站

需要 Python 3.11+ 和 Node.js 18+。以下命令在仓库根目录执行，无需 `npm install`：

```sh
npm run build
npm test
npm run serve
```

打开 <http://127.0.0.1:4173/chapters.html>。网站使用 ES modules，需通过 HTTP 打开。修改 `source/web/` 后重新构建，提交源码和 `docs/` 产物。构建会同时更新下载包和 `MANIFEST.sha256`；文档或测试修改完成后也应重新构建。

网页在浏览器本地计算，无外部运行时依赖。浏览器中的缩小模型、固定参数和算子演示不能等同于完整 Python 训练结果，各章节的区别见[测试说明](tests/README.md#机制与结论的边界)。

## 运行 Python 实现

建议使用 Python 3.11–3.13，在独立环境中安装固定版本的 NumPy 和 Matplotlib。下面是 macOS / Linux 的根目录执行方式：

```sh
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r source/series_python/requirements.txt
(cd source/series_python && OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 python3 -m unittest discover -s tests -v)
python3 source/series_python/run_all.py --seed 42 --output outputs_local
```

Windows PowerShell 的环境激活命令为 `.venv\Scripts\Activate.ps1`；测试命令和环境变量设置需使用对应的 PowerShell 语法。

重跑结果写入根目录 `outputs_local/`，避免覆盖随包实测输出。历史环境、测量数字与已知跨平台差异见 [Python 核验记录](source/series_python/VERIFICATION.md)。下载包位于 [docs/ai-toys-python.zip](docs/ai-toys-python.zip)，T1 独立包位于 [docs/t1-sample-python.zip](docs/t1-sample-python.zip)。

## 发布与许可

网站仓库为 `agischool/ai-toys`，GitHub Pages 使用 `main` 分支的 `/docs`。内部资源采用相对路径，支持项目子路径部署；本地构建通过不代表公网部署已经完成。公众号材料需在平台粘贴后检查图片、排版并发送手机预览。

尚未选择开源许可证。公开可见或可下载不等于授予开放许可。
