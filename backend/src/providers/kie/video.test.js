import assert from "node:assert/strict";
import test from "node:test";
import { createJobsInput } from "./video.js";

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

test("maps the selected Kling resolution to its provider mode", () => {
  const proInput = createJobsInput(
    { provider_model: "kling-3.0/video", mode: "std" },
    { prompt: "A product reveal", ratio: "16:9", duration: 5, resolution: "1080P" }
  );
  const fourKInput = createJobsInput(
    { provider_model: "kling-3.0/video", mode: "std" },
    { prompt: "A product reveal", ratio: "16:9", duration: 5, resolution: "4K" }
  );

  assert.equal(proInput.mode, "pro");
  assert.equal(fourKInput.mode, "4K");
});
