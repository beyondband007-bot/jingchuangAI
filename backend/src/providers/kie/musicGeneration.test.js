import assert from "node:assert/strict";
import test from "node:test";
import {
  buildKieMusicRequestBody,
  normalizeKieMusicError,
  parseKieMusicRecord
} from "./musicGeneration.js";

test("builds KIE V5.5 vocal and instrumental requests", () => {
  const vocal = buildKieMusicRequestBody({
    prompt: "Mandopop, warm summer night",
    title: "夏夜",
    lyrics: "[Verse]\n晚风吹过",
    model: "V5_5",
    callbackUrl: "https://example.com/api/music/kie-callback",
    durationSeconds: 30
  });
  assert.deepEqual(vocal, {
    customMode: true,
    instrumental: false,
    model: "V5_5",
    callBackUrl: "https://example.com/api/music/kie-callback",
    style: "Mandopop, warm summer night",
    title: "夏夜",
    prompt: "[Verse]\n晚风吹过",
    duration: 30
  });

  const instrumental = buildKieMusicRequestBody({
    prompt: "ambient piano",
    title: "Quiet Room",
    model: "V5_5",
    isInstrumental: true,
    callbackUrl: "https://example.com/api/music/kie-callback",
    durationSeconds: 30
  });
  assert.equal(instrumental.instrumental, true);
  assert.equal(instrumental.style, "ambient piano");
  assert.equal("prompt" in instrumental, false);

  const unrestricted = buildKieMusicRequestBody({
    prompt: "cinematic orchestral",
    title: "Open Ending",
    model: "V5_5",
    isInstrumental: true,
    callbackUrl: "https://example.com/api/music/kie-callback"
  });
  assert.equal("duration" in unrestricted, false);
});

test("uses KIE simple mode for automatic lyrics", () => {
  assert.deepEqual(
    buildKieMusicRequestBody({
      prompt: "uplifting pop about chasing dreams",
      title: "Dreams",
      model: "V5_5",
      callbackUrl: "https://example.com/api/music/kie-callback",
      lyricsOptimizer: true
    }),
    {
      prompt: "uplifting pop about chasing dreams",
      customMode: false,
      instrumental: false,
      model: "V5_5",
      callBackUrl: "https://example.com/api/music/kie-callback"
    }
  );
});

test("parses completed KIE music records and rejects terminal failures", () => {
  const parsed = parseKieMusicRecord({
    data: {
      taskId: "kie-task-1",
      status: "SUCCESS",
      response: {
        sunoData: [{ id: "audio-1", audioUrl: "https://example.com/song.mp3", duration: 30.5 }]
      }
    }
  });
  assert.equal(parsed.done, true);
  assert.equal(parsed.taskId, "kie-task-1");
  assert.equal(parsed.track.durationSeconds, 30.5);

  assert.throws(
    () => parseKieMusicRecord({ data: { status: "GENERATE_AUDIO_FAILED", errorMessage: "upstream failed" } }),
    /upstream failed/
  );
});

test("maps common KIE music errors to readable Chinese messages", () => {
  assert.equal(normalizeKieMusicError(new Error("Insufficient credits")).message, "KIE 账户积分不足，请充值后重试");
  assert.equal(normalizeKieMusicError(new Error("Unauthorized API key")).message, "KIE API Key 无效或没有音乐模型权限");
});
