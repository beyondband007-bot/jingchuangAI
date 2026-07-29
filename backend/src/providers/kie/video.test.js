import assert from "node:assert/strict";
import test from "node:test";
import { createJobsInput } from "./video.js";

test("builds the documented Seedance 2.0 Mini multimodal input", () => {
  const input = createJobsInput(
    {
      provider_model: "bytedance/seedance-2-mini",
      mode: "mini"
    },
    {
      prompt: "A cinematic city sunrise",
      ratio: "16:9",
      duration: 6,
      referenceImageUrl: "https://cdn.example.com/reference.png",
      referenceVideoUrl: "https://cdn.example.com/reference.mp4",
      referenceAudioUrl: "https://cdn.example.com/reference.mp3"
    }
  );

  assert.deepEqual(input, {
    prompt: "A cinematic city sunrise",
    return_last_frame: false,
    generate_audio: true,
    resolution: "720p",
    aspect_ratio: "16:9",
    duration: 6,
    web_search: false,
    reference_image_urls: ["https://cdn.example.com/reference.png"],
    reference_video_urls: ["https://cdn.example.com/reference.mp4"],
    reference_audio_urls: ["https://cdn.example.com/reference.mp3"]
  });
});

test("uses an image-only Seedance 2.0 Mini reference as the first frame", () => {
  const input = createJobsInput(
    {
      provider_model: "bytedance/seedance-2-mini",
      mode: "mini"
    },
    {
      prompt: "Animate this product image",
      ratio: "1:1",
      duration: 5,
      referenceImageUrl: "https://cdn.example.com/product.png"
    }
  );

  assert.equal(input.first_frame_url, "https://cdn.example.com/product.png");
  assert.equal("reference_image_urls" in input, false);
});

test("builds Kling 3.0 image input with the required image_urls array", () => {
  const input = createJobsInput(
    {
      provider_model: "kling-3.0/video",
      mode: "std"
    },
    {
      prompt: "A runner crossing a rainy street",
      ratio: "9:16",
      duration: 5,
      referenceImageUrl: "https://cdn.example.com/runner.png"
    }
  );

  assert.deepEqual(input, {
    prompt: "A runner crossing a rainy street",
    sound: true,
    duration: "5",
    aspect_ratio: "9:16",
    mode: "std",
    multi_shots: false,
    image_urls: ["https://cdn.example.com/runner.png"]
  });
  assert.equal("image_url" in input, false);
});
