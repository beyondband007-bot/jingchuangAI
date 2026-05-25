# 后端变更记录 — AI 音乐生成

## 新增文件

### 1. `backend/src/providers/minimax/musicGeneration.js`
- 封装 MiniMax `/v1/music_generation` 接口
- 参数：prompt / lyrics / model / isInstrumental / lyricsOptimizer
- 默认 response_format: hex，内部 hexToBuffer 解码
- 返回：audioBuffer / durationMs / sampleRate / bitrate / traceId

### 2. `backend/src/modules/music/music.service.js`
- assertPrompt / assertLyrics 校验
- 调用 generateMinimaxMusic
- saveMusicAudio({taskId, audioBuffer}) 保存到 storage/music/audio/
- 返回：id / audioUrl / prompt / lyrics / model / durationMs / traceId

### 3. `backend/src/modules/music/music.controller.js`
- GET /api/music/config — 模型列表 / 长度限制 / 音频设置
- GET /api/music/recent — 最近记录（内存数组，MVP 不上 DB）
- POST /api/music/generate — 主接口

### 4. `backend/src/modules/music/music.routes.js`
- Express Router，POST 支持 multer memory storage

### 5. `backend/storage/music/audio/`
- 存储生成的 mp3 文件

## 修改文件

### `backend/src/app.js`
- import musicRouter
- app.use("/api/music", musicRouter)
