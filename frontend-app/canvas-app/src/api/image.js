import { associateNodeTask, faceminiRequest, notifyCreditsChanged, uploadDataUrl } from './facemini'

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

export async function generateImage(data) {
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
  await associateNodeTask({
    projectId: data.projectId,
    nodeId: data.nodeId,
    taskType: 'image',
    taskId: task.id,
    inputHash: data.inputHash
  })
  notifyCreditsChanged()

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const current = attempt === 0 ? task : await faceminiRequest(`/image/tasks/${encodeURIComponent(task.id)}`)
    if (current.status === 'completed' && current.imageUrl) {
      notifyCreditsChanged()
      return { data: [{ url: current.imageUrl }], taskId: current.id }
    }
    if (current.status === 'failed') throw new Error(current.error || '图片生成失败')
    await wait(2500)
  }
  throw new Error('图片生成仍在处理中，请稍后回到当前画布查看结果')
}
