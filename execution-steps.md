# 鲸创AI工作台执行步骤文档

## 1. 执行目标

基于现有计划文档和已有前端静态页面资产，按真实开发节奏完成一个生成式 AI 聚合平台。

第一阶段不追求一次性做完全部 25 个功能模块，而是优先跑通最小闭环：

```text
用户注册 -> 登录 -> 查看积分 -> 输入 prompt -> 创建图片生成任务 -> 查询任务状态 -> 展示生成结果
```

执行过程中需要坚持三条原则：

- 保留现有前端视觉成果，不重新设计品牌和交互气质。
- 所有 AI 能力统一通过自建 Node.js 后端代理，前端不直接调用 KIE.ai。
- 以 `features/image-generation/` 作为第一个标准模块，为后续视频、音频、数字人等能力提供复制模板。

## 2. 当前项目状态判断

阅读项目文档后，当前计划已经比较完整，包含：

- `plan(3).md`：总体架构、阶段规划、模块化规范、接口契约。
- `todo(2).md`：按 Sprint 拆分的任务清单、验收标准、数据表结构。
- `kie-api-reference(2).md`：KIE.ai 模型、价格、接口和积分换算规则。

检查项目目录后，当前 `frontend/` 更像是已经构建好的静态前端产物，而不是可继续维护的源码工程。

已有内容包括：

- `frontend/index.html`
- `frontend/assets/index-*.js`
- `frontend/assets/index-*.css`
- 多个图片、视频、WebM 素材

因此真实执行时，第一步不是直接改现有页面，而是先恢复或重建可维护的 React 源码工程，再把现有视觉资产组件化迁移进去。

## 3. 总体执行路线

整体按 5 个 Sprint 推进：

| Sprint | 核心目标 | 结果 |
| --- | --- | --- |
| Sprint 1 | 最小闭环 | 注册、登录、积分、图片生成可用 |
| Sprint 2 | 认证完善和核心扩展 | 验证码、充值、视频生成、AI 对话 |
| Sprint 3 | 创作和音频能力 | 数字人、TTS、音乐、音色转换 |
| Sprint 4 | 营销和辅助工具 | 模板、图文编辑器、画布、资产管理 |
| Sprint 5 | 登录和体验优化 | 微信/Google 登录、响应式、性能、国际化 |

真实执行时会先完成 Sprint 1，再根据最小闭环的质量决定是否继续扩展 Sprint 2。

## 4. Sprint 0：执行前准备

### 4.1 梳理现有前端视觉

执行步骤：

1. 从现有构建产物中识别核心页面和组件：
   - SplashScreen
   - Dashboard
   - Sidebar
   - 首页功能卡片
   - 素材轮播和视频背景
2. 整理可复用视觉资产：
   - 首页背景视频
   - 鲸鱼主视觉图
   - 功能缩略图
   - 热门能力图片
   - Gallery 示例图
3. 提取现有品牌风格：
   - 字体
   - 色彩
   - 圆角
   - 阴影
   - 动效节奏
   - 布局密度

验收标准：

- 明确哪些视觉必须保留。
- 明确哪些静态资源需要迁移到源码工程。
- 明确哪些页面只是展示原型，哪些要接入真实业务。

### 4.2 固定开发约定

执行步骤：

1. 固定端口：
   - 前端：`5174`
   - 后端：`3001`
   - MySQL：`3307`
   - Redis：`6380`
2. 固定环境变量：
   - `VITE_API_BASE_URL=http://localhost:3001`
   - `VITE_WS_URL=ws://localhost:3001`
   - `VITE_ASSET_BASE_URL=/`
   - `DATABASE_URL=mysql://user:pass@localhost:3307/sowa_ai`
   - `REDIS_URL=redis://localhost:6380`
   - `KIE_API_KEY=your-kie-api-key`
3. 固定 API 响应结构：

```ts
interface ApiResponse<T> {
  code: number;
  data: T;
  message: string;
}
```

验收标准：

- 前后端 `.env.example` 完成。
- 所有后续开发都遵守统一响应结构。
- 前端不按 `message` 判断错误类型，只按 `code` 判断。

## 5. Sprint 1：最小闭环执行步骤

## 5.1 前端源码工程重建

执行步骤：

1. 在 `frontend/` 中建立 React 19 + Vite + TypeScript 源码工程。
2. 安装核心依赖：
   - React Router
   - Zustand
   - Axios
   - Tailwind CSS
   - Framer Motion
   - lucide-react
3. 配置路径别名：
   - `@/` 指向 `src/`
4. 建立目录结构：

```text
frontend/src/
├── app/
├── assets/
├── components/
├── features/
├── pages/
├── router/
├── shared/
└── styles/
```

5. 迁移现有图片、视频和 WebM 素材，确保通过构建工具引用。
6. 配置 Vite `base`，支持子路径部署。

验收标准：

- `npm run dev` 能启动。
- `npm run build` 能构建。
- 构建产物中没有错误的根路径资源引用。
- 首页素材能正常加载。

## 5.2 前端设计系统和基础组件

执行步骤：

1. 建立 CSS 变量：
   - 品牌色
   - 背景色
   - 文本色
   - 边框色
   - 圆角
   - 阴影
   - 间距
2. 配置 Tailwind 主题扩展。
3. 封装通用动效组件：
   - `FadeIn`
   - `SlideIn`
   - `StaggerContainer`
4. 开发基础 UI 组件：
   - Button
   - Input
   - Select
   - Modal
   - Dropdown
   - Tabs
   - Toast

验收标准：

- 业务组件不直接引入 `framer-motion`。
- 基础组件支持统一主题。
- 组件在移动端和桌面端不出现明显布局溢出。

## 5.3 前端核心配置

执行步骤：

1. 配置 React Router：
   - 首页
   - 登录页
   - 注册页
   - 图片生成页
   - 受保护路由
2. 配置 Zustand：
   - `userStore`
   - `creditsStore`
   - `imageGenerationStore`
3. 配置 Axios：
   - 使用 `VITE_API_BASE_URL`
   - 请求自动注入 JWT
   - 响应自动拆包 `ApiResponse`
   - 统一处理错误码

验收标准：

- 未登录访问业务页会跳转登录页。
- 登录后刷新页面不丢失状态。
- API 错误能统一弹 Toast。

## 5.4 后端基础服务

执行步骤：

1. 新建 `server/` 工程。
2. 使用 Node.js + Express + TypeScript。
3. 配置基础能力：
   - CORS
   - Helmet
   - Rate Limit
   - JWT
   - 日志
   - 统一错误处理中间件
   - Zod 参数校验
4. 提供健康检查接口：

```http
GET /health
```

验收标准：

- 后端能在 `3001` 端口启动。
- `GET /health` 返回正常。
- 前端能请求后端健康检查。
- CORS 预检正常。

## 5.5 数据库和积分基础

执行步骤：

1. 创建数据库迁移。
2. 建立 MVP 表：
   - `users`
   - `credit_accounts`
   - `credit_transactions`
   - `generation_tasks`
3. 注册用户时自动创建积分账户。
4. 默认赠送 100 平台积分。
5. 积分扣减使用事务，避免并发错误。

验收标准：

- 数据库迁移能执行。
- 注册后能看到用户记录。
- 注册后能看到 100 积分账户。
- 积分流水能记录获得和消费。

## 5.6 用户认证功能

执行步骤：

1. 后端实现：

```http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
GET /api/auth/me
```

2. 前端实现：
   - LoginPage
   - RegisterPage
   - Token 持久化
   - 用户信息获取
   - Header 用户信息展示

验收标准：

- 用户可以用邮箱和密码注册。
- 用户可以登录。
- 登录后能获取当前用户信息。
- Header 能显示用户昵称和积分余额。

## 5.7 KIE 代理和任务系统

执行步骤：

1. 后端封装 KIE 请求服务。
2. Sprint 1 只接入一个模型：
   - `imagen-4-fast`
3. 平台积分消耗固定为：
   - 14 积分 / 次
4. 实现统一任务接口：

```http
GET /api/models?type=image
POST /api/tasks
GET /api/tasks/:taskId
DELETE /api/tasks/:taskId
```

5. 实现任务状态：

```ts
type TaskStatus = 'pending' | 'processing' | 'completed' | 'failed';
```

6. 后端负责：
   - 校验用户登录状态
   - 校验积分余额
   - 扣减积分
   - 创建任务记录
   - 调用 KIE
   - 查询 KIE 任务状态
   - 接收 KIE webhook
   - 更新本地任务状态

验收标准：

- 积分不足时不能创建任务。
- 创建任务成功后积分立即扣减。
- KIE 返回失败时任务标记为 `failed`。
- 查询任务接口能返回统一结构。

## 5.8 图片生成模块

执行步骤：

1. 建立模块目录：

```text
frontend/src/features/image-generation/
├── components/
├── hooks/
├── api.ts
├── store.ts
├── types.ts
├── config.ts
└── index.ts
```

2. 实现组件：
   - PromptInput
   - ModelSelector
   - RatioSelector
   - ResultGrid
   - ResultCard
3. 实现 `useTaskPolling`：
   - 创建任务后轮询状态
   - 成功后停止轮询
   - 失败后停止轮询并提示
4. 实现图片生成页面：
   - 输入 prompt
   - 选择比例
   - 显示预计消耗积分
   - 点击生成
   - 展示 loading
   - 展示结果

验收标准：

- 输入 prompt 后可以创建图片任务。
- 页面展示预计消耗 14 积分。
- 生成中有明确状态。
- 成功后展示图片结果。
- 失败后展示错误提示。
- 模块结构可复制给视频生成模块。

## 5.9 Sprint 1 联调顺序

真实执行时按下面顺序联调：

| 时间点 | 联调内容 | 验收标准 |
| --- | --- | --- |
| Day 2 | 健康检查 | 前端请求 `/health` 成功 |
| Day 4 | 注册登录 | 注册、登录、Token 持久化成功 |
| Day 6 | 积分查询 | Header 正确显示积分 |
| Day 8 | 创建生图任务 | 后端返回 `taskId` |
| Day 10 | 查询并展示结果 | 前端展示生成图片 |
| Day 12-14 | 最小闭环演示 | 注册到生图完整跑通 |

## 6. Sprint 2：认证完善和核心扩展

## 6.1 邮箱验证码和密码重置

执行步骤：

1. 接入 SMTP。
2. 实现发送验证码。
3. 注册接口增加验证码校验。
4. 实现密码重置流程。

验收标准：

- 验证码可发送。
- 验证码过期和错误能提示。
- 用户可以重置密码。

## 6.2 积分中心和充值

执行步骤：

1. 后端实现：
   - 积分余额查询
   - 积分流水分页
   - 模拟充值订单
2. 前端实现：
   - CreditsPage
   - 充值套餐
   - 消费记录
   - 分页筛选

验收标准：

- 用户能看到余额。
- 用户能看到流水。
- 用户能模拟充值。
- 充值后余额更新。

## 6.3 模型配置中心

执行步骤：

1. 建立 `ai_models` 表。
2. 写入模型种子数据。
3. `GET /api/models` 改为读取数据库。
4. 支持模型启用和禁用。
5. 前端模型选择器完全依赖后端返回。

验收标准：

- 前端不硬编码模型列表。
- 禁用模型不会出现在前端。
- 模型价格由后端控制。

## 6.4 视频生成模块

执行步骤：

1. 复制图片生成模块结构。
2. 建立 `features/video-generation/`。
3. 支持：
   - 模型选择
   - 时长选择
   - 首帧上传
   - 视频任务创建
   - 视频预览
4. 后端扩展 KIE 视频模型代理。

验收标准：

- 能创建视频任务。
- 视频按秒计算积分。
- 结果可预览播放。

## 6.5 AI 对话模块

执行步骤：

1. 建立 `features/chat/`。
2. 实现三栏布局：
   - 会话列表
   - 消息区
   - 配置区
3. 支持 Markdown 和代码高亮。
4. 使用 SSE 或 WebSocket 处理流式输出。
5. 按 token 估算积分消耗。

验收标准：

- 用户能发送消息。
- 回复可以流式展示。
- Markdown 渲染安全。
- 消耗提示清晰。

## 7. Sprint 3：创作和音频能力

执行步骤：

1. 数字人模块：
   - 形象选择
   - 配音配置
   - 视频生成
2. 图片数字人模块：
   - 图片上传
   - 文本或音频驱动
3. 动作迁移模块：
   - 人物图上传
   - 动作视频上传
   - 结果预览
4. TTS 模块：
   - 文本输入
   - 音色选择
   - 语速、音量、音调参数
5. 音乐生成模块：
   - 歌词编辑
   - 风格选择
   - 音乐播放器
6. 音色转换模块：
   - 音频上传
   - 声音选择
   - 转换结果播放

验收标准：

- 每个模块都遵守 `features/{feature-name}` 结构。
- 每个模块都走统一任务接口。
- 每个模块都接入积分扣减。

## 8. Sprint 4：营销和辅助工具

执行步骤：

1. 爆款模板：
   - 行业分类
   - 模板网格
   - 模板详情
2. 爆款图文编辑器：
   - Markdown 编辑
   - 实时预览
   - 主题切换
   - 多平台发布入口
3. 智能画布：
   - 多图上传
   - 图层管理
   - AI 融合预览
4. 工具箱：
   - 工具卡片
   - 工具路由
5. 资产管理：
   - 任务结果列表
   - 类型筛选
   - 批量操作
   - 预览弹窗
6. 自动发布：
   - 平台授权
   - 发布队列

验收标准：

- 营销工具能形成完整入口。
- 资产能被统一管理。
- 生成结果能复用到后续编辑或发布流程。

## 9. Sprint 5：登录、体验和上线前优化

执行步骤：

1. 第三方登录：
   - 微信 OAuth
   - Google OAuth
   - 账号绑定和解绑
2. 响应式适配：
   - 320px 到 1920px
   - 移动端侧边栏抽屉
   - 平板布局优化
3. 性能优化：
   - 路由懒加载
   - 图片懒加载
   - 代码分割
   - 首屏加载优化
4. 交互完善：
   - 骨架屏
   - Toast
   - Error Boundary
   - 页面过渡动画
5. 国际化预留：
   - react-i18next
   - 中文语言包
   - 语言切换入口

验收标准：

- 微信和 Google 登录可用。
- Lighthouse 性能分数大于 80。
- 控制台无明显错误。
- 移动端主要页面可用。
- 文案已迁移到语言包。

## 10. 关键接口清单

Sprint 1 必须完成：

```http
GET /health
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
GET /api/auth/me
GET /api/credits/balance
GET /api/credits/transactions?page=&limit=
GET /api/models?type=image
POST /api/tasks
GET /api/tasks/:taskId
DELETE /api/tasks/:taskId
```

任务创建请求：

```ts
interface CreateTaskRequest {
  type: 'image' | 'video' | 'audio' | 'chat';
  model: string;
  params: Record<string, unknown>;
}
```

任务查询响应：

```ts
interface TaskStatusResponse {
  taskId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  result?: {
    type: 'image' | 'video' | 'audio';
    urls: string[];
  };
  error?: string;
  creditsSpent: number;
  createdAt: string;
  completedAt?: string;
}
```

模型配置响应：

```ts
interface ModelConfig {
  id: string;
  name: string;
  type: 'image' | 'video' | 'audio' | 'chat';
  description?: string;
  paramsSchema: object;
  priceConfig: {
    unit: string;
    amount: number;
  };
  isEnabled: boolean;
}
```

## 11. 测试和验收方式

### 11.1 后端测试

- 健康检查正常。
- 注册接口正常。
- 登录接口正常。
- JWT 鉴权正常。
- 积分账户创建正常。
- 积分扣减事务正常。
- 积分不足拦截正常。
- 任务创建和查询正常。
- KIE 失败时能正确落库。

### 11.2 前端测试

- 首页视觉和现有原型一致。
- 登录注册流程完整。
- 登录态刷新不丢失。
- Header 显示积分。
- 图片生成流程完整。
- loading、success、failed、insufficient credits 状态完整。
- 移动端不出现明显遮挡和溢出。

### 11.3 联调测试

完整链路：

```text
注册账号 -> 登录 -> 获取积分 -> 输入 prompt -> 创建任务 -> 扣减积分 -> 查询任务 -> 展示图片
```

异常链路：

```text
余额不足 -> 拦截创建任务 -> 前端提示
KIE 失败 -> 任务 failed -> 前端提示
Token 失效 -> 自动跳转登录
网络错误 -> Toast 提示
```

## 12. 执行注意事项

- 不直接修改构建后的 `assets/index-*.js` 和 `assets/index-*.css`。
- 不让前端保存 KIE API Key。
- 不在前端写 KIE 专有字段转换逻辑。
- 不为每个模型单独创建前端 API 文件。
- 不在 Sprint 1 就追求全部模型接入。
- 不先做复杂后台管理，先保证用户侧最小闭环。
- 图片生成模块必须写得规整，因为它会成为后续模块模板。

## 13. 第一阶段完成标志

当以下条件全部满足，可以认为第一阶段执行完成：

- 前端源码工程可维护。
- 首页视觉基本保留。
- 后端基础服务可运行。
- 用户可以注册和登录。
- 用户可以看到积分。
- 用户可以生成一张图片。
- 积分可以正确扣减。
- 任务状态可以查询。
- 生成结果可以展示。
- 图片生成模块结构可复制扩展。

