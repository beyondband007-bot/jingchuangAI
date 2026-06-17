import {
  createTask as createImageTask,
  deleteTask as deleteImageTask,
  getModels as getImageModels,
  getTask as getImageTask,
  listTasks as listImageTasks,
  toggleFavorite as toggleImageFavorite,
} from '../image/image.service.js'

const ARTICLE_SOURCE = 'article'
const ARTICLE_PROMPT_MARKER = '爆款图文设计'

function isArticleTask(task) {
  return (
    task?.source === ARTICLE_SOURCE ||
    task?.prompt?.includes(ARTICLE_PROMPT_MARKER)
  )
}

function ensureArticleSource(task) {
  return task ? { ...task, source: ARTICLE_SOURCE } : task
}

export async function getModels() {
  return getImageModels()
}

export async function listTasks({ userId, filter = 'all' } = {}) {
  const tasks = await listImageTasks({ userId, filter })
  return tasks.filter(isArticleTask).map(ensureArticleSource)
}

export async function getTask(id, userId) {
  const task = await getImageTask(id, userId)
  return isArticleTask(task) ? ensureArticleSource(task) : null
}

export async function createTask(payload, userId) {
  const task = await createImageTask(
    {
      ...payload,
      source: ARTICLE_SOURCE,
    },
    userId,
  )
  return ensureArticleSource(task)
}

export async function toggleFavorite(id, userId) {
  const task = await getTask(id, userId)
  if (!task) return null
  return ensureArticleSource(await toggleImageFavorite(id, userId))
}

export async function deleteTask(id, userId) {
  const task = await getTask(id, userId)
  if (!task) return { ok: false }
  return deleteImageTask(id, userId)
}
