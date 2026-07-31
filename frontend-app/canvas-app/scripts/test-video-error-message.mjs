import assert from 'node:assert/strict'
import test from 'node:test'
import { createVideoError, getVideoErrorTitle, normalizeVideoError } from '../src/utils/videoError.js'

test('keeps a legacy string error visible', () => {
  const detail = normalizeVideoError({
    status: 'failed',
    error: 'Seedance 无法下载第1张参考图'
  })
  assert.equal(detail.message, 'Seedance 无法下载第1张参考图')
})

test('uses structured error details and refund metadata', () => {
  const error = createVideoError({
    status: 'failed',
    error: 'fallback',
    errorDetail: {
      code: 'VIDEO_REFERENCE_DOWNLOAD_FAILED',
      message: 'Seedance 无法下载第2张参考图，1200积分已退回。',
      referenceIndex: 2,
      requestId: 'request-123',
      refunded: true,
      points: 1200
    }
  })
  assert.equal(error.message, 'Seedance 无法下载第2张参考图，1200积分已退回。')
  assert.equal(error.errorDetail.referenceIndex, 2)
  assert.equal(error.errorDetail.requestId, 'request-123')
  assert.equal(error.errorDetail.refunded, true)
})

test('labels prompt moderation separately from reference image moderation', () => {
  const detail = normalizeVideoError({
    errorDetail: {
      code: 'VIDEO_PROMPT_CONTENT_REJECTED',
      message: '提示词未通过 Seedance 文本安全审核',
      refunded: true,
      points: 1800
    }
  })
  assert.equal(getVideoErrorTitle(detail), '提示词审核未通过')
  assert.equal(detail.referenceIndex, null)
})
