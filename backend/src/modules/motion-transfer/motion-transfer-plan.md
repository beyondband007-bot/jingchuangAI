# 动作迁移功能计划

## Summary
新增完整“动作迁移”链路：上传人物图片、上传动作参考视频、创建 KIE 动作迁移任务、轮询结果、展示历史结果。

UI 参考当前浏览器页面：浅蓝主画布，中部空状态标题“开启你的动作迁移”，底部悬浮上传面板，包含“上传单人图”和“上传动作视频”两个入口。

## Public APIs / Interfaces
- `GET /api/motion-transfer/models`
  - 返回模型、默认值、价格、上传限制。
- `POST /api/motion-transfer/uploads/image`
  - `multipart/form-data` 字段：`image`
  - 仅允许 `image/*`，默认上限 `10MB`
- `POST /api/motion-transfer/uploads/video`
  - `multipart/form-data` 字段：`video`
  - 仅允许 `video/*`，默认上限 `200MB`
- `POST /api/motion-transfer/tasks`
  - JSON：`{ imageAssetId, videoAssetId, prompt?, model?, resolution?, duration? }`
- `GET /api/motion-transfer/tasks`
- `GET /api/motion-transfer/tasks/:id`
- `POST /api/motion-transfer/tasks/:id/favorite`
- `DELETE /api/motion-transfer/tasks/:id`

## Key Changes
- 在 `backend/src/modules/motion-transfer/` 新建动作迁移模块，结构沿用现有 `video` / `image-digital-human` 模块。
- 新增数据库表：
  - `motion_transfer_assets`：保存上传图片/视频的本地地址、KIE 地址、文件名、大小、类型。
  - `motion_transfer_tasks`：保存任务状态、provider task id、结果视频、错误、收藏、扣退积分。
- 新增 KIE provider 方法：
  - 复用现有 `uploadFileToKie`
  - 创建任务走 `/api/v1/jobs/createTask`
  - 默认模型使用 `KIE_MOTION_TRANSFER_MODEL`，未配置时先用 `wan/2-7-r2v`
- 前端新增 `motionTransferApi.js` 和 `MotionTransferView`：
  - 支持 `/#/motion`
  - 上传图片后显示图片预览
  - 上传视频后显示视频预览
  - 两个素材上传完成后才能生成
  - 展示 processing / completed / failed 状态和历史结果
- 积分：
  - 默认每次 `100` 积分
  - 支持 `KIE_MOTION_TRANSFER_POINTS` 环境变量覆盖
  - 任务失败自动退款

## Test Plan
- 后端：
  - 图片上传接口拒绝非图片文件。
  - 视频上传接口拒绝非视频文件。
  - 缺少图片或视频 asset 时创建任务返回 `400`。
  - KIE 创建失败时任务标记 failed 并退款。
  - 轮询能正确映射 KIE success/fail。
- 前端：
  - `npm run build` 通过。
  - 打开 `/#/motion` 后侧边栏“动作迁移”高亮。
  - 空状态和上传面板贴近参考 UI。
  - 上传图片/视频后预览正常。
  - 生成按钮禁用/启用逻辑正确。
  - 完成任务后视频可播放，失败任务展示错误。
- 响应式：
  - 桌面端上传区并排。
  - 移动端上传区上下排列。
  - 价格、按钮、文件名不重叠。

## Assumptions
- 本期做完整任务链路，不只是上传接口。
- 计划文档路径为 `backend/src/modules/motion-transfer/motion-transfer-plan.md`。
- 先不引入 ffmpeg 解析视频时长，仅做 MIME 和大小校验。
- 动作参考视频建议控制在 15 秒以内。
