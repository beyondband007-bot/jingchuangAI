<template>
  <!-- Home page | 首页 -->
  <div class="min-h-screen h-screen overflow-x-hidden overflow-y-auto bg-[var(--bg-primary)]">
    <!-- Header | 顶部导航 -->
    <AppHeader />

    <!-- Main content | 主要内容 -->
    <main class="canvas-home max-w-5xl mx-auto px-4 py-8 md:py-16">
      <!-- Welcome section | 欢迎区域 -->
      <section class="canvas-home__welcome text-center mb-12">
        <div class="flex items-center justify-center gap-4 mb-8">
          <img src="../assets/facemini-logo.svg" alt="Facemini Logo" class="w-12 h-12 md:w-12 md:h-12" />
          <h1 class="text-2xl md:text-4xl font-bold text-[var(--text-primary)]">欢迎来到 Facemini 无限画布</h1>
        </div>
        
        <!-- Input area | 输入区域 -->
        <div class="canvas-home__composer max-w-2xl mx-auto">
          <div class="bg-[var(--bg-secondary)] rounded-2xl border border-[var(--border-color)] p-4 shadow-sm">
            <textarea
              v-model="inputText"
              placeholder="输入你的创意，开始新项目"
              class="w-full bg-transparent resize-none outline-none text-[var(--text-primary)] placeholder:text-[var(--text-secondary)] min-h-[80px]"
              @keydown.enter.ctrl="handleCreateWithInput"
            />
            <div class="flex items-center justify-between mt-2">
              <div class="flex items-center gap-2">
                <!-- <button class="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
                  <n-icon :size="18"><AddOutline /></n-icon>
                </button>
                <button class="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors">
                  <n-icon :size="18"><ImageOutline /></n-icon>
                </button> -->
              </div>
              <div class="flex items-center gap-3">
                <button 
                  @click="handleCreateWithInput"
                  class="canvas-home__send-button"
                  aria-label="Create project"
                  :disabled="!inputText.trim()"
                >
                  <n-icon :size="18"><FlashOutline /></n-icon>
                </button>
              </div>
            </div>
          </div>
          
          <!-- Quick suggestions | 快捷建议 -->
          <div class="flex flex-wrap items-center justify-center gap-2 mt-4">
            <span class="text-sm text-[var(--text-secondary)]">推荐：</span>
            <button 
              v-for="tag in suggestions" 
              :key="tag"
              @click="inputText = tag"
              class="px-3 py-1.5 text-sm rounded-full bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-[var(--accent-color)] transition-colors"
            >
              {{ tag }}
            </button>
            <button class="canvas-home__icon-button" data-testid="canvas-refresh-suggestions" data-tooltip="换一批推荐" aria-label="换一批推荐" @click="refreshSuggestions">
              <n-icon :size="16"><RefreshOutline /></n-icon>
            </button>
          </div>
        </div>
      </section>

      <!-- My projects section | 我的项目区域 -->
      <section ref="projectsSection" class="canvas-home__projects">
        <div class="flex items-center justify-between mb-4">
          <h2 class="text-lg font-semibold text-[var(--text-primary)]">我的项目</h2>
          <button 
            @click="createNewProject"
            data-testid="canvas-create-project"
            class="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white transition-colors"
          >
            <n-icon :size="16"><AddOutline /></n-icon>
            新建项目
          </button>
        </div>
        
        <!-- Empty state | 空状态 -->
        <div v-if="projects.length === 0" class="text-center py-12 bg-[var(--bg-secondary)] rounded-xl border border-dashed border-[var(--border-color)]">
          <n-icon :size="48" class="text-[var(--text-secondary)] mb-4"><FolderOutline /></n-icon>
          <p class="text-[var(--text-secondary)] mb-4">还没有项目，创建一个开始吧</p>
          <button 
            @click="createNewProject"
            class="px-4 py-2 text-sm rounded-lg bg-[var(--accent-color)] hover:bg-[var(--accent-hover)] text-white transition-colors"
          >
            创建第一个项目
          </button>
        </div>
        
        <!-- Projects grid | 项目网格 -->
        <div v-else class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div 
            v-for="project in projects" 
            :key="project.id"
            class="group relative"
          >
            <!-- Project card | 项目卡片 -->
            <div 
              @click="openProject(project)"
              class="cursor-pointer"
            >
              <div 
                class="aspect-video rounded-xl overflow-hidden bg-[var(--bg-tertiary)] mb-2 border border-[var(--border-color)] relative"
                @mouseenter="handleThumbnailHover(project, true)"
                @mouseleave="handleThumbnailHover(project, false)"
              >
                <!-- Thumbnail or placeholder | 缩略图或占位 -->
                <template v-if="project.thumbnail">
                  <!-- Video thumbnail | 视频缩略图 -->
                  <video 
                    v-if="isVideoUrl(project.thumbnail)"
                    :ref="el => setVideoRef(project.id, el)"
                    :src="project.thumbnail"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    muted
                    loop
                    playsinline
                  />
                  <!-- Image thumbnail | 图片缩略图 -->
                  <img 
                    v-else
                    :src="project.thumbnail" 
                    :alt="project.name"
                    class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </template>
                <div v-else class="w-full h-full flex items-center justify-center">
                  <n-icon :size="32" class="text-[var(--text-secondary)]"><DocumentOutline /></n-icon>
                </div>
                
                <!-- Hover overlay | 悬浮遮罩 -->
                <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span class="text-white text-sm">打开项目</span>
                </div>
              </div>
              <p class="text-sm text-[var(--text-primary)] truncate">{{ project.name }}</p>
              <p class="text-xs text-[var(--text-secondary)]">{{ formatDate(project.updatedAt) }}</p>
            </div>
            
            <!-- Project actions | 项目操作 -->
            <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
              <n-dropdown :options="getProjectActions(project)" @select="(key) => handleProjectAction(key, project)" placement="bottom-end">
                <button 
                  @click.stop
                  class="canvas-home__icon-button canvas-home__project-menu-button"
                  data-tooltip="项目操作"
                  aria-label="项目操作"
                >
                  <n-icon :size="16"><EllipsisHorizontalOutline /></n-icon>
                </button>
              </n-dropdown>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- Left sidebar | 左侧边栏 -->
    <aside class="fixed left-4 top-1/2 -translate-y-1/2 hidden md:flex flex-col gap-2 p-2 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] shadow-sm">
      <button 
        @click="createNewProject"
        class="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
        data-tooltip="新建项目"
        aria-label="新建项目"
      >
        <n-icon :size="20"><DocumentOutline /></n-icon>
      </button>
      <button 
        @click="scrollToProjects"
        class="p-2 hover:bg-[var(--bg-tertiary)] rounded-lg transition-colors"
        data-tooltip="我的项目"
        aria-label="我的项目"
      >
        <n-icon :size="20"><FolderOutline /></n-icon>
      </button>
    </aside>

    <!-- Rename modal | 重命名弹窗 -->
    <n-modal v-model:show="showRenameModal" preset="dialog" title="重命名项目">
      <n-input v-model:value="renameValue" placeholder="请输入项目名称" />
      <template #action>
        <n-button @click="showRenameModal = false">取消</n-button>
        <n-button type="primary" @click="confirmRename">确定</n-button>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
/**
 * Home view component | 首页视图组件
 * Entry point with project list and creation input
 */
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NIcon, NDropdown, NModal, NInput, NButton, useDialog } from 'naive-ui'
import { 
  AddOutline, 
  ImageOutline, 
  FlashOutline,
  RefreshOutline,
  DocumentOutline,
  FolderOutline,
  EllipsisHorizontalOutline,
  CreateOutline,
  CopyOutline,
  TrashOutline
} from '@vicons/ionicons5'
import { 
  projects, 
  initProjectsStore, 
  createProject, 
  deleteProject, 
  duplicateProject, 
  renameProject 
} from '../stores/projects'
import AppHeader from '../components/AppHeader.vue'

const router = useRouter()
const dialog = useDialog()
// Video refs for hover play | 视频引用用于悬停播放
const videoRefs = new Map()

// Set video ref | 设置视频引用
const setVideoRef = (projectId, el) => {
  if (el) {
    videoRefs.set(projectId, el)
  } else {
    videoRefs.delete(projectId)
  }
}

// Handle thumbnail hover | 处理缩略图悬停
const handleThumbnailHover = (project, isHovering) => {
  if (!isVideoUrl(project.thumbnail)) return
  
  const video = videoRefs.get(project.id)
  if (!video) return
  
  if (isHovering) {
    video.play().catch(() => {
      // Ignore play errors (e.g., autoplay policy)
    })
  } else {
    video.pause()
    video.currentTime = 0 // Reset to start
  }
}

// Input state | 输入状态
const inputText = ref('')

// Rename modal state | 重命名弹窗状态
const showRenameModal = ref(false)
const renameValue = ref('')
const renameTargetId = ref(null)

// Keep a broader inspiration pool while presenting four compact suggestions at a time.
const SUGGESTION_BATCH_SIZE = 4
const suggestionPool = [
  '雨中魔法森林',
  '日式街头美食摄影',
  '瀑布水流飞溅',
  '雨天窗边的花语',
  '赛博朋克霓虹夜市',
  '清晨云海上的小屋',
  '复古胶片感海边旅行',
  '二次元角色设定图',
  '北欧极简客厅设计',
  '月球基地全景插画',
  '水墨山川与孤舟',
  '夏日果汁广告海报',
  '童话风森林小鹿',
  '未来城市空中花园',
  '咖啡馆里的橘猫',
  '电影感雨夜街景',
  '国潮龙纹礼盒设计',
  '深海发光水母群',
  '手作陶艺工作台',
  '雪山脚下的木屋',
  '治愈系植物角落',
  '蒸汽朋克机械鸟',
  '宇航员漫步花田',
  '日落时分的公路旅行',
  '敦煌飞天壁画复原',
  '极光下的玻璃小屋',
  '未来感运动鞋海报',
  '热带雨林树屋餐厅',
  '黑胶唱片封面设计',
  '樱花季校园电影镜头',
  '沙漠中的蓝色巴士',
  '法式甜品橱窗陈列',
  '中世纪城堡晨雾',
  '迷你盆景微距摄影',
  '机械臂绘制水彩画',
  '新中式茶室空间设计',
  '夜空下的露营篝火',
  '冰川湖畔野餐场景',
  '轻奢香水产品静物',
  '城市天台爵士乐队',
  '像素风冒险游戏场景',
  '海底图书馆奇幻插画',
  '复古旅行明信片拼贴',
  '彩色玻璃窗下的猫咪',
  '未来医疗实验室',
  '冬日市集暖光人像',
  '海岛婚礼仪式布置',
  '手绘植物百科全图'
]

const shuffle = (items) => [...items].sort(() => Math.random() - 0.5)
const suggestions = ref(shuffle(suggestionPool).slice(0, SUGGESTION_BATCH_SIZE))

const refreshSuggestions = () => {
  const current = new Set(suggestions.value)
  const candidates = suggestionPool.filter((item) => !current.has(item))
  suggestions.value = shuffle(candidates).slice(0, SUGGESTION_BATCH_SIZE)
}

// Format date | 格式化日期
const formatDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  const now = new Date()
  const diff = now - d
  
  // Less than 1 minute | 小于1分钟
  if (diff < 60000) return '刚刚'
  // Less than 1 hour | 小于1小时
  if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`
  // Less than 1 day | 小于1天
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`
  // Less than 7 days | 小于7天
  if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`
  // Format as date | 格式化为日期
  return `${d.getMonth() + 1}/${d.getDate()}`
}

// Get project actions | 获取项目操作选项
const getProjectActions = (project) => [
  { label: '重命名', key: 'rename', icon: () => h(NIcon, null, { default: () => h(CreateOutline) }) },
  { label: '复制', key: 'duplicate', icon: () => h(NIcon, null, { default: () => h(CopyOutline) }) },
  { type: 'divider' },
  { label: '删除', key: 'delete', icon: () => h(NIcon, null, { default: () => h(TrashOutline) }) }
]

// Handle project action | 处理项目操作
const handleProjectAction = async (key, project) => {
  switch (key) {
    case 'rename':
      renameTargetId.value = project.id
      renameValue.value = project.name
      showRenameModal.value = true
      break
    case 'duplicate':
      const newId = await duplicateProject(project.id)
      if (newId) {
        window.$message?.success('项目已复制')
      }
      break
    case 'delete':
      dialog.warning({
        title: '删除项目',
        content: `确定要删除项目「${project.name}」吗？此操作不可恢复。`,
        positiveText: '删除',
        negativeText: '取消',
        onPositiveClick: async () => {
          await deleteProject(project.id)
          window.$message?.success('项目已删除')
        }
      })
      break
  }
}

// Confirm rename | 确认重命名
const confirmRename = async () => {
  if (renameTargetId.value && renameValue.value.trim()) {
    await renameProject(renameTargetId.value, renameValue.value.trim())
    window.$message?.success('已重命名')
  }
  showRenameModal.value = false
  renameTargetId.value = null
  renameValue.value = ''
}

// Check API key before navigation | 跳转前检查 API Key
const checkApiKeyAndNavigate = async (callback) => callback()

// Create new project | 创建新项目
const createNewProject = () => {
  checkApiKeyAndNavigate(async () => {
    const id = await createProject('未命名项目')
    router.push(`/canvas/${id}`)
  })
}

// Create project with input text | 使用输入文本创建项目
const handleCreateWithInput = () => {
  checkApiKeyAndNavigate(async () => {
    const name = inputText.value.trim() || '未命名项目'
    const id = await createProject(name)
    // Store the input text to be used as initial prompt
    sessionStorage.setItem('ai-canvas-initial-prompt', inputText.value.trim())
    inputText.value = ''
    router.push(`/canvas/${id}`)
  })
}

// Open existing project | 打开已有项目
const openProject = (project) => {
  checkApiKeyAndNavigate(() => {
    router.push(`/canvas/${project.id}`)
  })
}

// Check if URL is a video | 检查 URL 是否为视频
const isVideoUrl = (url) => {
  if (!url || typeof url !== 'string') return false
  const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi', '.mkv']
  return videoExtensions.some(ext => url.toLowerCase().includes(ext))
}

// Import h for render functions | 导入 h 用于渲染函数
import { h } from 'vue'

// Projects section ref | 项目区域引用
const projectsSection = ref(null)

// Scroll to projects section | 滚动到项目区域
const scrollToProjects = () => {
  if (projectsSection.value) {
    projectsSection.value.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

// Initialize projects store on mount | 挂载时初始化项目存储
onMounted(async () => {
  await initProjectsStore()
})
</script>

<style scoped>
.canvas-home {
  font-family: "PingFang SC";
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-default);
  line-height: var(--line-height-default);
}

.canvas-home__welcome h1 {
  color: var(--text-primary);
  font-size: var(--title-page-size);
  font-weight: var(--font-weight-default);
  line-height: var(--line-height-tight);
  letter-spacing: 0;
}

.canvas-home__composer textarea {
  border: 0;
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-default);
  line-height: var(--line-height-default);
}

.canvas-home__composer textarea:focus,
.canvas-home__composer textarea:focus-visible {
  border-color: transparent;
  outline: 0;
  box-shadow: none;
}

.canvas-home__composer > div:last-child {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-default);
}

.canvas-home__composer > div:last-child button:not(.canvas-home__send-button) {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-default);
}

.canvas-home__send-button {
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

.canvas-home__send-button:hover,
.canvas-home__send-button:focus-visible {
  color: var(--color-white);
  background: var(--brand-primary-strong);
  box-shadow: var(--shadow-brand);
}

.canvas-home__send-button:active {
  transform: translateY(1px);
}

.canvas-home__send-button:disabled {
  color: var(--text-faint);
  background: var(--state-disabled);
  border-color: var(--app-border);
  box-shadow: none;
  cursor: not-allowed;
}

.canvas-home__icon-button {
  display: inline-flex;
  width: 34px;
  height: 34px;
  align-items: center;
  justify-content: center;
  padding: 0;
  color: var(--text-secondary);
  background: transparent;
  border: 0;
  border-radius: var(--radius-control);
  line-height: 1;
  transition: color var(--duration-normal) var(--ease-standard), background var(--duration-normal) var(--ease-standard);
}

.canvas-home__icon-button:hover,
.canvas-home__icon-button:focus-visible {
  color: var(--brand-primary);
  background: var(--state-hover);
}

.canvas-home__project-menu-button {
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid var(--app-border);
  box-shadow: var(--shadow-control);
}

.canvas-home__projects h2 {
  color: var(--text-primary);
  font-size: var(--title-section-size);
  font-weight: var(--font-weight-default);
  line-height: 1.35;
  letter-spacing: 0;
}

.canvas-home__projects p {
  font-weight: var(--font-weight-default);
}

.canvas-home__projects > div:first-child > button,
.canvas-home__projects > div:nth-child(2) > button {
  min-height: 34px;
  color: var(--color-white);
  background: var(--fm-brand, var(--brand-primary));
  border: 1px solid transparent;
  border-radius: var(--radius-control);
  box-shadow: var(--shadow-brand);
  font-size: var(--font-size-md);
  font-weight: var(--font-weight-default);
}

.canvas-home__projects > div:first-child > button:hover,
.canvas-home__projects > div:first-child > button:focus-visible,
.canvas-home__projects > div:nth-child(2) > button:hover,
.canvas-home__projects > div:nth-child(2) > button:focus-visible {
  color: var(--color-white);
  background: var(--brand-primary-strong);
}

@media (max-width: 640px) {
  .canvas-home__welcome h1 {
    font-size: var(--font-size-section);
  }
}
</style>
