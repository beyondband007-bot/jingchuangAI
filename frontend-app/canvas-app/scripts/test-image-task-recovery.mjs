import assert from 'node:assert/strict'
import test from 'node:test'
import { buildImageTaskRecoveryTargets } from '../src/utils/imageTaskRecovery.js'

test('maps a legacy config-node task association to its pending image output', () => {
  const targets = buildImageTaskRecoveryTargets({
    nodeTasks: [
      { id: 10, nodeId: 'node_0', taskType: 'image', taskId: '50', inputHash: 'v1-test' }
    ],
    nodes: [
      { id: 'node_0', type: 'imageConfig', data: {} },
      { id: 'node_1', type: 'image', data: { loading: true, url: '', taskId: null } }
    ],
    edges: [{ source: 'node_0', target: 'node_1' }]
  })

  assert.deepEqual(targets, [
    {
      nodeId: 'node_1',
      taskId: '50',
      inputHash: 'v1-test',
      associationId: 10
    }
  ])
})

test('keeps only the newest task association for one output node', () => {
  const targets = buildImageTaskRecoveryTargets({
    nodeTasks: [
      { id: 7, nodeId: 'node_0', taskType: 'image', taskId: '47' },
      { id: 8, nodeId: 'node_0', taskType: 'image', taskId: '48' }
    ],
    nodes: [
      { id: 'node_0', type: 'imageConfig', data: {} },
      { id: 'node_1', type: 'image', data: { loading: true, url: '' } }
    ],
    edges: [{ source: 'node_0', target: 'node_1' }]
  })

  assert.equal(targets.length, 1)
  assert.equal(targets[0].nodeId, 'node_1')
  assert.equal(targets[0].taskId, '48')
})

test('recovers a task id stored directly on an image node without an association row', () => {
  const targets = buildImageTaskRecoveryTargets({
    nodes: [
      { id: 'node_3', type: 'image', data: { loading: true, taskId: 61 } }
    ]
  })

  assert.equal(targets.length, 1)
  assert.equal(targets[0].nodeId, 'node_3')
  assert.equal(targets[0].taskId, '61')
})
