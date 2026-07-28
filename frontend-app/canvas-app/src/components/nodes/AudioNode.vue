<template>
  <div
    class="audio-node-wrapper relative"
    @mouseenter="showHandleMenu = true"
    @mouseleave="showHandleMenu = false"
  >
    <div
      class="audio-node w-[340px] rounded-xl border bg-[var(--bg-secondary)] transition-all duration-200"
      :class="{ 'is-selected': data.selected, 'is-processing': data.loading, 'is-error': data.error }"
      :aria-busy="data.loading"
    >
      <div class="flex items-center justify-between border-b border-[var(--border-color)] px-3 py-2">
        <div class="flex min-w-0 items-center gap-2">
          <n-icon :size="17" class="shrink-0 text-[var(--accent-color)]">
            <MusicalNotesOutline />
          </n-icon>
          <span
            v-if="!isEditingLabel"
            class="truncate text-sm font-medium text-[var(--text-primary)]"
            @dblclick="startEditLabel"
          >
            {{ data.label || '音频节点' }}
          </span>
          <input
            v-else
            ref="labelInputRef"
            v-model="editingLabelValue"
            class="min-w-0 rounded border border-blue-500 bg-[var(--bg-tertiary)] px-1 text-sm text-[var(--text-primary)] outline-none"
            @blur="finishEditLabel"
            @keydown.enter="finishEditLabel"
            @keydown.escape="cancelEditLabel"
          />
        </div>
        <div class="flex items-center gap-1">
          <button
            v-if="data.url"
            class="rounded p-1 transition-colors hover:bg-[var(--bg-tertiary)]"
            title="下载音频"
            aria-label="下载音频"
            @click="handleDownload"
          >
            <n-icon :size="14"><DownloadOutline /></n-icon>
          </button>
          <button
            class="rounded p-1 transition-colors hover:bg-[var(--bg-tertiary)]"
            title="复制节点"
            aria-label="复制节点"
            @click="handleDuplicate"
          >
            <n-icon :size="14"><CopyOutline /></n-icon>
          </button>
          <button
            class="rounded p-1 transition-colors hover:bg-[var(--bg-tertiary)]"
            title="删除节点"
            aria-label="删除节点"
            @click="removeNode(id)"
          >
            <n-icon :size="14"><TrashOutline /></n-icon>
          </button>
        </div>
      </div>

      <div class="p-3">
        <div
          v-if="data.loading"
          class="flex h-20 items-center justify-center gap-2 rounded-lg bg-[var(--bg-tertiary)] text-sm text-[var(--text-secondary)]"
        >
          <n-spin :size="18" />
          音频上传中…
        </div>
        <div
          v-else-if="data.error"
          class="flex h-20 items-center justify-center rounded-lg border border-red-200 bg-red-50 px-3 text-center text-sm text-red-500 dark:border-red-800 dark:bg-red-900/20"
        >
          {{ data.error }}
        </div>
        <div v-else-if="data.url" class="space-y-2">
          <audio :src="data.url" controls preload="metadata" class="nodrag w-full" @mousedown.stop />
          <div v-if="data.fileName" class="truncate text-xs text-[var(--text-secondary)]">
            {{ data.fileName }}
          </div>
        </div>
        <label
          v-else
          class="relative flex h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--accent-color)]"
        >
          <n-icon :size="28"><CloudUploadOutline /></n-icon>
          <span class="text-sm">点击上传音频</span>
          <span class="text-xs">MP3、WAV、M4A、AAC、OGG、FLAC</span>
          <input type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.webm" class="hidden" @change="handleFileUpload" />
        </label>
      </div>

      <NodeHandleMenu
        :nodeId="id"
        nodeType="audio"
        :visible="showHandleMenu"
        :operations="operations"
        @select="handleSelect"
      />
      <Handle type="target" :position="Position.Left" id="left" class="!bg-[var(--accent-color)]" />
    </div>
  </div>
</template>

<script setup>
import { nextTick, ref } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NIcon, NSpin } from 'naive-ui'
import {
  CloudUploadOutline,
  CopyOutline,
  DownloadOutline,
  MusicalNotesOutline,
  TrashOutline,
  VideocamOutline
} from '@vicons/ionicons5'
import { addEdge, addNode, duplicateNode, nodes, removeNode, updateNode } from '../../stores/canvas'
import { uploadCanvasMedia } from '../../api/facemini'
import NodeHandleMenu from './NodeHandleMenu.vue'

const props = defineProps({
  id: String,
  data: Object
})

const { updateNodeInternals } = useVueFlow()
const showHandleMenu = ref(false)
const isEditingLabel = ref(false)
const editingLabelValue = ref('')
const labelInputRef = ref(null)
const operations = [{ type: 'videoConfig', label: '生视频', icon: VideocamOutline }]

const handleFileUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  try {
    updateNode(props.id, { loading: true, error: '' })
    const uploaded = await uploadCanvasMedia(file)
    if (uploaded.kind !== 'audio') throw new Error('请选择音频文件')
    updateNode(props.id, {
      url: uploaded.url,
      loading: false,
      fileName: uploaded.originalName || file.name,
      fileType: uploaded.mimeType || file.type,
      label: file.name || '音频素材',
      updatedAt: Date.now()
    })
  } catch (error) {
    updateNode(props.id, { loading: false, error: error.message || '音频上传失败' })
    window.$message?.error(error.message || '音频上传失败')
  } finally {
    event.target.value = ''
  }
}

const handleSelect = () => {
  const currentNode = nodes.value.find(node => node.id === props.id)
  const newId = addNode('videoConfig', {
    x: (currentNode?.position?.x || 0) + 390,
    y: currentNode?.position?.y || 0
  }, { label: '视频生成' })
  addEdge({
    source: props.id,
    target: newId,
    sourceHandle: 'right',
    targetHandle: 'left'
  })
  setTimeout(() => updateNodeInternals(newId), 50)
}

const startEditLabel = () => {
  editingLabelValue.value = props.data?.label || '音频节点'
  isEditingLabel.value = true
  nextTick(() => {
    labelInputRef.value?.focus()
    labelInputRef.value?.select()
  })
}

const finishEditLabel = () => {
  const label = editingLabelValue.value.trim()
  if (label) updateNode(props.id, { label })
  isEditingLabel.value = false
}

const cancelEditLabel = () => {
  isEditingLabel.value = false
}

const handleDuplicate = () => {
  const newId = duplicateNode(props.id)
  if (newId) window.$message?.success('音频节点已复制')
}

const handleDownload = () => {
  if (!props.data?.url) return
  const link = document.createElement('a')
  link.href = props.data.url
  link.download = props.data.fileName || `audio_${Date.now()}.mp3`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<style scoped>
.audio-node-wrapper {
  padding-right: 50px;
  padding-top: 20px;
}

.audio-node {
  position: relative;
  cursor: default;
  border-color: var(--canvas-border);
}

.audio-node.is-selected {
  border-color: var(--canvas-action);
  box-shadow: 0 0 0 3px var(--canvas-focus), var(--shadow-control);
}

.audio-node.is-processing::before {
  position: absolute;
  top: -1px;
  right: 12px;
  left: 12px;
  height: 3px;
  content: "";
  background: var(--brand-gradient);
  border-radius: var(--radius-pill);
}

.audio-node.is-error {
  border-color: var(--danger-border);
}
</style>
