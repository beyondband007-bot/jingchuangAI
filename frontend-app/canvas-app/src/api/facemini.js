const API_ROOT = '/api'

function notifyHost(type, detail = {}) {
  if (window.parent !== window) {
    window.parent.postMessage({ source: 'facemini-canvas', type, ...detail }, window.location.origin)
  }
}

async function parseResponse(response) {
  const text = await response.text()
  let body = null
  try {
    body = text ? JSON.parse(text) : null
  } catch {
    body = text
  }
  if (!response.ok) {
    if (response.status === 401) notifyHost('auth-required')
    const error = new Error(body?.error || body?.message || `请求失败（${response.status}）`)
    error.status = response.status
    error.body = body
    throw error
  }
  return body
}

export async function faceminiRequest(path, options = {}) {
  const headers = { ...(options.headers || {}) }
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }
  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    credentials: 'include',
    headers
  })
  return parseResponse(response)
}

export function notifyCreditsChanged() {
  notifyHost('credits-changed')
}

export function openMyAssets() {
  notifyHost('open-assets')
}

export async function uploadDataUrl(dataUrl, path, filename = 'canvas-reference.png') {
  const source = String(dataUrl || '').trim()
  if (!source) return source

  const isDataUrl = source.startsWith('data:')
  let isLocalMedia = false
  if (!isDataUrl) {
    try {
      const url = new URL(source, window.location.origin)
      isLocalMedia = url.origin === window.location.origin && url.pathname.startsWith('/media/')
    } catch {
      isLocalMedia = false
    }
  }
  if (!isDataUrl && !isLocalMedia) return source

  const response = await fetch(source, { credentials: 'include' })
  if (!response.ok) throw new Error(`参考素材读取失败（${response.status}）`)
  const blob = await response.blob()
  const extensionByType = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'image/gif': '.gif',
    'video/mp4': '.mp4',
    'video/quicktime': '.mov',
    'video/webm': '.webm',
    'video/x-msvideo': '.avi'
  }
  const originalExtension = filename.match(/\.[^.]+$/)?.[0] || ''
  const fallbackName = filename.replace(/\.[^.]+$/, '') + (extensionByType[blob.type] || originalExtension || '.bin')
  const file = new File([blob], fallbackName, { type: blob.type || 'application/octet-stream' })
  const formData = new FormData()
  formData.append('file', file)
  const uploaded = await faceminiRequest(path, { method: 'POST', body: formData })
  return uploaded.url
}

export async function uploadCanvasMedia(file) {
  const formData = new FormData()
  formData.append('file', file)
  return faceminiRequest('/canvas/uploads/media', { method: 'POST', body: formData })
}

export async function associateNodeTask({ projectId, nodeId, taskType, taskId, inputHash = '' }) {
  if (!projectId || !nodeId || !taskId) return null
  return faceminiRequest(`/canvas/projects/${encodeURIComponent(projectId)}/node-tasks`, {
    method: 'POST',
    body: JSON.stringify({ nodeId, taskType, taskId, inputHash })
  })
}
