# 静态素材分层约定

前端通过 Vite `public` 目录提供静态资源，浏览器访问路径从 `/assets/...` 开始。

- `image/`：图片生成功能素材，例如示例图、生成结果占位图。
- `video/`：视频生成功能素材，例如示例视频、视频封面。
- `digital-human/`：数字人功能素材，例如形象封面、示例视频、生成结果视频。
- `chat/`：AI 对话功能素材。
- `home/`：首页或公共落地页素材。
- `music/`、`motion/`、`face-swap/`、`tts/`、`article/`、`watermark/`、`voice/`：后续功能素材目录。

示例：

```js
"/assets/digital-human/host-demo.mp4"
"/assets/image/gallery-1.jpg"
"/assets/videoInspiration/demo.webm"
```

新增功能时创建同名目录，并只在该功能代码中引用自己的目录。
