import assert from "node:assert/strict";
import test from "node:test";
import {
  parseVideoTaskError,
  serializeVideoTaskError
} from "./video.errors.js";

test("serializes a refunded reference download failure with explicit points", () => {
  const stored = serializeVideoTaskError({
    code: "VIDEO_REFERENCE_DOWNLOAD_FAILED",
    message: "resource download failed",
    referenceType: "image",
    referenceIndex: 2,
    requestId: "request-123"
  }, {
    refunded: true,
    points: 1800
  });
  const detail = parseVideoTaskError(stored);

  assert.equal(detail.code, "VIDEO_REFERENCE_DOWNLOAD_FAILED");
  assert.equal(detail.referenceIndex, 2);
  assert.equal(detail.refunded, true);
  assert.equal(detail.points, 1800);
  assert.match(detail.message, /第2张参考图/);
  assert.match(detail.message, /1800积分已退回/);
});

test("keeps legacy plain-text errors compatible", () => {
  const detail = parseVideoTaskError("视频任务失败", {
    refunded: true,
    points: 600
  });
  assert.equal(detail.code, "VIDEO_GENERATION_FAILED");
  assert.equal(detail.message, "视频任务失败");
  assert.equal(detail.refunded, true);
});

test("rewrites a legacy Ark download failure into the clear refunded message", () => {
  const detail = parseVideoTaskError(
    "创建视频任务失败：The parameter `content[2].image_url` specified in the request is not valid: resource download failed. Request id: request-456",
    { refunded: true, points: 1800 }
  );
  assert.equal(detail.code, "VIDEO_REFERENCE_DOWNLOAD_FAILED");
  assert.equal(detail.referenceIndex, 2);
  assert.equal(detail.requestId, "request-456");
  assert.match(detail.message, /Seedance 无法下载第2张参考图/);
  assert.match(detail.message, /1800积分已退回/);
});

test("serializes text moderation as a prompt error without a reference index", () => {
  const stored = serializeVideoTaskError({
    code: "VIDEO_PROMPT_CONTENT_REJECTED",
    message: "input text content[0] may contain sensitive information",
    requestId: "request-text-456"
  }, {
    refunded: true,
    points: 1800
  });
  const detail = parseVideoTaskError(stored);

  assert.equal(detail.code, "VIDEO_PROMPT_CONTENT_REJECTED");
  assert.equal(detail.referenceType, null);
  assert.equal(detail.referenceIndex, null);
  assert.match(detail.message, /不是参考图片问题/);
  assert.match(detail.message, /1800积分已退回/);
});
