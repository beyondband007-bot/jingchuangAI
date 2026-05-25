# 后端变更记录 — 转录功能

## 新增文件

### 1. `backend/src/providers/minimax/transcribe.js`
- 封装 MiniMax `/v1/music_cover_preprocess` 接口
- 对外暴露转录语义：`text`、`formattedText`、`segments`、`durationMs`、`traceId`
- 内部将 `structure_result` 解析为标准化 segments

### 2. `backend/src/modules/transcribe/transcribe.service.js`
- 业务逻辑：音频文件校验（50MB、mp3/m4a/wav/flac/webm、6s~6min）
- 调用 provider 执行转录
- 维护内存级最近记录（最多50条）
- 返回结构化转录结果

### 3. `backend/src/modules/transcribe/transcribe.controller.js`
- `GET /api/transcribe/config` — 获取配置（格式限制、大小限制、时长限制）
- `GET /api/transcribe/recent` — 获取最近转录记录
- `POST /api/transcribe/` — 上传音频并执行转录

### 4. `backend/src/modules/transcribe/transcribe.routes.js`
- Express Router + multer memory storage
- 文件大小限制 50MB
- 字段名：`audio`

### 5. `backend/storage/transcribe/`
- 转录功能文件存储目录（预留）

## 修改文件

### `backend/src/app.js`
- 新增 import：`transcribeRouter`
- 新增路由：`app.use("/api/transcribe", transcribeRouter)`

## API 接口定义

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/transcribe/config | 获取转录配置 |
| GET | /api/transcribe/recent | 获取最近转录记录 |
| POST | /api/transcribe/ | 上传音频文件，返回转录结果 |

### POST /api/transcribe/ 请求
- Content-Type: `multipart/form-data`
- 字段：
  - `audio` (File, required) — 音频文件
  - `durationMs` (Number, optional) — 音频时长（毫秒）

### POST /api/transcribe/ 响应
```json
{
  "id": "transcribe-1234567890-abc123",
  "fileName": "recording.mp3",
  "mimeType": "audio/mpeg",
  "size": 1024000,
  "durationMs": 45000,
  "text": "这是转录后的纯文本内容",
  "formattedText": "[00:00] 这是\n[00:05] 转录后的\n[00:10] 内容",
  "segments": [
    { "label": "verse", "startMs": 0, "endMs": 5000 },
    { "label": "chorus", "startMs": 5000, "endMs": 10000 }
  ],
  "traceId": "trace-xxx",
  "createdAt": "2026/5/11 16:00:00"
}
```
