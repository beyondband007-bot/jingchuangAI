import assert from "node:assert/strict";
import test from "node:test";
import {
  parseVideoTaskError,
  serializeVideoTaskError
} from "./video.errors.js";

test("maps the METASO text moderation message to a prompt error", () => {
  const stored = serializeVideoTaskError(new Error("text content contains sensitive content (1027)"), {
    refunded: true,
    points: 90
  });
  const detail = parseVideoTaskError(stored);

  assert.equal(detail.code, "VIDEO_PROMPT_CONTENT_REJECTED");
  assert.equal(detail.referenceType, null);
  assert.equal(detail.referenceIndex, null);
  assert.equal(detail.refunded, true);
  assert.equal(detail.points, 90);
});
