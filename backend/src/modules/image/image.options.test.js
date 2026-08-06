import assert from "node:assert/strict";
import test from "node:test";
import {
  supportsImageReference,
  validateImagePayload,
} from "./image.options.js";

const visibleModels = [
  "gpt_image_2",
  "nano_banana_pro",
  "flux_2_pro",
  "seedream_4_5",
];

for (const model of visibleModels) {
  test(`${model} accepts a reference image`, () => {
    assert.equal(supportsImageReference(model), true);
    assert.doesNotThrow(() =>
      validateImagePayload({
        prompt: "Keep the referenced boat and change the background",
        model,
        ratio: "1:1",
        quality: "1K",
        count: 1,
        referenceImageUrl: "https://cdn.example.com/reference.png",
      }),
    );
  });
}

test("an image-to-image-only model still requires a reference image", () => {
  assert.throws(
    () =>
      validateImagePayload({
        prompt: "Change the background",
        model: "gpt_image_2_i2i",
        ratio: "1:1",
        quality: "1K",
        count: 1,
        referenceImageUrl: "",
      }),
    /reference image is required/,
  );
});

test("unknown models cannot silently receive a reference image", () => {
  assert.throws(
    () =>
      validateImagePayload({
        prompt: "Change the background",
        model: "unknown_image_model",
        ratio: "1:1",
        quality: "1K",
        count: 1,
        referenceImageUrl: "https://cdn.example.com/reference.png",
      }),
    /当前模型不支持参考图/,
  );
});
