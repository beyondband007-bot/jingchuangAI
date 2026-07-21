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
  if (!String(dataUrl || '').startsWith('data:')) return dataUrl
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  const file = new File([blob], filename, { type: blob.type || 'image/png' })
  const formData = new FormData()
  formData.append('file', file)
  const uploaded = await faceminiRequest(path, { method: 'POST', body: formData })
  return uploaded.url
}

export async function associateNodeTask({ projectId, nodeId, taskType, taskId, inputHash = '' }) {
  if (!projectId || !nodeId || !taskId) return null
  return faceminiRequest(`/canvas/projects/${encodeURIComponent(projectId)}/node-tasks`, {
    method: 'POST',
    body: JSON.stringify({ nodeId, taskType, taskId, inputHash })
  })
}

