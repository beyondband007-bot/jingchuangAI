function normalizeTaskId(value) {
  const taskId = String(value || '').trim()
  return taskId || null
}

function findLinkedVideoNodeId(nodeTask, nodes, edges) {
  const linkedNode = nodes.find(node => node.id === nodeTask.nodeId)
  if (linkedNode?.type === 'video') return linkedNode.id

  const connectedVideos = edges
    .filter(edge => edge.source === nodeTask.nodeId)
    .map(edge => nodes.find(node => node.id === edge.target))
    .filter(node => node?.type === 'video')

  const exactTaskNode = connectedVideos.find(
    node => normalizeTaskId(node.data?.taskId) === normalizeTaskId(nodeTask.taskId)
  )
  if (exactTaskNode) return exactTaskNode.id

  const pendingNode = connectedVideos.find(node => node.data?.loading && !node.data?.url)
  return pendingNode?.id || connectedVideos[0]?.id || null
}

export function buildVideoTaskRecoveryTargets({ nodeTasks = [], nodes = [], edges = [] } = {}) {
  const targets = new Map()

  for (const nodeTask of nodeTasks) {
    if (nodeTask?.taskType !== 'video') continue
    const taskId = normalizeTaskId(nodeTask.taskId)
    if (!taskId) continue
    const nodeId = findLinkedVideoNodeId(nodeTask, nodes, edges)
    if (!nodeId) continue
    targets.set(nodeId, {
      nodeId,
      taskId,
      inputHash: String(nodeTask.inputHash || ''),
      associationId: Number(nodeTask.id || 0)
    })
  }

  for (const node of nodes) {
    if (node?.type !== 'video') continue
    const taskId = normalizeTaskId(node.data?.taskId)
    if (!taskId || targets.has(node.id)) continue
    targets.set(node.id, {
      nodeId: node.id,
      taskId,
      inputHash: String(node.data?.inputHash || ''),
      associationId: 0
    })
  }

  return [...targets.values()]
}
