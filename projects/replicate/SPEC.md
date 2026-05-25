# 复刻功能 MVP — 项目规范

## 目标
用户上传图片/视频 → 系统反推 AI 生成提示词 → 展示提示词 + 复制/下载

## 技术方案
- 后端：Node.js/Express，MiniMax M2.5 多模态（`/v1/chat/completions`）
- 视频处理：Python OpenCV 提取关键帧（无需 ffmpeg）
- 前端：React + Vite，参考 AI 音乐页面风格

## 功能范围（MVP）
- 图片反推提示词（M2.5 多模态）
- 视频反推提示词（3 关键帧 + M2.5 分析）
- 提示词复制 / 下载
- 最近记录 localStorage

## 后端模块
- Provider: backend/src/providers/minimax/replicate.js
- Module: backend/src/modules/replicate/ (routes + controller + service)
- 注册: backend/src/app.js → /api/replicate

## 前端模块
- View: frontend-app/src/features/replicate/ReplicateView.jsx
- API: frontend-app/src/features/replicate/replicateApi.js
- 路由: main.jsx → #/replicate

## UI 参考
- 参考 AI 音乐页面：tabs + 上传区 + 结果展示 + 最近记录

## 分工
- @kimi: 后端 provider + module + app.js
- @Cindy: 前端 ReplicateView + replicateApi.js + main.jsx
- @codex: 规划收口 + 联调

## 进度
- [x] 后端 provider + module
- [x] 前端 view + API
- [x] 路由接入 main.jsx
- [ ] 联合测试