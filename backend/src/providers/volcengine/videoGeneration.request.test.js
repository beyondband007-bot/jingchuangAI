import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFirstFrameImage,
  buildLastFrameImage,
  buildReferenceImage,
  createArkVideoGenerationTask,
  getArkVideoGenerationTask,
  normalizeArkVideoErrorDetail
} from "./videoGeneration.js";

function transientFetchError(code = "ECONNRESET") {
  const error = new TypeError("fetch failed");
  error.cause = { code };
  return error;
}

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

test("retries transient Ark video status queries", { concurrency: false }, async () => {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls < 3) throw transientFetchError();
    return new Response(JSON.stringify({ id: "ark-test-task", status: "running" }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };
  console.warn = () => {};

  try {
    const result = await getArkVideoGenerationTask({ taskId: "ark-test-task" });
    assert.equal(result.status, "running");
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
  }
});

test("does not blindly retry Ark video creation POST requests", { concurrency: false }, async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    throw transientFetchError();
  };

  try {
    await assert.rejects(
      () =>
        createArkVideoGenerationTask({
          model: "doubao-seedance-test",
          content: [{ type: "text", text: "test prompt" }]
        }),
      /fetch failed/
    );
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("maps Ark reference download failures to an indexed user-facing error", () => {
  const detail = normalizeArkVideoErrorDetail({
    error: {
      code: "InvalidParameter",
      message: "The parameter `content[2].image_url` specified in the request is not valid: resource download failed. Request id: request-123",
      param: "content[2].image_url"
    }
  });

  assert.equal(detail.code, "VIDEO_REFERENCE_DOWNLOAD_FAILED");
  assert.equal(detail.referenceIndex, 2);
  assert.equal(detail.requestId, "request-123");
  assert.match(detail.message, /第2张参考图/);
});

test("maps Ark text moderation separately from reference image moderation", () => {
  const detail = normalizeArkVideoErrorDetail({
    error: {
      code: "InputTextSensitiveContentDetected",
      message: "The request failed because the input text 'content[0]' may contain sensitive information. Request id: request-text-123",
      param: "content[0]"
    }
  });

  assert.equal(detail.code, "VIDEO_PROMPT_CONTENT_REJECTED");
  assert.equal(detail.referenceType, null);
  assert.equal(detail.referenceIndex, null);
  assert.equal(detail.requestId, "request-text-123");
  assert.match(detail.message, /与参考图片无关/);
});
