import {
  createTask as createImageTask,
  deleteTask as deleteImageTask,
  getModels as getImageModels,
  getTask as getImageTask,
  listTasks as listImageTasks,
  toggleFavorite as toggleImageFavorite
} from "../image/image.service.js";

const ARTICLE_SOURCE = "article";
const ARTICLE_PROMPT_MARKER = "爆款图文设计";

function isArticleTask(task) {
  return task?.source === ARTICLE_SOURCE || task?.prompt?.includes(ARTICLE_PROMPT_MARKER);
}

function ensureArticleSource(task) {
  return task ? { ...task, source: ARTICLE_SOURCE } : task;
}

export async function getModels() {
  return getImageModels();
}

export async function listTasks({ filter = "all" } = {}) {
  const tasks = await listImageTasks({ filter });
  return tasks.filter(isArticleTask).map(ensureArticleSource);
}

export async function getTask(id) {
  const task = await getImageTask(id);
  return isArticleTask(task) ? ensureArticleSource(task) : null;
}

export async function createTask(payload) {
  const task = await createImageTask({
    ...payload,
    source: ARTICLE_SOURCE
  });
  return ensureArticleSource(task);
}

export async function toggleFavorite(id) {
  const task = await getTask(id);
  if (!task) return null;
  return ensureArticleSource(await toggleImageFavorite(id));
}

export async function deleteTask(id) {
  const task = await getTask(id);
  if (!task) return { ok: false };
  return deleteImageTask(id);
}
