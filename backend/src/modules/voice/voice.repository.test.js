import assert from "node:assert/strict";
import test from "node:test";
import {
  isRetryableVoiceCloneAsset,
  VOICE_CLONE_PROCESSING_STALE_MS
} from "./voice.repository.js";

test("voice clone processing lock remains active before the stale timeout", () => {
  const now = Date.parse("2026-08-07T04:00:00.000Z");
  assert.equal(isRetryableVoiceCloneAsset({
    status: "processing",
    updatedAt: new Date(now - VOICE_CLONE_PROCESSING_STALE_MS + 1)
  }, now), false);
});

test("voice clone processing lock can be reclaimed after the stale timeout", () => {
  const now = Date.parse("2026-08-07T04:00:00.000Z");
  assert.equal(isRetryableVoiceCloneAsset({
    status: "processing",
    updatedAt: new Date(now - VOICE_CLONE_PROCESSING_STALE_MS)
  }, now), true);
});

test("failed and expired voice clone assets remain retryable", () => {
  assert.equal(isRetryableVoiceCloneAsset({ status: "failed" }), true);
  assert.equal(isRetryableVoiceCloneAsset({ status: "expired" }), true);
  assert.equal(isRetryableVoiceCloneAsset({ status: "completed" }), false);
});
