import assert from "node:assert/strict";
import test from "node:test";
import { mapVoiceConvertTask } from "./voiceConvert.service.js";

test("mapVoiceConvertTask repairs legacy mojibake file names", () => {
  const task = mapVoiceConvertTask({
    id: "voice-convert-test",
    title: "æè¢å¤§å¦¹å­",
    voice_id: "voice-test",
    voice_name: "æçå°å¦è¯­é³",
    source_file_name: "æè¢å¤§å¦¹å­.mp3",
    audio_url: "/media/voice-convert/test.mp3",
    duration_ms: 15000,
    source_duration_ms: 14000,
    mime_type: "audio/mpeg",
    rhythm_meta: null,
    favorite: 0,
    created_at: "2026-06-27T02:19:50.000Z",
  });

  assert.equal(task.title, "旗袍大妹子");
  assert.equal(task.voiceName, "成熟少妇语音");
  assert.equal(task.sourceFileName, "旗袍大妹子.mp3");
});

test("mapVoiceConvertTask preserves correctly encoded Chinese names", () => {
  const task = mapVoiceConvertTask({
    id: "voice-convert-test",
    title: "旗袍大妹子",
    voice_id: "voice-test",
    voice_name: "成熟少妇语音",
    source_file_name: "旗袍大妹子.mp3",
    audio_url: "/media/voice-convert/test.mp3",
    duration_ms: 15000,
    source_duration_ms: 14000,
    mime_type: "audio/mpeg",
    rhythm_meta: null,
    favorite: 0,
    created_at: "2026-06-27T02:19:50.000Z",
  });

  assert.equal(task.title, "旗袍大妹子");
  assert.equal(task.voiceName, "成熟少妇语音");
  assert.equal(task.sourceFileName, "旗袍大妹子.mp3");
});
