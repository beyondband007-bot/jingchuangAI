import assert from "node:assert/strict";
import test from "node:test";
import { resolveVoiceCloneId } from "./voice.service.js";

test("voice clone generates a valid provider id when the client omits voiceId", () => {
  assert.equal(resolveVoiceCloneId("", 1775534400000, "abc12345"), "VoiceClone_1775534400000_abc12345");
});

test("voice clone preserves a valid client-provided voiceId", () => {
  assert.equal(resolveVoiceCloneId("VoiceClone_custom_01"), "VoiceClone_custom_01");
});
