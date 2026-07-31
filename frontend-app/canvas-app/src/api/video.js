import { associateNodeTask, faceminiRequest, notifyCreditsChanged, uploadDataUrl } from './facemini'
import { resolveVideoImageSources } from '../utils/videoRequest'
import { createVideoError } from '../utils/videoError'

export async function createVideoTask(data) {
  const {
    firstFrameImage,
    lastFrameImage,
    referenceImages
  } = resolveVideoImageSources(data)
  const videoReference = data.reference_video?.url || data.reference_video || ''
  const audioReference = data.reference_audio?.url || data.reference_audio || ''
  const hasFrameImages = Boolean(firstFrameImage || lastFrameImage)
  const hasImageReferences = referenceImages.length > 0
  if ((hasFrameImages || hasImageReferences) && videoReference) {
    throw new Error('一次视频生成只能引用图片或视频中的一种素材')
  }
  if (lastFrameImage && !firstFrameImage) {
    throw new Error('设置尾帧时必须同时设置首帧')
  }
  if (hasFrameImages && hasImageReferences) {
    throw new Error('首尾帧模式不能同时使用普通参考图')
  }
  if (referenceImages.length > 9) {
    throw new Error('一次视频生成最多支持 9 张参考图')
  }

  const firstFrameImageUrl = await uploadDataUrl(
    firstFrameImage,
    '/video/uploads/reference-image',
    'canvas-video-first-frame.png'
  )
  const lastFrameImageUrl = await uploadDataUrl(
    lastFrameImage,
    '/video/uploads/reference-image',
    'canvas-video-last-frame.png'
  )
  const referenceImageUrls = await Promise.all(referenceImages.map((image, index) =>
    uploadDataUrl(
      image,
      '/video/uploads/reference-image',
      `canvas-video-reference-${index + 1}.png`
    )
  ))
  const referenceVideoUrl = await uploadDataUrl(videoReference, '/video/uploads/reference-video', 'canvas-video-reference.mp4')
  const referenceAudioUrl = await uploadDataUrl(audioReference, '/video/uploads/reference-audio', 'canvas-video-reference.mp3')
  const task = await faceminiRequest('/video/tasks', {
    method: 'POST',
    body: JSON.stringify({
      model: 'seedance_2_0_720p',
      prompt: data.prompt || '',
      ratio: data.size || data.ratio || '16:9',
      duration: Number(data.seconds || data.duration || 5),
      mode: hasImageReferences
        ? 'reference-image'
        : lastFrameImageUrl
          ? 'first-last-frame'
          : 'first-frame',
      count: 1,
      source: 'infinite-canvas',
      firstFrameImageUrl: firstFrameImageUrl || null,
      lastFrameImageUrl: lastFrameImageUrl || null,
      referenceImageUrls,
      referenceVideoUrl: referenceVideoUrl || null,
      referenceAudioUrl: referenceAudioUrl || null
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
    if (result.status === 'failed') throw createVideoError(result)
    await new Promise(resolve => setTimeout(resolve, interval))
  }
  throw new Error('视频生成仍在处理中，请稍后回到当前画布查看结果')
}
