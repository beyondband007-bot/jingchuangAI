export function normalizeVideoError(value) {
  const body = value?.body || value || {}
  const detail = body.errorDetail || value?.errorDetail || {}
  const nestedError = body.error
  const message =
    detail.message ||
    nestedError?.message ||
    (typeof nestedError === 'string' ? nestedError : '') ||
    body.message ||
    value?.message ||
    '视频生成失败'

  return {
    code: detail.code || body.code || value?.code || 'VIDEO_GENERATION_FAILED',
    message,
    stage: detail.stage || null,
    referenceType: detail.referenceType || null,
    referenceIndex: detail.referenceIndex || null,
    requestId: detail.requestId || null,
    refunded: Boolean(detail.refunded),
    points: Number(detail.points || 0)
  }
}

export function createVideoError(value) {
  const detail = normalizeVideoError(value)
  const error = new Error(detail.message)
  error.code = detail.code
  error.errorDetail = detail
  error.body = value?.body || value
  return error
}

export function getVideoErrorTitle(detail = {}) {
  if (detail.code === 'VIDEO_PROMPT_CONTENT_REJECTED') return '提示词审核未通过'
  if (detail.code === 'VIDEO_REFERENCE_PRIVACY_REJECTED') return '参考素材隐私审核未通过'
  if (detail.code === 'VIDEO_REFERENCE_CONTENT_REJECTED') return '参考素材安全审核未通过'
  if (detail.code === 'VIDEO_REFERENCE_UPLOAD_FAILED') return '参考素材上传失败'
  if (detail.code === 'VIDEO_REFERENCE_URL_UNREACHABLE' || detail.code === 'VIDEO_REFERENCE_DOWNLOAD_FAILED') {
    return '参考素材读取失败'
  }
  return '视频生成失败'
}
