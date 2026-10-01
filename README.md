# ai-toys

## T1：一条直线，是怎样学会的？

中文线性回归互动样章。拖动学习率和噪声，改变训练样本量，逐步观察真实梯度下降、训练误差与独立测试误差。包含 T1 Python 源码下载。

网页为纯静态 HTML / CSS / JavaScript，无外部运行时依赖、登录、上传、遥测或后台服务。所有实验在浏览器本地计算。

### 目录

- `docs/`：可直接部署的静态站点；GitHub Pages 可选择 `main` 分支的 `/docs` 目录
- `source/web/`：网页源码
- `source/t1_python/`：原版 T1、样章扩展、NumPy 数据夹具与 Python 测试
- `tests/`：270 组 Python / JavaScript 数值对照与 DOM 适配器状态测试
- `scripts/build.py`：重建站点和可下载 Python ZIP；仅使用 Python 标准库
- `VALIDATION.md`：已完成检查及未完成的浏览器验证

### 本地运行与重建

需要 Python 3.11+；JavaScript 测试需要 Node.js 18+。无需安装 npm 包。

```sh
python scripts/build.py
python -m http.server 4173 --bind 127.0.0.1 --directory docs
```

在浏览器打开 `http://localhost:4173/`。JavaScript 使用 ES modules，请通过 HTTP 运行，不要直接双击 HTML。

修改网页时编辑 `source/web/`，修改 Python 时编辑 `source/t1_python/`，然后重新运行构建。`docs/` 为生成产物，连同源码一起提交。

```sh
npm test
cd source/t1_python
python -m venv .venv
# macOS / Linux；Windows PowerShell 使用 .venv\Scripts\Activate.ps1
source .venv/bin/activate
python -m pip install -r requirements.txt
python -m unittest discover -s tests -v
python -m toys.t01_linear
```

原版 Python 的结果写入 `source/t1_python/outputs/t01/`，不会打包进网站下载文件。

### 复现约定

默认设置与原版 T1 一致：种子 42、32 个训练点、16 个独立测试点、噪声 0.08、学习率 0.1、200 步。NumPy 预先生成固定数据，浏览器执行同样的梯度运算，不模拟 NumPy 随机数。270 组参数和误差对照的最大归一化差异低于 2e-12。

训练与测试数据独立；测试点不参与更新。生成规律含轻微二次项，线性模型有表达限制，范围内误差低不保证外推可靠。详细说明见 [Python README](source/t1_python/README.md)。

### 发布状态与许可

互动网页已发布至 [T1 样章](https://agischool.github.io/ai-toys/)。仓库为 Public，GitHub Pages 从 `main` 分支的 `/docs` 目录发布，使用 HTTPS。页面资源、模块与下载链接均为相对路径，已在 `/ai-toys/` 项目子路径实测。

尚未选择开源许可证。公开可见性或下载能力本身不等于授予开放许可；本仓库没有添加 MIT、CC 或其他开源授权。
