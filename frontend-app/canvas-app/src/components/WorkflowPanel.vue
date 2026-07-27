<template>
  <!-- Workflow panel | 工作流浮动面板 -->
  <Transition name="panel-slide">
    <aside v-if="visible" class="workflow-panel" aria-label="工作流模板" v-click-outside="handleClickOutside">
      <!-- Header | 头部 -->
      <div class="panel-header">
        <div class="panel-tabs" role="tablist" aria-label="工作流分类">
          <button
            type="button"
            class="tab-item" 
            :class="{ active: activeTab === 'public' }"
            @click="activeTab = 'public'"
            :aria-selected="activeTab === 'public'"
            role="tab"
          >公共工作流</button>
          <button
            type="button"
            class="tab-item" 
            :class="{ active: activeTab === 'my' }"
            @click="activeTab = 'my'"
            :aria-selected="activeTab === 'my'"
            role="tab"
          >我的工作流</button>
        </div>
        <button class="expand-btn" type="button" aria-label="关闭工作流模板" @click="visible = false">
          <n-icon :size="16"><CloseOutline /></n-icon>
        </button>
      </div>
      
      <!-- Content | 内容 -->
      <div class="panel-content">
        <!-- Public workflows | 公共工作流 -->
        <div v-if="activeTab === 'public'" class="workflow-grid">
          <button
            type="button"
            v-for="workflow in publicWorkflows" 
            :key="workflow.id"
            class="workflow-card"
            @click="handleAddWorkflow(workflow)"
          >
            <div class="card-cover">
              <img v-if="workflow.cover" :src="workflow.cover" :alt="workflow.name" class="cover-img" />
              <n-icon v-else :size="36" class="cover-icon">
                <component :is="getIcon(workflow.icon)" />
              </n-icon>
            </div>
            <div class="card-title">{{ workflow.name }}</div>
          </button>
        </div>
        
        <!-- My workflows | 我的工作流 -->
        <div v-else class="empty-state">
          <n-icon :size="36" class="text-gray-500">
            <FolderOpenOutline />
          </n-icon>
          <p class="text-gray-500 text-sm mt-2">暂无自定义工作流</p>
        </div>
      </div>
    </aside>
  </Transition>
</template>

<script setup>
/**
 * Workflow Panel Component | 工作流面板组件
 * 显示工作流模板列表，支持一键添加到画布
 */
import { computed, ref } from 'vue'
import { NIcon } from 'naive-ui'
import { 
  CloseOutline,
  GridOutline, 
  ImageOutline, 
  VideocamOutline,
  FolderOpenOutline,
  BookOutline,
  PersonOutline,
  CartOutline,
  ChatbubbleOutline
} from '@vicons/ionicons5'
import { WORKFLOW_TEMPLATES } from '../config/workflows'

const props = defineProps({
  show: Boolean
})

const emit = defineEmits(['update:show', 'add-workflow'])

// Active tab | 当前标签
const activeTab = ref('public')

// Visible state | 显示状态
const visible = computed({
  get: () => props.show,
  set: (val) => emit('update:show', val)
})

// Public workflows | 公共工作流
const publicWorkflows = computed(() => WORKFLOW_TEMPLATES)

// Icon mapping | 图标映射
const iconMap = {
  GridOutline,
  ImageOutline,
  VideocamOutline,
  BookOutline,
  PersonOutline,
  ShoppingOutline: CartOutline,
  ChatbubbleOutline
}

const getIcon = (iconName) => {
  return iconMap[iconName] || GridOutline
}

// Handle add workflow | 处理添加工作流
const handleAddWorkflow = (workflow) => {
  // 直接添加工作流，节点内容由用户自己填写
  emit('add-workflow', { workflow, options: {} })
  visible.value = false
}

// Handle click outside | 点击外部关闭
const handleClickOutside = () => {
  visible.value = false
}

// Custom directive | 自定义指令
const vClickOutside = {
  mounted(el, binding) {
    el._clickOutside = (e) => {
      if (!el.contains(e.target)) {
        binding.value()
      }
    }
    setTimeout(() => {
      document.addEventListener('click', el._clickOutside)
    }, 0)
  },
  unmounted(el) {
    document.removeEventListener('click', el._clickOutside)
  }
}
</script>

<style scoped>
/* Panel container | 面板容器 */
.workflow-panel {
  position: fixed;
  top: var(--app-header-height);
  right: 0;
  bottom: 0;
  width: min(420px, 100vw);
  max-height: none;
  background: var(--canvas-surface);
  border-left: 1px solid var(--canvas-border);
  box-shadow: -16px 0 32px rgba(48, 43, 82, 0.12);
  z-index: var(--z-drawer);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

/* Header | 头部 */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 64px;
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--canvas-border);
}

.panel-tabs {
  display: flex;
  gap: var(--space-2);
}

.tab-item {
  min-height: 34px;
  padding: 0 var(--space-3);
  color: var(--canvas-text-muted);
  background: transparent;
  border: 0;
  border-radius: var(--canvas-radius-control);
  font-size: var(--font-size-md);
  cursor: pointer;
  transition: color var(--duration-fast) var(--ease-standard), background var(--duration-fast) var(--ease-standard);
}

.tab-item:hover {
  color: var(--canvas-text);
  background: var(--state-hover);
}

.tab-item.active {
  color: var(--canvas-action);
  background: var(--state-selected);
  font-weight: 600;
}

.expand-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: 1px solid var(--canvas-border);
  border-radius: var(--canvas-radius-control);
  color: var(--canvas-text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.expand-btn:hover {
  background: var(--state-hover);
  color: var(--canvas-text);
}

/* Content | 内容区 */
.panel-content {
  flex: 1;
  overflow-y: auto;
  padding: var(--space-4);
}

/* Workflow grid | 工作流网格 */
.workflow-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}

/* Workflow card | 工作流卡片 */
.workflow-card {
  padding: 0;
  overflow: hidden;
  color: var(--canvas-text);
  background: transparent;
  border: 0;
  border-radius: var(--canvas-radius-panel);
  cursor: pointer;
  text-align: left;
  transition: transform var(--duration-fast) var(--ease-standard);
}

.workflow-card:hover {
  transform: translateY(-2px);
}

.workflow-card:hover .card-cover {
  border-color: var(--accent-color);
}

.card-cover {
  aspect-ratio: 1;
  border-radius: var(--canvas-radius-panel);
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--app-surface);
  border: 1px solid var(--canvas-border);
  transition: border-color var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard);
  overflow: hidden;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-icon {
  color: var(--text-secondary);
}

.card-title {
  margin-top: 10px;
  font-size: 13px;
  color: var(--canvas-text);
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Empty state | 空状态 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
  color: var(--canvas-text-muted);
}

/* Transition | 过渡动画 */
.panel-slide-enter-active,
.panel-slide-leave-active {
  transition: opacity var(--duration-normal) var(--ease-enter), transform var(--duration-normal) var(--ease-enter);
}

.panel-slide-enter-from,
.panel-slide-leave-to {
  opacity: 0;
  transform: translateX(24px);
}

/* Scrollbar | 滚动条 */
.panel-content::-webkit-scrollbar {
  width: 6px;
}

.panel-content::-webkit-scrollbar-track {
  background: transparent;
}

.panel-content::-webkit-scrollbar-thumb {
  background: var(--canvas-border);
  border-radius: 3px;
}

.panel-content::-webkit-scrollbar-thumb:hover {
  background: var(--canvas-text-muted);
}

@media (max-width: 768px) {
  .workflow-panel {
    top: 0;
    width: 100%;
    border-left: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  .panel-slide-enter-active,
  .panel-slide-leave-active,
  .workflow-card,
  .card-cover,
  .tab-item { transition: none; }
}
</style>
