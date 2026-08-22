import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMinimaxMusicRequestBody,
  parseMinimaxMusicResponse
} from "./musicGeneration.js";

test("builds a Music 3.0 vocal request with the official hex output field", () => {
  const body = buildMinimaxMusicRequestBody({
    prompt: "流行，温暖，适合夏夜",
    lyrics: "[Verse]\n夏夜微风",
    model: "music-3.0-free"
  });

  assert.equal(body.model, "music-3.0-free");
  assert.equal(body.output_format, "hex");
  assert.equal("response_format" in body, false);
  assert.equal(body.lyrics, "[Verse]\n夏夜微风");
  assert.equal(body.is_instrumental, false);
});

test("builds instrumental and automatic-lyrics Music 3.0 requests", () => {
  const instrumental = buildMinimaxMusicRequestBody({
    prompt: "ambient piano",
    model: "music-3.0-free",
    isInstrumental: true
  });
  assert.equal(instrumental.is_instrumental, true);
  assert.equal("lyrics" in instrumental, false);

  const automaticLyrics = buildMinimaxMusicRequestBody({
    prompt: "励志摇滚",
    model: "music-3.0-free",
    lyricsOptimizer: true
  });
  assert.equal(automaticLyrics.lyrics_optimizer, true);
  assert.equal("lyrics" in automaticLyrics, false);
});

test("accepts only successful MiniMax responses with non-empty audio and keeps trace_id", () => {
  const parsed = parseMinimaxMusicResponse({
    data: { status: 2, audio: "494433" },
    trace_id: "trace-music-3",
    base_resp: { status_code: 0 },
    extra_info: { music_duration: 30000 }
  });
  assert.equal(parsed.audioBuffer.length, 3);
  assert.equal(parsed.traceId, "trace-music-3");

  assert.throws(
    () => parseMinimaxMusicResponse({ data: { status: 1, audio: "494433" }, base_resp: { status_code: 0 } }),
    /未成功完成/
  );
  assert.throws(
    () => parseMinimaxMusicResponse({ data: { status: 2, audio: "" }, base_resp: { status_code: 0 } }),
    /有效音频/
  );
});
