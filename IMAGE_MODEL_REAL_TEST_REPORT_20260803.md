# 图片模型真实测试报告（2026-08-03）

> 状态更新：Imagen 4 Fast 已在同日从项目的运行时模型、前端入口和数据库模型配置中移除；下文仅保留移除前的真实测试与退款审计记录。

## 结论

- Flux 2 Pro：真实生成成功，结果已落地并可完整解码。
- Seedream 4.5：真实生成成功，结果已落地并可完整解码。
- Imagen 4 Fast：本地请求适配已修正为 Kie 当前官方最小请求，但 Kie 连续三次异步返回 `500 Internal Error`。三次均未消耗 Kie credits，平台积分均自动退款。剩余问题属于 Kie/Google 上游故障。

## 已修复问题

原适配器把通用的 `resolution`、`output_format`、`google_search`、`image_input` 等字段发送给三个协议不同的模型。

修复后：

- Flux 2 Pro：`prompt + aspect_ratio + resolution + nsfw_checker`
- Imagen 4 Fast：`prompt + negative_prompt + aspect_ratio`
- Seedream 4.5：`prompt + aspect_ratio + quality=basic + nsfw_checker`

同时新增协议级测试和可重复执行的真实冒烟脚本 `npm run smoke:image-models`。

## 真实任务证据

测试提示词：`A minimalist studio photograph of a small red paper boat on calm blue water, soft daylight, clean background, no text`

| 模型 | 本地任务 ID | Kie 任务 ID | Kie 模型记录 | 终态 | Kie credits | 平台积分 |
|---|---:|---|---|---|---:|---:|
| Flux 2 Pro | 58 | `2cc696a693b0abd9ead65e75062ac257` | `flux-2/pro-text-to-image` | success | 5 | -30 |
| Seedream 4.5 | 60 | `bd9e047eea499196e5d0987c4829dce0` | `seedream/4.5-text-to-image` | success | 6.5 | -30 |
| Imagen 4 Fast（初测） | 59 | `297e6ac7aed545edc16b102165f16240` | `google/imagen4-fast` | fail / 500 | 0 | 扣 30 后退 30 |
| Imagen 4 Fast（收敛字段） | 61 | `304035894b008c83dd645c5c13d3192e` | `google/imagen4-fast` | fail / 500 | 0 | 扣 30 后退 30 |
| Imagen 4 Fast（官方最小字段） | 62 | `c8fbdeb4432703c142494685b85e847e` | `google/imagen4-fast` | fail / 500 | 0 | 扣 30 后退 30 |

成功任务对应 run：`codex-image-model-smoke-20260803-real-01`。

最终 Imagen 回归 run：`codex-image-model-smoke-20260803-imagen-final-01`。

## 结果文件验证

### Flux 2 Pro

- 本地文件：`backend/storage/generated/images/58/result-1.png`
- 供应商结果 URL：`https://tempfile.aiquickdraw.com/h/2cc696a693b0abd9ead65e75062ac257_1785741558.png`
- 文件大小：1,343,616 bytes
- 解码：PNG，1024 × 1024，`rgb24`

### Seedream 4.5

- 本地文件：`backend/storage/generated/images/60/result-1.jpg`
- 供应商结果 URL：`https://tempfile.aiquickdraw.com/p/bd9e047eea499196e5d0987c4829dce0_1_1785741551_9779.jpg`
- 文件大小：574,270 bytes
- 解码：JPEG，1920 × 1920，`yuvj420p`

供应商 URL 为临时地址；本地结果已持久化，不依赖该临时地址继续展示。

## 验证项

- 后端全量测试：74 项通过，0 项失败。
- 新增图片模型协议测试：3 项通过，0 项失败。
- 运行态：后端容器 healthy，`/health` 返回数据库连接正常。
- 计费闭环：成功任务净扣 60 平台积分；三次 Imagen 失败均自动退款；Kie 总消耗 11.5 credits，仅来自两个成功模型。

## 未完成/异常项

Imagen 4 Fast 当前无法从 Kie 获得成功结果。最终请求已经与当前官方文档一致，Kie 能创建任务并返回正确的模型记录，但约 10 秒后统一以 `failCode=500`、`Internal Error, Please try again later.` 结束。由于供应商侧没有返回更细的错误码，本地没有可继续修复的参数或代码错误；需要 Kie 恢复该模型或由 Kie 支持根据上述任务 ID 排查上游日志。
