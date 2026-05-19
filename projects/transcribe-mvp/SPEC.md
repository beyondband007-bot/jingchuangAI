# 转录功能 MVP — 项目规范

## 目标
在 D:\AI工作台 项目中新增语音转文字功能，调用 MiniMax 接口，前端 UI 参考音色转换风格。

## 技术栈
- **后端**：Node.js / Express，端口 3006
- **前端**：React + Vite
- **API**：MiniMax （复用已有 API Key）
- **Base URL**：https://api.minimaxi.com

## 功能范围（MVP）
- 单文件音频上传（mp3/wav/flac/m4a/webm）
- 文件限制：6秒 ~ 6分钟，最大 50MB
- 输出：纯文本 + JSON 下载（含 segments）
- 历史记录：localStorage（不上 DB）

## 后端模块
- Provider: 
- Module:  (routes + controller + service)
- 路由注册:  → 
- 存储: 

## 前端模块
- View: 
- API: 
- 路由接入:  (activeNav === 'transcribe')

## UI 参考
- 参考 
- 布局：上传区 → 参数展示 → 执行按钮 → 结果区（文本展示/复制/下载）+ 历史记录
- 样式：新建 transcribe-* class，不污染 voice-convert

## 分工
- @kimi: 后端（provider + module + app.js 注册）
- @codex: 前端（TranscribeView + transcribeApi + main.jsx 路由）
- @Cindy: 协调 + 文档

## 进度
- [ ] 后端 provider + module
- [ ] 前端 TranscribeView + API
- [ ] 前端路由接入 main.jsx
- [ ] 联合测试验证
