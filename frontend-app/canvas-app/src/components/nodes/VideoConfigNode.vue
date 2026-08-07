<template>
  <!-- Video config node wrapper | 视频配置节点包裹层 -->
  <div class="video-config-node-wrapper relative" @mouseenter="showHandleMenu = true" @mouseleave="showHandleMenu = false">
    <!-- Video config node | 视频配置节点 -->
    <div class="video-config-node w-[300px] min-w-[300px] max-w-[300px] bg-[var(--bg-secondary)] rounded-xl border transition-all duration-200"
      :class="{ 'is-selected': data.selected, 'is-processing': isGenerating, 'is-error': error }"
      :aria-busy="isGenerating">
      <!-- Header | 头部 -->
      <div class="flex items-center justify-between px-3 py-2 border-b border-[var(--border-color)]">
        <span
          v-if="!isEditingLabel"
          @dblclick="startEditLabel"
          class="text-sm font-medium text-[var(--text-secondary)] cursor-text hover:bg-[var(--bg-tertiary)] px-1 rounded transition-colors"
          data-tooltip="双击编辑名称"
        >{{ data.label || '视频生成' }}</span>
        <input
          v-else
          ref="labelInputRef"
          v-model="editingLabelValue"
          @blur="finishEditLabel"
          @keydown.enter="finishEditLabel"
          @keydown.escape="cancelEditLabel"
          class="text-sm font-medium bg-[var(--bg-tertiary)] text-[var(--text-secondary)] px-1 rounded outline-none border border-blue-500"
        />
        <div class="flex items-center gap-1">
          <button @click="handleDuplicate" class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors" data-tooltip="复制节点" aria-label="复制节点">
            <n-icon :size="14">
              <CopyOutline />
            </n-icon>
          </button>
          <button @click="handleDelete" class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors" data-tooltip="删除节点" aria-label="删除节点">
            <n-icon :size="14">
              <TrashOutline />
            </n-icon>
          </button>
        </div>
      </div>

      <!-- Config options | 配置选项 -->
      <div class="p-3 space-y-3">
        <div class="space-y-1.5">
          <div class="flex items-center justify-between">
            <label class="text-xs text-[var(--text-secondary)]">提示词</label>
            <button
              type="button"
              class="nodrag flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] text-[var(--text-tertiary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]"
              title="放大编辑提示词"
              @click.stop="openPromptEditor"
              @mousedown.stop
            >
              <n-icon :size="13"><ExpandOutline /></n-icon>
              放大
            </button>
          </div>
          <PromptMentionEditor
            ref="promptInputRef"
            :model-value="localPrompt"
            :connected-node-ids="connectedMediaNodeIds"
            placeholder="直接输入视频提示词，输入 @ 可引用已连接的图片、视频或音频"
            @update:model-value="handlePromptValueChange"
          />
        </div>

        <!-- Model selector | 模型选择 -->
        <div class="flex items-center justify-between">
          <span class="text-xs text-[var(--text-secondary)]">模型</span>
          <n-dropdown :options="modelOptions" @select="handleModelSelect">
            <button class="flex items-center gap-1 text-sm text-[var(--text-primary)] hover:text-[var(--accent-color)]">
              {{ displayModelName }}
              <n-icon :size="12"><ChevronDownOutline /></n-icon>
            </button>
          </n-dropdown>
        </div>

        <!-- Aspect ratio selector | 宽高比选择 -->
        <div class="flex items-center justify-between">
          <span class="text-xs text-[var(--text-secondary)]">比例</span>
          <n-dropdown :options="ratioOptions" @select="handleRatioSelect">
            <button class="flex items-center gap-1 text-sm text-[var(--text-primary)] hover:text-[var(--accent-color)]">
              {{ localRatio }}
              <n-icon :size="12">
                <ChevronForwardOutline />
              </n-icon>
            </button>
          </n-dropdown>
        </div>

        <!-- Duration selector | 时长选择 -->
        <div class="flex items-center justify-between">
          <span class="text-xs text-[var(--text-secondary)]">时长</span>
          <n-dropdown :options="durationOptions" @select="handleDurationSelect">
            <button class="flex items-center gap-1 text-sm text-[var(--text-primary)] hover:text-[var(--accent-color)]">
              {{ localDuration }}s
              <n-icon :size="12">
                <ChevronForwardOutline />
              </n-icon>
            </button>
          </n-dropdown>
        </div>

        <!-- Resolution selector | 分辨率选择 -->
        <div class="flex items-center justify-between">
          <span class="text-xs text-[var(--text-secondary)]">分辨率</span>
          <n-dropdown :options="resolutionOptions" @select="handleResolutionSelect">
            <button class="flex items-center gap-1 text-sm text-[var(--text-primary)] hover:text-[var(--accent-color)]">
              {{ displayResolution }}
              <n-icon :size="12">
                <ChevronForwardOutline />
              </n-icon>
            </button>
          </n-dropdown>
        </div>

        <label class="nodrag flex cursor-pointer items-center justify-between rounded-lg bg-[var(--bg-primary)] px-2.5 py-2" @mousedown.stop>
          <span>
            <span class="block text-xs font-medium text-[var(--text-primary)]">首尾帧模式</span>
            <span class="mt-0.5 block text-[10px] text-[var(--text-tertiary)]">按连接顺序，最多两张图</span>
          </span>
          <input
            type="checkbox"
            class="h-4 w-4 cursor-pointer accent-[var(--accent-color)]"
            :checked="firstLastFrameMode"
            aria-label="首尾帧模式"
            @change="handleFirstLastFrameModeChange"
          />
        </label>

        <!-- Connected inputs indicator | 连接输入指示 -->
        <div
          class="flex flex-wrap items-center gap-2 text-xs text-[var(--text-secondary)] py-1 border-t border-[var(--border-color)]">
          <span class="px-2 py-0.5 rounded-full"
            :class="connectedPrompt ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'">
            提示词 {{ connectedPrompt ? '✓' : '○' }}
          </span>
          <span v-if="firstLastFrameMode" class="px-2 py-0.5 rounded-full"
            :class="imagesByRole.firstFrame ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'">
            首帧 {{ imagesByRole.firstFrame ? '✓' : '○' }}
          </span>
          <span v-if="firstLastFrameMode" class="px-2 py-0.5 rounded-full"
            :class="imagesByRole.lastFrame ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'">
            尾帧 {{ imagesByRole.lastFrame ? '✓' : '○' }}
          </span>
          <span v-else class="px-2 py-0.5 rounded-full"
            :class="imagesByRole.referenceImages.length > 0 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'">
            参考图 {{ imagesByRole.referenceImages.length > 0 ? `✓ ${imagesByRole.referenceImages.length}` : '○' }}
          </span>
          <span class="px-2 py-0.5 rounded-full"
            :class="connectedVideos.length > 0 ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'">
            参考视频 {{ connectedVideos.length > 0 ? `✓ ${connectedVideos.length}` : '○' }}
          </span>
          <span class="px-2 py-0.5 rounded-full"
            :class="connectedAudios.length > 0 ? 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'">
            参考音频 {{ connectedAudios.length > 0 ? `✓ ${connectedAudios.length}` : '○' }}
          </span>
        </div>

        <!-- Progress bar | 进度条 -->
        <!-- <div v-if="status === 'polling'" class="space-y-1">
        <div class="flex justify-between text-xs text-[var(--text-secondary)]">
          <span>生成中...</span>
          <span>{{ progress.percentage }}%</span>
        </div>
        <n-progress type="line" :percentage="progress.percentage" :show-indicator="false" :height="4" />
      </div> -->

        <!-- Generate button | 生成按钮 -->
        <button @click="handleGenerate" :disabled="isGenerating || !isConfigured"
          class="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
          <n-spin v-if="isGenerating" :size="14" />
          <template v-else>
            <n-icon :size="16">
              <VideocamOutline />
            </n-icon>
            生成视频
          </template>
        </button>

        <!-- Error message | 错误信息 -->
        <div v-if="error" class="text-xs text-red-500 mt-2">
          {{ error.message || '生成失败' }}
        </div>

        <!-- Generated video preview | 生成视频预览 -->
        <!-- <div v-if="generatedVideo?.url" class="mt-3 space-y-2">
        <div class="text-xs text-[var(--text-secondary)]">生成结果:</div>
        <div class="aspect-video rounded-lg overflow-hidden bg-black">
          <video :src="generatedVideo.url" controls class="w-full h-full object-contain" />
        </div>
      </div> -->
      </div>

      <!-- Handles | 连接点 -->
      <Handle type="target" :position="Position.Left" id="left" class="!bg-[var(--accent-color)]" />
      <NodeHandleMenu :nodeId="id" nodeType="videoConfig" :visible="showHandleMenu" :operations="[]" />
    </div>

    <n-modal v-model:show="isPromptExpanded" :mask-closable="true">
      <div class="prompt-editor-modal nodrag nowheel" @mousedown.stop @wheel.stop>
        <div class="flex items-center justify-between border-b border-[var(--border-color)] px-5 py-3">
          <div>
            <div class="text-base font-medium text-[var(--text-primary)]">视频提示词</div>
            <div class="mt-0.5 text-xs text-[var(--text-tertiary)]">输入 @ 可引用当前已连接的图片、视频或音频</div>
          </div>
          <button
            type="button"
            class="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
            title="收起编辑器"
            @click="isPromptExpanded = false"
          >
            <n-icon :size="18"><ContractOutline /></n-icon>
          </button>
        </div>
        <PromptMentionEditor
          ref="expandedPromptInputRef"
          :model-value="localPrompt"
          :connected-node-ids="connectedMediaNodeIds"
          expanded
          placeholder="描述画面内容、主体动作、镜头语言等，输入 @ 可引用已连接素材"
          @update:model-value="handlePromptValueChange"
        />
      </div>
    </n-modal>

  </div>
</template>

<script setup>
/**
 * Video config node component | 视频配置节点组件
 * Configuration panel for video generation with API integration
 */
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { Handle, Position, useVueFlow } from '@vue-flow/core'
import { NIcon, NDropdown, NSpin, NModal } from 'naive-ui'
import { ChevronForwardOutline, ChevronDownOutline, TrashOutline, VideocamOutline, CopyOutline, CreateOutline, ExpandOutline, ContractOutline } from '@vicons/ionicons5'
import { useVideoGeneration } from '../../hooks'
import { updateNode, removeNode, duplicateNode, addNode, addEdge, nodes, edges, getNodeInputHash } from '../../stores/canvas'
import NodeHandleMenu from './NodeHandleMenu.vue'
import PromptMentionEditor from '../PromptMentionEditor.vue'
import { useModelStore } from '../../stores/pinia'
import { getModelRatioOptions, getModelDurationOptions, getModelResolutionOptions, getModelConfig, DEFAULT_VIDEO_MODEL } from '../../stores/models'
import { orderReferenceImagesByMentions, resolvePromptMediaMentions } from '../../utils/promptMediaMentions'
import { canEnableFirstLastFrameMode, resolveVideoImageModeInputs } from '../../utils/videoImageMode'

// 使用 Pinia store 获取模型选项（根据渠道过滤）
const modelStore = useModelStore()

const props = defineProps({
  id: String,
  data: Object
})

// Vue Flow instance | Vue Flow 实例
const { updateNodeInternals } = useVueFlow()

// API config state | API 配置状态
const isConfigured = computed(() => !!modelStore.currentApiKey)

// Video generation hook | 视频生成 hook
const { loading, error, status, video: generatedVideo, progress, createVideoTaskOnly } = useVideoGeneration()

// Local state | 本地状态
const showHandleMenu = ref(false)
const isGenerating = ref(false)  // 任务创建中状态
const localModel = ref(props.data?.model || DEFAULT_VIDEO_MODEL)
const localRatio = ref(props.data?.ratio || '16:9')
const localDuration = ref(props.data?.duration || props.data?.dur || 5)
const localResolution = ref(
  props.data?.resolution || getModelConfig(localModel.value)?.defaultParams?.resolution || '720P'
)
const localPrompt = ref(props.data?.prompt || '')
const firstLastFrameMode = ref(Boolean(props.data?.firstLastFrameMode))
const promptInputRef = ref(null)
const expandedPromptInputRef = ref(null)
const isPromptExpanded = ref(false)

const openPromptEditor = () => {
  isPromptExpanded.value = true
  nextTick(() => {
    expandedPromptInputRef.value?.focusEnd()
  })
}

const handlePromptValueChange = value => {
  localPrompt.value = value
  updateNode(props.id, { prompt: localPrompt.value })
}

const handleFirstLastFrameModeChange = event => {
  const enabled = Boolean(event?.target?.checked)
  if (enabled && !canEnableFirstLastFrameMode(connectedImages.value.length)) {
    window.$message?.warning('首尾帧模式最多只能连接两张图片，请先断开多余图片')
    event.target.checked = false
    return
  }
  firstLastFrameMode.value = enabled
  updateNode(props.id, { firstLastFrameMode: enabled })
}

// Label editing state | Label 编辑状态
const isEditingLabel = ref(false)
const editingLabelValue = ref('')
const labelInputRef = ref(null)

// Get connected images with roles | 获取连接的图片及其角色
const connectedImages = computed(() => {
  const connectedEdges = edges.value.filter(e => e.target === props.id)
  const images = []

  for (const edge of connectedEdges) {
    const sourceNode = nodes.value.find(n => n.id === edge.source)
    if (sourceNode?.type === 'image' && sourceNode.data?.url) {
      images.push({
        nodeId: sourceNode.id,
        edgeId: edge.id,
        url: sourceNode.data.url,
        base64: sourceNode.data.base64
      })
    }
  }

  return images
})

const connectedVideos = computed(() => {
  const connectedEdges = edges.value.filter(e => e.target === props.id)
  return connectedEdges
    .map(edge => {
      const sourceNode = nodes.value.find(node => node.id === edge.source)
      if (sourceNode?.type !== 'video' || !sourceNode.data?.url) return null
      return {
        nodeId: sourceNode.id,
        edgeId: edge.id,
        url: sourceNode.data.url
      }
    })
    .filter(Boolean)
})

const connectedAudios = computed(() => {
  const connectedEdges = edges.value.filter(e => e.target === props.id)
  return connectedEdges
    .map(edge => {
      const sourceNode = nodes.value.find(node => node.id === edge.source)
      if (sourceNode?.type !== 'audio' || !sourceNode.data?.url) return null
      return {
        nodeId: sourceNode.id,
        edgeId: edge.id,
        url: sourceNode.data.url
      }
    })
    .filter(Boolean)
})

const connectedMediaNodeIds = computed(() => [
  ...new Set([
    ...connectedImages.value.map(image => image.nodeId),
    ...connectedVideos.value.map(video => video.nodeId),
    ...connectedAudios.value.map(audio => audio.nodeId)
  ])
])

const resolveConnectedMediaMentions = (content = '') => {
  const connectedMedia = connectedMediaNodeIds.value
    .map(nodeId => nodes.value.find(node => node.id === nodeId))
    .filter(Boolean)
    .map(node => ({
      nodeId: node.id,
      type: node.type,
      url: node.data?.base64 || node.data?.url || ''
    }))
  const result = resolvePromptMediaMentions(content, connectedMedia)
  if (firstLastFrameMode.value) {
    result.imageMentions.forEach((mention, promptIndex) => {
      const connectionIndex = connectedImages.value.findIndex(image => image.nodeId === mention.nodeId)
      const frameLabel = connectionIndex === 0 ? '首帧' : connectionIndex === 1 ? '尾帧' : ''
      result.resolvedContent = result.resolvedContent.replaceAll(`参考图${promptIndex + 1}`, frameLabel)
    })
  }
  return result
}

// Get images by role | 按角色获取图片
const imagesByRole = computed(() => {
  const firstFrame = firstLastFrameMode.value ? connectedImages.value[0] : null
  const lastFrame = firstLastFrameMode.value ? connectedImages.value[1] : null
  const referenceImages = firstLastFrameMode.value ? [] : connectedImages.value

  return {
    firstFrame,
    lastFrame,
    referenceImages
  }
})

// Get current model config | 获取当前模型配置
const currentModelConfig = computed(() => getModelConfig(localModel.value))
const allowsMixedReferences = computed(() => localModel.value === 'minimax_h3_2k')
const usesOrderedImageMentions = computed(() => ['minimax_h3_2k', 'seedance_tc'].includes(localModel.value))

// Model options from Pinia store (filtered by provider) | 从 Pinia store 获取模型选项（根据渠道过滤）
const modelOptions = computed(() => modelStore.videoModelOptions)

// Display model name | 显示模型名称
const displayModelName = computed(() => {
  const model = modelOptions.value.find(m => m.key === localModel.value)
  // 如果当前模型不在选项中，尝试从 allVideoModels 找到
  if (!model) {
    const allModel = modelStore.allVideoModels.find(m => m.key === localModel.value)
    return allModel?.label || localModel.value || '选择模型'
  }
  return model?.label || localModel.value || '选择模型'
})

// Ratio options based on model | 基于模型的比例选项
const ratioOptions = computed(() => {
  return getModelRatioOptions(localModel.value)
})

// Duration options based on model | 基于模型的时长选项
const durationOptions = computed(() => {
  return getModelDurationOptions(localModel.value)
})

const resolutionOptions = computed(() => {
  return getModelResolutionOptions(localModel.value)
})

const displayResolution = computed(() => {
  return resolutionOptions.value.find(option => option.key === localResolution.value)?.label || localResolution.value
})

// Handle model selection | 处理模型选择
const handleModelSelect = (key) => {
  localModel.value = key
  // Update ratio and duration to model's default | 更新为模型默认比例和时长
  const config = getModelConfig(key)
  const updates = { model: key }
  if (config?.defaultParams?.ratio) {
    localRatio.value = config.defaultParams.ratio
    updates.ratio = config.defaultParams.ratio
  }
  if (config?.defaultParams?.duration) {
    localDuration.value = config.defaultParams.duration
    updates.duration = config.defaultParams.duration
  }
  if (config?.defaultParams?.resolution) {
    localResolution.value = config.defaultParams.resolution
    updates.resolution = config.defaultParams.resolution
  }
  updateNode(props.id, updates)
}

// Handle duplicate | 处理复制
const handleDuplicate = () => {
  const newNodeId = duplicateNode(props.id)
  window.$message?.success('节点已复制')
  if (newNodeId) {
    setTimeout(() => {
      updateNodeInternals(newNodeId)
    }, 50)
  }
}

// Handle ratio selection | 处理比例选择
const handleRatioSelect = (key) => {
  localRatio.value = key
  updateNode(props.id, { ratio: key })
}

// Handle duration selection | 处理时长选择
const handleDurationSelect = (key) => {
  localDuration.value = key
  updateNode(props.id, { duration: key })
}

const handleResolutionSelect = (key) => {
  localResolution.value = key
  updateNode(props.id, { resolution: key })
}

// Get connected inputs by role | 根据角色获取连接的输入
const getConnectedInputs = () => {
  const connectedEdges = edges.value.filter(e => e.target === props.id)

  let externalPrompt = ''
  const connectedImageSources = []

  for (const edge of connectedEdges) {
    const sourceNode = nodes.value.find(n => n.id === edge.source)
    if (!sourceNode) continue

    if (sourceNode.type === 'text') {
      externalPrompt = sourceNode.data?.content || ''
    } else if (sourceNode.type === 'llmConfig') {
      // LLM node output as prompt | LLM 节点输出作为提示词
      const content = sourceNode.data?.outputContent || ''
      if (content) externalPrompt = content
    } else if (sourceNode.type === 'image' && sourceNode.data?.url) {
      const imageData = sourceNode.data.base64 || sourceNode.data.url
      connectedImageSources.push(imageData)
    }
  }

  const imageModeInputs = resolveVideoImageModeInputs(connectedImageSources, firstLastFrameMode.value)
  let first_frame_image = imageModeInputs.firstFrameImage
  let last_frame_image = imageModeInputs.lastFrameImage
  const images = [...imageModeInputs.referenceImages]

  const mentionResult = resolveConnectedMediaMentions(localPrompt.value)
  const hasImageMentions = mentionResult.imageMentions.length > 0
  const hasVideoMentions = mentionResult.videoMentions.length > 0
  const hasConnectedImage = Boolean(first_frame_image || last_frame_image || images.length > 0)
  const hasConnectedVideo = connectedVideos.value.length > 0
  const hasAudioMentions = mentionResult.audioMentions.length > 0
  const hasConnectedAudio = connectedAudios.value.length > 0
  const mediaConflict = firstLastFrameMode.value
    ? hasConnectedVideo || hasVideoMentions
      || (allowsMixedReferences.value && (hasConnectedAudio || hasAudioMentions))
    : allowsMixedReferences.value
      ? false
      : (hasImageMentions && hasVideoMentions)
        || (!hasImageMentions && !hasVideoMentions && hasConnectedImage && hasConnectedVideo)

  let reference_image = hasImageMentions ? mentionResult.imageMentions[0].url : ''
  let reference_video = hasVideoMentions ? mentionResult.videoMentions[0].url : ''
  let reference_audio = hasAudioMentions ? mentionResult.audioMentions[0].url : ''

  if (firstLastFrameMode.value) {
    reference_image = ''
  } else if (hasImageMentions && usesOrderedImageMentions.value) {
    first_frame_image = ''
    last_frame_image = ''
    const orderedImages = orderReferenceImagesByMentions(images, mentionResult.imageMentions)
    images.length = 0
    images.push(...orderedImages)
    reference_image = ''
  }

  if (allowsMixedReferences.value) {
    if (!reference_video && hasConnectedVideo) {
      reference_video = connectedVideos.value[0].url
    }
  } else {
    if (hasVideoMentions) {
      first_frame_image = ''
      last_frame_image = ''
      images.length = 0
    } else if (hasImageMentions) {
      reference_video = ''
    } else if (hasConnectedVideo && !hasConnectedImage) {
      reference_video = connectedVideos.value[0].url
    }
  }
  if (!reference_audio && hasConnectedAudio) {
    reference_audio = connectedAudios.value[0].url
  }

  const prompt = [mentionResult.resolvedContent, externalPrompt]
    .map(value => String(value || '').trim())
    .filter(Boolean)
    .join('\n\n')
  return {
    prompt,
    externalPrompt,
    first_frame_image,
    last_frame_image,
    images,
    reference_image,
    reference_video,
    reference_audio,
    mediaConflict
  }
}

// Computed connected prompt | 计算连接的提示词
const connectedPrompt = computed(() => {
  return localPrompt.value.trim()
})

// Created video node ID | 创建的视频节点 ID
const createdVideoNodeId = ref(null)

// Handle generate action | 处理生成操作
const handleGenerate = async () => {
  // 设置生成中状态
  isGenerating.value = true

  const {
    prompt,
    first_frame_image,
    last_frame_image,
    images,
    reference_image,
    reference_video,
    reference_audio,
    mediaConflict
  } = getConnectedInputs()

  if (mediaConflict) {
    window.$message?.warning(firstLastFrameMode.value
      ? '首尾帧模式不能同时使用参考视频或参考音频'
      : '一次视频生成只能引用图片或视频中的一种素材，请在提示词中 @ 指定其中一种')
    isGenerating.value = false
    return
  }

  const hasInput = prompt || first_frame_image || last_frame_image || images.length > 0
    || reference_image || reference_video || reference_audio
  if (!hasInput) {
    window.$message?.warning('请在节点内输入提示词，或连接图片/视频素材')
    isGenerating.value = false
    return
  }

  if (!isConfigured.value) {
    window.$message?.warning('请先配置 API Key')
    isGenerating.value = false
    return
  }

  // Get current node position | 获取当前节点位置
  const currentNode = nodes.value.find(n => n.id === props.id)
  const nodeX = currentNode?.position?.x || 0
  const nodeY = currentNode?.position?.y || 0

  // Create video node with loading state | 创建带加载状态的视频节点
  const videoNodeId = addNode('video', { x: nodeX + 350, y: nodeY }, {
    url: '',
    loading: true,
    label: '视频生成中...'
  })
  createdVideoNodeId.value = videoNodeId

  // Auto-connect videoConfig → video | 自动连接 视频配置 → 视频
  addEdge({
    source: props.id,
    target: videoNodeId,
    sourceHandle: 'right',
    targetHandle: 'left'
  })

  // Force Vue Flow to recalculate node dimensions | 强制 Vue Flow 重新计算节点尺寸
  setTimeout(() => {
    updateNodeInternals(videoNodeId)
  }, 50)

  try {
    // Build request params (raw form data) | 构建请求参数（原始表单数据）
    // These will be transformed by inputTransform | 这些会被 inputTransform 转换
    const params = {
      model: localModel.value,
      nodeId: props.id,
      resultNodeId: videoNodeId,
      inputHash: getNodeInputHash(props.id),
      onTaskCreated: task => {
        const taskId = task?.id || task?.task_id || task?.taskId
        if (!taskId) return
        updateNode(videoNodeId, {
          taskId,
          loading: true,
          label: '视频生成中...',
          model: localModel.value,
          inputChanged: false,
          updatedAt: Date.now()
        })
      }
    }

    // Add prompt if provided | 如果有提示词则添加
    if (prompt) {
      params.prompt = prompt
    }

    // Add first frame image | 添加首帧图片
    if (first_frame_image) {
      params.first_frame_image = first_frame_image
    }

    // Add last frame image | 添加尾帧图片
    if (last_frame_image) {
      params.last_frame_image = last_frame_image
    }

    // Add reference images (input_reference) | 添加参考图
    if (images.length > 0) {
      params.images = images
    }

    if (reference_image) {
      params.reference_image = reference_image
    }

    if (reference_video) {
      params.reference_video = reference_video
    }

    if (reference_audio) {
      params.reference_audio = reference_audio
    }

    // Add ratio/size | 添加比例参数
    if (localRatio.value) {
      params.ratio = localRatio.value
    }

    // Add duration | 添加时长
    if (localDuration.value) {
      params.duration = localDuration.value
    }

    if (localResolution.value) {
      params.resolution = localResolution.value
    }

    // 只创建任务，获取 taskId，不在这里轮询
    const { taskId: newTaskId, url } = await createVideoTaskOnly(params)

    // 如果有直接 URL，更新视频节点
    if (url) {
      updateNode(videoNodeId, {
        url: url,
        loading: false,
        label: '视频生成',
        model: localModel.value,
        resolution: localResolution.value,
        inputChanged: false,
        inputHash: params.inputHash,
        updatedAt: Date.now()
      })
      window.$message?.success('视频生成成功')
      // Mark this config node as executed | 标记配置节点已执行
      updateNode(props.id, { executed: true, outputNodeId: videoNodeId, lastRunInputHash: params.inputHash })
    } else if (newTaskId) {
      // 需要轮询，传递 taskId 给 VideoNode
      updateNode(videoNodeId, {
        taskId: newTaskId,
        loading: true,
        label: '视频生成中...',
        model: localModel.value,
        resolution: localResolution.value,
        inputChanged: false,
        inputHash: params.inputHash,
        updatedAt: Date.now()
      })
      window.$message?.success('视频任务已创建')
      // Mark this config node as executed | 标记配置节点已执行
      updateNode(props.id, { executed: true, outputNodeId: videoNodeId, lastRunInputHash: params.inputHash })
    }
  } catch (err) {
    // Update node to show error | 更新节点显示错误
    updateNode(videoNodeId, {
      loading: false,
      error: err.message || '生成失败',
      errorDetail: err.errorDetail || err.body?.errorDetail || null,
      label: '生成失败',
      updatedAt: Date.now()
    })
    window.$message?.error(err.message || '视频生成失败')
  } finally {
    isGenerating.value = false
  }
}

// Start editing label | 开始编辑 label
const startEditLabel = () => {
  editingLabelValue.value = props.data?.label || '视频生成'
  isEditingLabel.value = true
  nextTick(() => {
    labelInputRef.value?.focus()
    labelInputRef.value?.select()
  })
}

// Finish editing label | 完成编辑 label
const finishEditLabel = () => {
  const newLabel = editingLabelValue.value.trim()
  if (newLabel && newLabel !== props.data?.label) {
    updateNode(props.id, { label: newLabel })
  }
  isEditingLabel.value = false
}

// Cancel editing label | 取消编辑 label
const cancelEditLabel = () => {
  isEditingLabel.value = false
}

// Handle delete | 处理删除
const handleDelete = () => {
  removeNode(props.id)
}

// Initialize on mount | 挂载时初始化
onMounted(() => {
  if (firstLastFrameMode.value && !canEnableFirstLastFrameMode(connectedImages.value.length)) {
    firstLastFrameMode.value = false
    updateNode(props.id, { firstLastFrameMode: false })
  }
  // 检查当前模型是否在可用模型列表中
  const availableModels = modelStore.availableVideoModels
  const isModelAvailable = availableModels.some(m => m.key === localModel.value)

  if (!localModel.value || !isModelAvailable) {
    // 使用 store 中的默认模型或第一个可用模型
    localModel.value = modelStore.selectedVideoModel || availableModels[0]?.key || DEFAULT_VIDEO_MODEL
    updateNode(props.id, { model: localModel.value })
  }
})

// Watch for model changes from props | 监听 props 中模型变化
watch(() => props.data?.model, (newModel) => {
  if (newModel && newModel !== localModel.value) {
    localModel.value = newModel
  }
})

watch(() => props.data?.prompt, (newPrompt) => {
  if (String(newPrompt || '') !== localPrompt.value) localPrompt.value = String(newPrompt || '')
})

watch(() => props.data?.firstLastFrameMode, newValue => {
  const normalized = Boolean(newValue)
  if (normalized !== firstLastFrameMode.value) firstLastFrameMode.value = normalized
})

watch(() => props.data?.resolution, (newResolution) => {
  if (newResolution && newResolution !== localResolution.value) {
    localResolution.value = newResolution
  }
})

// 修复 Vue Flow visibility: hidden 问题
// 当节点数据变化时，强制更新内部状态
watch(() => props.data, () => {
  nextTick(() => {
    updateNodeInternals(props.id)
  })
}, { deep: true })

// Watch for auto-execute flag | 监听自动执行标志
watch(
  () => props.data?.autoExecute,
  (shouldExecute) => {
    if (shouldExecute && !loading.value) {
      // Clear the flag first to prevent re-triggering | 先清除标志防止重复触发
      updateNode(props.id, { autoExecute: false })
      // Delay to ensure node connections are established | 延迟确保节点连接已建立
      setTimeout(() => {
        handleGenerate()
      }, 100)
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.video-config-node-wrapper {
  position: relative;
  padding-top: 20px;
}

.video-config-node {
  cursor: default;
  position: relative;
  border-color: var(--canvas-border);
}

.video-config-node.is-selected {
  border-color: var(--canvas-action);
  box-shadow: 0 0 0 3px var(--canvas-focus), var(--shadow-control);
}

.video-config-node.is-processing::before {
  position: absolute;
  top: -1px;
  right: 12px;
  left: 12px;
  height: 3px;
  content: "";
  background: var(--brand-gradient);
  border-radius: var(--radius-pill);
}

.video-config-node.is-error {
  border-color: var(--danger-border);
}

.prompt-editor-modal {
  display: flex;
  width: min(920px, calc(100vw - 48px));
  height: min(680px, calc(100vh - 80px));
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--border-color);
  border-radius: 16px;
  background: var(--bg-secondary);
  box-shadow: 0 24px 80px rgba(0, 0, 0, 0.35);
}

.prompt-editor-textarea {
  min-height: 0;
  flex: 1;
  resize: none;
  border: 0;
  background: var(--bg-secondary);
  padding: 20px;
  color: var(--text-primary);
  font-size: 16px;
  line-height: 1.75;
  outline: none;
}
</style>
