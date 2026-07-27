# 前端样式优化方案（第三轮）

## 1. 目标与边界

本轮聚焦“公共组件收敛、历史记录页面统一、复杂页面可维护性”，不改变接口、业务流程、文案含义或既有交互。

目标：

1. 历史/结果空状态统一使用一个公共组件，页面不再分别维护插画、标题、说明文本和基础布局。
2. 统一历史记录容器、卡片列表、筛选栏和加载/错误状态的视觉规则。
3. 继续拆分 500 行以上的复杂样式文件，并把大页面 JSX 按业务职责拆开。
4. 以样式门禁、构建和 Playwright 视觉回归保证改造不引入串页、双滚动或响应式问题。

不在本轮范围：

- 调整 API、数据库或任务轮询协议。
- 重做产品视觉风格、品牌色或业务文案。
- 删除仍被产品代码引用的图片、视频、原型或部署文件。

## 2. 当前审计基线

审计日期：2026-07-24。

| 指标 | 当前值 | 本轮目标 |
| --- | ---: | --- |
| 前端样式文件 | 324 | 通过职责合并减少无意义分散 |
| 前端样式行数 | 79,343 | 只在可读性改善时减少 |
| 真实重复选择器 | 63 | 不反弹，优先降低到 45 以下 |
| 超过 800 行的样式文件 | 0 | 保持 0 |
| 样式 `!important` | 0 | 保持 0 |
| 非标准宽度断点 | 0 | 保持 0 |
| 公共空状态组件引用 | 28 处 | 所有历史/结果空态使用公共组件 |

现有质量门禁：

- `npm.cmd run check:coverage`：样式归属与引用检查。
- `npm.cmd run check:redundancy`：重复选择器和样式文件规模阈值。
- `npm.cmd run check:styles`：令牌、作用域、`!important` 等样式规则。
- `npm.cmd run check:breakpoints`：只允许 375 / 768 / 1024 / 1440 / 1920 宽度断点。
- `npm.cmd run build` 与 `npm.cmd run test`：构建、单元与路由/视觉回归。

## 3. 核心问题

### 3.1 历史空状态仍有两套实现

当前已有：

- `src/components/FeedbackState.jsx`：通用反馈状态。
- `src/components/HistoryEmptyState.jsx`：历史/结果空状态封装。

但下列页面仍保留自定义空状态结构或第三方 `Empty` 组件：

- 资产账单：`features/assets/BillingCenterView.jsx`
- 数字人历史：`features/digital-human-hub/DigitalHumanHistoryView.jsx`
- 数字人形象库、音色库、预览区：`features/digital-human-v2/components/*`
- 视频生成历史：`features/video/VideoGenerationContent.jsx`
- 聊天初始空状态：`features/chat/ChatGenerationView.jsx`
- 音乐封面裁剪弹窗：`features/music-generation-ui/MusicCoverCropModal.jsx`

风险是：插画、标题字号、说明文字、最小高度、边框和居中方式再次产生差异。

### 3.2 历史容器和列表布局分散

语音、营销工具、资产、视频、数字人等页面分别定义了：

- 空态容器高度和居中规则；
- 历史列表网格/表格；
- 顶部工具栏、筛选、分页；
- 卡片边框、圆角和状态色。

虽然业务数据结构不同，但“容器壳层”和“状态反馈”可收敛，避免每个功能复制相近 CSS。

### 3.3 中大型样式文件仍较多

优先关注以下文件：

| 文件 | 当前行数 | 主要职责混合 |
| --- | ---: | --- |
| `features/audio-ui/voiceWorkbench.css` | 788 | 表单、历史、空态、卡片、响应式 |
| `features/article/articlePopularWorkbench.scss` | 783 | 工作台、模板、预览、覆盖规则 |
| `features/music/musicHistory.css` | 759 | 历史列表、播放器、歌词、控制条 |
| `features/assets/assetsBase.css` | 754 | 壳层、工具栏、账单、账户状态 |
| `features/assets/assetsProfile.css` | 723 | 账户信息、表单、提示、弹层 |
| `features/video-workflow/videoWorkflowStates.css` | 643 | 处理态、结果态、空态、历史态 |
| `features/marketing-tool-ui/marketingToolShared.css` | 611 | 共享工作台、运行态、历史态 |

### 3.4 大型页面组件承担过多职责

| 文件 | 当前行数 | 建议拆分 |
| --- | ---: | --- |
| `features/article/ArticleGenerationView.jsx` | 2,133 | 输入工作台、历史、结果、模板预览、任务轮询 |
| `features/assets/AssetsPage.jsx` | 1,399 | 资产画廊、账户、账单、收藏、路由视图 |
| `features/image/ImageGenerationView.jsx` | 1,257 | 生成表单、任务状态、结果展示、预览弹层 |
| `features/chat/ChatGenerationView.jsx` | 1,226 | 会话状态、消息流、输入区、历史、弹层 |
| `features/digital-human-v2/DigitalHumanV2View.jsx` | 840 | 形象选择、音色、场景、预览、生成任务 |

## 4. 设计原则

1. 公共组件只覆盖真正一致的结构；业务卡片内容、任务字段和操作按钮保留在功能模块内。
2. 公共组件不接受“任意 className 覆盖所有样式”的设计；只开放明确的变体，例如 `fill`、`compact`、`borderless`。
3. 共享样式放在 `src/styles/components.css`，共享 React 结构放在 `src/components/`，业务差异放在功能目录。
4. 迁移时先保持 DOM/交互等价，再删除旧 CSS；禁止仅新增公共组件而遗留旧图标、伪元素或说明文本。
5. 每个批次都运行对应路由、截图与五档宽度检查。

## 5. 分批执行计划

### 批次 A：历史空状态公共化

#### A1. 完善公共组件

目标文件：

- `src/components/HistoryEmptyState.jsx`
- `src/components/FeedbackState.jsx`
- `src/styles/components.css`

改造内容：

1. `HistoryEmptyState` 固定使用 `/assets/article/empty/kong.png`，不提供说明文本插槽。
2. 提供有限变体：
   - `fill`：填满工作区或卡片内容区域；
   - `compact`：用于弹窗、抽屉和小列表；
   - `borderless`：由父容器已提供边框时使用。
3. 统一插画宽度、标题字号、最小高度、居中方式、边框和圆角。
4. 仅允许 `title`、`className`（布局钩子）和明确变体；禁止传入任意描述段落。

验收：

- 公共组件只生成一张插画、一个标题，不包含 `<p>`。
- 375px 宽度下插画不溢出，标题不换行异常。
- 空态不会生成双插画（组件 `<img>` 与旧 `::before` 同时存在）。

#### A2. 迁移历史/结果空态

迁移顺序：

1. 营销工具：去水印、智能抠图、画质提升、反推提示词。
2. 音频工具：语音合成、音色转换、转录、视频配音。
3. 资产中心：作品、收藏、账单、积分明细。
4. 视频工具：视频生成、动作迁移、视频换脸。
5. 数字人：历史、预览、我的形象/音色空态。
6. 聊天、音乐、文章的结果/历史空态。

每个页面的处理步骤：

1. 替换自定义图标、插画、`strong` 和 `p` 为 `<HistoryEmptyState title="..." />`。
2. 删除或缩减对应的 `*-empty` CSS，只保留父布局确实需要的网格定位规则。
3. 删除旧 `svg`、`::before`、`p` 的兼容选择器，避免隐藏规则长期堆积。
4. 增加或更新该页面空态截图基线。

验收：

- 搜索历史/结果空态时，不再出现手写插画 `<img>`、图标加标题加说明的重复结构。
- 所有历史空态均为“插画 + 标题”，无说明文本。

### 批次 B：历史容器与状态反馈统一

新增或完善公共样式：

- `.ui-history-panel`：页面级历史内容区。
- `.ui-history-toolbar`：标题、筛选、操作按钮区域。
- `.ui-history-grid`：卡片型历史列表。
- `.ui-history-list`：列表/表格型历史记录。
- `.ui-history-status`：处理中、失败、完成状态徽标。

迁移策略：

1. 保留每个业务的卡片内容和操作逻辑。
2. 只迁移外层栅格、间距、工具栏、空态、状态徽标。
3. 对营销工具与视频工作流优先建立 `data-feature-module` 或功能根节点作用域，避免历史样式串页。

验收：

- 空态居中逻辑不再在多个功能 CSS 中重复定义。
- 历史页的筛选、卡片间距、边框和空态视觉一致。
- 所有历史页在 375 / 768 / 1024 / 1440 / 1920 下没有横向溢出或双滚动。

### 批次 C：样式文件职责拆分

#### C1. 音频工作台

将 `features/audio-ui/voiceWorkbench.css` 拆为：

- `voiceWorkbenchLayout.css`：页面框架、左右栏、响应式布局；
- `voiceWorkbenchComposer.css`：输入、上传、参数控件；
- `voiceHistory.css`：历史列表、卡片和空态定位；
- `voicePlayer.css`：播放器和下载/收藏控制；
- `voiceResponsive.css`：统一标准断点规则。

#### C2. 音乐历史与播放器

将 `features/music/musicHistory.css` 拆为：

- `musicHistoryList.css`；
- `musicMiniPlayer.css`；
- `musicLyrics.css`；
- `musicHistoryResponsive.css`。

#### C3. 资产中心

将 `assetsBase.css`、`assetsProfile.css`、`assetsBilling.css` 的共性部分迁移至：

- `assetsShell.css`；
- `assetsHistory.css`；
- `assetsAccount.css`；
- `assetsBilling.css`（仅账单业务差异）。

验收：

- 每个样式文件建议不超过 500 行，复杂文件不超过 650 行。
- 新文件按“基础 → 功能 → 状态 → 响应式”顺序导入。
- 不出现仅为覆盖前一个文件而存在的 `final`、`legacy`、`override` 命名文件。

### 批次 D：页面组件拆分

#### D1. 文章生成

将 `ArticleGenerationView.jsx` 划分为：

- `ArticleWorkbench.jsx`；
- `ArticleHistoryView.jsx`；
- `ArticleResultView.jsx`；
- `ArticleTemplateRail.jsx`；
- `useArticleGeneration.js`（任务、轮询和状态）。

#### D2. 聊天生成

将 `ChatGenerationView.jsx` 划分为：

- `ChatWorkspace.jsx`；
- `ChatMessageList.jsx`；
- `ChatComposer.jsx`；
- `ChatHistorySidebar.jsx`；
- `useChatConversation.js`。

#### D3. 资产中心与图片生成

- `AssetsPage.jsx`：按“画廊/收藏/账户/账单”路由视图拆分。
- `ImageGenerationView.jsx`：按“工作台/任务列表/结果预览/弹层”拆分。

验收：

- 页面入口组件建议控制在 450 行以内。
- 组件只负责视图组合；请求、轮询、映射和缓存进入 hook 或独立模块。
- 拆分后关键路由、任务创建、历史切换和预览操作行为不变。

### 批次 E：防回归与门禁收紧

1. 给所有迁移过的历史页建立四态截图：默认空态、加载态、处理态/结果态、错误态。
2. 为 `HistoryEmptyState` 增加组件级测试：单插画、无说明文本、`fill` 与 `compact` 变体。
3. 在 `check-redundancy.mjs` 中增加：
   - 空态组件外的重复文档插画结构报告；
   - `*-empty` 样式规则数量趋势报告；
   - 样式文件 650 行预警、800 行失败门禁。
4. 在 CI 保持执行：
   - `npm run prebuild`
   - `npm run build`
   - `npm run test`

## 6. 推荐排期

| 批次 | 工作量 | 依赖 | 交付 |
| --- | --- | --- | --- |
| A：空状态公共化 | 1–2 天 | 无 | `HistoryEmptyState` 覆盖所有历史/结果空态 |
| B：历史容器统一 | 1–2 天 | 批次 A | 公共历史容器、工具栏和状态样式 |
| C：样式职责拆分 | 2–3 天 | 批次 A/B | 音频、音乐、资产样式拆分 |
| D：页面组件拆分 | 3–5 天 | 批次 C | 文章、聊天、资产、图片生成组件化 |
| E：回归与门禁 | 1–2 天 | 全部 | 截图覆盖、CI 阈值和最终验收 |

## 7. 每批次验收命令

```powershell
Set-Location E:\CodeX\AI工作台\frontend-app
npm.cmd run prebuild
npm.cmd run build
npm.cmd run test
```

局部改造时，先运行对应 Playwright 路由测试；批次结束前必须执行上面的完整命令。

## 8. 风险与控制

| 风险 | 控制方式 |
| --- | --- |
| 公共空态造成双插画 | 删除旧 `svg`/`::before`，并为迁移页面更新截图 |
| 公共样式影响非历史页面 | 公共类使用 `ui-history-*` 前缀，业务样式仍受功能根节点约束 |
| 拆分改变 CSS 级联 | 保持原文件顺序，先移动再删除，逐功能回归 |
| 大组件拆分影响状态同步 | 先抽取纯展示组件，再抽取 hook；任务轮询保持单一数据源 |
| 静态资源误删 | 只删除已证明未引用的临时/构建产物，产品资源必须先运行引用审计 |

## 9. 完成定义

满足以下条件才视为第三轮完成：

1. 所有历史/结果空态使用公共组件或明确的公共变体。
2. 空态均只显示一张插画和一个标题，不显示描述文本。
3. 真实重复选择器不高于 45，且无跨功能模块样式串页。
4. 没有超过 800 行的样式文件，500 行以上文件均有明确职责边界。
5. 关键历史页四态截图和五档宽度回归全部通过。
6. `prebuild`、`build`、`test` 均通过。
