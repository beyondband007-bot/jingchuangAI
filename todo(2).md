# TODO: 生成式AI聚合页开发任务清单

> 状态说明: `[ ]` 待办 | `[x]` 完成 | `[-]` 进行中
> API来源: KIE.ai
> 后端: 自建Node.js服务
> 开发模式: **增量 Sprint，前后端并行，每 2-3 天一次联调**

---

## 开发前置约定（启动前必须全部确认）

以下约定在 Sprint 1 启动前由前后端负责人共同确认，写入代码库，开发期间严格遵守。

### 1. 端口规划（开发环境）

| 服务 | 端口 | 用途 | 说明 |
|------|------|------|------|
| 前端 dev server | `5174` | Vite HMR | `npm run dev` 默认 |
| 后端 API | `3001` | Express | `server/.env` 中 `PORT=3001` |
| MySQL | `3307` | 数据库 | 本地 Docker 或安装实例 |
| Redis | `6380` | 缓存/会话 | 本地 Docker 或安装实例 |

**约束**：开发期间端口固定，任何人不得擅自变更。如需调整，必须在群聊中同步并更新本文档。

### 2. 环境变量命名规范

**前端**（`frontend/.env` / `frontend/.env.production`）：
```bash
# 必填
VITE_API_BASE_URL=http://localhost:3001      # 后端 API 基址（生产环境改为域名）
VITE_ASSET_BASE_URL=/                        # 静态资源 base 路径（子路径部署时修改）
VITE_WS_URL=ws://localhost:3001              # WebSocket 连接地址

# 可选
VITE_APP_NAME=鲸创AI
VITE_APP_VERSION=1.0.0
```

**后端**（`server/.env`）：
```bash
# 服务
PORT=3001
NODE_ENV=development

# 数据库
DATABASE_URL=mysql://user:pass@localhost:3307/sowa_ai
REDIS_URL=redis://localhost:6380

# 安全
JWT_SECRET=your-jwt-secret-here              # 生产环境必须 ≥ 32 位随机字符串
JWT_EXPIRES_IN=7d

# 第三方
KIE_API_KEY=your-kie-api-key
KIE_BASE_URL=https://api.kie.ai

# 邮件（验证码用，MVP 可延后）
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```

### 3. API 路由前缀规范

| 类型 | 前缀 | 示例 |
|------|------|------|
| REST API | `/api/*` | `POST /api/tasks` |
| WebSocket | `/ws` | `ws://localhost:3001/ws?token=xxx` |
| 静态文件代理 | `/api/files/*` | `GET /api/files/:fileId` |
| 健康检查 | `/health` | `GET /health`（无 `/api` 前缀） |

### 4. 数据库命名规范

- **表名**：小写 + 下划线（`snake_case`），复数形式，如 `credit_accounts`
- **字段名**：小写 + 下划线，如 `created_at`
- **外键**：`{referenced_table}_id`，如 `model_id` 引用 `ai_models.id`
- **索引前缀**：`idx_{字段名}`，如 `idx_user_id`
- **时间戳**：所有表必须含 `created_at` 和 `updated_at`

### 5. 代码变量命名规范

| 层级 | 规范 | 示例 |
|------|------|------|
| 前端 TS/JS | `camelCase` | `userName`, `taskList` |
| 前端组件 | `PascalCase` | `SplashScreen.tsx` |
| 后端 TS/JS | `camelCase` | `creditBalance` |
| 数据库 SQL | `snake_case` | `credit_balance` |
| 常量 | `UPPER_SNAKE_CASE` | `DEFAULT_CREDITS = 100` |
| API 响应字段 | `camelCase` | `{ taskId: "xxx" }` |

### 6. 接口契约版本控制

- 所有 API 响应必须包含标准包装：
  ```typescript
  interface ApiResponse<T> {
    code: number;        // 0 = 成功，非0 = 业务错误码
    data: T;             // 实际数据
    message: string;     // 可读消息
  }
  ```
- 后端错误码统一维护在 `server/src/constants/error-codes.ts`
- 前端按 code 做统一错误处理，禁止按 message 判断错误类型

### 7. 并行开发约定

| 时间点 | 前后端动作 |
|--------|-----------|
| **Day 0** | 共同确认本 Sprint 的接口契约（Swagger 或手写） |
| **Day 2** | 后端输出 mock 数据，前端可开始 UI 开发 |
| **Day 4** | 第一次联调：验证接口通不通、字段对不对 |
| **Day 7** | 第二次联调：验证完整链路（创建→查询→展示） |
| **Day 10** | 第三次联调：集成测试，修复边界问题 |
| **Day 12-14** | 验收演示 |

**原则**：前端不等待后端完全完成，后端提供 mock 后前端立即开始 UI；联调时发现契约问题当日修复，不遗留到下一个 Sprint。

---

## Sprint 1: 最小闭环（Week 1-2）

**目标**：用户注册 → 登录 → 看到积分 → 输入 prompt → 生成图片 → 看到结果
**并行策略**：后端 5 个任务 + 前端 8 个任务同步启动，每日 17:00 站会对齐进度
**技术策略**：后端只支持 1 个模型（Imagen 4 Fast），前端 `ai_models` 用硬编码数组临时替代动态接口

### 后端（并行轨道 A）

#### Task B1: 后端项目初始化
**Acceptance Criteria:**
- [ ] Node.js + Express 项目初始化
- [ ] 数据库配置 (MySQL)
- [ ] Redis缓存配置
- [ ] JWT认证中间件
- [ ] 错误处理中间件（统一 `ApiResponse` 格式）
- [ ] 日志系统配置 (winston/pino, 分级: error/warn/info/debug)
- [ ] CORS配置（允许 `http://localhost:5174`）
- [ ] Helmet.js安全头中间件
- [ ] Rate Limiting限流 (100 req/15min/IP)
- [ ] 请求参数验证中间件 (zod)
- [ ] **环境变量按「开发前置约定」第 2 节配置，提交 `.env.example`**

**Verification:**
- [ ] 服务可启动 `npm run dev`（端口 3001）
- [ ] 数据库连接正常
- [ ] `GET /health` 返回正常
- [ ] CORS预检请求正常
- [ ] 限流触发后返回429

**Files:** `server/package.json`, `server/src/app.ts`, `server/src/config/`, `server/src/middlewares/`, `server/.env.example`

---

#### Task B2: 核心数据库设计（MVP 简化版）
**Acceptance Criteria:**
- [ ] 用户表 (`users`)
- [ ] 积分账户表 (`credit_accounts`, 注册默认赠送 100 积分)
- [ ] 积分流水表 (`credit_transactions`)
- [ ] 生成任务表 (`generation_tasks`)
- [ ] **暂不需要**：登录日志表、第三方登录表、文件存储表（Sprint 2 补充）

**Verification:**
- [ ] 数据库迁移执行成功
- [ ] 表结构符合设计

**Files:** `server/src/models/`, `server/migrations/`

---

#### Task B3: 邮箱注册/登录 + 积分查询（MVP 简化版）
**Acceptance Criteria:**
- [ ] 注册接口（邮箱+密码，**MVP 暂不强制验证码**，密码强度校验）
- [ ] 登录接口（邮箱+密码）
- [ ] Token 刷新接口
- [ ] 获取用户信息接口（含积分余额）
- [ ] **暂不需要**：发送验证码、密码重置、第三方登录（Sprint 2 补充）

**Verification:**
- [ ] Postman 测试所有接口通过
- [ ] Token 生成和验证正常
- [ ] 注册后自动创建积分账户（100积分）

**Files:** `server/src/controllers/auth.ts`, `server/src/routes/auth.ts`, `server/src/services/credits.service.ts`

---

#### Task B4: KIE 代理 + 图片生成链路（单模型 MVP）
**Acceptance Criteria:**
- [ ] KIE API 请求封装（含错误重试）
- [ ] `POST /api/tasks` 创建任务（**只支持 `model: "imagen-4-fast"`**）
- [ ] `GET /api/tasks/:taskId` 查询任务状态
- [ ] Webhook 回调接收接口（KIE 推送结果）
- [ ] 任务创建时自动扣减积分（调用 `CreditService.deduct`）
- [ ] 积分不足时返回明确错误码（如 `INSUFFICIENT_CREDITS`）

**Verification:**
- [ ] 通过 Postman 完整跑通：注册 → 获取积分 → 创建任务 → 查询状态
- [ ] 积分扣减正确（Imagen 4 Fast = 4 KIE credits ≈ 14 平台积分）
- [ ] 余额不足时返回 402 或特定错误码

**Files:** `server/src/services/kie.ts`, `server/src/controllers/tasks.ts`, `server/src/routes/tasks.ts`

---

#### Task B5: `GET /api/models` 简化接口
**Acceptance Criteria:**
- [ ] 返回硬编码 JSON 数组（只包含 1 个模型：Imagen 4 Fast）
- [ ] 包含 `id`, `name`, `type`, `paramsSchema`, `priceConfig`
- [ ] 支持 `?type=image` 筛选

**Verification:**
- [ ] 前端可通过该接口渲染模型选择器

**Files:** `server/src/controllers/models.ts`

---

### 前端（并行轨道 B）

#### Task F1: 前端项目脚手架搭建
**Acceptance Criteria:**
- [ ] Vite + React 19 + TypeScript 项目初始化
- [ ] 路径别名 `@/` 配置生效
- [ ] **环境变量按「开发前置约定」第 2 节配置，提交 `.env.example`**
- [ ] 核心依赖安装完成（React Router v6, Zustand, Axios, Tailwind CSS, Framer Motion, lucide-react）
- [ ] 与后端 API 联调配置（`axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL })`）

**Verification:**
- [ ] `npm run dev` 启动成功（端口 5174）
- [ ] `npm run build` 构建成功

**Files:** `frontend/package.json`, `frontend/vite.config.ts`, `frontend/.env.example`

---

#### Task F2: CSS 设计系统 + Framer Motion 动画规范
**Acceptance Criteria:**
- [ ] CSS 变量定义完成（颜色、间距、圆角、阴影）
- [ ] Tailwind 配置扩展（品牌色、自定义断点）
- [ ] 响应式断点配置
- [ ] Framer Motion 动画封装：`FadeIn`, `StaggerContainer`, `SlideIn` 等通用动效组件
- [ ] **禁止在业务组件中直接引入 `framer-motion`，统一使用封装组件**

**Files:** `frontend/src/styles/`, `frontend/src/shared/components/motion/`

---

#### Task F3: 核心配置完成
**Acceptance Criteria:**
- [ ] React Router v6 路由配置（含懒加载）
- [ ] Zustand 状态管理配置（按功能模块拆分 Store）
- [ ] Axios 实例配置（统一后端基址、请求拦截器、错误处理）
- [ ] **请求拦截器自动注入 JWT Token**
- [ ] **响应拦截器统一处理 `ApiResponse` 格式**

**Files:** `frontend/src/router/`, `frontend/src/shared/stores/`, `frontend/src/shared/api/client.ts`, `frontend/src/shared/api/interceptors.ts`

---

#### Task F4: 基础 UI 组件开发
**Acceptance Criteria:**
- [ ] Button, Input, Select, Modal, Dropdown, Tabs, Toast 组件
- [ ] 所有组件支持 Tailwind CSS 主题变量
- [ ] Storybook 或简单文档页（可选，MVP 可延后）

**Files:** `frontend/src/shared/components/common/`

---

#### Task F5: 前端资产工程化
**Acceptance Criteria:**
- [ ] 所有静态资源通过构建工具导入（`import` 语法或 `new URL(..., import.meta.url)`）
- [ ] `vite.config.ts` 配置 `base` 路径支持子路径部署
- [ ] 环境变量 `VITE_ASSET_BASE_URL` 定义
- [ ] 子路径部署验证（如 `http://localhost:8080/frontend/`）
- [ ] 本地文件直接打开验证（双击 `frontend/index.html`）

**Verification:**
- [ ] 构建产物中无硬编码 `/...` 根相对路径
- [ ] 从非根路径访问时所有图片、视频正常加载

**Files:** `frontend/vite.config.ts`, `frontend/.env`, `frontend/.env.production`

---

#### Task F6: 布局组件开发
**Acceptance Criteria:**
- [ ] AppLayout 主布局（Sidebar + 主内容区）
- [ ] Sidebar 侧边栏（220px 固定宽，移动端抽屉）
- [ ] Header 顶部导航（含用户头像、积分显示）

**Files:** `frontend/src/components/layout/`

---

#### Task F7: Landing Page 首页
**Acceptance Criteria:**
- [ ] HeroSection 英雄区（保留现有 Splash 视觉）
- [ ] FeatureSection 功能展示
- [ ] SearchBar 搜索组件
- [ ] Splash 视频轮播含错误降级（`onerror` 跳过 + poster 回退 + 超时机制）
- [ ] **资产路径全部使用相对路径或 `import.meta.env.BASE_URL`**

**Files:** `frontend/src/pages/LandingPage.tsx`, `frontend/src/features/landing/`

---

#### Task F8: 登录/注册页（MVP 简化版）
**Acceptance Criteria:**
- [ ] LoginPage 登录页（邮箱+密码）
- [ ] RegisterPage 注册页（邮箱+密码+确认密码）
- [ ] userStore 状态管理（Zustand，含 Token 持久化）
- [ ] 路由守卫（未登录跳转登录页）
- [ ] **MVP 暂不强制验证码，密码强度校验即可**

**Verification:**
- [ ] 邮箱注册登录正常
- [ ] 登录状态持久化（刷新页面不丢失）
- [ ] 登录后 Header 显示用户昵称和积分余额

**Files:** `frontend/src/pages/LoginPage.tsx`, `frontend/src/pages/RegisterPage.tsx`, `frontend/src/shared/stores/user.ts`

---

#### Task F9: 图片生成（模块化样板，单模型 MVP）
**Acceptance Criteria:**
- [ ] 按 `features/image-generation/` 模块化目录规范开发
- [ ] ImagePage 页面布局
- [ ] PromptInput 输入组件
- [ ] 模型选择器（**MVP 只显示 Imagen 4 Fast，从 `GET /api/models` 获取**）
- [ ] 比例/分辨率选择
- [ ] ResultGrid 结果网格 + ResultCard 结果卡片
- [ ] 积分消耗提示（"预计消耗 14 积分"）
- [ ] generatorStore 状态管理（Zustand，按模块拆分）
- [ ] 任务状态轮询（使用共享 `useTaskPolling` hook）
- [ ] **模块目录结构符合规范，可作为后续模块的复制样板**

**Verification:**
- [ ] 输入 prompt → 点击生成 → 扣减积分 → 轮询状态 → 显示结果
- [ ] 余额不足时弹出提示，不创建任务
- [ ] 模块目录可直接复制为 `features/video-generation/` 的骨架

**Files:** `frontend/src/features/image-generation/`

---

### Sprint 1 联调里程碑

| 天数 | 里程碑 | 验收标准 |
|------|--------|---------|
| Day 2 | 健康检查联调 | 前端 `axios.get('/health')` 返回 `ok` |
| Day 4 | 登录注册联调 | 前端完成注册 → 登录 → Token 持久化 |
| Day 6 | 积分查询联调 | Header 正确显示积分余额 |
| Day 8 | 图片生成链路联调 | 前端创建任务 → 后端提交 KIE → 返回 taskId |
| Day 10 | 结果展示联调 | 前端轮询 → 获取 resultUrl → 渲染图片 |
| Day 12-14 | 最小闭环演示 | 完整链路：注册 → 登录 → 生图 → 看结果 |

---

### ✓ Checkpoint Sprint 1
- [ ] 用户可以注册/登录
- [ ] 用户可以看到积分余额
- [ ] 用户可以输入 prompt 生成图片（Imagen 4 Fast）
- [ ] 用户可以看到生成结果
- [ ] 积分正确扣减
- [ ] 余额不足时友好提示
- [ ] 资产路径工程化通过子路径部署验证
- [ ] Splash 降级处理正常

---

## Sprint 2: 认证完善 + 功能扩展（Week 3-4）

**目标**：邮箱验证码、积分充值、模型配置中心、视频生成、AI 对话
**并行策略**：后端补充基础设施，前端扩展功能模块

### 后端

#### Task B6: 邮箱验证码 + 密码重置
**Acceptance Criteria:**
- [ ] 发送验证码接口（邮件 SMTP）
- [ ] 注册接口增加验证码校验
- [ ] 密码重置接口

**Files:** `server/src/controllers/auth.ts`

---

#### Task B7: 积分充值 + 积分中心接口
**Acceptance Criteria:**
- [ ] 积分充值接口（模拟支付，生成充值订单）
- [ ] 积分流水查询接口（分页）
- [ ] `GET /api/credits/balance` 优化（含今日消费统计）

**Files:** `server/src/controllers/credits.ts`

---

#### Task B8: 模型配置中心（完整版）
**Acceptance Criteria:**
- [ ] `ai_models` 配置表完整设计与迁移
- [ ] 模型种子数据初始化（所有 KIE 支持的模型及定价）
- [ ] `GET /api/models` 从数据库动态查询
- [ ] 模型启用/禁用开关

**Files:** `server/src/models/ai_model.ts`, `server/src/controllers/models.ts`

---

#### Task B9: 文件存储服务（简化版）
**Acceptance Criteria:**
- [ ] 本地文件上传接口
- [ ] 文件下载接口（`GET /api/files/:fileId`）
- [ ] 案例文件标记
- [ ] **暂不需要**：定期清理任务（Sprint 3 补充）

**Files:** `server/src/controllers/storage.ts`

---

#### Task B10: KIE 代理扩展（多模型支持）
**Acceptance Criteria:**
- [ ] `POST /api/tasks` 支持所有图片生成模型
- [ ] `POST /api/tasks` 支持视频生成模型
- [ ] Webhook 回调处理多模型结果

**Files:** `server/src/services/kie.ts`, `server/src/controllers/tasks.ts`

---

### 前端

#### Task F10: 积分中心页面
**Acceptance Criteria:**
- [ ] 积分余额展示
- [ ] 积分套餐展示（4 档：100/500/2000/10000）
- [ ] 支付按钮（模拟）
- [ ] 积分流水列表（分页）
- [ ] 消费记录筛选

**Files:** `frontend/src/pages/CreditsPage.tsx`, `frontend/src/features/credits/`

---

#### Task F11: 视频生成功能
**Acceptance Criteria:**
- [ ] VideoPage 页面布局
- [ ] 模型选择器（Sora 2, Kling 3.0, Hailuo 2.3, Seedance 2.0, Wan 2.7）
- [ ] 时长选择（6s/10s/15s）
- [ ] 首帧图片上传
- [ ] VideoCard 视频卡片 + 视频预览播放器
- [ ] **复用 `features/image-generation/` 的目录结构作为样板**

**Verification:**
- [ ] 视频生成流程正常
- [ ] 积分按秒扣减

**Files:** `frontend/src/features/video-generation/`

---

#### Task F12: AI 对话功能
**Acceptance Criteria:**
- [ ] ChatPage 三栏布局
- [ ] 模型选择器（GPT-5.4, Claude 4.6, Gemini 3）
- [ ] 对话列表组件
- [ ] 消息渲染组件（支持 Markdown + 代码高亮）
- [ ] 流式响应处理（SSE 或 WebSocket）
- [ ] 积分按 token 消耗提示

**Files:** `frontend/src/features/chat/`

---

### ✓ Checkpoint Sprint 2
- [ ] 邮箱验证码注册/登录正常
- [ ] 积分充值流程完整（模拟支付）
- [ ] 模型配置中心支持动态增删模型
- [ ] 视频生成功能完整
- [ ] AI 对话功能完整（流式响应）
- [ ] 所有功能通过积分扣减验证

---

## Sprint 3: 创作 + 音频（Week 5-6）

### Task F13: 数字人功能
**Files:** `frontend/src/features/digital-human/`

### Task F14: 图片数字人 / 动作迁移 / 视频换脸
**Files:** `frontend/src/features/*/`

### Task F15: TTS 语音合成功能
**Files:** `frontend/src/features/tts/`

### Task F16: 音乐生成功能
**Files:** `frontend/src/features/music-generation/`

### Task F17: 音色转换功能
**Files:** `frontend/src/features/voice-conversion/`

---

### ✓ Checkpoint Sprint 3
- [ ] 数字人视频可生成
- [ ] 图片驱动功能正常
- [ ] TTS 可正常生成语音
- [ ] 音乐创作流程完整

---

## Sprint 4: 营销 + 辅助（Week 7-8）

### Task F18: 爆款模板功能
**Files:** `frontend/src/features/templates/`

### Task F19: 爆款图文编辑器
**Files:** `frontend/src/features/viral-article/`

### Task F20: 智能画布功能
**Files:** `frontend/src/features/smart-canvas/`

### Task F21: 工具箱功能
**Files:** `frontend/src/features/toolbox/`

### Task F22: 资产管理功能
**Files:** `frontend/src/features/assets/`

### Task F23: 自动发布功能
**Files:** `frontend/src/features/auto-publish/`

---

### ✓ Checkpoint Sprint 4
- [ ] 模板可浏览和使用
- [ ] 画布多图融合可用
- [ ] 资产可管理

---

## Sprint 5: 第三方登录 + 优化（Week 9）

### 后端

#### Task B11: 第三方登录集成
**Acceptance Criteria:**
- [ ] 微信登录 OAuth2.0
- [ ] Google 登录 OAuth2.0
- [ ] 登录回调处理
- [ ] 账号绑定/解绑

**Files:** `server/src/controllers/oauth.ts`, `server/src/routes/oauth.ts`

---

### 前端

#### Task F24: 第三方登录按钮
**Acceptance Criteria:**
- [ ] 微信登录按钮
- [ ] Google 登录按钮

**Files:** `frontend/src/pages/LoginPage.tsx`

---

#### Task F25: 响应式适配
**Acceptance Criteria:**
- [ ] 移动端布局适配（320px - 768px）
- [ ] 平板布局适配（768px - 1024px）
- [ ] 侧边栏折叠（移动端汉堡菜单）

---

#### Task F26: 性能优化
**Acceptance Criteria:**
- [ ] 路由懒加载验证
- [ ] 图片懒加载
- [ ] 代码分割优化
- [ ] 首屏加载优化（LCP < 2.5s）

---

#### Task F27: 动画与交互完善
**Acceptance Criteria:**
- [ ] 页面过渡动画
- [ ] 加载骨架屏
- [ ] 错误边界处理（React Error Boundary）
- [ ] Toast 提示完善

---

#### Task F28: 国际化预留
**Acceptance Criteria:**
- [ ] react-i18next 配置
- [ ] 中文语言包
- [ ] 语言切换组件（预留位置）
- [ ] 所有文案提取到语言包

**Files:** `frontend/src/locales/`

---

### ✓ Checkpoint Sprint 5
- [ ] 微信/Google 登录正常
- [ ] 响应式测试通过（320px - 1920px）
- [ ] Lighthouse 性能分数 > 80
- [ ] 无控制台错误
- [ ] 国际化预留完成

---

## 开发进度图（甘特图）

```mermaid
gantt
    title 鲸创AI 增量开发进度（9周）
    dateFormat  YYYY-MM-DD
    axisFormat  %m/%d

    section Sprint 1
    后端初始化(B1)           :a1, 2026-04-29, 3d
    核心数据库(B2)           :a2, after a1, 2d
    登录注册+积分(B3)        :a3, after a2, 3d
    KIE代理(B4)              :a4, after a3, 4d
    模型接口简化(B5)         :a5, after a4, 1d
    Sprint1联调              :milestone, after a5, 0d

    section 前端 Sprint 1
    脚手架(F1)               :b1, 2026-04-29, 2d
    CSS+动画(F2)             :b2, after b1, 2d
    核心配置(F3)             :b3, after b2, 2d
    基础组件(F4)             :b4, after b3, 2d
    资产工程化(F5)           :b5, after b1, 3d
    布局(F6)                 :b6, after b4, 2d
    Landing页(F7)            :b7, after b6, 3d
    登录页(F8)               :b8, after b7, 2d
    图片生成(F9)             :b9, after b8, 3d

    section Sprint 2
    邮箱验证码(B6)           :c1, after a5, 3d
    积分充值(B7)             :c2, after c1, 2d
    模型配置中心(B8)         :c3, after c2, 3d
    文件存储(B9)             :c4, after c3, 2d
    KIE扩展(B10)             :c5, after c4, 3d
    Sprint2联调              :milestone, after c5, 0d

    section 前端 Sprint 2
    积分中心(F10)            :d1, after b9, 3d
    视频生成(F11)            :d2, after d1, 4d
    AI对话(F12)              :d3, after d2, 4d

    section Sprint 3
    数字人(F13)              :e1, after d3, 4d
    图片数字人/换脸(F14)     :e2, after e1, 4d
    TTS(F15)                 :e3, after e2, 3d
    音乐(F16)                :e4, after e3, 3d
    音色转换(F17)            :e5, after e4, 2d

    section Sprint 4
    爆款模板(F18)            :f1, after e5, 3d
    图文编辑器(F19)          :f2, after f1, 3d
    智能画布(F20)            :f3, after f2, 3d
    工具箱(F21)              :f4, after f3, 2d
    资产管理(F22)            :f5, after f4, 3d
    自动发布(F23)            :f6, after f5, 2d

    section Sprint 5
    第三方登录(B11)          :g1, after f6, 4d
    响应式(F25)              :g2, after g1, 3d
    性能优化(F26)            :g3, after g2, 3d
    动画完善(F27)            :g4, after g3, 2d
    国际化(F28)              :g5, after g4, 2d
    最终验收                 :milestone, after g5, 0d
```

---

## Summary

| Sprint | 内容 | 时间 | 任务数 | 核心目标 |
|--------|------|------|--------|---------|
| Sprint 1 | 最小闭环 | Week 1-2 | 13 | 注册→登录→生图→看结果 |
| Sprint 2 | 认证完善+功能扩展 | Week 3-4 | 10 | 验证码+充值+视频+对话 |
| Sprint 3 | 创作+音频 | Week 5-6 | 5 | 数字人+TTS+音乐 |
| Sprint 4 | 营销+辅助 | Week 7-8 | 6 | 模板+画布+资产 |
| Sprint 5 | 第三方登录+优化 | Week 9 | 6 | 微信/Google+响应式+国际化 |
| **Total** | | **~9周** | **40** | |

---

## 数据库表结构概要

```sql
-- 用户表
CREATE TABLE users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20) UNIQUE,
  password_hash VARCHAR(255),
  nickname VARCHAR(50),
  avatar VARCHAR(500),
  status TINYINT DEFAULT 1 COMMENT '1:正常 0:禁用 -1:已删除',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL COMMENT '软删除时间',
  INDEX idx_email (email),
  INDEX idx_phone (phone),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 积分账户表
CREATE TABLE credit_accounts (
  user_id BIGINT PRIMARY KEY,
  balance INT DEFAULT 0 COMMENT '当前余额',
  total_earned INT DEFAULT 0 COMMENT '累计获得',
  total_spent INT DEFAULT 0 COMMENT '累计消费',
  version INT DEFAULT 0 COMMENT '乐观锁版本号',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_balance (balance)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 积分流水表
CREATE TABLE credit_transactions (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  amount INT NOT NULL COMMENT '正数为获得,负数为消费',
  balance_after INT NOT NULL COMMENT '操作后余额',
  type ENUM('earn', 'spend', 'refund', 'gift', 'admin') NOT NULL,
  description VARCHAR(255),
  related_task_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at),
  INDEX idx_type (type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 第三方登录表
CREATE TABLE oauth_connections (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  provider ENUM('wechat', 'google') NOT NULL,
  provider_id VARCHAR(100) NOT NULL,
  provider_data JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_provider (provider, provider_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 生成任务表
CREATE TABLE generation_tasks (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  task_id VARCHAR(100) UNIQUE NOT NULL,
  type ENUM('image', 'video', 'audio', 'chat') NOT NULL,
  model_id VARCHAR(50) NOT NULL COMMENT '关联 ai_models.id',
  params JSON,
  status ENUM('pending', 'processing', 'completed', 'failed') DEFAULT 'pending',
  result_url VARCHAR(500),
  credits_spent INT DEFAULT 0,
  error_message TEXT COMMENT '错误信息',
  is_example BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  deleted_at TIMESTAMP NULL COMMENT '软删除',
  INDEX idx_user_id (user_id),
  INDEX idx_task_id (task_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at),
  INDEX idx_type (type),
  FOREIGN KEY (model_id) REFERENCES ai_models(id) ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 文件存储表
CREATE TABLE stored_files (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  task_id BIGINT,
  file_type ENUM('image', 'video', 'audio') NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_size INT,
  is_example BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP NULL COMMENT '过期时间,定期清理',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_task_id (task_id),
  INDEX idx_expires_at (expires_at),
  INDEX idx_is_example (is_example)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- AI模型配置表（后端驱动，前端零硬编码）
CREATE TABLE ai_models (
  id VARCHAR(50) PRIMARY KEY COMMENT '模型唯一标识，如 gpt-image-2, sora-2',
  type ENUM('image', 'video', 'audio', 'chat') NOT NULL,
  name VARCHAR(100) NOT NULL COMMENT '展示名称',
  description VARCHAR(500) COMMENT '模型描述',
  provider VARCHAR(50) NOT NULL DEFAULT 'kie' COMMENT '供应商: kie, openai, google 等',
  params_schema JSON NOT NULL COMMENT 'JSON Schema，前端动态渲染表单',
  price_config JSON NOT NULL COMMENT '{ unit: "per_image|per_second|per_request", amount: 6 }',
  sort_order INT DEFAULT 0 COMMENT '排序',
  is_enabled BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE COMMENT '是否首页推荐',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_provider (provider),
  INDEX idx_enabled (is_enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 登录日志表
CREATE TABLE login_logs (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  user_id BIGINT NOT NULL,
  ip VARCHAR(45) NOT NULL,
  user_agent VARCHAR(500),
  login_type ENUM('email', 'wechat', 'google') NOT NULL,
  status TINYINT DEFAULT 1 COMMENT '1:成功 0:失败',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

*Last Updated: 2026-04-29*
*Version: 4.0.0 - 增量 Sprint 重构：前后端并行开发、最小闭环优先、开发前置约定、甘特图*
