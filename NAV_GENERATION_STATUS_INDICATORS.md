# 侧边栏生成状态指示（黄点 / 红点）设计说明

## 1. 背景与目标

用户在 Facemini 工作台发起 AI 生成任务后，常会切换到其他功能页继续操作。当前侧边栏 `FeatureSidebar` 无法感知各模块的生成进度与「是否有新结果未查看」，用户需要手动回到对应功能页确认状态。

本方案在侧边栏导航项右侧增加两类状态点：

| 状态 | 颜色 | 含义 |
|------|------|------|
| 生成中 | **黄点** | 该功能下有任务处于 `pending` / `processing`（及约定的运行中状态） |
| 未读完成 | **红点** | 该功能下有任务已生成完成，但用户尚未「已读」 |

目标：

1. 用户切走页面后，仍能从侧边栏知道「哪里还在生成」。
2. 任务完成后，即使用户不在该页，也能看到「有新结果」提示。
3. 进入对应功能页并确认后，红点消失。

---

## 2. UI 规范

### 2.1 展示位置

参考产品标注：状态点显示在**子菜单文字右侧**（分组内的 `feature-nav-child`），与菜单项垂直居中对齐。

```
视觉生成
  图片生成          ●   ← 黄点或红点
  视频生成
  ...
```

顶层独立项（如「数字人形象」「爆款图文」）使用同样的 `feature-nav-item` 右侧点位。

### 2.2 优先级

同一 `navId` 同时满足多种条件时，只显示一个点：

1. **黄点优先** — 只要存在运行中任务，一律显示黄点，不显示红点。
2. 无运行中任务、存在未读完成任务 → **红点**。
3. 均无 → 不显示。

### 2.3 样式建议

```css
.feature-nav-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  margin-left: auto;
}

.feature-nav-status-dot.is-running {
  background: #f5b400;
  box-shadow: 0 0 0 2px rgba(245, 180, 0, 0.25);
}

.feature-nav-status-dot.is-unread {
  background: #e5484d;
  box-shadow: 0 0 0 2px rgba(229, 72, 77, 0.2);
}
```

分组标题（「视觉生成」「营销工具」等）**不显示**聚合点；仅在具体功能子项上展示，避免歧义。

---

## 3. 状态定义

### 3.1 运行中（黄点）

与现有 `frontend-app/src/api/taskPolling.js` 保持一致：

```js
const RUNNING_TASK_STATUSES = new Set([
  "pending",
  "processing",
  "partial_completed", // 图文等多阶段任务按需纳入
]);
```

某 `navId` 下任意任务命中上述状态 → `running: true`。

### 3.2 未读完成（红点）

**未读**：任务从非完成态变为 `completed`（或各模块约定的成功态）之后，用户尚未对该 `navId` 执行「已读」操作。

建议成功态集合（按模块微调）：

```js
const COMPLETED_TASK_STATUSES = new Set(["completed", "success"]);
const FAILED_TASK_STATUSES = new Set(["failed", "error", "cancelled"]);
```

- **失败任务默认不产生红点**（避免用户以为有新成果）；可在二期支持「失败未读」灰点。
- **用户当前正在该功能页且该任务结果已在视口内展示** → 可视为已读（见 4.2）。

### 3.3 navId 与业务模块映射

侧边栏 `navItems` / `navSections` 定义见 `frontend-app/src/main.jsx`。

| navId | 功能 | 任务 API / 视图 | 现有轮询 |
|-------|------|-----------------|----------|
| `image` | 图片生成 | `imageApi.getTasks` | ✅ `setHasRunningTasks` |
| `video` | 视频生成 | `videoApi.getTasks` | ✅ |
| `face-swap` | 视频换脸 | `faceSwapApi.getTasks` | ✅ |
| `motion` | 动作迁移 | `motionTransferApi.getTasks` | ✅ |
| `digital-human` | 数字人形象 | `digitalHumanApi` / `imageDigitalHumanApi` | ✅ |
| `article` | 爆款图文 | `articleApi` packages/tasks | ✅ |
| `watermark` | 去水印 | `watermarkApi.getTasks` | ✅ |
| `remove-bg` | 智能抠图 | `removeBgApi.getTasks` | ✅ |
| `enhance` | 画质提升 | `enhanceApi.getTasks` | ✅ |
| `replicate` | 反推提示词 | 待确认 API | 待接入 |
| `voice` | 语音合成 | 待确认 | 待接入 |
| `music` | AI 音乐 | `musicApi` | 待接入 |
| `voice-convert` | 音色转换 | 待确认 | 待接入 |
| `transcribe` | 语音转文字 | 待确认 | 待接入 |
| `video-voice` | 视频配音 | 待确认 | 待接入 |
| `chat` | 大模型 | 流式对话，**一期可排除** | — |

一期建议覆盖：**图片、视频、换脸、动作迁移、数字人、爆款图文、去水印、抠图、画质提升**（与 `AssetsPage` 资产汇总重叠度高的模块）。

---

## 4. 产品规则

### 4.1 黄点出现

- 用户在本页或其他页发起生成，任务进入运行中 → 对应 `navId` 黄点亮起。
- 用户切换到其他 `navId` 后，原模块仍在后台轮询（`FeatureModuleKeepAlive` 已常驻 DOM）→ 黄点持续直到任务结束。

### 4.2 红点出现

满足以下全部条件时记为未读，显示红点：

1. 任务进入完成态（`completed` / `success`）。
2. 任务完成时，用户**不在**该 `navId` 页面（`activeNav !== navId`）。
3. 该任务 ID 不在该 `navId` 的「已读任务集合」中。

**不显示红点的情形：**

- 用户一直停留在该功能页直到任务完成，且结果区已展示该任务（视为当场已读）。
- 任务失败 / 取消。
- 用户已完成「全部已读」操作（进入该 nav 时批量标记，见 4.3）。

### 4.3 红点清除（已读）

以下任一触发即清除该 `navId` 的红点（并更新已读记录）：

1. **用户点击进入该 `navId`**（`onNavChange(navId)`）— 推荐默认策略：进入即标记该模块当前所有未读完成任务为已读。
2. （可选细化）用户点击打开具体结果卡片 / 播放器 — 仅标记该任务已读；全部已读后红点消失。

推荐一期采用 **策略 1（进入即已读）**，实现简单、符合「点进去看」的预期。

### 4.4 刷新与重进

| 场景 | 黄点 | 红点 |
|------|------|------|
| 浏览器刷新 | 重新拉任务列表，有运行中则黄点恢复 | 依赖本地已读缓存（见 5.2），未读红点可恢复 |
| 退出登录 | 清除 | 清除 |
| 游客模式 | 可不展示或仅内存态 | 可不展示 |

---

## 5. 技术方案

### 5.1 总体架构

```
各生成模块 (ImageGenerationView, MusicGenerationView, …)
        │ 任务列表变化时上报
        ▼
navGenerationStatusStore  （全局状态 / 事件总线）
        │ 订阅
        ▼
FeatureSidebar  →  渲染黄点 / 红点
        ▲
ImageFeaturePage  →  activeNav 变化时触发 markNavRead(navId)
```

参考现有 `frontend-app/src/api/creditsEvents.js` 模式，新增：

```
frontend-app/src/api/navGenerationStatus.js
```

建议 API：

```js
// 模块上报：{ navId, tasks } 或 { navId, running, unreadCount, unreadTaskIds }
export function reportNavGenerationStatus(navId, snapshot);

// 侧边栏 / 壳层订阅
export function subscribeNavGenerationStatus(listener);

// 进入某 nav 时标记已读
export function markNavGenerationRead(navId);

// 登出时清空
export function resetNavGenerationStatus();
```

### 5.2 已读持久化（红点）

**一期：localStorage**

```js
// key: facemini:nav-generation-read
{
  "image": { "readTaskIds": ["123", "456"], "lastReadAt": 1719123456789 },
  "video": { ... }
}
```

逻辑：

- 任务完成时，若不在当前页，将 `taskId` 写入内存中的 `unreadTaskIds`。
- `markNavGenerationRead(navId)` 将该 nav 下所有当前未读 ID 合并进 `readTaskIds`，并清空未读集合。
- 启动时对比服务端任务列表：`completed` 且 `id ∉ readTaskIds` → 恢复红点。

**二期（可选）：后端**

在任务表或独立表增加 `read_at` / `seen_at`，支持多端同步。一期不做。

### 5.3 模块接入方式

每个生成视图在任务列表更新处增加统一上报（伪代码）：

```js
import { reportNavGenerationStatus } from "../../api/navGenerationStatus";
import { hasRunningTasks } from "../../api/taskPolling";

useEffect(() => {
  reportNavGenerationStatus("image", {
    tasks: cards,
    activeNav, // 由壳层注入或从 context 读取
  });
}, [cards, activeNav]);
```

`reportNavGenerationStatus` 内部计算：

- `running = hasRunningTasks(tasks)`
- `unreadTaskIds` = 新完成且满足 4.2 条件的 ID

已有 `setHasRunningTasks` 的模块，黄点数据可直接复用，无需重复轮询。

### 5.4 侧边栏改造

文件：`frontend-app/src/main.jsx` → `FeatureSidebar`

```jsx
const navStatus = useNavGenerationStatus(); // { image: { running, unread }, ... }

<span className="feature-nav-child-label">{item.label}</span>
{navStatus[item.id]?.running ? (
  <span className="feature-nav-status-dot is-running" aria-label="生成中" />
) : navStatus[item.id]?.unread ? (
  <span className="feature-nav-status-dot is-unread" aria-label="有新结果" />
) : null}
```

`ImageFeaturePage` 的 `handleNavChange` 中：

```js
if (featureNavIdSet.has(nextId)) {
  markNavGenerationRead(nextId);
}
```

注意：从 A 切到 B 时只标记 B 为已读；A 上未查看的完成结果应保留红点（符合预期）。

### 5.5 与 KeepAlive 的关系

`FeatureModuleKeepAlive` 保证模块切换不卸载，任务轮询可继续，**有利于黄点准确性**。

尚未访问过的模块（`!visitedIds.has(id)`）无 DOM、无轮询 → 若用户从未打开过「视频生成」，但在创作中心通过 deeplink 触发了视频任务，需要：

- **壳层统一轮询**（二期），或
- 一期接受局限：仅用户至少进入过一次该模块后，侧边栏状态才准确。

一期文档约定：**以用户曾进入过该模块为前提**；创作中心跳转时 `handleOpenFeature` 已会 `setVisitedIds`，一般可覆盖。

---

## 6. 实施分期

### Phase 1 — MVP（约 2～3 天）

- [ ] 新增 `navGenerationStatus.js` + localStorage 已读
- [ ] `FeatureSidebar` 黄点 / 红点 UI
- [ ] `ImageFeaturePage` 导航切换时 `markNavGenerationRead`
- [ ] 接入模块：`image`、`video`、`article`、`watermark`、`remove-bg`、`enhance`
- [ ] 登出清空状态

### Phase 2 — 覆盖扩展（约 2 天）

- [ ] `face-swap`、`motion`、`digital-human`
- [ ] `music`、`voice`、`voice-convert`、`transcribe`、`video-voice`
- [ ] 失败任务可选提示（灰点 / 角标数字）

### Phase 3 — 体验增强（可选）

- [ ] 红点多任务时显示数量角标 `3`
- [ ] 后端 `read_at` 多端同步
- [ ] 创作中心发起任务时壳层轻量轮询，覆盖未访问模块

---

## 7. 边界情况

| 情况 | 处理 |
|------|------|
| 同一 nav 多任务并行 | 任一运行中 → 黄点；全部完成且存在未读 → 红点 |
| 任务被用户删除 | 从 unread / running 计算中剔除 |
| 重新生成同一入口 | 新 taskId，旧已读记录不影响新任务 |
| 图文 package 多图部分完成 | `partial_completed` 算黄点；package 整体 `completed` 算红点 |
| 音乐歌词同步 `processing` | 仅歌词同步不亮黄点，或单独子状态（需产品确认） |
| 当前页完成任务 | 不亮红点（4.2） |
| 快速切换 nav | `markNavRead` 与任务完成事件竞态：以完成事件时间戳 vs `lastReadAt` 判定 |

---

## 8. 测试要点

1. 在图片生成发起任务 → 切到创作中心 → 侧边栏「图片生成」黄点。
2. 等待完成 → 黄点消失 → 红点出现。
3. 点击进入图片生成 → 红点消失。
4. 停留在图片生成页直到完成 → 不出现红点。
5. 刷新页面 → 未完成仍黄点；已完成未读仍红点（localStorage）。
6. 登出再登录 → 状态清空。
7. 失败任务 → 无红点。

---

## 9. 相关文件索引

| 文件 | 说明 |
|------|------|
| `frontend-app/src/main.jsx` | `FeatureSidebar`、`navItems`、`ImageFeaturePage` |
| `frontend-app/src/api/taskPolling.js` | 运行中状态、轮询控制器 |
| `frontend-app/src/api/creditsEvents.js` | 可参考的事件总线模式 |
| `frontend-app/src/styles.css` | `.feature-nav-child` 等侧边栏样式 |

---

## 10. 待产品确认

1. 红点清除：进入功能页即全部已读，还是必须点开具体结果？
2. `chat` 大模型是否纳入（流式无传统 task 列表）？
3. 音乐「歌词同步中」是否算生成中黄点？
4. 红点是否需要在刷新后保留（当前方案：保留）？
5. 失败任务是否需要弱提示？

确认后即可按 Phase 1 开发。
