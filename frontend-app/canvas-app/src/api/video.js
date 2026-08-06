import { associateNodeTask, faceminiRequest, notifyCreditsChanged, uploadDataUrl } from './facemini'
import { resolveVideoImageSources } from '../utils/videoRequest'
import { createVideoError } from '../utils/videoError'

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

export async function createVideoTask(data, { onTaskCreated = () => {} } = {}) {
  const {
    firstFrameImage,
    lastFrameImage,
    referenceImages
  } = resolveVideoImageSources(data)
  const videoReference = data.reference_video?.url || data.reference_video || ''
  const audioReference = data.reference_audio?.url || data.reference_audio || ''
  const isMinimaxH3 = data.model === 'minimax_h3_2k'
  const hasFrameImages = Boolean(firstFrameImage || lastFrameImage)
  const hasImageReferences = referenceImages.length > 0
  if ((hasFrameImages || (!isMinimaxH3 && hasImageReferences)) && videoReference) {
    throw new Error('一次视频生成只能引用图片或视频中的一种素材')
  }
  if (isMinimaxH3 && hasFrameImages && audioReference) {
    throw new Error('MiniMax H3 首尾帧模式不能同时使用参考音频')
  }
  if (isMinimaxH3 && audioReference && !hasImageReferences && !videoReference) {
    throw new Error('MiniMax H3 参考音频必须搭配参考图片或视频')
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
      model: data.model || 'seedance_2_0_720p',
      prompt: data.prompt || '',
      ratio: data.size || data.ratio || '16:9',
      resolution: data.resolution || null,
      duration: Number(data.seconds || data.duration || 5),
      mode: hasImageReferences || videoReference || audioReference
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
  onTaskCreated(task)
  await associateNodeTask({
    projectId: data.projectId,
    nodeId: data.resultNodeId || data.nodeId,
    taskType: 'video',
    taskId: task.id,
    inputHash: data.inputHash
  }).catch(error => {
    console.warn('[Canvas] 视频任务关联保存失败，节点内 taskId 将用于恢复:', error.message)
  })
  notifyCreditsChanged()
  return task
}

export async function getVideoTaskStatus(taskId) {
  const task = await faceminiRequest(`/video/tasks/${encodeURIComponent(taskId)}`, {
    cache: 'no-store'
  })
  if (['completed', 'failed'].includes(task.status)) notifyCreditsChanged()
  return { ...task, url: task.video || task.url || null }
}

export async function pollVideoTask(taskId, {
  maxAttempts = 120,
  interval = 5000,
  onStatus = () => {}
} = {}) {
  let lastError = null
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const result = await getVideoTaskStatus(taskId)
      lastError = null
      onStatus(result)
      if (result.status === 'completed' && result.url) return result
      if (result.status === 'failed') {
        const terminalError = createVideoError(result)
        terminalError.terminalTask = true
        throw terminalError
      }
    } catch (error) {
      if (error.terminalTask || [401, 403, 404].includes(error.status)) throw error
      lastError = error
    }
    if (attempt < maxAttempts - 1) await wait(interval)
  }
  if (lastError) {
    throw new Error(`视频任务状态同步失败：${lastError.message || '网络异常'}`)
  }
  throw new Error('视频生成仍在处理中，请稍后重新打开当前画布自动恢复结果')
}
