const MEDIA_TYPES = new Set(['image', 'video', 'audio'])

function getReferenceLabel(type, index) {
  if (type === 'video') return `参考视频${index}`
  if (type === 'audio') return `参考音频${index}`
  return `参考图${index}`
}

export function resolvePromptMediaMentions(content = '', connectedMedia = []) {
  const mediaById = new Map(
    connectedMedia
      .filter(item => item?.nodeId && MEDIA_TYPES.has(item.type) && item.url)
      .map(item => [item.nodeId, item])
  )
  const groups = {
    image: [],
    video: [],
    audio: []
  }

  const resolvedContent = String(content || '').replace(
    /@\[([^\]|]+)(?:\|([^\]]+))?\]/g,
    (rawMention, nodeId, storedLabel = '') => {
      const media = mediaById.get(nodeId)
      if (!media) return storedLabel || ''

      const group = groups[media.type]
      let index = group.findIndex(item => item.nodeId === nodeId)
      if (index < 0) {
        group.push(media)
        index = group.length - 1
      }
      return getReferenceLabel(media.type, index + 1)
    }
  )

  return {
    resolvedContent,
    imageMentions: groups.image,
    videoMentions: groups.video,
    audioMentions: groups.audio
  }
}

export function orderReferenceImagesByMentions(referenceImages = [], imageMentions = []) {
  const ordered = []
  const seen = new Set()
  for (const item of [...imageMentions, ...referenceImages]) {
    const url = item?.url || item
    if (!url || seen.has(url)) continue
    seen.add(url)
    ordered.push(url)
  }
  return ordered
}
