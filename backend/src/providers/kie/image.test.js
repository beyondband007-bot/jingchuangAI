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
