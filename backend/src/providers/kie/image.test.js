import assert from "node:assert/strict";
import test from "node:test";
import { buildKieImageInput, mapImageModelToKie } from "./image.js";

const prompt = "A small red paper boat on calm blue water";

test("builds the documented Flux 2 Pro text-to-image request", () => {
  assert.equal(mapImageModelToKie("flux_2_pro"), "flux-2/pro-text-to-image");
  assert.deepEqual(
    buildKieImageInput({ prompt, modelKey: "flux_2_pro", ratio: "1:1", quality: "1K" }),
    {
      prompt,
      aspect_ratio: "1:1",
      resolution: "1K",
      nsfw_checker: false
    }
  );
});

test("builds the documented Flux 2 Pro image-to-image request", () => {
  const referenceImageUrls = ["https://cdn.example.com/reference.png"];
  assert.equal(
    mapImageModelToKie("flux_2_pro", { hasReferenceImages: true }),
    "flux-2/pro-image-to-image",
  );
  assert.deepEqual(
    buildKieImageInput({
      prompt,
      modelKey: "flux_2_pro",
      ratio: "1:1",
      quality: "1K",
      referenceImageUrls,
    }),
    {
      prompt,
      input_urls: referenceImageUrls,
      aspect_ratio: "1:1",
      resolution: "1K",
      nsfw_checker: false,
    },
  );
});

test("maps the product resolution tier to Seedream 4.5 basic quality", () => {
  assert.equal(mapImageModelToKie("seedream_4_5"), "seedream/4.5-text-to-image");
  assert.deepEqual(
    buildKieImageInput({ prompt, modelKey: "seedream_4_5", ratio: "1:1", quality: "1K" }),
    {
      prompt,
      aspect_ratio: "1:1",
      quality: "basic",
      nsfw_checker: false
    }
  );
});

test("builds the documented Seedream 4.5 edit request", () => {
  const referenceImageUrls = ["https://cdn.example.com/reference.png"];
  assert.equal(
    mapImageModelToKie("seedream_4_5", { hasReferenceImages: true }),
    "seedream/4.5-edit",
  );
  assert.deepEqual(
    buildKieImageInput({
      prompt,
      modelKey: "seedream_4_5",
      ratio: "1:1",
      quality: "1K",
      referenceImageUrls,
    }),
    {
      prompt,
      image_urls: referenceImageUrls,
      aspect_ratio: "1:1",
      quality: "basic",
      nsfw_checker: false,
    },
  );
});

test("builds the documented Nano Banana Pro image-to-image request", () => {
  const referenceImageUrls = ["https://cdn.example.com/reference.png"];
  assert.equal(mapImageModelToKie("nano_banana_pro"), "nano-banana-pro");
  assert.deepEqual(
    buildKieImageInput({
      prompt,
      modelKey: "nano_banana_pro",
      ratio: "1:1",
      quality: "1K",
      referenceImageUrls,
    }),
    {
      prompt,
      image_input: referenceImageUrls,
      aspect_ratio: "1:1",
      resolution: "1K",
      output_format: "png",
    },
  );
});
