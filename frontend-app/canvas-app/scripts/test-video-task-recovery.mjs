import assert from 'node:assert/strict'
import test from 'node:test'
import { buildVideoTaskRecoveryTargets } from '../src/utils/videoTaskRecovery.js'

test('maps a legacy config-node video task association to its output', () => {
  const targets = buildVideoTaskRecoveryTargets({
    nodeTasks: [
      { id: 12, nodeId: 'node_6', taskType: 'video', taskId: '19', inputHash: 'video-v1' }
    ],
    nodes: [
      { id: 'node_6', type: 'videoConfig', data: {} },
      { id: 'node_9', type: 'video', data: { loading: true, url: '' } }
    ],
    edges: [{ source: 'node_6', target: 'node_9' }]
  })

  assert.deepEqual(targets, [{
    nodeId: 'node_9',
    taskId: '19',
    inputHash: 'video-v1',
    associationId: 12
  }])
})

test('prefers a task association written directly to a video result node', () => {
  const targets = buildVideoTaskRecoveryTargets({
    nodeTasks: [
      { id: 20, nodeId: 'node_4', taskType: 'video', taskId: '21' }
    ],
    nodes: [
      { id: 'node_4', type: 'video', data: { loading: true, url: '' } }
    ]
  })

  assert.equal(targets.length, 1)
  assert.equal(targets[0].nodeId, 'node_4')
  assert.equal(targets[0].taskId, '21')
})

test('uses a task id stored on the video node when association reads fail', () => {
  const targets = buildVideoTaskRecoveryTargets({
    nodes: [
      { id: 'node_8', type: 'video', data: { loading: true, taskId: 22 } }
    ]
  })

  assert.equal(targets.length, 1)
  assert.equal(targets[0].nodeId, 'node_8')
  assert.equal(targets[0].taskId, '22')
})
