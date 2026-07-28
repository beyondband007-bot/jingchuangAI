<template>
  <!-- Canvas page | 画布页面 -->
  <div class="canvas-workbench h-screen w-screen flex flex-col bg-[var(--bg-primary)]">
    <!-- Header | 顶部导航 -->
    <AppHeader class="canvas-workbench__header bg-[var(--bg-secondary)]">
      <template #left>
      <button
        @click="goBack"
        class="canvas-header-icon-button"
        data-tooltip="返回项目列表"
        data-tooltip--bottom
        aria-label="返回项目列表"
      >
          <n-icon :size="20"><ChevronBackOutline /></n-icon>
        </button>
        <n-dropdown :options="projectOptions" @select="handleProjectAction">
          <button class="canvas-project-trigger flex items-center gap-1 hover:bg-[var(--bg-tertiary)] px-2 py-1 rounded-lg transition-colors">
            <span class="canvas-project-title font-medium">{{ projectName }}</span>
            <n-icon :size="16"><ChevronDownOutline /></n-icon>
          </button>
        </n-dropdown>
      </template>
      <template #right>
        <span class="canvas-save-status text-xs" role="status" aria-live="polite" :class="saveState === 'error' || saveState === 'conflict' ? 'text-red-500' : 'text-[var(--text-secondary)]'" :data-tooltip="saveError || ''">
          {{ saveStatusLabel }}
        </span>
        <button 
          @click="showDownloadModal = true"
          class="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
          :class="{ 'text-[var(--accent-color)]': hasDownloadableAssets }"
          data-tooltip="批量下载素材"
          data-tooltip--bottom
          aria-label="批量下载素材"
        >
          <n-icon :size="20"><DownloadOutline /></n-icon>
        </button>
        <button 
          @click="openMyAssets"
          class="canvas-assets-entry px-3 py-1.5 text-sm hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
        >
          我的资产
        </button>
      </template>
    </AppHeader>

    <!-- Main canvas area | 主画布区域 -->
    <div
      ref="canvasContainerRef"
      class="flex-1 relative overflow-hidden"
      @dragenter.prevent="handleCanvasDragEnter"
      @dragover.prevent="handleCanvasDragOver"
      @dragleave="handleCanvasDragLeave"
      @drop.prevent="handleCanvasDrop"
    >
      <!-- Vue Flow canvas | Vue Flow 画布 -->
      <VueFlow
        :key="flowKey"
        v-model:nodes="nodes"
        v-model:edges="edges"
        v-model:viewport="viewport"
        :node-types="nodeTypes"
        :edge-types="edgeTypes"
        :default-viewport="canvasViewport"
        :min-zoom="0.1"
        :max-zoom="2"
        :snap-to-grid="true"
        :snap-grid="[20, 20]"
        :delete-key-code="null"
        @connect="onConnect"
        @node-click="onNodeClick"
        @edge-click="onEdgeClick"
        @pane-click="onPaneClick"
        @pane-context-menu="handlePaneContextMenu"
        @viewport-change="handleViewportChange"
        @edges-change="onEdgesChange"
        class="canvas-flow"
      >
        <Background v-if="showGrid" :gap="20" :size="1" />
        <MiniMap 
          v-if="!isMobile"
          position="bottom-right"
          :pannable="true"
          :zoomable="true"
        />
      </VueFlow>

      <div
        v-if="isDraggingMedia"
        class="pointer-events-none absolute inset-4 z-30 flex items-center justify-center rounded-2xl border-2 border-dashed border-[var(--accent-color)] bg-[var(--bg-primary)]/85"
      >
        <div class="rounded-xl bg-[var(--bg-secondary)] px-6 py-4 text-center shadow-lg">
          <div class="text-base font-medium text-[var(--text-primary)]">释放以添加到画布</div>
          <div class="mt-1 text-xs text-[var(--text-secondary)]">支持图片和视频，可一次拖入多个文件</div>
        </div>
      </div>

      <!-- Left toolbar | 左侧工具栏 -->
      <aside class="canvas-toolbar absolute left-4 top-1/2 -translate-y-1/2 flex flex-col gap-1 p-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-lg z-10" aria-label="画布工具">
        <button 
          @click="showNodeMenu = !showNodeMenu"
          class="w-10 h-10 flex items-center justify-center rounded-xl bg-[var(--accent-color)] text-white hover:bg-[var(--accent-hover)] transition-colors"
          data-tooltip="添加节点"
          data-tooltip--left
          aria-label="添加节点"
          :aria-expanded="showNodeMenu"
        >
          <n-icon :size="20"><AddOutline /></n-icon>
        </button>
        <button 
          @click="showWorkflowPanel = true"
          class="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-[var(--bg-tertiary)] transition-colors"
          data-tooltip="工作流模板"
          data-tooltip--left
          aria-label="工作流模板"
        >
          <n-icon :size="20"><AppsOutline /></n-icon>
        </button>
        <div class="w-full h-px bg-[var(--border-color)] my-1"></div>
        <button 
          v-for="tool in tools" 
          :key="tool.id"
          @click="tool.action"
          :disabled="tool.disabled && tool.disabled()"
          class="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          :data-tooltip="tool.name"
          data-tooltip--left
          :aria-label="tool.name"
        >
          <n-icon :size="20"><component :is="tool.icon" /></n-icon>
        </button>
      </aside>

      <!-- Node menu popup | 节点菜单弹窗 -->
      <div 
        v-if="showNodeMenu"
        class="canvas-menu absolute left-20 top-1/2 -translate-y-1/2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-lg p-2 z-20"
      >
        <button 
          v-for="nodeType in nodeTypeOptions" 
          :key="nodeType.type"
          @click="addNewNode(nodeType.type)"
          class="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors text-left"
        >
          <n-icon :size="20" :color="nodeType.color"><component :is="nodeType.icon" /></n-icon>
          <span class="text-sm">{{ nodeType.name }}</span>
        </button>
      </div>


      <!-- Canvas context menu | 画布右键菜单 -->
      <div
        v-if="contextMenu.visible"
        class="canvas-menu absolute z-40 min-w-[180px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2 shadow-xl"
        :style="{ left: `${contextMenu.x}px`, top: `${contextMenu.y}px` }"
        @click.stop
        @contextmenu.prevent
      >
        <div class="px-3 pb-1.5 pt-1 text-xs text-[var(--text-secondary)]">新建节点</div>
        <button
          v-for="nodeType in nodeTypeOptions"
          :key="`context-${nodeType.type}`"
          class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors hover:bg-[var(--bg-tertiary)]"
          @click="addNodeFromContextMenu(nodeType.type)"
        >
          <n-icon :size="18" :color="nodeType.color"><component :is="nodeType.icon" /></n-icon>
          <span class="text-sm">{{ nodeType.name }}</span>
        </button>
      </div>

      <!-- Bottom controls | 底部控制 -->
      <div class="canvas-viewport-controls absolute bottom-4 left-4 flex items-center gap-2 bg-[var(--bg-secondary)] rounded-lg border border-[var(--border-color)] p-1" aria-label="画布视图控制">
        <!-- <button 
          @click="showGrid = !showGrid" 
          :class="showGrid ? 'bg-[var(--accent-color)] text-white' : 'hover:bg-[var(--bg-tertiary)]'"
          class="p-2 rounded transition-colors"
        >
          <n-icon :size="16"><GridOutline /></n-icon>
        </button> -->
        <button 
          @click="fitView({ padding: 0.2 })" 
          class="p-2 hover:bg-[var(--bg-tertiary)] rounded transition-colors"
          data-tooltip="适应视图"
          aria-label="适应视图"
        >
          <n-icon :size="16"><LocateOutline /></n-icon>
        </button>
        <div class="flex items-center gap-1 px-2">
          <button @click="zoomOut" class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors" aria-label="缩小画布">
            <n-icon :size="14"><RemoveOutline /></n-icon>
          </button>
          <span class="text-xs min-w-[40px] text-center" aria-live="polite">{{ Math.round(viewport.zoom * 100) }}%</span>
          <button @click="zoomIn" class="p-1 hover:bg-[var(--bg-tertiary)] rounded transition-colors" aria-label="放大画布">
            <n-icon :size="14"><AddOutline /></n-icon>
          </button>
        </div>
      </div>

      <!-- Bottom input panel (floating) | 底部输入面板（悬浮） -->
      <div class="canvas-composer absolute bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 z-20">
        <!-- Processing indicator | 处理中指示器 -->
        <div
          v-if="isProcessing" 
          class="mb-3 p-3 bg-[var(--bg-primary)] rounded-xl border border-[var(--accent-color)] animate-pulse"
          role="status"
          aria-live="polite"
        >
          <div class="flex items-center gap-2 text-sm text-[var(--accent-color)] mb-2">
            <n-spin :size="14" />
            <span>正在生成提示词...</span>
          </div>
          <div v-if="currentResponse" class="text-sm text-[var(--text-primary)] whitespace-pre-wrap">
            {{ currentResponse }}
          </div>
        </div>

        <div class="canvas-composer__surface bg-[var(--bg-primary)] rounded-xl border border-[var(--border-color)] p-3">
          <textarea
            v-model="chatInput"
            :placeholder="inputPlaceholder"
            :disabled="isProcessing"
            class="w-full bg-transparent resize-none outline-none text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] min-h-[40px] max-h-[120px] disabled:opacity-50"
            rows="1"
            @keydown.enter.exact="handleEnterKey"
            @keydown.enter.ctrl="sendMessage"
          />
          <div class="flex items-center justify-between mt-2">
            <div class="flex items-center gap-2">
              <button 
                @click="handlePolish"
                :disabled="isProcessing || !chatInput.trim()"
                class="px-3 py-1.5 text-xs rounded-lg bg-[var(--bg-secondary)] hover:bg-[var(--bg-tertiary)] border border-[var(--border-color)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                data-tooltip="AI 润色提示词"
              >
                ✨ AI 润色
              </button>
            </div>
            <div class="flex items-center gap-3">
              <label class="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                <n-switch v-model:value="autoExecute" size="small" />
                自动执行
              </label>
              <button 
                @click="sendMessage"
                :disabled="isProcessing || !chatInput.trim()"
                class="canvas-composer__send-button"
              >
                <n-spin v-if="isProcessing" :size="16" />
                <n-icon v-else :size="18"><FlashOutline /></n-icon>
              </button>
            </div>
          </div>
        </div>
        
        <!-- Quick suggestions | 快捷建议 -->
        <div class="flex flex-wrap items-center justify-center gap-2 mt-2">
          <span class="text-xs text-[var(--text-secondary)]">推荐：</span>
          <button 
            v-for="tag in suggestions" 
            :key="tag"
            @click="chatInput = tag"
            class="px-2 py-0.5 text-xs rounded-full bg-[var(--bg-secondary)]/80 border border-[var(--border-color)] hover:border-[var(--accent-color)] transition-colors"
          >
            {{ tag }}
          </button>
          <button
            class="canvas-composer__suggestion-refresh"
            data-testid="canvas-refresh-canvas-suggestions"
            data-tooltip="换一批推荐"
            aria-label="换一批推荐"
            @click="refreshSuggestions"
          >
            <n-icon :size="14"><RefreshOutline /></n-icon>
          </button>
        </div>
      </div>
    </div>

    <!-- Rename Modal | 重命名弹窗 -->
    <n-modal v-model:show="showRenameModal" preset="dialog" title="重命名项目">
      <n-input v-model:value="renameValue" placeholder="请输入项目名称" />
      <template #action>
        <n-button @click="showRenameModal = false">取消</n-button>
        <n-button type="primary" @click="confirmRename">确定</n-button>
      </template>
    </n-modal>

    <!-- Delete Confirm Modal | 删除确认弹窗 -->
    <n-modal v-model:show="showDeleteModal" preset="dialog" title="删除项目" type="warning">
      <p>确定要删除项目「{{ projectName }}」吗？此操作不可恢复。</p>
      <template #action>
        <n-button @click="showDeleteModal = false">取消</n-button>
        <n-button type="error" @click="confirmDelete">删除</n-button>
      </template>
    </n-modal>

    <!-- Download Modal | 下载弹窗 -->
    <DownloadModal v-model:show="showDownloadModal" />

    <!-- Workflow Panel | 工作流面板 -->
    <WorkflowPanel v-model:show="showWorkflowPanel" @add-workflow="handleAddWorkflow" />
  </div>
</template>

<script setup>
/**
 * Canvas view component | 画布视图组件
 * Main infinite canvas with Vue Flow integration
 */
import { ref, computed, onMounted, onUnmounted, watch, nextTick, markRaw } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { MiniMap } from '@vue-flow/minimap'
import { NIcon, NSwitch, NDropdown, NMessageProvider, NSpin, NModal, NInput, NButton } from 'naive-ui'
import { 
  ChevronBackOutline,
  ChevronDownOutline,
  AddOutline,
  ImageOutline,
  MusicalNotesOutline,
  FlashOutline,
  RefreshOutline,
  TextOutline,
  VideocamOutline,
  ColorPaletteOutline,
  BookmarkOutline,
  ArrowUndoOutline,
  ArrowRedoOutline,
  GridOutline,
  LocateOutline,
  RemoveOutline,
  DownloadOutline,
  AppsOutline,
  ChatbubbleOutline
} from '@vicons/ionicons5'
import { nodes, edges, addNode, addNodes, addEdge, addEdges, updateNode, removeEdge, initSampleData, loadProject, saveProject, clearCanvas, canvasViewport, updateViewport, undo, redo, canUndo, canRedo, manualSaveHistory, startBatchOperation, endBatchOperation, markDescendantResultsStale } from '../stores/canvas'
import { loadAllModels } from '../stores/models'
import { useChat, useWorkflowOrchestrator } from '../hooks'
import { useModelStore } from '../stores/pinia'
import { projects, initProjectsStore, ensureProjectLoaded, renameProject, deleteProject, duplicateProject, flushProjectSave, saveState, saveError } from '../stores/projects'
import { openMyAssets, uploadCanvasMedia } from '../api/facemini'
import { resumeProjectImageTasks } from '../services/imageTaskRecovery'
import { IMAGE_PROMPT_POLISH_SYSTEM_PROMPT, PROMPT_POLISH_MODEL, VIDEO_PROMPT_POLISH_SYSTEM_PROMPT } from '../config/promptPolish'

// API Settings component | API 设置组件
import DownloadModal from '../components/DownloadModal.vue'
import WorkflowPanel from '../components/WorkflowPanel.vue'
import AppHeader from '../components/AppHeader.vue'

// API Config state | API 配置状态
const modelStore = useModelStore()
const isApiConfigured = computed(() => !!modelStore.currentApiKey)
const saveStatusLabel = computed(() => ({
  pending: '等待保存',
  saving: '保存中…',
  saved: '已保存到云端',
  conflict: '保存冲突',
  error: '保存失败'
}[saveState.value] || '已保存到云端'))

// Initialize models on page load | 页面加载时初始化模型
onMounted(() => {
  loadAllModels()
})

// Chat templates | 问答模板
const CHAT_TEMPLATES = {
  imagePrompt: {
    name: '生图提示词',
    systemPrompt: IMAGE_PROMPT_POLISH_SYSTEM_PROMPT,
    model: PROMPT_POLISH_MODEL
  },
  videoPrompt: {
    name: '视频提示词',
    systemPrompt: VIDEO_PROMPT_POLISH_SYSTEM_PROMPT,
    model: PROMPT_POLISH_MODEL
  }
}

// Current template | 当前模板
const currentTemplate = ref('imagePrompt')

// Chat hook with image prompt template | 问答 hook
const { 
  loading: chatLoading, 
  status: chatStatus, 
  currentResponse, 
  send: sendChat 
} = useChat({
  systemPrompt: CHAT_TEMPLATES.imagePrompt.systemPrompt,
  model: CHAT_TEMPLATES.imagePrompt.model
})

// Workflow orchestrator hook | 工作流编排 hook
const {
  isAnalyzing: workflowAnalyzing,
  isExecuting: workflowExecuting,
  currentStep: workflowStep,
  totalSteps: workflowTotalSteps,
  executionLog: workflowLog,
  analyzeIntent,
  executeWorkflow,
  createTextToImageWorkflow,
  createMultiAngleStoryboard,
  WORKFLOW_TYPES
} = useWorkflowOrchestrator()

// Custom node components | 自定义节点组件
import TextNode from '../components/nodes/TextNode.vue'
import ImageConfigNode from '../components/nodes/ImageConfigNode.vue'
import VideoNode from '../components/nodes/VideoNode.vue'
import ImageNode from '../components/nodes/ImageNode.vue'
import AudioNode from '../components/nodes/AudioNode.vue'
import VideoConfigNode from '../components/nodes/VideoConfigNode.vue'
import LLMConfigNode from '../components/nodes/LLMConfigNode.vue'
import ImageRoleEdge from '../components/edges/ImageRoleEdge.vue'
import PromptOrderEdge from '../components/edges/PromptOrderEdge.vue'
import ImageOrderEdge from '../components/edges/ImageOrderEdge.vue'
import DeletableEdge from '../components/edges/DeletableEdge.vue'

const router = useRouter()
const route = useRoute()

// Vue Flow instance | Vue Flow 实例
const { viewport, zoomIn, zoomOut, fitView, updateNodeInternals, screenToFlowCoordinate } = useVueFlow()

// Register custom node types | 注册自定义节点类型
const nodeTypes = {
  text: markRaw(TextNode),
  imageConfig: markRaw(ImageConfigNode),
  video: markRaw(VideoNode),
  image: markRaw(ImageNode),
  audio: markRaw(AudioNode),
  videoConfig: markRaw(VideoConfigNode),
  llmConfig: markRaw(LLMConfigNode)
}

// Register custom edge types | 注册自定义边类型
const edgeTypes = {
  default: markRaw(DeletableEdge),
  imageRole: markRaw(ImageRoleEdge),
  promptOrder: markRaw(PromptOrderEdge),
  imageOrder: markRaw(ImageOrderEdge)
}

// UI state | UI状态
const showNodeMenu = ref(false)
const chatInput = ref('')
const autoExecute = ref(false)
const isMobile = ref(false)
const showGrid = ref(true)
const isProcessing = ref(false)
const canvasContainerRef = ref(null)
const isDraggingMedia = ref(false)
const dragDepth = ref(0)
const contextMenu = ref({ visible: false, x: 0, y: 0, flowPosition: { x: 0, y: 0 } })

// Flow key for forcing re-render on project switch | 项目切换时强制重新渲染的 key
const flowKey = ref(Date.now())

// Modal state | 弹窗状态
const showRenameModal = ref(false)
const showDeleteModal = ref(false)
const showDownloadModal = ref(false)
const showWorkflowPanel = ref(false)
const renameValue = ref('')

// Check if has downloadable assets | 检查是否有可下载素材
const hasDownloadableAssets = computed(() => {
  return nodes.value.some(n => 
    ['image', 'video', 'audio'].includes(n.type) && n.data?.url
  )
})


// Project info | 项目信息
const projectName = computed(() => {
  const project = projects.value.find(p => p.id === route.params.id)
  return project?.name || '未命名项目'
})

// Project dropdown options | 项目下拉选项
const projectOptions = [
  { label: '重命名', key: 'rename' },
  { label: '复制', key: 'duplicate' },
  { label: '删除', key: 'delete' }
]

// Toolbar tools | 工具栏工具
const tools = [
  { id: 'text', name: '文本', icon: TextOutline, action: () => addNewNode('text') },
  { id: 'image', name: '图片', icon: ImageOutline, action: () => addNewNode('image') },
  { id: 'audio', name: '音频', icon: MusicalNotesOutline, action: () => addNewNode('audio') },
  { id: 'imageConfig', name: '生图配置', icon: ColorPaletteOutline, action: () => addNewNode('imageConfig') },
  { id: 'videoConfig', name: '视频生成', icon: VideocamOutline, action: () => addNewNode('videoConfig') },
  { id: 'undo', name: '撤销 (Ctrl+Z)', icon: ArrowUndoOutline, action: () => undo(), disabled: () => !canUndo() },
  { id: 'redo', name: '重做', icon: ArrowRedoOutline, action: () => redo(), disabled: () => !canRedo() }
]

// Node type options for menu | 节点类型菜单选项
const nodeTypeOptions = [
  { type: 'text', name: '文本节点', icon: TextOutline, color: '#3b82f6' },
  { type: 'llmConfig', name: 'LLM文本生成', icon: ChatbubbleOutline, color: '#a855f7' },
  { type: 'imageConfig', name: '生图配置', icon: ColorPaletteOutline, color: '#22c55e' },
  { type: 'videoConfig', name: '视频生成配置', icon: VideocamOutline, color: '#f59e0b' },
  { type: 'image', name: '图片节点', icon: ImageOutline, color: '#8b5cf6' },
  { type: 'audio', name: '音频节点', icon: MusicalNotesOutline, color: '#0ea5e9' },
  { type: 'video', name: '视频节点', icon: VideocamOutline, color: '#ef4444' }
]

// Input placeholder | 输入占位符
const inputPlaceholder = '你可以试着说"帮我生成一个二次元的卡通角色"'

// Quick suggestions | 快捷建议
const CANVAS_SUGGESTION_BATCH_SIZE = 4
const canvasSuggestionPool = [
  '童话森林里的发光小屋',
  '雨夜霓虹街头人像',
  '生成三段分镜脚本',
  '产品广告镜头设计',
  '海边日落旅行短片',
  '古风侠客角色设定',
  '未来城市航拍视角',
  '治愈系猫咪日常',
  '咖啡馆品牌宣传图',
  '赛博朋克机械少女',
  '国潮茶饮包装方案',
  '雪山露营纪录片',
  '二次元冒险场景',
  '北欧客厅软装设计',
  '美食制作过程分镜',
  '水墨山水动画灵感',
  '时尚杂志封面人像',
  '深海水母奇幻世界',
  '儿童绘本角色设计',
  '城市夜景延时摄影',
  '夏日音乐节海报',
  '复古胶片旅行影像',
  '科技产品发布会主视觉',
  '花店开业宣传短片'
]

const pickSuggestions = (pool, count = CANVAS_SUGGESTION_BATCH_SIZE) => {
  const shuffled = [...pool]

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1))
    ;[shuffled[index], shuffled[randomIndex]] = [shuffled[randomIndex], shuffled[index]]
  }

  return shuffled.slice(0, count)
}

const suggestions = ref(pickSuggestions(canvasSuggestionPool))

const refreshSuggestions = () => {
  const currentSuggestions = new Set(suggestions.value)
  const availableSuggestions = canvasSuggestionPool.filter(
    suggestion => !currentSuggestions.has(suggestion)
  )

  suggestions.value = pickSuggestions(
    availableSuggestions.length >= CANVAS_SUGGESTION_BATCH_SIZE
      ? availableSuggestions
      : canvasSuggestionPool
  )
}

// Add new node | 添加新节点
const addNewNode = async (type, requestedPosition = null) => {
  // Calculate viewport center position | 计算视口中心位置
  const viewportCenterX = -viewport.value.x / viewport.value.zoom + (window.innerWidth / 2) / viewport.value.zoom
  const viewportCenterY = -viewport.value.y / viewport.value.zoom + (window.innerHeight / 2) / viewport.value.zoom
  
  // Add node at viewport center | 在视口中心添加节点
  const nodeId = addNode(type, requestedPosition || { x: viewportCenterX - 100, y: viewportCenterY - 100 })
  
  // Set highest z-index | 设置最高层级
  const maxZIndex = Math.max(0, ...nodes.value.map(n => n.zIndex || 0))
  updateNode(nodeId, { zIndex: maxZIndex + 1 })
  
  // Force Vue Flow to recalculate node dimensions | 强制 Vue Flow 重新计算节点尺寸
  setTimeout(() => {
    updateNodeInternals(nodeId)
  }, 50)
  
  showNodeMenu.value = false
}

const closeContextMenu = () => {
  contextMenu.value = { ...contextMenu.value, visible: false }
}

const handlePaneContextMenu = (event) => {
  event.preventDefault()
  const bounds = canvasContainerRef.value?.getBoundingClientRect()
  if (!bounds) return
  const menuWidth = 190
  const menuHeight = 330
  contextMenu.value = {
    visible: true,
    x: Math.max(8, Math.min(event.clientX - bounds.left, bounds.width - menuWidth - 8)),
    y: Math.max(8, Math.min(event.clientY - bounds.top, bounds.height - menuHeight - 8)),
    flowPosition: screenToFlowCoordinate({ x: event.clientX, y: event.clientY }),
  }
  showNodeMenu.value = false
}

const addNodeFromContextMenu = (type) => {
  const position = { ...contextMenu.value.flowPosition }
  closeContextMenu()
  addNewNode(type, position)
}

const audioFileExtensions = new Set(['mp3', 'wav', 'm4a', 'aac', 'ogg', 'flac', 'webm'])

const getMediaTypeForFile = (file) => {
  const mimeType = String(file?.type || '').toLowerCase()
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  const extension = String(file?.name || '').split('.').pop()?.toLowerCase()
  return audioFileExtensions.has(extension) ? 'audio' : ''
}

const containsMediaFiles = (dataTransfer) => Array.from(dataTransfer?.items || []).some(item =>
  item.kind === 'file' && (
    item.type.startsWith('image/')
    || item.type.startsWith('video/')
    || item.type.startsWith('audio/')
    || getMediaTypeForFile(item.getAsFile())
  )
)

const handleCanvasDragEnter = (event) => {
  if (!containsMediaFiles(event.dataTransfer)) return
  dragDepth.value += 1
  isDraggingMedia.value = true
}

const handleCanvasDragOver = (event) => {
  if (!containsMediaFiles(event.dataTransfer)) return
  event.dataTransfer.dropEffect = 'copy'
}

const handleCanvasDragLeave = () => {
  dragDepth.value = Math.max(0, dragDepth.value - 1)
  if (dragDepth.value === 0) isDraggingMedia.value = false
}

const handleCanvasDrop = async (event) => {
  dragDepth.value = 0
  isDraggingMedia.value = false
  closeContextMenu()

  const files = Array.from(event.dataTransfer?.files || []).filter(file =>
    getMediaTypeForFile(file)
  )
  if (!files.length) return

  const start = screenToFlowCoordinate({ x: event.clientX, y: event.clientY })
  let uploadedCount = 0
  for (let index = 0; index < files.length; index += 1) {
    const file = files[index]
    const type = getMediaTypeForFile(file)
    const position = { x: start.x + index * 36, y: start.y + index * 36 }
    const nodeId = addNode(type, position, {
      url: '',
      loading: true,
      label: file.name || ({ video: '上传视频', audio: '上传音频', image: '上传图片' }[type]),
      fileName: file.name,
      fileType: file.type,
    })
    setTimeout(() => updateNodeInternals(nodeId), 50)
    try {
      const uploaded = await uploadCanvasMedia(file)
      updateNode(nodeId, {
        url: uploaded.url,
        loading: false,
        label: file.name || ({ video: '视频素材', audio: '音频素材', image: '图片素材' }[type]),
        updatedAt: Date.now(),
      })
      uploadedCount += 1
    } catch (error) {
      updateNode(nodeId, { loading: false, error: error.message || '上传失败' })
      window.$message?.error(`${file.name || '文件'}上传失败：${error.message || '未知错误'}`)
    }
  }
  if (uploadedCount > 0) {
    window.$message?.success(uploadedCount === 1 ? '素材已添加到画布' : `已添加 ${uploadedCount} 个素材`)
  }
}

// Handle add workflow from panel | 处理从面板添加工作流
const handleAddWorkflow = ({ workflow, options }) => {
  // Calculate viewport center position | 计算视口中心位置
  const viewportCenterX = -viewport.value.x / viewport.value.zoom + (window.innerWidth / 2) / viewport.value.zoom
  const viewportCenterY = -viewport.value.y / viewport.value.zoom + (window.innerHeight / 2) / viewport.value.zoom

  // Create nodes from workflow template | 从工作流模板创建节点
  const startPosition = { x: viewportCenterX - 300, y: viewportCenterY - 200 }
  const { nodes: newNodes, edges: newEdges } = workflow.createNodes(startPosition, options)

  // Start batch operation manually | 手动开始批量操作
  startBatchOperation()

  // Add nodes to canvas in batch | 批量将节点添加到画布
  const nodeSpecs = newNodes.map(node => ({
    type: node.type,
    position: node.position,
    data: node.data
  }))
  const nodeIds = addNodes(nodeSpecs, false)

  // Map old node IDs to new IDs | 映射旧节点ID到新ID
  const idMap = {}
  newNodes.forEach((node, index) => {
    idMap[node.id] = nodeIds[index]
  })

  // Add edges to canvas in batch | 批量将边添加到画布
  const edgeSpecs = newEdges.map(edge => ({
    source: idMap[edge.source] || edge.source,
    target: idMap[edge.target] || edge.target,
    sourceHandle: edge.sourceHandle || 'right',
    targetHandle: edge.targetHandle || 'left',
    type: edge.type,
    data: edge.data
  }))

  // Add edges (autoBatch=false to use manual batch) | 添加边（autoBatch=false 以使用手动批量）
  addEdges(edgeSpecs, false)

  // End batch operation and save to history | 结束批量操作并保存到历史
  endBatchOperation()

  // Delay node internals update | 延迟节点内部更新
  setTimeout(() => {
    // Update node internals | 更新节点内部
    nodeIds.forEach(nodeId => {
      updateNodeInternals(nodeId)
    })
  }, 100)

  window.$message?.success(`已添加工作流: ${workflow.name}`)
}

// Handle connection | 处理连接
const onConnect = (params) => {
  // Check connection types | 检查连接类型
  const sourceNode = nodes.value.find(n => n.id === params.source)
  const targetNode = nodes.value.find(n => n.id === params.target)

  if (
    ['text', 'llmConfig'].includes(sourceNode?.type)
    && ['imageConfig', 'videoConfig'].includes(targetNode?.type)
  ) {
    window.$message?.info('请直接在生成节点的提示词框中输入内容')
    return
  }
  
  if (sourceNode?.type === 'image' && targetNode?.type === 'videoConfig') {
    // Use imageRole edge type | 使用图片角色边类型
    addEdge({
      ...params,
      type: 'imageRole',
      data: { imageRole: 'first_frame_image' } // Default to first frame | 默认首帧
    })
  } else if (sourceNode?.type === 'image' && targetNode?.type === 'imageConfig') {
    // Use imageOrder edge type | 使用图片顺序边类型
    // Calculate next order number | 计算下一个顺序号
    const existingImageEdges = edges.value.filter(e =>
      e.target === params.target && e.type === 'imageOrder'
    )

    // Get @ mentioned image count from connected TextNodes | 获取已连接 TextNode 中 @ 提及的图片数量
    let mentionedImageCount = 0
    const connectedTextEdges = edges.value.filter(e => e.target === params.target)
    for (const edge of connectedTextEdges) {
      const sourceNode = nodes.value.find(n => n.id === edge.source)
      if (sourceNode?.type === 'text') {
        const content = sourceNode.data?.content || ''
        // Count @ mentions of image nodes | 统计图片节点的 @ 提及
        const mentionRegex = /@\[([^\]|]+)(?:\|([^\]]+))?\]/g
        let match
        while ((match = mentionRegex.exec(content)) !== null) {
          const mentionedNode = nodes.value.find(n => n.id === match[1])
          if (mentionedNode?.type === 'image') {
            mentionedImageCount++
          }
        }
      }
    }

    // Next order = existing edges + mentioned image count + 1 | 下一个序号 = 现有边数 + @提及图片数 + 1
    const nextOrder = existingImageEdges.length + mentionedImageCount + 1

    addEdge({
      ...params,
      type: 'imageOrder',
      data: { imageOrder: nextOrder }
    })
  } else {
    addEdge(params)
  }
}
const onNodeClick = (event) => {
  // nodes.value.forEach(node => {
  //   updateNode(node.id, { selected: false })
  // })
  
  // // Select clicked node | 选中的节点
  // const clickedNode = nodes.value.find(n => n.id === event.node.id)
  // if (clickedNode) {
  //   updateNode(event.node.id, { selected: true })
  // }
}

const onEdgeClick = ({ edge }) => {
  edges.value = edges.value.map(item => ({ ...item, selected: item.id === edge.id }))
}

const isTextEditingTarget = (target) => target instanceof HTMLElement && (
  target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
)

const handleCanvasKeyboardShortcut = (event) => {
  // Keep native undo behavior while the user is editing a node title or prompt.
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
    if (isTextEditingTarget(event.target)) return
    if (!canUndo()) return
    event.preventDefault()
    undo()
    return
  }

  if (!['Delete', 'Backspace'].includes(event.key)) return
  if (isTextEditingTarget(event.target)) return

  const selectedIds = edges.value.filter(edge => edge.selected).map(edge => edge.id)
  if (!selectedIds.length) return
  event.preventDefault()
  selectedIds.forEach(removeEdge)
  window.$message?.success('连线已删除')
}

// Handle viewport change | 处理视口变化
const handleViewportChange = (newViewport) => {
  updateViewport(newViewport)
}

// Handle edges change | 处理边变化
const onEdgesChange = (changes) => {
  // Check if any edge is being removed | 检查是否有边被删除
  const hasRemoval = changes.some(change => change.type === 'remove')
  changes
    .filter(change => change.type === 'remove')
    .map(change => edges.value.find(edge => edge.id === change.id)?.target || change.target)
    .filter(Boolean)
    .forEach(markDescendantResultsStale)
  
  if (hasRemoval) {
    // Trigger history save after edge removal | 边删除后触发历史保存
    nextTick(() => {
      manualSaveHistory()
    })
  }
}

// Handle pane click | 处理画布点击
const onPaneClick = () => {
  closeContextMenu()
  showNodeMenu.value = false
  edges.value = edges.value.map(edge => edge.selected ? { ...edge, selected: false } : edge)
  // Clear all selections | 清除所有选中
  // nodes.value = nodes.value.map(node => ({
  //   ...node,
  //   selected: false
  // }))
}

// Handle project action | 处理项目操作
const handleProjectAction = async (key) => {
  switch (key) {
    case 'rename':
      renameValue.value = projectName.value
      showRenameModal.value = true
      break
    case 'duplicate':
      await flushProjectSave(route.params.id)
      router.push(`/canvas/${await duplicateProject(route.params.id)}`)
      break
    case 'delete':
      showDeleteModal.value = true
      break
  }
}

// Confirm rename | 确认重命名
const confirmRename = async () => {
  const projectId = route.params.id
  if (renameValue.value.trim()) {
    await renameProject(projectId, renameValue.value.trim())
    window.$message?.success('已重命名')
  }
  showRenameModal.value = false
}

// Confirm delete | 确认删除
const confirmDelete = async () => {
  const projectId = route.params.id
  await deleteProject(projectId)
  showDeleteModal.value = false
  window.$message?.success('项目已删除')
  router.push('/')
}

// Handle Enter key | 处理回车键
const handleEnterKey = (e) => {
  e.preventDefault()
  sendMessage()
}

// Handle AI polish | 处理 AI 润色
const handlePolish = async () => {
  const input = chatInput.value.trim()
  if (!input) return
  
  // Check API configuration | 检查 API 配置
  if (!isApiConfigured.value) {
    window.$message?.warning('请先配置 API Key')
    window.$message?.warning('请先登录 Facemini')
    return
  }

  isProcessing.value = true
  const originalInput = chatInput.value

  try {
    // Call chat API to polish the prompt | 调用 AI 润色提示词
    const result = await sendChat(input, true)
    
    if (result) {
      chatInput.value = result
      window.$message?.success('提示词已润色')
    }
  } catch (err) {
    chatInput.value = originalInput
    window.$message?.error(err.message || '润色失败')
  } finally {
    isProcessing.value = false
  }
}

// Send message | 发送消息
const sendMessage = async () => {
  const input = chatInput.value.trim()
  if (!input) return

  // Check API configuration | 检查 API 配置
  if (!isApiConfigured.value) {
    window.$message?.warning('请先配置 API Key')
    window.$message?.warning('请先登录 Facemini')
    return
  }

  isProcessing.value = true
  const content = chatInput.value
  chatInput.value = ''

  try {
    // Calculate position to avoid overlap | 计算位置避免重叠
    let maxY = 0
    if (nodes.value.length > 0) {
      maxY = Math.max(...nodes.value.map(n => n.position.y))
    }
    const baseX = 100
    const baseY = maxY + 200

    if (autoExecute.value) {
      // Auto-execute mode: analyze intent and execute workflow | 自动执行模式：分析意图并执行工作流
      window.$message?.info('正在分析工作流...')
      
      try {
        // Analyze user intent | 分析用户意图
        const result = await analyzeIntent(content)
        
        // Ensure we have valid workflow params | 确保有效的工作流参数
        const workflowParams = {
          workflow_type: result?.workflow_type || WORKFLOW_TYPES.TEXT_TO_IMAGE,
          image_prompt: result?.image_prompt || content,
          video_prompt: result?.video_prompt || content,
          character: result?.character,
          shots: result?.shots
        }
        
        window.$message?.info(`执行工作流: ${result?.description || '文生图'}`)
        
        // Execute the workflow | 执行工作流
        await executeWorkflow(workflowParams, { x: baseX, y: baseY })
        
        window.$message?.success('工作流已启动')
      } catch (err) {
        console.error('Workflow error:', err)
        // Fallback to simple text-to-image | 回退到文生图
        window.$message?.warning('使用默认文生图工作流')
        await createTextToImageWorkflow(content, { x: baseX, y: baseY })
      }
    } else {
      // Manual mode: create a config node with its prompt embedded.
      addNode('imageConfig', { x: baseX, y: baseY }, {
        label: '生图配置',
        prompt: content
      })
    }
  } catch (err) {
    window.$message?.error(err.message || '创建失败')
  } finally {
    isProcessing.value = false
  }
}

// Go back to home | 返回首页
const goBack = () => {
  router.push('/')
}

// Check if mobile | 检测是否移动端
const checkMobile = () => {
  isMobile.value = window.innerWidth < 768
}

// Load project by ID | 根据ID加载项目
const loadProjectById = async (projectId) => {
  // Update flow key to force VueFlow re-render | 更新 key 强制 VueFlow 重新渲染
  flowKey.value = Date.now()
  
  if (projectId && projectId !== 'new') {
    await ensureProjectLoaded(projectId)
    loadProject(projectId)
    await resumeProjectImageTasks({
      projectId,
      nodes: nodes.value,
      edges: edges.value,
      updateNode,
      isCurrent: () => route.params.id === projectId
    })
  } else {
    // New project - clear canvas | 新项目 - 清空画布
    clearCanvas()
  }
}

// Watch for route changes | 监听路由变化
watch(
  () => route.params.id,
  async (newId, oldId) => {
    if (newId && newId !== oldId) {
      // Save current project before switching | 切换前保存当前项目
      if (oldId) {
        saveProject()
        await flushProjectSave(oldId).catch(() => {})
      }
      // Load new project | 加载新项目
      await loadProjectById(newId)
    }
  }
)

// Initialize | 初始化
onMounted(async () => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
  window.addEventListener('keydown', handleCanvasKeyboardShortcut)
  
  // Initialize projects store | 初始化项目存储
  await initProjectsStore()
  
  // Load project data | 加载项目数据
  await loadProjectById(route.params.id)
  
  // Check for initial prompt from home page | 检查来自首页的初始提示词
  const initialPrompt = sessionStorage.getItem('ai-canvas-initial-prompt')
  if (initialPrompt) {
    sessionStorage.removeItem('ai-canvas-initial-prompt')
    chatInput.value = initialPrompt
    // Auto-send the message | 自动发送消息
    nextTick(() => {
      sendMessage()
    })
  }
})

// Cleanup on unmount | 卸载时清理
onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  window.removeEventListener('keydown', handleCanvasKeyboardShortcut)
  // Save project before leaving | 离开前保存项目
  saveProject()
  flushProjectSave(route.params.id).catch(() => {})
})
</script>

<style>
/* Import Vue Flow styles | 引入 Vue Flow 样式 */
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
@import '@vue-flow/minimap/dist/style.css';

.canvas-flow {
  width: 100%;
  height: 100%;
}

.canvas-workbench {
  color: var(--canvas-text);
  background: var(--canvas-bg);
}

.canvas-workbench__header {
  flex: 0 0 var(--app-header-height);
  min-height: var(--app-header-height);
  padding-right: var(--space-6);
  padding-left: var(--space-6);
  border-color: var(--canvas-border) !important;
  box-shadow: none;
}

.canvas-header-icon-button,
.canvas-composer__suggestion-refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  line-height: 1;
}

.canvas-header-icon-button {
  width: 34px;
  height: 34px;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--canvas-radius-control);
  transition: color var(--duration-fast) var(--ease-standard), background var(--duration-fast) var(--ease-standard);
}

.canvas-header-icon-button:hover,
.canvas-header-icon-button:focus-visible {
  color: var(--text-primary);
  background: var(--bg-tertiary);
}

.canvas-project-trigger {
  min-width: 0;
}

.canvas-project-title {
  max-width: min(30vw, 280px);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.canvas-flow .vue-flow__background {
  color: var(--canvas-grid);
}

.canvas-toolbar,
.canvas-viewport-controls,
.canvas-menu,
.canvas-composer__surface {
  border-color: var(--canvas-border) !important;
  background: var(--canvas-surface) !important;
  box-shadow: var(--canvas-shadow-panel) !important;
}

.canvas-composer textarea {
  border: 0;
}

.canvas-composer textarea:focus,
.canvas-composer textarea:focus-visible {
  border-color: transparent;
  outline: 0;
  box-shadow: none;
}

.canvas-composer__send-button {
  display: inline-flex;
  width: 44px;
  min-height: 34px;
  align-items: center;
  justify-content: center;
  color: var(--color-white);
  background: var(--fm-brand, var(--brand-primary));
  border: 1px solid transparent;
  border-radius: var(--radius-pill);
  box-shadow: var(--shadow-brand);
  transition: background var(--duration-normal) var(--ease-standard), box-shadow var(--duration-normal) var(--ease-standard), transform var(--duration-fast) var(--ease-standard);
}

.canvas-composer__send-button:hover:not(:disabled),
.canvas-composer__send-button:focus-visible:not(:disabled) {
  color: var(--color-white);
  background: var(--brand-primary-strong);
}

.canvas-composer__send-button:disabled {
  color: var(--text-faint);
  background: var(--state-disabled);
  border-color: var(--app-border);
  box-shadow: none;
  cursor: not-allowed;
}

.canvas-composer__suggestion-refresh {
  width: 30px;
  height: 30px;
  color: var(--text-secondary);
  background: var(--canvas-surface);
  border: 1px solid var(--canvas-border);
  border-radius: var(--radius-pill);
  transition: color var(--duration-fast) var(--ease-standard), border-color var(--duration-fast) var(--ease-standard), background var(--duration-fast) var(--ease-standard);
}

.canvas-composer__suggestion-refresh:hover,
.canvas-composer__suggestion-refresh:focus-visible {
  color: var(--fm-brand, var(--brand-primary));
  background: var(--bg-tertiary);
  border-color: var(--fm-brand, var(--brand-primary));
}

.canvas-toolbar {
  padding: var(--space-2);
  border-radius: var(--canvas-radius-panel);
}

.canvas-toolbar button,
.canvas-viewport-controls button {
  border-radius: var(--canvas-radius-control);
}

.canvas-toolbar button:first-child {
  background: var(--canvas-action);
}

.canvas-toolbar button:first-child:hover,
.canvas-toolbar button:first-child:focus-visible {
  background: var(--canvas-action-hover);
}

.canvas-menu {
  border-radius: var(--canvas-radius-panel);
}

.canvas-composer {
  max-width: min(672px, calc(100% - 32px));
}

.canvas-composer__surface {
  border-radius: var(--canvas-radius-panel);
}

.canvas-workbench .vue-flow__minimap {
  overflow: hidden;
  border: 1px solid var(--canvas-border);
  border-radius: var(--canvas-radius-control);
  background: var(--canvas-surface);
  box-shadow: var(--shadow-control);
}

@media (max-width: 1024px) {
  .canvas-workbench__header {
    padding-right: var(--space-4);
    padding-left: var(--space-4);
  }

  .canvas-composer {
    max-width: min(600px, calc(100% - 32px));
  }
}

@media (max-width: 768px) {
  .canvas-workbench__header {
    padding-right: var(--space-3);
    padding-left: var(--space-3);
  }

  .canvas-project-title {
    max-width: 24vw;
  }

  .canvas-save-status {
    max-width: 76px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .canvas-toolbar {
    top: auto;
    bottom: var(--space-4);
    left: 50%;
    flex-direction: row;
    max-width: calc(100% - 32px);
    transform: translateX(-50%);
  }

  .canvas-toolbar > div {
    width: 1px;
    height: 28px;
    margin: 0 var(--space-1);
  }

  .canvas-viewport-controls {
    bottom: var(--space-4);
    left: var(--space-4);
  }

  .canvas-composer {
    right: 0;
    bottom: 76px;
    left: 0;
    max-width: none;
    transform: none;
  }
}

@media (max-width: 375px) {
  .canvas-workbench__header {
    padding-right: var(--space-2);
    padding-left: var(--space-2);
  }

  .canvas-composer {
    bottom: 72px;
    padding-right: var(--space-2);
    padding-left: var(--space-2);
  }

  .canvas-workbench__header {
    gap: var(--space-1);
  }

  .canvas-workbench__header > div {
    gap: var(--space-1);
  }

  .canvas-project-title {
    max-width: 72px;
  }

  .canvas-save-status {
    display: none;
  }

  .canvas-assets-entry {
    padding-right: var(--space-1) !important;
    padding-left: var(--space-1) !important;
    font-size: var(--font-size-xs) !important;
  }
}
</style>
