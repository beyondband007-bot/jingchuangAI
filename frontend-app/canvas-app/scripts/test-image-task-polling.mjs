import assert from 'node:assert/strict'
import test from 'node:test'

import { pollImageTask } from '../src/api/image.js'

test('retries a transient task-status error and returns the completed image', async (t) => {
  const originalFetch = globalThis.fetch
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  let calls = 0
  globalThis.fetch = async () => {
    calls += 1
    if (calls === 1) {
      return new Response(JSON.stringify({ error: 'temporary upstream error' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      })
    }
    return new Response(JSON.stringify({
      id: 50,
      status: 'completed',
      imageUrl: '/media/generated/images/50/result-1.png'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const task = await pollImageTask(50, { maxAttempts: 2, interval: 0 })
  assert.equal(calls, 2)
  assert.equal(task.status, 'completed')
  assert.equal(task.imageUrl, '/media/generated/images/50/result-1.png')
})

test('does not retry a missing image task', async (t) => {
  const originalFetch = globalThis.fetch
  t.after(() => {
    globalThis.fetch = originalFetch
  })

  let calls = 0
  globalThis.fetch = async () => {
    calls += 1
    return new Response(JSON.stringify({ error: '任务不存在' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  await assert.rejects(
    pollImageTask(999999, { maxAttempts: 3, interval: 0 }),
    /任务不存在/
  )
  assert.equal(calls, 1)
})
