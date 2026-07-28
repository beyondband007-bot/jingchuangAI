function normalizeTaskId(value) {
  const taskId = String(value || '').trim()
  return taskId || null
}

function findLinkedImageNodeId(nodeTask, nodes, edges) {
  const linkedNode = nodes.find(node => node.id === nodeTask.nodeId)
  if (linkedNode?.type === 'image') return linkedNode.id

  const connectedImages = edges
    .filter(edge => edge.source === nodeTask.nodeId)
    .map(edge => nodes.find(node => node.id === edge.target))
    .filter(node => node?.type === 'image')

  const exactTaskNode = connectedImages.find(
    node => normalizeTaskId(node.data?.taskId) === normalizeTaskId(nodeTask.taskId)
  )
  if (exactTaskNode) return exactTaskNode.id

  const pendingNode = connectedImages.find(node => node.data?.loading && !node.data?.url)
  return pendingNode?.id || connectedImages[0]?.id || null
}

export function buildImageTaskRecoveryTargets({ nodeTasks = [], nodes = [], edges = [] } = {}) {
  const targets = new Map()

  for (const nodeTask of nodeTasks) {
    if (nodeTask?.taskType !== 'image') continue
    const taskId = normalizeTaskId(nodeTask.taskId)
    if (!taskId) continue
    const nodeId = findLinkedImageNodeId(nodeTask, nodes, edges)
    if (!nodeId) continue
    targets.set(nodeId, {
      nodeId,
      taskId,
      inputHash: String(nodeTask.inputHash || ''),
      associationId: Number(nodeTask.id || 0)
    })
  }

  for (const node of nodes) {
    if (node?.type !== 'image') continue
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
