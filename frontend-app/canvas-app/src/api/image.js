import { associateNodeTask, faceminiRequest, notifyCreditsChanged, uploadDataUrl } from './facemini.js'

const wait = ms => new Promise(resolve => setTimeout(resolve, ms))

function normalizeRatio(value) {
  const ratio = String(value || '1:1').replace('x', ':')
  return ['1:1', '3:4', '4:3', '9:16', '16:9', '21:9'].includes(ratio) ? ratio : '1:1'
}

async function resolveReferences(value) {
  const input = Array.isArray(value) ? value : (value ? [value] : [])
  return Promise.all(input.filter(Boolean).map((item, index) =>
    uploadDataUrl(item?.url || item, '/image/uploads/reference', `canvas-reference-${index + 1}.png`)
  ))
}

export async function getImageTaskStatus(taskId) {
  return faceminiRequest(`/image/tasks/${encodeURIComponent(taskId)}`, {
    cache: 'no-store'
  })
}

export async function pollImageTask(taskId, {
  maxAttempts = 120,
  interval = 2500,
  onStatus = () => {}
} = {}) {
  let lastError = null
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const current = await getImageTaskStatus(taskId)
      lastError = null
      onStatus(current)
      if (current.status === 'completed' && current.imageUrl) return current
      if (current.status === 'failed') throw new Error(current.error || '图片生成失败')
    } catch (error) {
      if ([401, 403, 404].includes(error.status)) throw error
      lastError = error
    }
    if (attempt < maxAttempts - 1) await wait(interval)
  }
  if (lastError) {
    throw new Error(`图片任务状态同步失败：${lastError.message || '网络异常'}`)
  }
  throw new Error('图片生成仍在处理中，请稍后重新打开当前画布自动恢复结果')
}

export async function generateImage(data, { onTaskCreated = () => {} } = {}) {
  const referenceImageUrls = await resolveReferences(data.image)
  const task = await faceminiRequest('/image/tasks', {
    method: 'POST',
    body: JSON.stringify({
      model: data.model || 'gpt_image_2',
      prompt: data.prompt,
      ratio: normalizeRatio(data.size),
      quality: ['1K', '2K'].includes(data.quality) ? data.quality : '1K',
      count: 1,
      source: 'infinite-canvas',
      referenceImageUrl: referenceImageUrls[0] || null,
      referenceImageUrls
    })
  })
  onTaskCreated(task)
  await associateNodeTask({
    projectId: data.projectId,
    nodeId: data.resultNodeId || data.nodeId,
    taskType: 'image',
    taskId: task.id,
    inputHash: data.inputHash
  }).catch(error => {
    console.warn('[Canvas] 图片任务关联保存失败，节点内 taskId 将用于恢复:', error.message)
  })
  notifyCreditsChanged()

  const current = task.status === 'completed' && task.imageUrl
    ? task
    : await pollImageTask(task.id)
  notifyCreditsChanged()
  return { data: [{ url: current.imageUrl }], taskId: current.id }
}
