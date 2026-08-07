import assert from 'node:assert/strict'
import test from 'node:test'
import {
  orderReferenceImagesByMentions,
  resolvePromptMediaMentions
} from '../src/utils/promptMediaMentions.js'

test('replaces internal node ids with stable numbered reference labels', () => {
  const media = [
    { nodeId: 'node_8', type: 'image', url: '/character.png' },
    { nodeId: 'node_10', type: 'image', url: '/prop.png' },
    { nodeId: 'node_9', type: 'image', url: '/scene.png' }
  ]
  const result = resolvePromptMediaMentions(
    '角色 @[node_8|图片4]，场景 @[node_9|图片5]，道具 @[node_10|图片6]，角色仍是 @[node_8|图片4]。',
    media
  )

  assert.equal(result.resolvedContent, '角色 参考图1，场景 参考图2，道具 参考图3，角色仍是 参考图1。')
  assert.deepEqual(result.imageMentions.map(item => item.nodeId), ['node_8', 'node_9', 'node_10'])
})

test('uses the same mention order for the provider image array', () => {
  const ordered = orderReferenceImagesByMentions(
    ['/character.png', '/prop.png', '/scene.png'],
    [
      { nodeId: 'node_8', url: '/character.png' },
      { nodeId: 'node_9', url: '/scene.png' },
      { nodeId: 'node_10', url: '/prop.png' }
    ]
  )
  assert.deepEqual(ordered, ['/character.png', '/scene.png', '/prop.png'])
})
