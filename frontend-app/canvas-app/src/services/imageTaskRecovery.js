import { getImageTaskStatus, pollImageTask } from '@/api/image'
import { listNodeTasks } from '@/api/facemini'
import { buildImageTaskRecoveryTargets } from '@/utils/imageTaskRecovery'

const activeRecoveries = new Map()

function applyTaskState({ task, nodeId, taskId, updateNode, isCurrent }) {
  if (!isCurrent()) return
  if (task.status === 'completed' && task.imageUrl) {
    updateNode(nodeId, {
      taskId,
      url: task.imageUrl,
      loading: false,
      error: null,
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
      error: task.error || '图片生成失败',
      updatedAt: Date.now()
    })
  }
}

function startRecovery({ projectId, nodeId, taskId, updateNode, isCurrent }) {
  const key = `${projectId}:${nodeId}:${taskId}`
  if (activeRecoveries.has(key)) return activeRecoveries.get(key)

  const recovery = pollImageTask(taskId, {
    onStatus: task => applyTaskState({ task, nodeId, taskId, updateNode, isCurrent })
  })
    .catch(error => {
      if (!isCurrent()) return
      updateNode(nodeId, {
        taskId,
        loading: false,
        error: error.message || '图片任务恢复失败',
        updatedAt: Date.now()
      })
    })
    .finally(() => activeRecoveries.delete(key))

  activeRecoveries.set(key, recovery)
  return recovery
}

export async function resumeProjectImageTasks({
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
    console.warn('[Canvas] 节点任务关联读取失败，将使用节点内 taskId 恢复:', error.message)
  }
  const targets = buildImageTaskRecoveryTargets({ nodeTasks, nodes, edges })

  for (const target of targets) {
    const node = nodes.find(item => item.id === target.nodeId)
    if (!node || (node.data?.url && !node.data?.loading)) continue

    updateNode(target.nodeId, {
      taskId: target.taskId,
      loading: true,
      error: null
    })

    try {
      const current = await getImageTaskStatus(target.taskId)
      applyTaskState({
        task: current,
        nodeId: target.nodeId,
        taskId: target.taskId,
        updateNode,
        isCurrent
      })

      if (['completed', 'failed'].includes(current.status)) continue
    } catch (error) {
      console.warn(`[Canvas] 图片任务 ${target.taskId} 首次状态读取失败，进入恢复轮询:`, error.message)
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
