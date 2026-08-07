import assert from 'node:assert/strict'
import test from 'node:test'
import { getVideoNodeDisplayState } from '../src/utils/videoNodeState.js'

test('shows a terminal error before the task loading state', () => {
  assert.equal(getVideoNodeDisplayState({
    taskId: '28',
    loading: false,
    url: '',
    error: 'This ModelVersion is not supported.'
  }), 'error')
})

test('keeps active tasks and finished videos in their expected states', () => {
  assert.equal(getVideoNodeDisplayState({ taskId: '29', loading: true }), 'loading')
  assert.equal(getVideoNodeDisplayState({ taskId: '30', url: 'https://example.com/result.mp4' }), 'video')
  assert.equal(getVideoNodeDisplayState({}), 'empty')
})
