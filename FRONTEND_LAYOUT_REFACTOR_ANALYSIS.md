# Frontend Layout Refactor Analysis

## 背景

当前前端项目已经出现明显的 Layout 债务：入口文件承担过多职责，全局样式体量过大，业务页面各自管理高度、滚动、间距和固定定位，导致后续只能通过大量覆盖样式继续修补。数字人 V2 页面本身有较清晰的左右工作台结构，但它也被外层布局、高度计算和全局样式影响，难以稳定扩展。

本文档先只分析布局重构方向，不涉及具体代码修改。

## 当前主要问题

### 1. 入口文件职责过重

`frontend-app/src/main.jsx` 当前同时承担：

- React 挂载和全局 Provider
- 路由判断
- 登录态和积分状态
- 顶部栏、侧边栏、功能页容器
- 多个业务页面的装配
- 部分业务数据和工具函数

这会让 Layout 逻辑和业务逻辑混在一起。后续如果调整功能页外壳、侧栏、顶部栏或滚动策略，很容易牵动大量无关业务代码。

理想状态下，`main.jsx` 只负责应用挂载，App Shell、Feature Shell、业务路由、业务页面分别拆开。

### 2. 全局样式污染严重

`frontend-app/src/styles.scss` 和 `frontend-app/src/styles.css` 体量很大，包含大量跨模块规则，例如：

- 针对具体 feature 的 `[data-feature-module="..."]` 覆盖
- 大量强制覆盖标记
- `:has()` 选择器修补局部布局
- 多处 `height: 100vh`、`min-height: 100vh`
- 多层 `overflow: hidden` / `overflow-y: auto`

这些写法通常说明页面没有统一的布局边界。每个业务模块都在自行争夺高度和滚动权，最终导致样式相互覆盖。

### 3. 滚动容器不统一

当前布局中可能同时存在多层滚动容器：

- 页面 Shell
- 主内容区
- Feature keep-alive 容器
- 业务页面 root
- 业务页面内部左右面板

这种结构容易造成：

- 页面高度计算不稳定
- 内容被截断
- 弹窗、抽屉、固定底栏定位异常
- 移动端滚动体验差
- 某些页面需要额外 `clearStaleGlobalScrollLocks`

布局重构需要明确规则：通常一个页面只应该有一个主滚动层，局部面板滚动必须由稳定的父容器约束。

### 4. 业务页面硬编码外层高度

数字人 V2 中存在典型例子：

```css
.dhv2-root {
  height: calc(100vh - 64px);
  overflow: hidden;
}
```

这意味着数字人页面知道外层顶部栏高度。这个职责不应该由业务页面承担。一旦顶部栏高度变化、侧栏布局变化、移动端布局变化，业务页面就需要跟着改。

业务页面应该只接收父容器提供的可用空间，例如 `height: 100%`、`min-height: 0`，而不是自己计算 viewport。

### 5. Layout 与视觉样式混在一起

很多 CSS 同时控制：

- 页面结构
- 滚动
- 间距
- 卡片视觉
- 按钮视觉
- 状态颜色
- 响应式规则

建议把 Layout 类和 Component Skin 类分离。比如：

- `FeatureShell` 控制整体应用布局
- `WorkspaceLayout` 控制业务工作台布局
- `Card`、`Button`、`Field` 控制视觉组件
- 业务 CSS 只保留业务专属细节

### 6. 数字人 V2 文案存在乱码

`frontend-app/src/features/digital-human-v2/DigitalHumanV2View.jsx` 中存在乱码字符串，例如 `涓€?`、`宸叉仮澶嶉粯璁ら厤缃?`。这不是 Layout 问题，但会影响 UI 质量和后续重构判断。

建议后续单独处理编码和文案常量，将文案集中到常量文件或 i18n 层。

## 重构目标

### 总体目标

建立稳定的前端 Layout 标准，让业务页面不再自行管理应用级高度、侧栏、顶部栏和主滚动层。

### 具体目标

- `main.jsx` 只保留应用挂载和 Provider
- App Shell 管理整站级布局
- Feature Shell 管理侧栏、顶部栏、主内容区
- 业务页面只管理自己的内容布局
- 全局样式只放 tokens、reset、基础组件和布局 primitives
- 删除大部分强制覆盖标记和跨模块覆盖
- 统一滚动策略和 `min-height: 0` 使用
- 数字人 V2 接入统一工作台布局

## 建议的新布局分层

### 1. App 层

建议拆分为：

```text
src/app/App.jsx
src/app/AppRouter.jsx
src/app/authState.js
```

职责：

- 应用状态
- 路由判断
- 登录态
- 全局弹窗入口
- Provider 装配

### 2. Layout 层

建议新增：

```text
src/layouts/AppShell.jsx
src/layouts/FeatureShell.jsx
src/layouts/FeatureSidebar.jsx
src/layouts/WorkbenchTopbar.jsx
src/layouts/FeatureViewport.jsx
src/layouts/WorkspaceLayout.jsx
```

职责：

- `AppShell`：整站页面边界
- `FeatureShell`：功能区主布局
- `FeatureSidebar`：左侧导航
- `WorkbenchTopbar`：工作台顶部栏
- `FeatureViewport`：唯一主内容滚动容器
- `WorkspaceLayout`：业务工作台通用布局，例如左右栏、三栏、画布模式

### 3. Feature 层

业务页面只关注业务内容，例如：

```jsx
<WorkspaceLayout variant="two-pane">
  <WorkspaceSidebar>
    配置区
  </WorkspaceSidebar>
  <WorkspaceMain>
    素材库或预览区
  </WorkspaceMain>
</WorkspaceLayout>
```

数字人 V2、图片生成、视频生成、语音合成、爆款图文等页面都可以逐步接入统一工作台布局。

## 推荐布局标准

### 应用外壳

```css
.app-shell {
  min-height: 100dvh;
}

.feature-shell {
  display: grid;
  grid-template-columns: var(--feature-sidebar-width) minmax(0, 1fr);
  height: 100dvh;
  overflow: hidden;
}

.feature-content {
  display: grid;
  grid-template-rows: var(--workbench-topbar-height) minmax(0, 1fr);
  min-width: 0;
  min-height: 0;
}

.feature-viewport {
  min-width: 0;
  min-height: 0;
  overflow: auto;
}
```

### 业务工作台

```css
.workspace-layout {
  height: 100%;
  min-height: 0;
}

.workspace-layout--two-pane {
  display: grid;
  grid-template-columns: var(--workspace-sidebar-width) minmax(0, 1fr);
}

.workspace-pane {
  min-width: 0;
  min-height: 0;
}

.workspace-pane--scroll {
  overflow: auto;
}
```

核心原则：业务页面不要再写 `100vh - topbarHeight`，而是继承父容器的可用空间。

## 数字人 V2 改造建议

当前数字人 V2 页面结构：

```jsx
<section className="dhv2-root">
  <div className="dhv2-workspace">
    <aside className="dhv2-sidebar">...</aside>
    <AvatarLibraryPanel />
    或
    <PreviewPanel />
  </div>
</section>
```

这个结构可以保留，但建议调整职责：

### 保留

- 左侧配置区
- 右侧素材库 / 预览切换
- 配置区内部滚动
- 生成按钮固定在左侧底部
- 右侧素材网格独立滚动

### 调整

- `.dhv2-root` 不再使用 `height: calc(100vh - 64px)`
- `.dhv2-root` 改为 `height: 100%; min-height: 0`
- `.dhv2-workspace` 使用统一 `WorkspaceLayout`
- 左侧宽度从业务 CSS 变量逐步迁移到 layout token
- Modal、Toast 的 z-index 使用统一 overlay token
- 表单卡片、分段按钮、选择器逐步抽公共组件样式

### 数字人 V2 优先问题

- 左侧面板宽度固定 420px，缺少中间屏适配策略
- 右侧素材库 grid 固定 4 列，响应式较粗糙
- 预览区和素材库是两个不同组件，但外层容器职责不统一
- `GenerateFooter` 属于 layout sticky/footer 行为，建议受 `WorkspaceSidebar` 管理
- CSS 文件同时包含页面布局、组件视觉、弹窗、语音选择器、素材库、预览、草稿等大量内容，建议拆分

## 分阶段实施方案

### Phase 1：建立 Layout 骨架

目标：不大改视觉，只建立稳定页面外壳。

建议任务：

- 拆出 `FeatureShell`
- 拆出 `FeatureSidebar`
- 拆出 `WorkbenchTopbar`
- 拆出 `FeatureViewport`
- 让 `main.jsx` 不再直接定义大量 Layout 组件
- 明确只有 `FeatureViewport` 负责主内容滚动

验收标准：

- 首页和功能页正常打开
- 侧栏、顶部栏位置稳定
- 页面不出现双滚动条
- 数字人 V2 不再依赖 `calc(100vh - 64px)`

### Phase 2：数字人 V2 接入标准工作台

目标：先把当前打开且问题明显的页面规范化。

建议任务：

- 引入 `WorkspaceLayout`
- 数字人 V2 使用 `WorkspaceSidebar` + `WorkspaceMain`
- 左侧配置区和右侧预览区统一滚动策略
- 清理 `digitalHumanV2.css` 中与应用外壳相关的高度计算
- 初步拆分数字人 V2 CSS

验收标准：

- 左侧配置滚动正常
- 生成按钮稳定在左下区域
- 右侧素材库滚动正常
- 右侧预览视频不被截断
- 中等屏幕和移动端有可接受布局

### Phase 3：清理全局样式覆盖

目标：减少不可控副作用。

建议任务：

- 盘点 `styles.scss` 中所有强制覆盖标记
- 删除针对特定 feature 的全局 override
- 把业务样式迁回各 feature 目录
- 抽出基础 tokens 和布局 primitives
- 合并重复的 card、toolbar、button、field 样式

验收标准：

- 全局样式不再大量感知具体业务页面
- `styles.scss` 只保留全局必要内容
- 各 feature 样式边界清晰

### Phase 4：推广到其他功能页

目标：让图片、视频、语音、图文等页面共享同一套工作台规则。

建议任务：

- 图片生成接入 `WorkspaceLayout`
- 视频生成接入 `WorkspaceLayout`
- 音频相关页面接入统一 composer/result/history 布局
- 爆款图文移除全局布局补丁
- 统一空状态、历史面板、结果预览、底部操作栏

验收标准：

- 新增功能页不再需要写应用级布局 CSS
- 不再通过 `:has()` 和强制覆盖标记修复主布局
- 主功能页的响应式规则一致

## 风险点

- 当前存在未提交改动，重构前需要确认哪些是用户改动，不能回滚。
- `styles.css` 和 `styles.scss` 似乎同时存在大量重复内容，需要确认构建实际引用哪个文件。
- 部分业务页面可能依赖现有全局 override，删除时需要逐页验证。
- Keep-alive 机制可能影响高度和滚动恢复，需要单独测试。
- 乱码文案需要谨慎处理，避免误改业务逻辑。

## 建议优先级

推荐先做：

1. 拆 Layout，不改视觉。
2. 数字人 V2 去掉外层高度依赖。
3. 统一主滚动容器。
4. 再清理全局 override。

不建议一开始就做：

- 全站视觉重设
- 大规模删除 CSS
- 同时重构多个业务页面
- 直接替换所有组件结构

## 初步结论

当前项目最需要解决的是 Layout 权责边界，而不是单纯调样式。只要 App Shell、Feature Shell、Workspace Layout 三层稳定下来，后续页面样式才能逐步变干净。数字人 V2 适合作为第一批试点页面，因为它已有明确的左右工作台结构，重构收益明显，风险也相对可控。
