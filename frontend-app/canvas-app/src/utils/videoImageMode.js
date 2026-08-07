export function resolveVideoImageModeInputs(imageSources = [], firstLastFrameMode = false) {
  const sources = imageSources.filter(Boolean)
  if (firstLastFrameMode) {
    return {
      firstFrameImage: sources[0] || '',
      lastFrameImage: sources[1] || '',
      referenceImages: []
    }
  }

  return {
    firstFrameImage: '',
    lastFrameImage: '',
    referenceImages: sources
  }
}

export function canEnableFirstLastFrameMode(connectedImageCount = 0) {
  return connectedImageCount <= 2
}

export function canConnectVideoImage(connectedImageCount = 0, firstLastFrameMode = false) {
  return !firstLastFrameMode || connectedImageCount < 2
}
