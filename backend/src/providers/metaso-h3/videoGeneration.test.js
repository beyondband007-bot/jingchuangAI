import assert from "node:assert/strict";
import test from "node:test";
import {
  createMetasoH3VideoTask,
  extractMetasoH3VideoResult,
  getMetasoH3VideoTask,
  mapMetasoH3VideoState
} from "./videoGeneration.js";

test("submits a MiniMax H3 compatible payload to the METASO API host", async () => {
  const originalFetch = globalThis.fetch;
  const requests = [];
  globalThis.fetch = async (url, options) => {
    requests.push({ url: String(url), options });
    return new Response(JSON.stringify({ task_id: "metaso-task-1" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  try {
    const result = await createMetasoH3VideoTask({
      model: "MiniMax-H3",
      content: [{ type: "text", text: "A cinematic city sunrise" }],
      resolution: "768P",
      duration: 4,
      ratio: "16:9",
      aigc_watermark: false
    });
    assert.equal(result.taskId, "metaso-task-1");
    assert.equal(requests[0].url, "https://metaso.cn/api/minimax/v2/video_generation");
    assert.match(requests[0].options.headers.Authorization, /^Bearer .+/);
    assert.deepEqual(JSON.parse(requests[0].options.body), {
      model: "MiniMax-H3",
      content: [{ type: "text", text: "A cinematic city sunrise" }],
      resolution: "768P",
      duration: 4,
      ratio: "16:9",
      aigc_watermark: false
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("keeps MiniMax-compatible METASO result parsing", () => {
  const record = {
    task: {
      status: "succeeded",
      content: { url: "https://cdn.example.com/metaso-result.mp4" }
    }
  };
  assert.equal(mapMetasoH3VideoState(record), "completed");
  assert.equal(extractMetasoH3VideoResult(record).resultUrl, "https://cdn.example.com/metaso-result.mp4");
});

test("safely retries transient network failures while querying an existing task", async () => {
  const originalFetch = globalThis.fetch;
  let attempts = 0;
  globalThis.fetch = async () => {
    attempts += 1;
    if (attempts < 3) throw new TypeError("fetch failed");
    return new Response(JSON.stringify({ task: { status: "processing" } }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  try {
    const result = await getMetasoH3VideoTask({ taskId: "existing-task-1" });
    assert.equal(result.task.status, "processing");
    assert.equal(attempts, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
