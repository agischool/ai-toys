# 看得见的 AI · 十个机制，十个小实验

中文互动科普系列：T1 线性回归、T2 逻辑回归、T3 多层网络、T4 CNN、T5 残差、T6 RNN、T7 注意力、T8 微型 Transformer、T9 外部记忆、T10 最小描述长度。

- [既有 T1 入口](https://agischool.github.io/ai-toys/)
- [十篇目录](https://agischool.github.io/ai-toys/chapters.html)
- T2–T10 固定路径为 `t2.html` 至 `t10.html`

网页为纯静态 HTML / CSS / JavaScript，无外部运行时依赖、登录、上传、遥测或后台服务。所有实验在浏览器本地计算。T1 原始 URL、交互与独立 Python 下载保持兼容。

## 浏览器实验与完整 Python 的区别

浏览器实验是各篇明确说明的机制演示，实际运行数值运算，不伪造训练动画或指标。部分浏览器模型为便于逐项检查而缩小，或使用明确固定的参数；不能把它们的结果当成原版完整训练的复现。

完整 NumPy 版本位于 `source/series_python/`，十个算法、86 项测试、中文说明与已测输出均保留，下载包为 `docs/ai-toys-python.zip`。其中的 README、验证报告和输出是原始交付快照，日期为 2026-10-01，所述“未发布”指原快照时的状态；本仓库的发布状态以当前仓库与 Pages 为准。T1 的浏览器实现另有 270 组 Python / JS 数值夹具对照。

## 目录

- `docs/`：生成后的 GitHub Pages 站点，部署 `main` 分支的 `/docs`
- `source/web/`：所有页面、交互控制器与纯数值引擎
- `source/t1_python/`：T1 原版、样章扩展、固定 NumPy 数据与测试
- `source/series_python/`：十篇完整 Python 原始实现与实测输出
- `tests/`：数值、状态、站点链接、下载完整性与浏览器检查
- `scripts/build.py`：无 npm 构建依赖；重建网页与固定元数据 ZIP
- `VALIDATION.md`：本轮检查记录与明确限制

## 本地运行

需要 Python 3.11+；JS 测试需要 Node.js 18+。网页与基本测试无需 npm 安装。

```sh
python scripts/build.py
npm test
python -m http.server 4173 --bind 127.0.0.1 --directory docs
```

打开 `http://localhost:4173/chapters.html`。JavaScript 使用 ES modules，需通过 HTTP，不能直接双击 HTML。修改 `source/web/` 后重建，提交源文件和 `docs/` 产物。

完整 Python 复现：

```sh
cd source/series_python
python -m venv .venv
# Linux/macOS:
source .venv/bin/activate
# Windows PowerShell: .venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
python run_all.py
```

Python 只依赖 NumPy 与 Matplotlib，未使用自动求导、预训练模型或网络 API。T9 控制器固定，未训练 NTM；T10 只在有限候选中选择最短编码，不宣称求出 Kolmogorov 复杂度。

可选真实浏览器 QA 使用环境中已安装的 Playwright 和 Chromium：

```sh
node tests/browser-smoke.cjs
```

默认服务地址 `http://127.0.0.1:4173/`，可用 `SITE_URL` 改成带 `/ai-toys/` 的项目路径。这个检查不是网页的运行依赖。测试数与覆盖范围见 `VALIDATION.md`。

## 发布与许可

现有 Public 仓库：`agischool/ai-toys`，GitHub Pages 从 `main` 的 `/docs` 发布。所有内部资源采用相对路径，适用于项目子路径。新增章节只有在新提交成功部署后才在公网可用。

尚未选择开源许可证。公开可见性或下载能力本身不等于授予开放许可；没有新增 MIT、CC 或其他授权。
