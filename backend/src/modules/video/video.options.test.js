import assert from "node:assert/strict";
import test from "node:test";
import { validateVideoPayload } from "./video.options.js";

const model = {
  supported_ratios: JSON.stringify(["16:9"]),
  supported_durations: JSON.stringify([5])
};

test("accepts reference audio together with an image reference", () => {
  assert.doesNotThrow(() => validateVideoPayload({
    prompt: "根据参考音频生成自然口型的视频",
    model,
    ratio: "16:9",
    duration: 5,
    count: 1,
    referenceImageUrl: "/media/canvas/uploads/portrait.png",
    referenceAudioUrl: "/media/canvas/uploads/voice.mp3"
  }));
});

test("rejects an unsupported reference audio URL scheme", () => {
  assert.throws(
    () => validateVideoPayload({
      prompt: "生成视频",
      model,
      ratio: "16:9",
      duration: 5,
      count: 1,
      referenceAudioUrl: "file:///private/voice.mp3"
    }),
    /invalid reference audio URL/
  );
});

test("keeps the existing image and video reference conflict rule", () => {
  assert.throws(
    () => validateVideoPayload({
      prompt: "生成视频",
      model,
      ratio: "16:9",
      duration: 5,
      count: 1,
      referenceImageUrl: "/media/image.png",
      referenceVideoUrl: "/media/video.mp4",
      referenceAudioUrl: "/media/voice.mp3"
    }),
    /cannot provide both reference image and reference video/
  );
});
