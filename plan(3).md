# Implementation Plan: 生成式AI聚合页 (SOWA Clone)

## Overview

基于极火AI (SOWA AI) 技术拆解文档，开发一个包含25个功能模块的生成式AI聚合平台。

### 核心特性
- **前端**: React 19 + Vite + Zustand + React Router + TypeScript
- **后端**: Node.js + Express/Fastify + MySQL/PostgreSQL + Redis
- **API来源**: KIE.ai (比官方便宜30%-50%)
- **文件存储**: 本地服务器 + KIE图床
- **用户系统**: 邮箱登录 + 微信登录 + Google登录
- **积分系统**: 预付费积分，按使用量扣减
- **国际化**: 预留多语言支持 (当前中文)

## Architecture Decisions

| 决策 | 说明 |
|------|------|
| **前端框架**: React 19 + Vite | 保留现有原型视觉成果，生态完善，动画表现力强 |
| **状态管理**: Zustand | 轻量、无样板代码、TypeScript支持好、适合模块化拆分 |
| **样式方案**: CSS变量 + Tailwind CSS | 延续现有原型样式系统，Tailwind加速开发 |
| **图标库**: lucide-react | 轻量、现代、可tree-shaking |
| **路由模式**: History模式 (React Router v6) | 更优雅的URL结构，支持嵌套路由和懒加载 |
| **后端框架**: Node.js + Express | 轻量灵活，与前端技术栈统一 |
| **数据库**: MySQL/PostgreSQL | 关系型数据库，支持事务 |
| **缓存**: Redis | 会话管理、任务状态缓存 |
| **API来源**: KIE.ai | 比官方便宜30%-50%，支持多种AI模型 |
| **文件存储**: 本地服务器 | 案例永久保留，其他定期清理 |
| **用户系统**: 自建 + OAuth | 邮箱注册 + 微信/Google第三方登录 |
| **积分系统**: 预付费积分制 | 按API消耗扣减积分 |
| **国际化**: react-i18next | 当前中文，预留多语言支持 |

## Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户界面层 (React 19)                     │
│  LandingPage │ LoginPage │ ImagePage │ VideoPage │ ChatPage... │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                        组件层                                   │
│  PromptInput │ ResultCard │ UploadZone │ Sidebar │ Header...   │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                        状态管理层 (Zustand)                     │
│  userStore │ creditsStore │ generatorStore │ assetsStore       │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                        前端API层                                │
│  generationApi │ chatApi │ taskApi │ userApi                   │
└───────────────────────────────┬─────────────────────────────────┘
                                │ HTTP/WebSocket
┌───────────────────────────────▼─────────────────────────────────┐
│                     后端服务层 (Node.js)                        │
│  AuthController │ CreditsController │ ProxyController          │
│  StorageController │ TaskController                              │
└───────────────────────────────┬─────────────────────────────────┘
                                │
         ┌──────────────────────┼──────────────────────┐
         │                      │                      │
┌────────▼────────┐   ┌─────────▼─────────┐   ┌──────▼──────┐
│   MySQL/PG      │   │      Redis        │   │   KIE.ai    │
│   用户/积分数据   │   │  会话/任务状态     │   │  AI模型API  │
└─────────────────┘   └───────────────────┘   └─────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│                        文件存储层                               │
│  本地文件系统 (案例永久保留, 其他定期清理)                       │
└─────────────────────────────────────────────────────────────────┘
```

## Vertical Slicing Strategy

采用垂直切片策略，每个任务交付一个可测试的完整功能路径：

**示例 - 图片生成功能垂直切片:**
```
┌─────────────────────────────────────────────────────┐
│  ImagePage.tsx (UI)                                 │
│      ↓                                              │
│  generatorStore (State)                             │
│      ↓                                              │
│  imageApi.generate() (API)                          │
│      ↓                                              │
│  WebSocket status update                            │
│      ↓                                              │
│  ResultCard display                                 │
└─────────────────────────────────────────────────────┘
```

---

## Phase 0: Backend Foundation (后端基础设施)

### Task 0.1: 后端项目初始化
- Node.js + Express项目搭建
- 数据库配置 (MySQL/PostgreSQL)
- Redis缓存配置
- JWT认证中间件

### Task 0.2: 用户系统数据库设计
- 用户表、积分账户表、积分流水表
- 第三方登录关联表
- 登录日志表

### Task 0.3: 用户认证API
- 注册/登录/登出接口
- 验证码发送
- Token刷新
- 密码重置

### Task 0.4: 积分系统API
- 余额查询
- 积分消费/充值
- 流水查询
- 积分不足拦截

### Task 0.5: 第三方登录集成
- 微信OAuth2.0登录
- Google OAuth2.0登录
- 账号绑定/解绑

### Task 0.6: KIE API代理服务
- KIE API请求封装
- 任务创建/查询代理
- Webhook回调接收
- 错误处理和重试

### Task 0.7: 文件存储服务
- 本地文件上传/下载
- 定期清理任务
- 案例文件标记

### Checkpoint 0: Backend Foundation Complete
- [ ] 所有后端API测试通过
- [ ] 数据库结构完整
- [ ] KIE代理服务正常

---

## Phase 1: Foundation (前端基础架构)

### Task 1: 项目脚手架搭建
- 初始化Vite + React 19 + TypeScript项目
- 配置路径别名、环境变量
- 安装核心依赖

### Task 2: CSS设计系统建立
- 定义CSS变量 (颜色、间距、圆角、阴影)
- 创建动画关键帧
- 响应式断点配置

### Task 3: 核心配置完成
- React Router v6 路由配置
- Zustand 状态管理配置（按功能模块拆分 Store）
- Axios实例配置（统一后端代理，禁止直连第三方）

### Task 4: 基础UI组件开发 (Part 1)
- Button组件
- Input组件
- Select组件

### Task 5: 基础UI组件开发 (Part 2)
- Modal组件
- Dropdown组件
- Tabs组件
- Toast组件

### Checkpoint 1: Foundation Complete
- [ ] 项目可启动 (`npm run dev`)
- [ ] 所有基础组件单元测试通过
- [ ] Storybook组件文档可访问

---

## Phase 2: Layout & Auth (布局与认证)

### Task 6: 布局组件开发
- AppLayout主布局
- Sidebar侧边栏导航
- Header顶部导航

### Task 7: Landing Page首页
- HeroSection英雄区
- FeatureSection功能展示
- CommunitySection社区展示
- 动画效果 (blob浮动、标题渐入)

### Task 8: 用户认证流程
- LoginPage登录页
- RegisterPage注册页
- userStore状态管理
- 路由守卫

### Checkpoint 2: Auth Flow Complete
- [ ] 用户可以注册账号
- [ ] 用户可以登录系统
- [ ] 未登录用户被重定向到登录页
- [ ] 登录状态持久化

---

## Phase 3: Core Features (核心功能)

### Task 9: 图片生成完整功能（模块化样板）
- 按 `features/image-generation/` 模块化规范开发，作为后续模块的复制样板
- ImagePage页面
- PromptInput输入组件
- ModelSelect/RatioSelect配置组件
- ResultGrid结果网格
- ResultCard结果卡片
- imageApi + generatorStore（Zustand，模块级拆分）
- WebSocket状态推送
- 模型配置与积分消耗配置抽取到 `config.ts`，禁止硬编码

### Task 10: 视频生成完整功能
- VideoPage页面
- VideoCard视频卡片
- 首帧模式支持
- videoApi扩展
- 视频预览播放器

### Task 11: AI对话功能
- ChatPage页面 (三栏布局)
- 对话列表组件
- 聊天消息组件
- 代码编辑器集成
- chatApi + chatStore

### Checkpoint 3: Core Features Complete
- [ ] 用户可以生成图片并查看结果
- [ ] 用户可以生成视频并预览
- [ ] 用户可以进行AI对话
- [ ] 生成状态实时更新
- [ ] 图片生成模块符合 `features/` 规范，可作为后续模块样板

---

## Phase 4: Creation Features (创作功能)

### Task 12: 数字人功能
- DigitalHumanPage页面
- 形象选择组件
- 配音配置组件
- 数字人预览

### Task 13: 图片数字人功能
- ImageDigitalHumanPage页面
- 图片上传驱动
- 音频/文本驱动模式

### Task 14: 动作迁移功能
- MotionTransferPage页面
- 单人图上传
- 动作视频上传
- 结果预览

### Task 15: 视频换脸功能
- VigglePage页面
- 模型选择
- 结果生成与预览

### Checkpoint 4: Creation Features Complete
- [ ] 数字人视频可生成
- [ ] 图片驱动功能正常
- [ ] 动作迁移效果符合预期

---

## Phase 5: Audio Features (音频功能)

### Task 16: TTS语音合成功能
- TTSPage页面
- 文本输入区
- 音色选择器
- 参数调节 (语速/音量/音调)
- 音频播放器

### Task 17: 音乐生成功能
- MusicPage页面
- 歌词编辑器
- 风格标签选择
- 音乐播放器

### Task 18: 音色转换功能
- VoiceConversionPage页面
- RVC声音克隆集成

### Checkpoint 5: Audio Features Complete
- [ ] TTS可正常生成语音
- [ ] 音乐创作流程完整
- [ ] 音色转换功能可用

---

## Phase 6: Marketing Tools (营销工具)

### Task 19: 爆款模板功能
- TemplatesPage页面
- 行业分类导航
- 模板网格展示
- 模板详情预览

### Task 20: 爆款图文编辑器
- ViralArticlePage页面
- Markdown编辑器
- 实时预览
- 主题切换
- 多平台发布按钮

### Checkpoint 6: Marketing Tools Complete
- [ ] 模板可浏览和使用
- [ ] 图文编辑器功能完整
- [ ] 预览渲染正确

---

## Phase 7: Utility Features (辅助功能)

### Task 21: 智能画布功能
- CanvasPage页面
- 多图上传
- 图层管理
- AI融合预览

### Task 22: 工具箱功能
- ToolsPage页面
- 14个工具卡片
- 各工具页面路由

### Task 23: 资产管理功能
- AssetsPage页面
- 分类筛选
- 批量操作
- 预览弹窗

### Task 24: 自动发布功能
- AutoPublishPage页面
- 平台授权
- 发布队列

### Checkpoint 7: Utility Features Complete
- [ ] 画布多图融合可用
- [ ] 工具箱入口完整
- [ ] 资产可管理

---

## Phase 8: Polish & Optimize (优化完善)

### Task 25: 响应式适配
- 移动端布局适配
- 平板布局适配
- 侧边栏折叠

### Task 26: 性能优化
- 路由懒加载验证
- 图片懒加载
- 代码分割优化
- 首屏加载优化

### Task 27: 动画与交互完善
- 页面过渡动画
- 加载骨架屏
- 错误边界处理
- Toast提示完善

### Checkpoint 8: Final Complete
- [ ] 响应式测试通过 (320px-1920px)
- [ ] Lighthouse性能分数 > 80
- [ ] 无控制台错误
- [ ] 所有页面功能可用

---

## Risks and Mitigations

| 风险 | 影响 | 缓解策略 | 状态 |
|------|------|----------|------|
| WebSocket断线重连 | 高 | 实现心跳检测 + 自动重连机制 | Phase 3实现 |
| 大文件上传失败 | 中 | 分片上传 + 断点续传 | 后续优化 |
| 视频预览兼容性 | 中 | 使用hls.js处理多种格式 | Phase 3实现 |
| Markdown渲染XSS | 高 | 使用DOMPurify净化HTML | Phase 6实现 |
| 状态管理复杂度 | 中 | 按功能模块拆分Store | Phase 1实现 |
| API接口Mock | 中 | 开发阶段直接对接KIE | 不使用Mock |
| 积分并发竞争 | 高 | 数据库事务 + 乐观锁 | Phase 0实现 |
| 用户恶意刷积分 | 高 | Rate Limiting + IP黑名单 | Phase 0实现 |
| KIE API不可用 | 高 | 错误重试 + 降级提示 | Phase 0实现 |
| 前端资产路径硬编码 | 高 | 构建工具管理资产 + base路径配置 + 子路径部署验证 | Phase 1实现 |

### 后续优化项 (MVP后)

- 分片上传大文件
- Webhook回调签名验证
- API响应缓存 (Redis)
- 数据库读写分离

---

## 架构原则与模块化规范

> 以下三条为已锁定架构原则，后续所有技术决策与代码组织必须服从。

### 原则一：保留现有前端视觉成果，技术栈服从已有成果

- **执行决策**：沿用 React 19 + Vite 技术栈，不再为 Vue 迁移付出任何成本。
- **文档要求**：所有技术文档、接口示例、任务描述必须与 React / Zustand / React Router 对齐。
- **视觉资产**：当前 `SplashScreen`、`Dashboard`、`Sidebar` 的动画表现、交互气质、品牌 Token 必须完整保留，仅做“去数据化”和“组件化”拆解，不重新设计。

### 原则二：系统必须是模块化能力架构（模块化 AI 能力容器）

该系统不是“单一产品流程页面”，而是**后端驱动的模块化 AI 能力平台**。页面只是承载层，功能模块才是核心。

每个 AI 子功能必须按统一模块骨架组织，支持独立上线、独立下线、独立演进：

```
src/features/{feature-name}/
├── components/          # 本模块专属 UI 组件
│   ├── PromptInput.tsx
│   ├── ModelSelector.tsx
│   └── ResultGrid.tsx
├── hooks/               # 本模块专属业务 hooks
│   └── useTaskPolling.ts
├── api.ts               # 本模块 API 封装（只调用自建后端）
├── store.ts             # 本模块 Zustand slice
├── types.ts             # 本模块类型定义
├── workflow/            # （可选）工作流编排配置
├── agent/               # （可选）智能体配置与提示词
├── schema/              # （可选）表单校验 schema (zod)
├── config.ts            # 模型列表、默认参数、积分消耗配置
└── index.ts             # 模块统一出口（组件 + 路由 + 类型）
```

**模块注册方式**：
- 新增能力时，在 `src/features/` 下新建文件夹，按骨架填充，在 `src/app/routes.tsx` 注册路由即可。
- 下线能力时，删除模块文件夹 + 路由注册项，不影响其他模块。
- 不同能力可对接不同调用方式（单次生成、任务编排、智能体回合），但对外暴露为统一入口。

### 原则三：所有 AI 能力统一经由后端暴露，前端零感知第三方

前端**绝不直接调用 KIE.ai 或任何外部模型服务**，所有请求必须经过自建 Node.js 后端。

**前端边界**：
- 只认识平台自身的 REST / WebSocket 接口
- 不持有任何第三方 API Key
- 不写任何供应商特有逻辑（如 KIE 的字段差异、OpenAI 的格式差异）

**后端边界**：
- 统一做代理层、编排层、安全层
- 负责鉴权、限流、计费、日志、缓存、审计
- 以后更换模型供应商，前端完全无感知

### 前后端统一接口契约（必须在 Phase 0 结束前敲定）

#### 1. 任务生命周期协议（所有生成类能力共用）

```typescript
// 创建任务
POST /api/tasks
Body: {
  type: 'image' | 'video' | 'audio' | 'chat',
  model: string,           // 后端映射到具体供应商模型
  params: object,          // 各能力不同参数
  callbackUrl?: string     // 可选，内部 webhook
}
Response: { taskId: string }

// 查询任务状态
GET /api/tasks/:taskId
Response: {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;        // 0-100
  result?: {
    type: 'image' | 'video' | 'audio';
    urls: string[];
  };
  error?: string;
  creditsSpent: number;
  createdAt: string;
  completedAt?: string;
}

// 列表查询（资产管理）
GET /api/tasks?type=&status=&page=&limit=

// 取消/删除
DELETE /api/tasks/:taskId
```

#### 2. 积分系统接口

```typescript
GET    /api/credits/balance
GET    /api/credits/transactions?page=&limit=
POST   /api/credits/consume      // 后端内部调用，前端不直接消费
```

#### 3. WebSocket 实时推送协议

```
连接: wss://api.yourdomain.com/ws?token=<jwt>
消息格式:
{
  "type": "task_update" | "credits_update" | "system_notice",
  "payload": object,
  "timestamp": 1714353245
}
```

#### 4. 认证接口

```typescript
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
GET  /api/auth/me
POST /api/auth/oauth/wechat     // 微信登录
POST /api/auth/oauth/google     // Google 登录
```

### 前端分层规范

```
表现层 (Presentation)
  └── pages/ 和 features/*/components/
  职责：纯渲染 + 动画，不包含业务逻辑，不直接调用 API

业务组件层 (Feature Components)
  └── features/*/components/（复杂交互组件）
  职责：接收 props + 回调，处理 UI 交互，不直接调用 API

状态管理层 (State Management)
  └── shared/stores/ 和 features/*/store.ts
  技术：Zustand
  职责：持有业务状态，封装异步 action，处理乐观更新

API 适配层 (API Adapter)
  └── shared/api/client.ts 和 features/*/api.ts
  技术：Axios + 统一拦截器
  职责：所有 HTTP/WebSocket 调用集中在此，对外暴露类型化接口
```

---

## 已确认决策

| 问题 | 决策 |
|------|------|
| **后端API方案** | ✅ 使用KIE.ai API (比官方便宜30%-50%) |
| **用户系统** | ✅ 邮箱登录 + 微信登录 + Google登录 |
| **文件存储** | ✅ 本地服务器存储，案例永久保留，其他定期清理 |
| **前端框架** | ✅ React 19 + Vite，保留现有视觉成果 |
| **国际化** | ✅ 当前中文，预留 react-i18next 多语言支持 |
| **积分系统** | ✅ 预付费积分制，按API消耗扣减 |
| **图床** | ✅ 使用KIE自带图床 + 本地备份 |

---

## Timeline Estimate

| 阶段 | 预估工时 | 缓冲30% | 任务数 |
|------|----------|---------|--------|
| Phase 0: Backend | 6天 | 8天 | 9 |
| Phase 1: Foundation | 4天 | 5天 | 7 |
| Phase 2: Layout & Auth | 3天 | 4天 | 4 |
| Phase 3: Core Features | 4天 | 5天 | 3 |
| Phase 4: Creation Features | 3天 | 4天 | 4 |
| Phase 5: Audio Features | 2天 | 3天 | 3 |
| Phase 6: Marketing Tools | 2天 | 3天 | 2 |
| Phase 7: Utility Features | 3天 | 4天 | 4 |
| Phase 8: Polish | 2天 | 3天 | 4 |
| **Total** | **29天** | **~38天** | **40** |

> 注: 缓冲时间用于处理调试、测试、返工等不可预见情况

---

## 相关文档

- [任务清单](./todo.md) - 详细的验收标准和文件列表
- [KIE API参考](./kie-api-reference.md) - KIE.ai API接口文档

---

*Plan Version: 3.0.0*
*Created: 2026-04-28*
*Updated: 2026-04-29*
*Changes: 架构原则锁定 - 沿用React保留视觉成果、模块化能力容器、统一后端代理；技术栈Vue3→React19/Pinia→Zustand/VueRouter→ReactRouter；新增统一任务协议与模块化规范*
