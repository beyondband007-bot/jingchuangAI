import assert from 'node:assert/strict'
import test from 'node:test'
import {
  resolveVideoImageSources,
  resolveVideoRequestDuration
} from '../src/utils/videoRequest.js'

test('preserves supported duration selections in video task requests', () => {
  for (const duration of [4, 5, 10, 15]) {
    assert.equal(resolveVideoRequestDuration({ duration }), duration)
  }
})

test('keeps legacy dur compatibility for saved canvas projects', () => {
  assert.equal(resolveVideoRequestDuration({ dur: 10 }), 10)
})

test('prefers the normalized duration field over legacy dur', () => {
  assert.equal(resolveVideoRequestDuration({ duration: 15, dur: 5 }), 15)
})

test('omits invalid duration values instead of forwarding them', () => {
  assert.equal(resolveVideoRequestDuration({}), null)
  assert.equal(resolveVideoRequestDuration({ duration: 0 }), null)
  assert.equal(resolveVideoRequestDuration({ duration: 'invalid' }), null)
})

test('keeps first frame, last frame, and reference images in separate request roles', () => {
  assert.deepEqual(resolveVideoImageSources({
    first_frame_image: { url: '/media/first.png' },
    last_frame_image: '/media/last.png',
    reference_image: '/media/reference-1.png',
    images: [
      { url: '/media/reference-2.png' },
      '/media/reference-1.png'
    ]
  }), {
    firstFrameImage: '/media/first.png',
    lastFrameImage: '/media/last.png',
    referenceImages: [
      '/media/reference-1.png',
      '/media/reference-2.png'
    ]
  })
})
