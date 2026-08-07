<template>
  <div class="prompt-mention-editor" :class="{ 'is-expanded': expanded }">
    <div
      ref="editorRef"
      class="prompt-mention-editor__content nodrag nowheel"
      :class="{ 'is-empty': !modelValue }"
      contenteditable="true"
      role="textbox"
      aria-multiline="true"
      :data-placeholder="placeholder"
      @input="handleInput"
      @keydown="handleKeydown"
      @paste="handlePaste"
      @mousedown.stop
      @wheel.stop
    />

    <MentionsPicker
      v-model:visible="showPicker"
      :position="pickerPosition"
      context="videoConfig"
      :connected-node-ids="connectedNodeIds"
      @select="handleMentionSelect"
    />
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import { nodes } from '../stores/canvas'
import MentionsPicker from './MentionsPicker.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  connectedNodeIds: { type: Array, default: () => [] },
  placeholder: { type: String, default: '' },
  expanded: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue'])

const editorRef = ref(null)
const showPicker = ref(false)
const pickerPosition = ref({ x: 0, y: 0 })
const mentionStart = ref(-1)
const mentionEnd = ref(-1)
let renderedValue = ''
let isRendering = false

const mentionToken = (nodeId, label) => `@[${nodeId}|${label}]`

const getNodeLabel = (node, storedLabel = '') => {
  if (storedLabel) return storedLabel
  if (node?.data?.label) return node.data.label
  if (node?.data?.publicProps?.name) return node.data.publicProps.name
  if (node?.type === 'video') return '视频'
  if (node?.type === 'audio') return '音频'
  return '图片'
}

const getNodeUrl = node => node?.data?.base64 || node?.data?.url || ''

const createMentionChip = (nodeId, storedLabel = '') => {
  const sourceNode = nodes.value.find(node => node.id === nodeId)
  const label = getNodeLabel(sourceNode, storedLabel)
  const chip = document.createElement('span')
  chip.className = 'mention-chip'
  chip.contentEditable = 'false'
  chip.dataset.nodeId = nodeId
  chip.dataset.label = label
  chip.setAttribute('aria-label', label)

  const mediaUrl = getNodeUrl(sourceNode)
  if (sourceNode?.type === 'image' && mediaUrl) {
    const image = document.createElement('img')
    image.className = 'mention-chip__thumb'
    image.src = mediaUrl
    image.alt = ''
    image.draggable = false
    chip.appendChild(image)
  } else {
    const mediaIcon = document.createElement('span')
    mediaIcon.className = 'mention-chip__icon'
    mediaIcon.textContent = sourceNode?.type === 'video' ? '▶' : sourceNode?.type === 'audio' ? '♪' : '▧'
    chip.appendChild(mediaIcon)
  }

  const labelElement = document.createElement('span')
  labelElement.className = 'mention-chip__label'
  labelElement.textContent = label
  chip.appendChild(labelElement)
  return chip
}

const appendText = (fragment, value) => {
  if (value) fragment.appendChild(document.createTextNode(value))
}

const renderValue = (value, caretOffset = null) => {
  const editor = editorRef.value
  if (!editor) return
  isRendering = true
  const fragment = document.createDocumentFragment()
  const rawValue = String(value || '')
  const mentionPattern = /@\[([^\]|]+)(?:\|([^\]]+))?\]/g
  let lastIndex = 0
  let match

  while ((match = mentionPattern.exec(rawValue))) {
    appendText(fragment, rawValue.slice(lastIndex, match.index))
    fragment.appendChild(createMentionChip(match[1], match[2] || ''))
    lastIndex = match.index + match[0].length
  }
  appendText(fragment, rawValue.slice(lastIndex))

  editor.replaceChildren(fragment)
  renderedValue = rawValue
  if (caretOffset !== null) setCaretAtRawOffset(caretOffset)
  nextTick(() => { isRendering = false })
}

const extractRawValue = root => {
  let value = ''
  const walk = node => {
    if (node.nodeType === Node.TEXT_NODE) {
      value += node.textContent || ''
      return
    }
    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return
    if (node.classList?.contains('mention-chip')) {
      value += mentionToken(node.dataset.nodeId || '', node.dataset.label || '图片')
      return
    }
    if (node.tagName === 'BR') {
      value += '\n'
      return
    }
    Array.from(node.childNodes || []).forEach(walk)
    if (node !== root && ['DIV', 'P'].includes(node.tagName)) value += '\n'
  }
  Array.from(root?.childNodes || []).forEach(walk)
  return value
}

const getCaretRawOffset = () => {
  const editor = editorRef.value
  const selection = window.getSelection()
  if (!editor || !selection?.rangeCount) return extractRawValue(editor).length
  const activeRange = selection.getRangeAt(0)
  if (!editor.contains(activeRange.startContainer)) return extractRawValue(editor).length
  const prefixRange = document.createRange()
  prefixRange.selectNodeContents(editor)
  prefixRange.setEnd(activeRange.startContainer, activeRange.startOffset)
  return extractRawValue(prefixRange.cloneContents()).length
}

const setCaretAtRawOffset = offset => {
  const editor = editorRef.value
  if (!editor) return
  const selection = window.getSelection()
  const range = document.createRange()
  let remaining = Math.max(0, offset)

  for (let index = 0; index < editor.childNodes.length; index += 1) {
    const child = editor.childNodes[index]
    if (child.nodeType === Node.TEXT_NODE) {
      const length = child.textContent?.length || 0
      if (remaining <= length) {
        range.setStart(child, remaining)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
        return
      }
      remaining -= length
      continue
    }
    if (child.classList?.contains('mention-chip')) {
      const rawLength = mentionToken(child.dataset.nodeId || '', child.dataset.label || '图片').length
      if (remaining <= rawLength) {
        range.setStart(editor, remaining < rawLength / 2 ? index : index + 1)
        range.collapse(true)
        selection.removeAllRanges()
        selection.addRange(range)
        return
      }
      remaining -= rawLength
    }
  }

  range.selectNodeContents(editor)
  range.collapse(false)
  selection.removeAllRanges()
  selection.addRange(range)
}

const updatePicker = rawValue => {
  const editor = editorRef.value
  const caretOffset = getCaretRawOffset()
  const beforeCaret = rawValue.slice(0, caretOffset)
  const lastAt = beforeCaret.lastIndexOf('@')
  const query = lastAt >= 0 ? beforeCaret.slice(lastAt + 1) : ''
  const shouldShow = lastAt >= 0 && !/[\s\[]/.test(query)

  if (!shouldShow || !editor) {
    showPicker.value = false
    return
  }

  mentionStart.value = lastAt
  mentionEnd.value = caretOffset
  const rect = editor.getBoundingClientRect()
  pickerPosition.value = { x: rect.left + 8, y: Math.min(rect.bottom + 6, window.innerHeight - 280) }
  showPicker.value = true
}

const handleInput = () => {
  if (isRendering) return
  const rawValue = extractRawValue(editorRef.value)
  renderedValue = rawValue
  emit('update:modelValue', rawValue)
  updatePicker(rawValue)
}

const insertLineBreak = () => {
  const selection = window.getSelection()
  if (!selection?.rangeCount) return
  const range = selection.getRangeAt(0)
  range.deleteContents()
  const lineBreak = document.createTextNode('\n')
  range.insertNode(lineBreak)
  range.setStartAfter(lineBreak)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
  handleInput()
}

const handleKeydown = event => {
  if (event.key === 'Escape' && showPicker.value) {
    event.preventDefault()
    showPicker.value = false
    return
  }
  if (event.key === 'Enter') {
    event.preventDefault()
    insertLineBreak()
  }
}

const handlePaste = event => {
  event.preventDefault()
  const text = event.clipboardData?.getData('text/plain') || ''
  const selection = window.getSelection()
  if (!selection?.rangeCount) return
  const range = selection.getRangeAt(0)
  range.deleteContents()
  const textNode = document.createTextNode(text)
  range.insertNode(textNode)
  range.setStartAfter(textNode)
  range.collapse(true)
  selection.removeAllRanges()
  selection.addRange(range)
  handleInput()
}

const handleMentionSelect = ({ nodeId, label, type }) => {
  if (!props.connectedNodeIds.includes(nodeId)) return
  const rawValue = extractRawValue(editorRef.value)
  const fallbackLabel = type === 'video' ? '视频' : type === 'audio' ? '音频' : '图片'
  const displayLabel = label || fallbackLabel
  const token = mentionToken(nodeId, displayLabel)
  const nextValue = `${rawValue.slice(0, mentionStart.value)}${token} ${rawValue.slice(mentionEnd.value)}`
  const nextCaret = mentionStart.value + token.length + 1
  showPicker.value = false
  emit('update:modelValue', nextValue)
  renderValue(nextValue, nextCaret)
  editorRef.value?.focus()
}

const focusEnd = () => {
  editorRef.value?.focus()
  setCaretAtRawOffset(String(props.modelValue || '').length)
}

watch(() => props.modelValue, value => {
  const normalized = String(value || '')
  if (normalized !== renderedValue) renderValue(normalized)
})

watch(
  () => props.connectedNodeIds.map(nodeId => {
    const node = nodes.value.find(item => item.id === nodeId)
    return `${nodeId}:${getNodeLabel(node)}:${getNodeUrl(node)}`
  }).join('|'),
  () => renderValue(props.modelValue)
)

onMounted(() => renderValue(props.modelValue))

defineExpose({ focusEnd })
</script>

<style scoped>
.prompt-mention-editor {
  position: relative;
  width: 100%;
}

.prompt-mention-editor.is-expanded {
  display: flex;
  min-height: 0;
  flex: 1;
}

.prompt-mention-editor__content {
  width: 100%;
  min-height: 82px;
  max-height: 180px;
  overflow: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  padding: 8px 10px;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.65;
  outline: none;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.prompt-mention-editor__content:focus {
  border-color: var(--accent-color);
}

.prompt-mention-editor__content.is-empty::before {
  color: var(--text-tertiary);
  content: attr(data-placeholder);
  pointer-events: none;
}

.is-expanded .prompt-mention-editor__content {
  min-height: 0;
  max-height: none;
  flex: 1;
  border: 0;
  border-radius: 0;
  background: var(--bg-secondary);
  padding: 20px;
  font-size: 16px;
  line-height: 1.75;
}

:deep(.mention-chip) {
  display: inline-flex;
  height: 24px;
  align-items: center;
  gap: 5px;
  margin: 0 2px;
  padding: 2px 8px 2px 2px;
  border: 1px solid color-mix(in srgb, var(--accent-color) 28%, var(--border-color));
  border-radius: 6px;
  background: color-mix(in srgb, var(--accent-color) 10%, var(--bg-secondary));
  color: var(--text-primary);
  line-height: 20px;
  user-select: none;
  vertical-align: middle;
}

:deep(.mention-chip__thumb) {
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  border-radius: 4px;
  object-fit: cover;
}

:deep(.mention-chip__icon) {
  display: inline-flex;
  width: 20px;
  height: 20px;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  background: var(--bg-tertiary);
  color: var(--accent-color);
  font-size: 11px;
}

:deep(.mention-chip__label) {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
