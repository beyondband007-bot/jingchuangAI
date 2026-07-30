import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFirstFrameImage,
  buildLastFrameImage,
  buildReferenceImage,
  createArkVideoGenerationTask
} from "./videoGeneration.js";

test("builds distinct Ark image roles for frames and references", () => {
  assert.deepEqual(buildFirstFrameImage("asset://first"), {
    type: "image_url",
    role: "first_frame",
    image_url: { url: "asset://first" }
  });
  assert.deepEqual(buildLastFrameImage("asset://last"), {
    type: "image_url",
    role: "last_frame",
    image_url: { url: "asset://last" }
  });
  assert.deepEqual(buildReferenceImage("asset://reference"), {
    type: "image_url",
    role: "reference_image",
    image_url: { url: "asset://reference" }
  });
});

test("sends digital-human output spec and exact duration to Ark", async () => {
  const originalFetch = globalThis.fetch;
  let capturedRequest;

  globalThis.fetch = async (url, options = {}) => {
    capturedRequest = {
      url: String(url),
      method: options.method,
      body: JSON.parse(options.body)
    };
    return new Response(JSON.stringify({ id: "ark-test-task" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  try {
    const result = await createArkVideoGenerationTask({
      model: "doubao-seedance-test",
      content: [{ type: "text", text: "test prompt" }],
      resolution: "720p",
      ratio: "16:9",
      duration: 11,
      generateAudio: true,
      watermark: false
    });

    assert.equal(result.taskId, "ark-test-task");
    assert.match(capturedRequest.url, /\/contents\/generations\/tasks$/);
    assert.equal(capturedRequest.method, "POST");
    assert.deepEqual(capturedRequest.body, {
      model: "doubao-seedance-test",
      content: [{ type: "text", text: "test prompt" }],
      resolution: "720p",
      ratio: "16:9",
      generate_audio: true,
      watermark: false,
      duration: 11
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
