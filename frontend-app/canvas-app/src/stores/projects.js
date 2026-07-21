import { computed, ref } from 'vue'
import { faceminiRequest } from '@/api/facemini'

export const projects = ref([])
export const currentProjectId = ref(null)
export const projectsLoading = ref(false)
export const saveState = ref('saved')
export const saveError = ref('')

const saveTimers = new Map()
const pendingSaves = new Map()
let initialized = false

export const currentProject = computed(() =>
  projects.value.find(project => project.id === currentProjectId.value) || null
)

function mapProject(project) {
  return {
    ...project,
    thumbnail: project.thumbnailUrl || '',
    createdAt: new Date(project.createdAt),
    updatedAt: new Date(project.updatedAt),
    canvasData: project.graph
      ? { nodes: project.graph.nodes || [], edges: project.graph.edges || [], viewport: project.viewport }
      : project.canvasData
  }
}

function cleanValue(value) {
  if (typeof value === 'string' && value.startsWith('data:')) return ''
  if (Array.isArray(value)) return value.map(cleanValue)
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cleanValue(item)]))
  }
  return value
}

function cleanGraph(canvasData = {}) {
  return cleanValue({
    nodes: canvasData.nodes || [],
    edges: canvasData.edges || []
  })
}

function replaceProject(project) {
  const mapped = mapProject(project)
  const index = projects.value.findIndex(item => item.id === mapped.id)
  if (index >= 0) projects.value.splice(index, 1, mapped)
  else projects.value.unshift(mapped)
  return mapped
}

export async function loadProjects({ force = false } = {}) {
  if (initialized && !force) return projects.value
  projectsLoading.value = true
  try {
    projects.value = (await faceminiRequest('/canvas/projects')).map(mapProject)
    initialized = true
    return projects.value
  } finally {
    projectsLoading.value = false
  }
}

export async function ensureProjectLoaded(id) {
  const existing = projects.value.find(project => project.id === id && project.canvasData)
  if (existing) return existing
  const project = await faceminiRequest(`/canvas/projects/${encodeURIComponent(id)}`)
  return replaceProject(project)
}

export async function createProject(name = '未命名项目') {
  const project = await faceminiRequest('/canvas/projects', {
    method: 'POST',
    body: JSON.stringify({ name })
  })
  replaceProject(project)
  return project.id
}

export async function updateProject(id, data) {
  const payload = {}
  if (Object.prototype.hasOwnProperty.call(data, 'name')) payload.name = data.name
  if (Object.prototype.hasOwnProperty.call(data, 'thumbnail')) payload.thumbnailUrl = data.thumbnail || ''
  if (!Object.keys(payload).length) return true
  replaceProject(await faceminiRequest(`/canvas/projects/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  }))
  return true
}

async function persistProject(id) {
  const project = projects.value.find(item => item.id === id)
  if (!project?.canvasData) return false
  saveState.value = 'saving'
  saveError.value = ''
  try {
    const saved = await faceminiRequest(`/canvas/projects/${encodeURIComponent(id)}/graph`, {
      method: 'PUT',
      body: JSON.stringify({
        revision: project.revision,
        graph: cleanGraph(project.canvasData),
        viewport: project.canvasData.viewport || { x: 100, y: 50, zoom: 0.8 },
        thumbnailUrl: String(project.thumbnail || '').startsWith('data:') ? '' : (project.thumbnail || '')
      })
    })
    replaceProject(saved)
    saveState.value = 'saved'
    return true
  } catch (error) {
    saveState.value = error.status === 409 ? 'conflict' : 'error'
    saveError.value = error.status === 409
      ? '此画布已在其他窗口更新，请刷新后继续。'
      : error.message
    window.$message?.error(saveError.value)
    throw error
  } finally {
    pendingSaves.delete(id)
  }
}

export function updateProjectCanvas(id, canvasData) {
  const project = projects.value.find(item => item.id === id)
  if (!project) return false
  project.canvasData = { ...(project.canvasData || {}), ...canvasData }
  project.updatedAt = new Date()
  if (canvasData.nodes) {
    const latestMedia = [...canvasData.nodes]
      .filter(node => ['image', 'video'].includes(node.type) && node.data?.url && !String(node.data.url).startsWith('data:'))
      .sort((a, b) => Number(b.data?.updatedAt || b.data?.createdAt || 0) - Number(a.data?.updatedAt || a.data?.createdAt || 0))[0]
    if (latestMedia) project.thumbnail = latestMedia.data.thumbnail || latestMedia.data.url
  }
  saveState.value = 'pending'
  clearTimeout(saveTimers.get(id))
  saveTimers.set(id, setTimeout(() => {
    const promise = persistProject(id)
    pendingSaves.set(id, promise)
    promise.catch(() => {})
  }, 1500))
  return true
}

export async function flushProjectSave(id) {
  if (!id) return
  clearTimeout(saveTimers.get(id))
  saveTimers.delete(id)
  if (pendingSaves.has(id)) return pendingSaves.get(id)
  if (saveState.value === 'pending') return persistProject(id)
}

export function getProjectCanvas(id) {
  return projects.value.find(project => project.id === id)?.canvasData || null
}

export async function deleteProject(id) {
  await flushProjectSave(id).catch(() => {})
  await faceminiRequest(`/canvas/projects/${encodeURIComponent(id)}`, { method: 'DELETE' })
  projects.value = projects.value.filter(project => project.id !== id)
}

export async function duplicateProject(id) {
  await flushProjectSave(id)
  const project = await faceminiRequest(`/canvas/projects/${encodeURIComponent(id)}/duplicate`, { method: 'POST' })
  replaceProject(project)
  return project.id
}

export const renameProject = (id, name) => updateProject(id, { name })
export const updateProjectThumbnail = (id, thumbnail) => updateProject(id, { thumbnail })

export const getSortedProjects = (sortBy = 'updatedAt', order = 'desc') => computed(() =>
  [...projects.value].sort((a, b) => {
    const first = a[sortBy] instanceof Date ? a[sortBy].getTime() : String(a[sortBy] || '').toLowerCase()
    const second = b[sortBy] instanceof Date ? b[sortBy].getTime() : String(b[sortBy] || '').toLowerCase()
    return order === 'asc' ? (first > second ? 1 : -1) : (first < second ? 1 : -1)
  })
)

export const initProjectsStore = () => loadProjects()
export const saveProjects = () => flushProjectSave(currentProjectId.value)

if (typeof window !== 'undefined') {
  window.__faceminiCanvasProjects = { projects, loadProjects, createProject, deleteProject, flushProjectSave }
}
