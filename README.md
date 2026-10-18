# 看得见的 AI

三个并列项目，从代码实验、五图观察和长文科普三个方向解释 AI。每个项目都有自己的说明和网页入口，可按需要单独阅读、运行或准备发布。

## 三个项目

| Python 实现 | 少年 AI 观察室 | 青少年 AI 科普连载 |
| --- | --- | --- |
| [![线性回归的拟合、训练曲线和测试残差](Python%E5%AE%9E%E7%8E%B0/source/series_python/outputs/t01/fit_loss_residual.png)](Python实现/README.md) | [![少年 AI 观察室首期封面](%E5%B0%91%E5%B9%B4AI%E8%A7%82%E5%AF%9F%E5%AE%A4/01_%E8%AE%A4%E7%8C%AB%E7%9A%84%E8%AE%A1%E7%AE%97%E8%B7%AF%E7%BA%BF/%E5%85%AC%E4%BC%97%E5%8F%B7%E4%B8%BB%E5%B0%81%E9%9D%A2_21x9.png)](少年AI观察室/README.md) | [![青少年 AI 科普连载首篇封面](%E9%9D%92%E5%B0%91%E5%B9%B4AI%E7%A7%91%E6%99%AE%E8%BF%9E%E8%BD%BD/01_AI%E5%88%B0%E5%BA%95%E5%9C%A8%E5%81%9A%E4%BB%80%E4%B9%88%20%E4%BB%8E%E8%AE%A4%E7%8C%AB%E5%BC%80%E5%A7%8B/00_%E5%B0%81%E9%9D%A2%E5%9B%BE_%E6%A8%AA%E7%89%882.35.png)](青少年AI科普连载/README.md) |
| **10 个 AI 机制**：NumPy 实现、中文说明、测试、历史实测输出与互动实验。适合运行代码、修改参数和检查计算。 | **16 期五图内容**：标题、描述、5 张正文图及封面。适合逐图阅读与公众号图片贴图发布。 | **16 篇长文章**：排版 HTML、Markdown 正文、标题、摘要、配图与封面。适合连续阅读与公众号长文发布。 |
| [项目说明](Python实现/README.md) · [网页入口](Python实现/index.html) | [项目说明](少年AI观察室/README.md) · [网页目录](少年AI观察室/index.html) | [项目说明](青少年AI科普连载/README.md) · [网页目录](青少年AI科普连载/index.html) |

点击预览图进入对应项目说明。Python 预览为随包历史实测图，两套公众号预览为各自首期封面。

Python 项目使用 T1–T10 编号；两套公众号系列分别使用 01–16 编号。它们是三个内容项目，各自保留完整材料与使用说明。

## 目录结构

```text
.
├── Python实现/           # 代码、互动实验、测试与实测输出
├── 少年AI观察室/         # 16 期五图观察
├── 青少年AI科普连载/     # 16 篇长文科普
├── README.md            # 三个项目的介绍与入口
├── index.html           # 三个项目的网页首页
├── .site/               # 共用网页样式、复制功能与生成脚本
├── package.json         # 根目录构建、检查和预览命令
├── MANIFEST.sha256      # 构建文件校验清单
└── .nojekyll            # GitHub Pages 按静态文件发布
```

## 浏览网页

双击根目录 [index.html](index.html)，即可进入三个项目。公众号每期页面支持搜索目录、预览图片和复制文案；长文章保留原有的排版正文入口。若浏览器限制自动复制，按提示手动复制已选中的文本。

互动实验需要 HTTP 环境。在仓库根目录运行：

```sh
npm run serve
```

打开 <http://127.0.0.1:4174/>。`npm run serve:library` 是同一命令的兼容入口。Python 环境、独立运行、测试和输出保存方法见 [Python 项目说明](Python实现/README.md)；公众号发布步骤见各系列 README。

## 修改与构建

根目录统一命令需要 Python 3.11+ 和 Node.js 18+，无需安装 npm 依赖：

```sh
npm run build
npm test
```

构建会更新三个项目的网页入口、Python 互动实验站、下载包和校验清单。公众号入口页从每期 `发布文案.md` 和现有图片生成；长文的 `正文.md` 与 `公众号_排版.html` 是独立文件，改稿后须同步排版正文。

各级 README 的图片和链接可在 GitHub 中直接查看；本地网页中的「项目说明」使用生成的图文阅读页，Markdown 保留为源文件。修改 README 后运行 `npm run build` 更新阅读页。

共用网页工具集中在 `.site/`；Python 项目也可以进入自己的目录独立构建和测试。历史实测输出保留在 `Python实现/source/series_python/outputs/`，本地重跑应另存。

## GitHub 网页与许可

GitHub 仓库中的 README 提供三个项目的文件入口；HTML 网页由 GitHub Pages 展示。此结构的发布源应为 **`main` 分支的 `/(root)`**，以根目录 `index.html` 为首页。旧配置发布根目录 `/docs`；上线新版时需同步调整 Pages 配置，互动实验的新路径为 `Python实现/docs/`。本地构建不代表公网部署已完成。

尚未选择开源许可证。公开可见或可下载不等于授予开放许可。
