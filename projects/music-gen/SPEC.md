# AI 音乐生成 — 项目规范

## 目标
新增"AI 音乐"功能：输入风格 prompt + 歌词 → MiniMax 生成 → 播放/下载/历史记录。

## 技术栈
- 后端：Node.js/Express，端口 3006
- 前端：React + Vite
- API：MiniMax POST /v1/music_generation
- 模型：music-2.6-free（MVP）
- 输出：hex → 本地 /media/music/... 稳定链接

## 功能范围（MVP）
- 原创音乐生成（文本 prompt + 歌词）
- 纯音乐模式（isInstrumental，歌词非必填）
- 输出：mp3 播放/下载、歌词 txt、最近记录 localStorage

## 后端模块
- Provider: backend/src/providers/minimax/musicGen.js
- Module: backend/src/modules/music/ (routes + controller + service)
- 注册: backend/src/app.js → /api/music
- 存储: backend/storage/music/audio/

## 前端模块
- View: frontend-app/src/features/music/MusicGenView.jsx
- API: frontend-app/src/features/music/musicApi.js
- 路由: main.jsx → #/music

## UI 参考
- 参考 TranscribeView 布局：tabs + 结果区 + 底部悬浮 composer

## 分工
- @kimi: 后端 provider + module + app.js
- @Cindy: 前端 MusicGenView + musicApi.js + main.jsx
- @codex: 规划 + 联调

## 进度
- [ ] 后端 provider + module
- [ ] 前端 view + API
- [ ] 路由接入 main.jsx
- [ ] 联合测试