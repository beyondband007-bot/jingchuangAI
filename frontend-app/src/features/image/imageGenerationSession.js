const emptyOptions = { models: [], ratios: [], qualities: [], counts: [] };
const imageGenerationSessionKey = "jingchuang:image-generation-session";
const imageGenerationThreadsKey = "jingchuang:image-generation-threads";

export function normalizeImageOptions(value) {
  return {
    ...emptyOptions,
    ...(value && typeof value === "object" && !Array.isArray(value) ? value : {}),
    models: Array.isArray(value?.models) ? value.models : [],
    ratios: Array.isArray(value?.ratios) ? value.ratios : [],
    qualities: Array.isArray(value?.qualities) ? value.qualities : [],
    counts: Array.isArray(value?.counts) ? value.counts : [],
  };
}

export function normalizeTaskList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.tasks)) return value.tasks;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

export function readImageGenerationSession() {
  try {
    const cached = window.sessionStorage.getItem(imageGenerationSessionKey);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

export function writeImageGenerationSession(next) {
  try {
    window.sessionStorage.setItem(imageGenerationSessionKey, JSON.stringify(next));
  } catch {
    // Session storage can be unavailable in strict privacy contexts.
  }
}

export function clearImageGenerationSession() {
  try {
    window.sessionStorage.removeItem(imageGenerationSessionKey);
  } catch {
    // Ignore storage errors; the in-memory state still drives the current view.
  }
}

export function createImageThreadId() {
  const uuid = window.crypto?.randomUUID?.();
  return uuid
    ? `image-thread-${uuid}`
    : `image-thread-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getTaskReferenceUrl(task) {
  return (
    task?.referenceImageUrl ||
    task?.referenceImage?.url ||
    task?.referenceUrl ||
    task?.sourceImageUrl ||
    null
  );
}

export function getTaskThreadId(task) {
  return typeof task?.threadId === "string" && task.threadId.trim()
    ? task.threadId.trim()
    : null;
}

function readImageGenerationThreads() {
  try {
    const cached = window.sessionStorage.getItem(imageGenerationThreadsKey);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

export function writeImageGenerationThread(ids) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return uniqueIds;
  try {
    const threads = readImageGenerationThreads();
    uniqueIds.forEach((id) => {
      threads[id] = uniqueIds;
    });
    window.sessionStorage.setItem(imageGenerationThreadsKey, JSON.stringify(threads));
  } catch {
    // Ignore storage errors; the in-memory state still drives the current view.
  }
  return uniqueIds;
}

export function resolveThreadIdFromTaskIds(ids, tasks) {
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  for (const id of ids) {
    const threadId = getTaskThreadId(taskMap.get(id));
    if (threadId) return threadId;
  }
  return null;
}

export function resolveImageThreadIds(taskId, tasks) {
  if (!taskId) return [];
  const stored = readImageGenerationThreads();
  const storedIds = Array.isArray(stored[taskId]) ? stored[taskId] : [];
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const selectedTask = taskMap.get(taskId);
  const selectedThreadId = getTaskThreadId(selectedTask);
  const imageToId = new Map(
    tasks.filter((task) => task.image).map((task) => [task.image, task.id]),
  );
  const related = new Set(storedIds.filter((id) => taskMap.has(id)));
  related.add(taskId);
  if (selectedThreadId) {
    tasks.forEach((task) => {
      if (getTaskThreadId(task) === selectedThreadId) related.add(task.id);
    });
  }

  let changed = true;
  while (changed) {
    changed = false;
    tasks.forEach((task) => {
      const referenceUrl = getTaskReferenceUrl(task);
      const parentId = referenceUrl ? imageToId.get(referenceUrl) : null;
      if (parentId && related.has(parentId) && !related.has(task.id)) {
        related.add(task.id);
        changed = true;
      }
      if (parentId && related.has(task.id) && !related.has(parentId)) {
        related.add(parentId);
        changed = true;
      }
    });
  }

  const ids = [...related];
  if (storedIds.length) {
    const storedOrder = storedIds.filter((id) => related.has(id));
    ids.forEach((id) => {
      if (!storedOrder.includes(id)) storedOrder.push(id);
    });
    return storedOrder;
  }
  return tasks
    .filter((task) => ids.includes(task.id))
    .map((task) => task.id)
    .reverse();
}

export function buildImageHistoryThreads(tasks) {
  const stored = readImageGenerationThreads();
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const visited = new Set();
  const threads = [];

  tasks.forEach((task) => {
    if (visited.has(task.id)) return;
    const storedIds = Array.isArray(stored[task.id]) ? stored[task.id] : [];
    const threadId = getTaskThreadId(task);
    const ids = threadId
      ? tasks
          .filter((item) => getTaskThreadId(item) === threadId)
          .map((item) => item.id)
          .reverse()
      : storedIds.length
        ? storedIds.filter((id) => taskMap.has(id))
        : resolveImageThreadIds(task.id, tasks);
    const uniqueIds = [...new Set(ids.length ? ids : [task.id])];
    uniqueIds.forEach((id) => visited.add(id));
    const threadTasks = uniqueIds.map((id) => taskMap.get(id)).filter(Boolean);
    if (!threadTasks.length) return;
    const latestTask =
      [...threadTasks]
        .reverse()
        .find((item) => item.image || item.status !== "completed") ||
      threadTasks[threadTasks.length - 1];
    threads.push({
      id: uniqueIds[uniqueIds.length - 1],
      ids: uniqueIds,
      latestTask,
      count: uniqueIds.length,
    });
  });

  return threads;
}

export { emptyOptions };
