import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateVideoPoints,
  normalizeVideoImageInputs,
  validateVideoPayload
} from "./video.options.js";
import { getVideoResolutionOption } from "./video.resolutions.js";

const model = {
  supported_ratios: JSON.stringify(["16:9"]),
  supported_durations: JSON.stringify([5])
};

test("charges MiniMax H3 at its configured 2K fallback rate", () => {
  assert.equal(calculateVideoPoints({
    price_unit: "per_second",
    base_points: 96
  }, 4), 384);
});

test("charges each enabled video model by its selected resolution", () => {
  assert.equal(calculateVideoPoints({ model_key: "minimax_h3_2k" }, 4, 1, "768P"), 240);
  assert.equal(calculateVideoPoints({ model_key: "minimax_h3_2k" }, 4, 1, "2K"), 384);
  assert.equal(calculateVideoPoints({ model_key: "seedance_2_0_720p" }, 5, 1, "480P"), 270);
  assert.equal(calculateVideoPoints({ model_key: "seedance_2_0_720p" }, 5, 1, "1080P"), 1350);
  assert.equal(calculateVideoPoints({ model_key: "seedance_2_0_mini" }, 6, 1, "720P"), 738);
  assert.equal(calculateVideoPoints({ model_key: "kling_3_std" }, 5, 1, "4K"), 2010);
});

test("keeps MiniMax H3 selling rates at cost times 1.2", () => {
  for (const resolution of ["768P", "2K"]) {
    const option = getVideoResolutionOption({ model_key: "minimax_h3_2k" }, resolution);
    assert.equal(option.pointsPerSecond, option.rmbPerSecond * 1.2 * 100);
  }
});

test("rejects an unsupported resolution for a configured video model", () => {
  assert.throws(
    () => validateVideoPayload({
      prompt: "Generate a city shot",
      model: {
        ...model,
        model_key: "seedance_2_0_mini"
      },
      ratio: "16:9",
      duration: 5,
      count: 1,
      resolution: "1080P"
    }),
    /invalid video resolution/
  );
});

test("keeps the unified video rate as a fallback for legacy model rows", () => {
  assert.equal(calculateVideoPoints({}, 4), 480);
});

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

test("allows MiniMax H3 to combine reference image, video, and audio", () => {
  const h3Model = {
    ...model,
    provider_type: "minimax",
    provider_model: "MiniMax-H3"
  };
  assert.doesNotThrow(() => validateVideoPayload({
    prompt: "Use all references to generate a coherent scene",
    model: h3Model,
    ratio: "16:9",
    duration: 5,
    count: 1,
    referenceImageUrls: ["/media/image.png"],
    referenceVideoUrl: "/media/video.mp4",
    referenceAudioUrl: "/media/voice.mp3"
  }));
});

test("rejects MiniMax H3 reference audio without an image or video", () => {
  const h3Model = {
    ...model,
    provider_type: "minimax",
    provider_model: "MiniMax-H3"
  };
  assert.throws(
    () => validateVideoPayload({
      prompt: "Generate from audio",
      model: h3Model,
      ratio: "16:9",
      duration: 5,
      count: 1,
      referenceAudioUrl: "/media/voice.mp3"
    }),
    /requires a reference image or video/
  );
});

test("rejects unsupported video and audio references for Kling 3.0", () => {
  const klingModel = {
    ...model,
    provider_model: "kling-3.0/video"
  };

  assert.throws(
    () => validateVideoPayload({
      prompt: "生成带原生音效的视频",
      model: klingModel,
      ratio: "16:9",
      duration: 5,
      count: 1,
      referenceAudioUrl: "/media/voice.mp3"
    }),
    /Kling 3.0 currently supports prompt and optional reference image only/
  );
});

test("accepts a first and last frame pair", () => {
  assert.doesNotThrow(() => validateVideoPayload({
    prompt: "从首帧自然过渡到尾帧",
    model,
    ratio: "16:9",
    duration: 5,
    count: 1,
    firstFrameImageUrl: "/media/first.png",
    lastFrameImageUrl: "/media/last.png"
  }));
});

test("rejects a last frame without a first frame", () => {
  assert.throws(
    () => validateVideoPayload({
      prompt: "生成视频",
      model,
      ratio: "16:9",
      duration: 5,
      count: 1,
      lastFrameImageUrl: "/media/last.png"
    }),
    /last frame requires first frame/
  );
});

test("rejects mixing frame images with ordinary reference images", () => {
  assert.throws(
    () => validateVideoPayload({
      prompt: "生成视频",
      model,
      ratio: "16:9",
      duration: 5,
      count: 1,
      firstFrameImageUrl: "/media/first.png",
      referenceImageUrls: ["/media/reference.png"]
    }),
    /frame images cannot be combined with reference images/
  );
});

test("maps the legacy single image to first frame mode", () => {
  assert.deepEqual(normalizeVideoImageInputs({
    mode: "first-frame",
    referenceImageUrl: "/media/legacy.png"
  }), {
    firstFrameImageUrl: "/media/legacy.png",
    lastFrameImageUrl: null,
    referenceImageUrls: []
  });
});
