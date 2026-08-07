export function getVideoNodeDisplayState(data = {}) {
  if (data.error) return 'error'
  if (data.url) return 'video'
  if (data.taskId || data.loading) return 'loading'
  return 'empty'
}
