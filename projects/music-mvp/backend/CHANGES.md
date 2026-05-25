# 后端变更记录 — AI 音乐生成

## 新增文件

### 1. `backend/src/providers/minimax/musicGeneration.js`
- 封装 MiniMax `/v1/music_generation` 接口
- 默认模型 `music-2.6-free`
- 支持参数：`prompt`、`lyrics`、`model`、`isInstrumental`、`lyricsOptimizer`
- 返回：`audioBuffer`、`durationMs`、`sampleRate`、`channel`、`bitrate`、`musicSize`、`traceId`
- hex → buffer 解码（复用 TTS 的 `hexToBuffer` 模式）

### 2. `backend/src/modules/music/music.service.js`
- 业务逻辑：prompt/lyrics 校验（prompt ≤2000，lyrics ≤3500）
- 调用 provider 生成音乐
- 保存音频到 `storage/music/audio/`
- 维护内存级最近记录（最多50条）
- 支持纯音乐模式（`isInstrumental: true` 时 lyrics 非必填）

### 3. `backend/src/modules/music/music.controller.js`
- `GET /api/music/config` — 获取配置（模型列表、长度限制、音频设置）
- `GET /api/music/recent` — 获取最近生成记录
- `POST /api/music/generate` — 生成音乐

### 4. `backend/src/modules/music/music.routes.js`
- Express Router
- `GET /config`、`GET /recent`、`POST /generate`

### 5. `backend/storage/music/audio/`
- 音乐生成结果存储目录

## 修改文件

### `backend/src/app.js`
- 新增 import：`musicRouter`
- 新增路由：`app.use("/api/music", musicRouter)`

## API 接口定义

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/music/config | 获取音乐生成配置 |
| GET | /api/music/recent | 获取最近生成记录 |
| POST | /api/music/generate | 生成音乐 |

### POST /api/music/generate 请求
```json
{
  "prompt": "独立民谣,忧郁,内省,渴望,独自漫步,咖啡馆",
  "lyrics": "[verse]\n街灯微亮晚风轻抚\n...",
  "model": "music-2.6-free",
  "isInstrumental": false,
  "lyricsOptimizer": false
}
```

### POST /api/music/generate 响应
```json
{
  "id": "music-1234567890-abc123",
  "prompt": "独立民谣,忧郁,内省,渴望,独自漫步,咖啡馆",
  "lyrics": "[verse]\n街灯微亮晚风轻抚\n...",
  "model": "music-2.6-free",
  "isInstrumental": false,
  "audioUrl": "/media/music/audio/music-1234567890-abc123.mp3",
  "durationMs": 25364,
  "sampleRate": 44100,
  "channel": 2,
  "bitrate": 256000,
  "musicSize": 813651,
  "traceId": "trace-xxx",
  "createdAt": "2026/5/11 16:00:00"
}
```
