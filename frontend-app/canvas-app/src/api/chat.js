import { faceminiRequest, notifyCreditsChanged } from './facemini'
import { CHINESE_TEXT_OUTPUT_SYSTEM_PROMPT, TEXT_GENERATION_MODEL } from '../config/textGeneration'

function prepareTextGenerationRequest(data = {}) {
  const { enforceChineseOutput = true, ...requestData } = data
  const messages = [...(requestData.messages || [])]

  if (enforceChineseOutput && !messages.some(message => message.content === CHINESE_TEXT_OUTPUT_SYSTEM_PROMPT)) {
    const firstNonSystemIndex = messages.findIndex(message => message.role !== 'system')
    const insertIndex = firstNonSystemIndex === -1 ? messages.length : firstNonSystemIndex
    messages.splice(insertIndex, 0, { role: 'system', content: CHINESE_TEXT_OUTPUT_SYSTEM_PROMPT })
  }

  return {
    ...requestData,
    model: TEXT_GENERATION_MODEL,
    source: 'infinite-canvas',
    messages
  }
}

export const chatCompletions = data => faceminiRequest('/chat/messages', {
  method: 'POST',
  body: JSON.stringify({ ...prepareTextGenerationRequest(data), stream: false })
})

function parseEvent(block) {
  const lines = block.split(/\r?\n/)
  const event = lines.find(line => line.startsWith('event:'))?.slice(6).trim() || 'message'
  const raw = lines.filter(line => line.startsWith('data:')).map(line => line.slice(5).trim()).join('\n')
  try { return { event, data: raw ? JSON.parse(raw) : null } } catch { return { event, data: raw } }
}

export async function* streamChatCompletions(data, signal) {
  const requestData = prepareTextGenerationRequest(data)
  const response = await fetch('/api/chat/messages/stream', {
    method: 'POST',
    credentials: 'include',
    signal,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...requestData, stream: true })
  })
  if (!response.ok || !response.body) {
    const body = await response.json().catch(() => ({}))
    throw new Error(body.error || body.message || '对话请求失败')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done })
    const parts = buffer.split(/\r?\n\r?\n/)
    buffer = parts.pop() || ''
    for (const part of parts) {
      const parsed = parseEvent(part)
      if (parsed.event === 'delta' && parsed.data?.delta) yield parsed.data.delta
      if (parsed.event === 'error') throw new Error(parsed.data?.error || '对话失败')
      if (parsed.event === 'done') notifyCreditsChanged()
    }
    if (done) break
  }
}
