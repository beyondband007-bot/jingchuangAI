import { getVideoTaskStatus, pollVideoTask } from '@/api/video'
import { listNodeTasks } from '@/api/facemini'
import { buildVideoTaskRecoveryTargets } from '@/utils/videoTaskRecovery'

const activeRecoveries = new Map()

function applyTaskState({ task, nodeId, taskId, updateNode, isCurrent }) {
  if (!isCurrent()) return
  if (task.status === 'completed' && task.url) {
    updateNode(nodeId, {
      taskId,
      url: task.url,
      loading: false,
      recoveringTask: false,
      error: null,
      errorDetail: null,
      model: task.modelKey || task.model,
      inputChanged: false,
      updatedAt: Date.now()
    })
    return
  }
  if (task.status === 'failed') {
    updateNode(nodeId, {
      taskId,
      loading: false,
      recoveringTask: false,
      error: task.error || '视频生成失败',
      errorDetail: task.errorDetail || null,
      updatedAt: Date.now()
    })
  }
}

function startRecovery({ projectId, nodeId, taskId, updateNode, isCurrent }) {
  const key = `${projectId}:${nodeId}:${taskId}`
  if (activeRecoveries.has(key)) return activeRecoveries.get(key)

  const recovery = pollVideoTask(taskId, {
    onStatus: task => applyTaskState({ task, nodeId, taskId, updateNode, isCurrent })
  })
    .then(task => applyTaskState({ task, nodeId, taskId, updateNode, isCurrent }))
    .catch(error => {
      if (!isCurrent()) return
      updateNode(nodeId, {
        taskId,
        loading: false,
        recoveringTask: false,
        error: error.message || '视频任务恢复失败',
        errorDetail: error.errorDetail || error.body?.errorDetail || null,
        updatedAt: Date.now()
      })
    })
    .finally(() => activeRecoveries.delete(key))

  activeRecoveries.set(key, recovery)
  return recovery
}

export async function resumeProjectVideoTasks({
  projectId,
  nodes,
  edges,
  updateNode,
  isCurrent
}) {
  if (!projectId) return []
  let nodeTasks = []
  try {
    nodeTasks = await listNodeTasks(projectId)
  } catch (error) {
    console.warn('[Canvas] 视频节点任务关联读取失败，将使用节点内 taskId 恢复:', error.message)
  }
  const targets = buildVideoTaskRecoveryTargets({ nodeTasks, nodes, edges })

  for (const target of targets) {
    const node = nodes.find(item => item.id === target.nodeId)
    if (!node) continue
    if (node.data?.url && !node.data?.loading) {
      if (String(node.data?.taskId || '') !== target.taskId) {
        updateNode(target.nodeId, { taskId: target.taskId })
      }
      continue
    }

    updateNode(target.nodeId, {
      taskId: target.taskId,
      loading: true,
      recoveringTask: true,
      error: null,
      errorDetail: null
    })

    try {
      const current = await getVideoTaskStatus(target.taskId)
      applyTaskState({
        task: current,
        nodeId: target.nodeId,
        taskId: target.taskId,
        updateNode,
        isCurrent
      })

      if (['completed', 'failed'].includes(current.status)) continue
    } catch (error) {
      if ([401, 403, 404].includes(error.status)) {
        updateNode(target.nodeId, {
          taskId: target.taskId,
          loading: false,
          recoveringTask: false,
          error: error.message || '视频任务不存在',
          updatedAt: Date.now()
        })
        continue
      }
      console.warn(`[Canvas] 视频任务 ${target.taskId} 首次状态读取失败，进入恢复轮询:`, error.message)
    }

    if (isCurrent()) {
      startRecovery({
        projectId,
        nodeId: target.nodeId,
        taskId: target.taskId,
        updateNode,
        isCurrent
      })
    }
  }

  return targets
}
