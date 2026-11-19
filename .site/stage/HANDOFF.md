# 青少年连载 · 第 01 篇互动版交接

> 更新：2026-11-19。正文与源文件以工作区实际内容为准。

## 1. 当前状态

M1 样片在接手时实际为 13 拍、14/72 个文字单元；旧记录中的 16 拍已纠正。M2、M3 的内容和工程接入现已完成。

| 项目 | 当前结果 |
| --- | --- |
| 正文覆盖 | 69 拍，72/72 个文字单元，`complete: true` |
| 场景 | `cover / open / hub / task / pixels / train / bias / human / refs` |
| 目录 | 导读、5 节正文、资料来源，共 7 张道具缩略卡 |
| 动作卡 | 第 64 拍可翻面，第 65 拍展示答案；支持点击、触摸、空格、回车，横竖屏保留状态 |
| 资料 | 第 69 拍提供 5 条原始资料链接，并可回到全文 |
| 页面体积 | 约 276 KiB，静态检查上限为 512 KiB |
| 构建 | `build.py` 已接入互动版，并将分镜与 HTML 写入校验清单 |
| 入口 | 第 01 篇单篇页面含「打开互动版」，连载 README 已补文件表与发布方法 |
| 发布资源 | `package_pages.py` 白名单包含 stage CSS、JS 和 480px 机器人 PNG |

第 01 篇已按阅读引擎与构建接入分批提交到本地 Git，未推送或部署。后续已获授权继续制作第 02 篇；首页大入口、公众号正文互动化和深色模式不在当前范围内。

## 2. 文件与职责

- `青少年AI科普连载/01_AI到底在做什么 从认猫开始/正文.md`：文字唯一来源，本轮未修改。
- 同目录 `分镜.json`：按顺序消费正文单元；`互动版.html` 是生成物。
- `.site/render_stage.cjs`：构建、锁句、完整覆盖、镜头及 focus 校验；`compileOne()` 只在内存生成，供检查器使用。
- `.site/stage/scenes/01.cjs`：场景、横竖屏摆位、镜头和目录缩略图。
- `.site/stage/art.cjs`、`text.cjs`：绘制道具、调色板、切句与标题折行。
- `.site/stage/stage.js`、`stage.css`：导航、滚轮门闩、自动播放、全文模式、翻面卡与焦点管理。
- `.site/check_stage.py`：完整分镜、生成物一致性、链接、资源相对路径和体积检查。
- `.site/tests/stage-unit.cjs`：35 项纯函数检查，保留原 29 项并增加 6 项分镜防错检查。
- `.site/tests/stage-browser.cjs`：版面、对比度、字号、手势、翻面卡、目录、资料及 `file://` 检查。
- `.site/tests/stage-shots.cjs`：桌面、手机逐拍截图和接触表，另保存目录截图。

## 3. 常用命令

在仓库根目录执行。浏览器检查需要本机 Playwright 与 Chrome；先把环境变量设置为实际安装位置。

```bash
node .site/render_stage.cjs 01 --units
node .site/render_stage.cjs 01
node .site/tests/stage-unit.cjs
python3 .site/check_stage.py

export PLAYWRIGHT_MODULE=/path/to/node_modules/playwright
export CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
npm run test:stage:browser
npm run test:stage:shots -- --out=/tmp/stage01

npm run build
npm test
python3 .site/package_pages.py /tmp/pages-check-new
```

打包目标必须是仓库外尚不存在的目录。浏览器脚本自建仅监听 `127.0.0.1` 的临时服务；受限环境需允许本机监听与 Chrome 启动。

按变更拍复查时，可使用 `--from=58 --to=69`；浏览器组可用 `--only=layout,contrast,actions,file`。省略范围默认检查全篇。`gesture` 是原有翻页交互组，`actions` 是目录缩略图、动作卡与资料链接组。

## 4. 分镜与场景契约

- `take` 为非负整数；正数必须有 `from` 句首校验。文字从正文依次取出，不得跳句或复制长段到 SVG。
- 标题单独成拍，不能被前一拍的多句字幕吞入。`complete: true` 时必须消费全部正文单元。
- `scene / step / cam` 必须存在。`focus` 使用元素的 `data-n` 名或点号前缀，且元素在当前 step 必须可见；`solo` 必须带 focus。
- `quiet: true` 隐藏字幕卡。资料来源拍使用 `take: 0, refs: true`，独立进入目录。
- `reveal: true` 用于动作答案拍；每张翻面卡通过 `data-flip` 关联横竖屏状态。
- 场景返回 `{ id, cams, svg }`。镜头矩形为 `[x, y, w, h]`，`l` 与 `p` 分别用于横屏、竖屏。
- `el(svg, { at, until, d, kind, n, bleed, only, l, p })`：元素在 `[at, until)` 出现；省略 until 表示持续可见。摆位数组为 `[x, y, scale, rotate]`。
- 新章节回到 `hub`。第 5 节将五站分类路线扩成含人工核查的六站路线，使用 `full` 镜头。
- 画面只放短标签，正文只放字幕卡。`machine()` 按标签长度适配屏内字号；`numberGrid()` 可用 `digitSize` 显式指定数字字号。
- 新增场景后，在场景工厂的返回数组注册；构建只内联被分镜引用的场景。

## 5. 质量门禁

每批改动完成后，依次执行构建、单测、浏览器检查、逐拍截图。浏览器红项或人工截图发现的问题修好后，重跑受影响检查。交付前检查全篇。

1. `render_stage` 零报错，完整分镜为 72/72 单元。
2. `stage-unit` 35 项通过，保留 `createWheelGate`、`fitCamera` 等纯函数导出契约。
3. `stage-browser` 五视口版面通过：1440×900、1280×577、390×844、360×640、320×640。
4. 画面不切边、不压字幕或控件；界面文字对比度达到检查标准。画面字号阈值为 desk/mob 12px、narrow 10px、tiny 7px，不得降低阈值。
5. 一次惯性滚动只前进一拍；按钮、键盘、触摸、hash 深链、减少动态和全文模式正常。
6. `file://` 双击可播，机器人图片可解码，无外部运行时请求。
7. 桌面与手机逐拍扫接触表，同时检查翻面正反面和目录；自动测量不能替代看图。

保持原有纸色、线稿和同源调色板；压字使用 `tealInk / coralInk`。不加阴影、发光、玻璃效果或位图背景。元素动效 250ms ease-out，镜头 700ms `cubic-bezier(.22,1,.36,1)`，尊重减少动态设置。

本轮人工复查修过：手机标签挤靠、箭头伸入下一件道具、误画为垂耳狗的哈士奇示意、模型屏内长标签，以及长字幕和六站总览中的小字号。

后续修正：圆形徽章中的问号改用矢量笔画，按可见轮廓居中，避免全角字形留白造成偏移；35 项单测与全篇五组浏览器检查通过，含问号画面的桌面、手机接触表已复查，截图位于 `/tmp/stage01-qcenter`。

## 6. 验收记录

- [x] 9 个场景、69 拍、72/72 单元、完整分镜。
- [x] 目录缩略图、三张翻面动作卡和资料来源。
- [x] 构建、静态检查、单篇入口、README、发布白名单。
- [x] 35 项单测通过，`check_stage.py` 通过。
- [x] `npm run build && npm test` 通过；打包检查通过，126 个 HTML 页面、1,755 处本地资源与锚点。
- [x] 最终完整浏览器门禁：`layout / contrast / gesture / actions / file` 五组全通过，覆盖全部 69 拍。
- [x] 最终桌面、手机接触表逐拍人工复核：共 138 张逐拍截图及桌面、手机目录截图，未发现切边或字幕遮挡。

最终截图目标：`/tmp/stage01-final`。该目录为本机临时验收产物，不随仓库发布。

## 7. 后续修改与发布

修改正文后，先用 `--units` 核对单元边界，再同步分镜；不要直接改生成的 HTML。改动通过上述门禁后，再运行全站构建、测试和新的临时目录打包，更新校验清单。

推送 main 会触发 Pages 发布。当前授权为本地分批提交并继续制作第 02 篇，不包含推送或部署。

## 8. 参考

- 体验参照：`https://www.human-md.ai/`，一次手势推进一拍。
- 图解画风源：`.site/serial_art.cjs`；本轮未修改。
- 机器人：`.site/assets/serial-robot-480.png`；沿用 M1 素材与制作声明，无新增位图。
- 旧产品方案路径 `.zcode/plans/plan-sess_40b89b59-4b14-41a4-9382-708cb012bc84.md` 在本次工作区不存在；未将其作为已核验依据。
