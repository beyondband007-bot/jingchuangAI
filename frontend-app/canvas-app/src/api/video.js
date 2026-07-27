import { associateNodeTask, faceminiRequest, notifyCreditsChanged, uploadDataUrl } from './facemini'

export async function createVideoTask(data) {
  const imageReference = data.reference_image?.url || data.reference_image
    || data.first_frame_image?.url || data.first_frame_image
    || data.images?.[0]?.url || data.images?.[0] || ''
  const videoReference = data.reference_video?.url || data.reference_video || ''
  if (imageReference && videoReference) {
    throw new Error('一次视频生成只能引用图片或视频中的一种素材')
  }
  const referenceImageUrl = await uploadDataUrl(imageReference, '/video/uploads/reference-image', 'canvas-video-reference.png')
  const referenceVideoUrl = await uploadDataUrl(videoReference, '/video/uploads/reference-video', 'canvas-video-reference.mp4')
  const task = await faceminiRequest('/video/tasks', {
    method: 'POST',
    body: JSON.stringify({
      model: 'seedance_2_0_720p',
      prompt: data.prompt || '',
      ratio: data.size || data.ratio || '16:9',
      duration: Number(data.seconds || data.duration || 5),
      mode: 'first-frame',
      count: 1,
      source: 'infinite-canvas',
      referenceImageUrl: referenceImageUrl || null,
      referenceVideoUrl: referenceVideoUrl || null
    })
  })
  await associateNodeTask({
    projectId: data.projectId,
    nodeId: data.nodeId,
    taskType: 'video',
    taskId: task.id,
    inputHash: data.inputHash
  })
  notifyCreditsChanged()
  return task
}

export async function getVideoTaskStatus(taskId) {
  const task = await faceminiRequest(`/video/tasks/${encodeURIComponent(taskId)}`)
  if (['completed', 'failed'].includes(task.status)) notifyCreditsChanged()
  return { ...task, url: task.video || null }
}

export async function pollVideoTask(taskId, maxAttempts = 120, interval = 5000) {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await getVideoTaskStatus(taskId)
    if (result.status === 'completed') return result
    if (result.status === 'failed') throw new Error(result.error || '视频生成失败')
    await new Promise(resolve => setTimeout(resolve, interval))
  }
  throw new Error('视频生成仍在处理中，请稍后回到当前画布查看结果')
}
