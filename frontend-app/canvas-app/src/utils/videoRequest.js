export function resolveVideoRequestDuration(params = {}) {
  const duration = Number(params.duration ?? params.dur)
  return Number.isFinite(duration) && duration > 0 ? duration : null
}

function getMediaSource(value) {
  return String(value?.url || value || '').trim()
}

function uniqueMediaSources(values = []) {
  return [...new Set(values.map(getMediaSource).filter(Boolean))]
}

export function resolveVideoImageSources(data = {}) {
  const firstFrameImage = getMediaSource(data.first_frame_image)
  const lastFrameImage = getMediaSource(data.last_frame_image)
  const referenceImages = uniqueMediaSources([
    data.reference_image,
    ...(Array.isArray(data.images) ? data.images : [])
  ])

  return {
    firstFrameImage,
    lastFrameImage,
    referenceImages
  }
}
