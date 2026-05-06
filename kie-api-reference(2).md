# KIE.ai API 接口规划

> 文档更新: 2026-04-28
> API Base URL: `https://api.kie.ai` (从官网抓取，待注册后验证)
> 认证方式: Bearer Token

---

## 一、API 概览

### 1.0 积分换算公式

**KIE.ai 官方定价: 1 KIE credit ≈ $0.005 USD**
**平台积分定价: 1 平台积分 = ¥0.01 RMB**
**汇率假设: 1 USD ≈ 7 RMB（随市场波动调整）**

**换算关系:**
- 1 KIE credit 成本 = $0.005 × 7 = **¥0.035**
- 1 KIE credit = ¥0.035 ÷ ¥0.01 = **3.5 平台积分**

```
KIE 充值参考:
- 100 KIE credits ≈ $0.50 (¥3.50)
- 1000 KIE credits ≈ $5.00 (¥35.00)
- 10000 KIE credits ≈ $50.00 (¥350.00)

平台积分充值:
- 100 积分 = ¥1.00
- 1000 积分 = ¥10.00
- 10000 积分 = ¥100.00
```

> 注: 高额充值可获得 +10% 赠送积分，积分永不过期

### 1.1 通用认证
```http
Authorization: Bearer <YOUR_API_KEY>
Content-Type: application/json
```

### 1.2 通用响应格式
```typescript
// 任务创建响应
interface TaskResponse {
  taskId: string;  // 任务ID，用于查询状态
}

// 任务状态响应
interface TaskStatusResponse {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;  // 0-100
  result?: {
    type: 'image' | 'video' | 'audio';
    outputMediaUrls: Array<{ mediaUrl: string }>;
  };
  error?: string;
}
```

### 1.3 异步任务模式
- 所有生成任务均为异步
- 200响应仅表示任务创建成功
- 获取结果方式: 回调webhook 或 轮询查询API

### 1.4 数据保留
| 数据类型 | 保留期限 |
|----------|----------|
| 生成的媒体文件 | 14天后自动删除 |
| 日志记录 | 2个月后自动删除 |

---

## 二、模型分类与定价

### 2.1 图片生成模型

| 模型 | KIE Credits | USD Cost | RMB Cost | Platform Points | 特点 |
|------|------------|----------|----------|-----------------|------|
| **GPT Image 2** (1K) | 6 | $0.03 | ¥0.21 | 21 | OpenAI图片生成 |
| **GPT Image 2** (2K) | 10 | $0.05 | ¥0.35 | 35 | 高清输出 |
| **GPT Image 2** (4K) | 16 | $0.08 | ¥0.56 | 56 | 超高清输出 |
| **4o Image** (1张) | 6 | $0.03 | ¥0.21 | 21 | GPT-4o图片 |
| **4o Image** (2张) | 7 | $0.035 | ¥0.245 | 25 | 批量生成 |
| **4o Image** (4张) | 8 | $0.04 | ¥0.28 | 28 | 批量生成 |
| **Nano Banana Pro** (1K-2K) | 18 | $0.09 | ¥0.63 | 63 | 文生图/图生图 |
| **Nano Banana Pro** (4K) | 24 | $0.12 | ¥0.84 | 84 | 超高清 |
| **Flux 2 Pro** (1K) | 5 | $0.025 | ¥0.175 | 18 | 高质量 |
| **Flux 2 Pro** (2K) | 7 | $0.035 | ¥0.245 | 25 | 高清输出 |
| **Flux 2 Flex** (1K) | 14 | $0.07 | ¥0.49 | 49 | 经济型 |
| **Flux 2 Flex** (2K) | 24 | $0.12 | ¥0.84 | 84 | 经济高清 |
| **Flux Kontext Pro** | 5+ | ~$0.025 | ~¥0.175 | ~18 | 图像编辑 |
| **Imagen 4 Ultra** | 12 | $0.06 | ¥0.42 | 42 | Google超高质量 |
| **Imagen 4** | 8 | $0.04 | ¥0.28 | 28 | Google标准 |
| **Imagen 4 Fast** | 4 | $0.02 | ¥0.14 | 14 | Google快速 |
| **Ideogram V3 Turbo** | 3.5 | $0.0175 | ¥0.123 | 12 | 快速生成 |
| **Ideogram V3 Balanced** | 7 | $0.035 | ¥0.245 | 25 | 平衡质量 |
| **Ideogram V3 Quality** | 10 | $0.05 | ¥0.35 | 35 | 高质量 |
| **Seedream 4.5** | 6.5 | $0.032 | ¥0.224 | 22 | 字节跳动 |
| **Sora 2 图片转视频** | 按秒计费 | - | - | - | 图片驱动视频 |

### 2.2 视频生成模型

| 模型 | KIE Credits/秒 | USD/秒 | RMB/秒 | Points/秒 | 特点 |
|------|---------------|--------|--------|-----------|------|
| **Sora 2** | 3 | $0.015 | ¥0.105 | 11 | OpenAI视频 |
| **Sora 2 Pro** (720P) | 9 | $0.045 | ¥0.315 | 32 | 专业版 |
| **Sora 2 Pro** (1080P) | 20-26 | $0.10-0.13 | ¥0.70-0.91 | 70-91 | 高清专业 |
| **Kling 3.0 Std** | 14 | $0.07 | ¥0.49 | 49 | 标准模式 |
| **Kling 3.0 Pro** | 18 | $0.09 | ¥0.63 | 63 | 专业模式 |
| **Kling 3.0 4K** | 67 | $0.335 | ¥2.345 | 235 | 4K输出 |
| **Hailuo 2.3 Std** (6s) | 30 | $0.15 | ¥1.05 | 105 | 图生视频 |
| **Hailuo 2.3 Pro** (6s) | 45 | $0.22 | ¥1.54 | 154 | 专业图生视频 |
| **Seedance 2.0** (480P) | 11.5-19 | $0.058-0.095 | ¥0.406-0.665 | 41-67 | 字节视频 |
| **Seedance 2.0** (720P) | 25-41 | $0.125-0.205 | ¥0.875-1.435 | 88-144 | 高清 |
| **Seedance 2.0** (1080P) | 62-102 | $0.31-0.51 | ¥2.17-3.57 | 217-357 | 超高清 |
| **Wan 2.7** (720P) | 16 | $0.08 | ¥0.56 | 56 | 多功能视频 |
| **Wan 2.7** (1080P) | 24 | $0.12 | ¥0.84 | 84 | 高清输出 |
| **Veo 3.1 Fast** | 80 | $0.4 | ¥2.80 | 280 | Google快速 |
| **Veo 3.1 Quality** | 400 | $2.0 | ¥14.00 | 1400 | Google高质量 |

### 2.3 音乐/音频模型

| 模型 | KIE Credits | USD Cost | RMB Cost | Platform Points | 特点 |
|------|------------|----------|----------|-----------------|------|
| **Suno 音乐生成** | 12 | $0.06 | ¥0.42 | 42 | 完整歌曲 |
| **Suno 音效生成** | 2.5 | $0.0125 | ¥0.088 | 9 | 短音效 |
| **Suno 人声分离** | 10 | $0.05 | ¥0.35 | 35 | 音轨分离 |
| **Suno 时间戳歌词** | 0.5 | $0.0025 | ¥0.018 | 2 | 歌词同步 |
| **WAV 音频转换** | 0.4 | $0.002 | ¥0.014 | 1 | 格式转换 |
| **MIDI生成** | 0 | 免费 | 免费 | 0 | MIDI生成 |

### 2.4 文本/对话模型

| 模型 | 输入 Credits/1M | 输出 Credits/1M | USD/1M | RMB/1M | Points/1M |
|------|----------------|----------------|--------|--------|-----------|
| | | | 输入/输出 | 输入/输出 | 输入/输出 |
| **GPT-5.4** | 140 | 1120 | $0.70/$5.60 | ¥4.90/¥39.20 | 490/3920 |
| **Claude Opus 4.6** | 285 | 1430 | $1.43/$7.15 | ¥10.01/¥50.05 | 1001/5005 |
| **Claude Sonnet 4.6** | 90 | 450 | $0.45/$2.25 | ¥3.15/¥15.75 | 315/1575 |
| **Gemini 3 Pro** | 100 | 700 | $0.50/$3.50 | ¥3.50/¥24.50 | 350/2450 |
| **Gemini 2.5 Pro** | 85 | 340 | $0.43/$1.70 | ¥3.01/¥11.90 | 301/1190 |
| **DeepSeek** | 更低 | 更低 | 经济型 | 经济型 | 经济型 |

---

## 三、API 接口详情

### 3.1 图片生成 API

#### 3.1.1 GPT Image 2 - 文生图
```typescript
// POST /api/v1/jobs/createTask
interface GPTImage2TextToImageRequest {
  prompt: string;           // 图片描述
  aspect_ratio?: 'auto' | '1:1' | '5:4' | '9:16' | '16:9' | '4:3' | '3:2';
  resolution?: '1K' | '2K' | '4K';
}

// 响应
interface GPTImage2Response {
  taskId: string;
}
```

#### 3.1.2 GPT Image 2 - 图生图
```typescript
interface GPTImage2ImageToImageRequest {
  prompt: string;           // 变换描述
  input_urls: string[];     // 参考图片URL (最多16张, 30MB/张)
  aspect_ratio?: string;
  resolution?: '1K' | '2K' | '4K';
}
```

#### 3.1.3 4o Image
```typescript
interface FourOImageRequest {
  prompt: string;
  size?: '1:1' | '3:2' | '2:3';
  nVariants?: 1 | 2 | 4;    // 生成数量
  callbackUrl?: string;     // 回调URL
}
```

#### 3.1.4 Nano Banana Pro
```typescript
interface NanoBananaProRequest {
  prompt: string;           // 描述 (最多20000字符)
  image_input?: string[];   // 输入图片 (最多8张)
  aspect_ratio?: '1:1' | '2:3' | '3:2' | '3:4' | '4:3' | '4:5' | '5:4' | '9:16' | '16:9' | '21:9' | 'auto';
  resolution?: '1K' | '2K' | '4K';
  output_format?: 'png' | 'jpg';
}
```

#### 3.1.5 Flux 2 Pro Text-to-Image
```typescript
interface Flux2ProTextRequest {
  prompt: string;           // 3-5000字符
  aspect_ratio: '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '3:2' | '2:3';
  resolution: '1K' | '2K';
  nsfw_checker?: boolean;   // 默认true
}
```

#### 3.1.6 Flux 2 Pro Image-to-Image
```typescript
interface Flux2ProImageRequest {
  input_urls: string[];     // 1-8张图片
  prompt: string;
  aspect_ratio: string;
  resolution: '1K' | '2K';
}
```

#### 3.1.7 Flux Kontext Pro/Max
```typescript
interface FluxKontextRequest {
  prompt: string;           // 最多2000字符
  ratio?: '16:9' | '21:9' | '4:3' | '1:1' | '3:4' | '9:16' | '16:21';
  outputFormat?: 'jpeg' | 'png';
  model?: 'pro' | 'max';
  upsampling?: boolean;
  watermark?: string;
}
```

#### 3.1.8 Imagen 4
```typescript
interface Imagen4Request {
  prompt: string;
  negative_prompt?: string;
  aspect_ratio?: '1:1' | '16:9' | '9:16' | '3:4' | '4:3';
  seed?: number;
  num_images?: '1' | '2' | '3' | '4';  // Fast模式
  nsfw_checker?: boolean;
}
```

#### 3.1.9 Ideogram V3
```typescript
interface IdeogramV3TextRequest {
  prompt: string;
  rendering_speed?: 'TURBO' | 'BALANCED' | 'QUALITY';
  style?: 'AUTO' | 'GENERAL' | 'REALISTIC' | 'DESIGN';
  expand_prompt?: boolean;  // MagicPrompt
  image_size?: 'square' | 'square_hd' | 'portrait_4_3' | 'portrait_16_9' | 'landscape_4_3' | 'landscape_16_9';
  seed?: number;
  negative_prompt?: string;
}

interface IdeogramV3EditRequest {
  prompt: string;
  image_url: string;
  mask_url: string;         // 蒙版图片
  rendering_speed?: string;
}

interface IdeogramV3RemixRequest {
  prompt: string;
  image_url: string;
  strength?: number;        // 0.01-1.0, 保留原图程度
  rendering_speed?: string;
  style?: string;
}
```

#### 3.1.10 Seedream 4.5
```typescript
interface Seedream45TextRequest {
  prompt: string;           // 最多3000字符
  aspect_ratio: '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '2:3' | '3:2' | '21:9';
  quality: 'basic' | 'high'; // basic=2K, high=4K
}

interface Seedream45EditRequest {
  prompt: string;
  image_urls: string[];     // 最多14张
  aspect_ratio: string;
  quality: 'basic' | 'high';
}
```

---

### 3.2 视频生成 API

#### 3.2.1 Sora 2 文生视频
```typescript
interface Sora2TextToVideoRequest {
  prompt: string;           // 最多10000字符
  aspect_ratio?: 'portrait' | 'landscape';
  n_frames?: '10' | '15';   // 秒
  remove_watermark?: boolean;
  upload_method?: 's3' | 'oss';
  nsfw_checker?: boolean;
}
```

#### 3.2.2 Sora 2 图生视频
```typescript
interface Sora2ImageToVideoRequest {
  prompt: string;
  image_urls: string[];     // 必需, 首帧图片
  aspect_ratio?: 'portrait' | 'landscape';
  n_frames?: '10' | '15';
}
```

#### 3.2.3 Sora 2 角色一致性
```typescript
interface Sora2CharactersProRequest {
  origin_task_id: string;   // 之前Sora视频的任务ID
  character_user_name?: string; // 全局唯一标识 (最多40字符)
  character_prompt: string; // 角色特征描述 (最多1000字符)
  safety_instruction?: string;
}
```

#### 3.2.4 Kling 3.0
```typescript
interface Kling30Request {
  mode: 'std' | 'pro' | '4K';
  prompt: string;           // 最多2500字符
  duration: number;         // 3-15秒
  aspect_ratio?: '1:1' | '9:16' | '16:9';
  image_urls?: string[];    // 首尾帧
  multi_shots?: boolean;    // 多镜头叙事
  sound?: boolean;          // 生成音频
}
```

#### 3.2.5 Hailuo 2.3 图生视频
```typescript
interface Hailuo23Request {
  model: 'hailuo/2-3-image-to-video-standard' | 'hailuo/2-3-image-to-video-pro';
  prompt: string;           // 最多5000字符
  image_url: string;        // 必需
  duration?: '6' | '10';
  resolution?: '768P' | '1080P';
}
```

#### 3.2.6 Seedance 2.0
```typescript
interface Seedance20Request {
  prompt: string;
  reference_image_urls?: string[];  // 最多9张
  reference_video_urls?: string[];  // 最多3个, 共≤15s
  reference_audio_urls?: string[];  // 最多3个, 共≤15s
  generate_audio?: boolean;
  resolution?: '480p' | '720p' | '1080p';
  aspect_ratio?: '16:9' | '4:3' | '1:1' | '3:4' | '9:16' | '21:9';
  duration?: number;        // 4-15秒
  first_frame_url?: string;
  last_frame_url?: string;
}
```

#### 3.2.7 Wan 2.7 文生视频
```typescript
interface Wan27TextToVideoRequest {
  prompt: string;
  negative_prompt?: string;
  audio_url?: string;       // 背景音频
  resolution?: '720p' | '1080p';
  ratio?: '16:9' | '9:16' | '1:1' | '4:3' | '3:4';
  duration?: number;        // 2-15秒
  prompt_extend?: boolean;  // 提示词优化
  seed?: number;
}
```

#### 3.2.8 Wan 2.7 图生视频
```typescript
interface Wan27ImageToVideoRequest {
  prompt: string;
  first_frame_url?: string; // 首帧图片
  last_frame_url?: string;  // 尾帧图片
  first_clip_url?: string;  // 参考视频
  driving_audio_url?: string; // 驱动音频
  resolution?: '720p' | '1080p';
  duration?: number;
}
```

#### 3.2.9 Wan 2.7 视频编辑
```typescript
interface Wan27VideoEditRequest {
  video_url: string;        // 源视频
  prompt?: string;          // 编辑指令
  reference_image?: string;
  resolution?: '720p' | '1080p';
  audio_setting?: 'auto' | 'origin';
}
```

---

### 3.3 音乐/音频 API

#### 3.3.1 Suno 音乐生成
```typescript
interface SunoGenerateRequest {
  model?: 'V4_5PLUS';
  prompt?: string;          // 风格描述
  title?: string;
  style?: string;           // 音乐风格
  lyrics?: string;          // 歌词
  instrumental?: boolean;   // 纯音乐
  vocalGender?: 'male' | 'female';
  audioWeight?: number;
}

interface SunoExtendRequest {
  model: string;
  audioId: string;          // 扩展的音频ID
  defaultParamFlag?: boolean;
}
```

#### 3.3.2 Suno 歌词生成
```typescript
interface SunoLyricsRequest {
  prompt: string;           // 最多200字符
}
```

#### 3.3.3 Suno 人声分离
```typescript
interface SunoVocalRemovalRequest {
  taskId: string;
  audioId: string;
  separationType: 'vocals' | 'instrumental' | 'both';
}
```

#### 3.3.4 Suno MIDI生成
```typescript
interface SunoMIDIRequest {
  taskId: string;           // 人声分离后的任务ID
  audioId?: string;
}
```

---

### 3.4 文本对话 API

```typescript
// OpenAI兼容格式
interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: object;
    };
  }>;
}

// 可用模型
const chatModels = [
  'gpt-5-4-openai-resp',
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'gemini-3-pro-openai',
  'gemini-2.5-pro',
  'gemini-2.5-flash',
];
```

---

## 四、前端接口封装

### 4.1 API 服务层结构（统一抽象，禁止按模型拆分）

> **架构原则**：前端绝不直接调用 KIE.ai，所有请求经自建后端代理。API 层按"能力类型"统一抽象，不按具体模型拆分。

```
src/api/
├── client.ts             # Axios实例 + 通用拦截器（统一后端基址）
├── types.ts              # 所有类型定义
├── generation.ts         # 统一生成API（图片/视频/音频共用）
├── chat.ts               # 对话API（流式响应）
├── task.ts               # 任务状态查询（全能力共用）
└── user.ts               # 用户/认证/积分相关
```

**设计约束**：
- 禁止为每个模型创建独立 API 文件（如 `gpt-image.ts`、`sora.ts` 等反模式）
- 模型列表通过后端 `GET /api/models` 动态获取，前端零硬编码
- 新增/下线模型只需后端配置，前端无需发布

### 4.2 通用任务查询

```typescript
// src/api/task.ts
export const taskApi = {
  // 查询任务状态
  getStatus: (taskId: string) =>
    get<TaskStatusResponse>(`/api/tasks/${taskId}`),

  // 列表查询（资产管理）
  getList: (params?: { type?: string; status?: string; page?: number; limit?: number }) =>
    get<TaskListResponse>('/api/tasks', { params }),

  // 取消/删除
  delete: (taskId: string) =>
    del(`/api/tasks/${taskId}`),
};
```

### 4.3 统一生成 API 封装

```typescript
// src/api/generation.ts
export const generationApi = {
  // 统一创建生成任务（图片/视频/音频）
  create: (data: {
    type: 'image' | 'video' | 'audio';
    model: string;           // 从后端 GET /api/models 获取的模型ID
    params: object;          // 各能力不同参数，前端按后端返回的 schema 渲染表单
  }) =>
    post<TaskResponse>('/api/tasks', data),

  // 获取可用模型列表（前端动态渲染模型选择器）
  getModels: (type?: string) =>
    get<ModelConfig[]>('/api/models', { params: { type } }),
};

// ModelConfig 类型（后端驱动）
interface ModelConfig {
  id: string;               // 模型唯一标识
  name: string;             // 展示名称
  type: 'image' | 'video' | 'audio' | 'chat';
  description?: string;
  paramsSchema: object;     // JSON Schema，前端动态渲染表单
  priceConfig: {
    unit: string;           // 'per_image' | 'per_second' | 'per_request'
    amount: number;         // 积分单价
  };
  isEnabled: boolean;
}
```

### 4.4 对话 API 封装

```typescript
// src/api/chat.ts
export const chatApi = {
  // 流式对话
  sendStream: (data: {
    model: string;
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>;
    temperature?: number;
    maxTokens?: number;
  }) =>
    post('/api/chat', { ...data, stream: true }, {
      responseType: 'stream',
    }),

  // 非流式对话
  send: (data: ChatRequest) =>
    post<ChatResponse>('/api/chat', { ...data, stream: false }),
};
```

---

## 五、文件存储与图床策略

> **架构原则**：前端绝不直接访问 KIE.ai 图床，所有文件 URL 经由自建后端代理或转存。

### 5.1 KIE 生成的媒体文件生命周期

KIE.ai 生成的媒体文件自动托管，原始 URL 格式:
```
https://static.aiquickdraw.com/...
```

**后端处理流程**：
1. KIE 回调返回 `result_url`（KIE 图床地址，14天自动删除）
2. 后端 `FileService` 异步下载到本地存储
3. `stored_files` 表记录 `original_url`（KIE）和 `local_path`（永久）
4. 前端统一通过 `/api/files/:fileId` 访问，不直接暴露 KIE URL

**文件保留策略**：
| 类型 | 保留方式 | 期限 |
|------|---------|------|
| 案例文件 (`is_example=true`) | 本地永久存储 | 永久 |
| 普通生成文件 | 本地存储 + 定期清理 | 30天 |
| KIE 原始文件 | 仅作备份下载源 | 14天后失效 |

### 5.2 前端文件上传（走自建后端）
```typescript
// 上传文件到自建后端，由后端存储或转发到 KIE
export const uploadApi = {
  uploadFile: (file: File) =>
    post<{ fileId: string; url: string }>('/api/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
};
```
**约束**：前端禁止直接请求 KIE 上传接口，所有文件流经由自建后端。

---

## 六、积分消耗估算

### 6.1 典型操作消耗

| 操作 | 模型推荐 | KIE Credits | USD Cost | RMB Cost | Platform Points |
|------|----------|------------|----------|----------|-----------------|
| 生成1张图片 | Imagen 4 Fast | 4 | $0.02 | ¥0.14 | 14 |
| 生成高质量图片 | GPT Image 2 2K | 10 | $0.05 | ¥0.35 | 35 |
| 生成10秒视频 | Kling 3.0 Std | 140 | $0.70 | ¥4.90 | 490 |
| 生成一首歌 | Suno | 12 | $0.06 | ¥0.42 | 42 |
| AI对话 1K tokens | GPT-5.4 | ~1 | ~$0.005 | ~¥0.035 | ~4 |

### 6.2 用户积分建议定价

**定价基准: 1 平台积分 = ¥0.01 RMB**

| 套餐 | 积分 | 售价 | 成本 | 毛利 | 可消费参考 |
|------|------|------|------|------|-----------|
| 体验版 | 100 | ¥1.0 | ~¥0.50 | ~50% | 7张 Imagen 4 Fast / 2张 GPT Image 2 2K |
| 基础版 | 500 | ¥5.0 | ~¥2.50 | ~50% | 35张 Imagen 4 Fast / 10张 GPT Image 2 2K |
| 标准版 | 2000 | ¥20.0 | ~¥10.00 | ~50% | 4条 10秒 Kling Std 视频 / 47首 Suno 歌曲 |
| 专业版 | 10000 | ¥100.0 | ~¥50.00 | ~50% | 20条 10秒 Kling Std 视频 / 238首 Suno 歌曲 |

> **成本计算说明**: 成本按 KIE 定价 + 50% 运营/算力/带宽综合成本估算。实际定价可根据市场策略调整，建议体验版微利引流，专业版保证 40%+ 毛利。

---

*API文档版本: 2.0.0*
*基于 KIE.ai 官方文档整理*
*更新: 2026-04-29 - 新增人民币成本与平台积分列（1 KIE credit ≈ 3.5 平台积分，1 平台积分 = ¥0.01）*
