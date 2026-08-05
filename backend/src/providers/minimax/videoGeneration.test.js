import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMinimaxH3Content,
  buildMinimaxH3Payload,
  extractMinimaxH3VideoResult,
  mapMinimaxH3VideoState
} from "./videoGeneration.js";

test("builds MiniMax H3 frame and multimodal reference roles", () => {
  assert.deepEqual(buildMinimaxH3Content({
    prompt: "test prompt",
    referenceImageUrls: ["https://cdn.example.com/reference.png"],
    referenceVideoUrl: "https://cdn.example.com/reference.mp4",
    referenceAudioUrl: "https://cdn.example.com/reference.mp3"
  }), [
    { type: "text", text: "test prompt" },
    {
      type: "image_url",
      role: "reference_image",
      image_url: { url: "https://cdn.example.com/reference.png" }
    },
    {
      type: "video_url",
      role: "reference_video",
      video_url: { url: "https://cdn.example.com/reference.mp4" }
    },
    {
      type: "audio_url",
      role: "reference_audio",
      audio_url: { url: "https://cdn.example.com/reference.mp3" }
    }
  ]);
});

test("uses adaptive ratio for MiniMax H3 frame generation", () => {
  const content = buildMinimaxH3Content({
    prompt: "animate the frame",
    firstFrameImageUrl: "https://cdn.example.com/first.png"
  });
  assert.deepEqual(buildMinimaxH3Payload({
    content,
    resolution: "2K",
    ratio: "16:9",
    duration: 4
  }), {
    model: "MiniMax-H3",
    content,
    resolution: "2K",
    duration: 4,
    ratio: "adaptive",
    aigc_watermark: false
  });
});

test("maps MiniMax H3 terminal states and extracts the result URL", () => {
  const record = {
    task: {
      status: "succeeded",
      content: { url: "https://cdn.example.com/result.mp4" },
      resolution: "2K",
      duration: 4,
      ratio: "16:9",
      usage: { total_seconds: 4 }
    }
  };
  assert.equal(mapMinimaxH3VideoState(record), "completed");
  assert.equal(mapMinimaxH3VideoState({ task: { status: "failed" } }), "failed");
  assert.equal(mapMinimaxH3VideoState({ task: { status: "running" } }), "processing");
  assert.equal(extractMinimaxH3VideoResult(record).resultUrl, "https://cdn.example.com/result.mp4");
});
