import assert from 'node:assert/strict'
import test from 'node:test'
import {
  canConnectVideoImage,
  canEnableFirstLastFrameMode,
  resolveVideoImageModeInputs
} from '../src/utils/videoImageMode.js'

test('uses every connected image as a reference image by default', () => {
  assert.deepEqual(resolveVideoImageModeInputs(['a', 'b', 'c'], false), {
    firstFrameImage: '',
    lastFrameImage: '',
    referenceImages: ['a', 'b', 'c']
  })
})

test('assigns the first two connected images to first and last frame mode', () => {
  assert.deepEqual(resolveVideoImageModeInputs(['a'], true), {
    firstFrameImage: 'a',
    lastFrameImage: '',
    referenceImages: []
  })
  assert.deepEqual(resolveVideoImageModeInputs(['a', 'b'], true), {
    firstFrameImage: 'a',
    lastFrameImage: 'b',
    referenceImages: []
  })
})

test('prevents an invalid first and last frame mode image count', () => {
  assert.equal(canEnableFirstLastFrameMode(2), true)
  assert.equal(canEnableFirstLastFrameMode(3), false)
  assert.equal(canConnectVideoImage(1, true), true)
  assert.equal(canConnectVideoImage(2, true), false)
  assert.equal(canConnectVideoImage(9, false), true)
})
