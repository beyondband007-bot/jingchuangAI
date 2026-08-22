import assert from "node:assert/strict";
import test from "node:test";
import { config } from "../../config/index.js";
import { calculateMusicPoints } from "../../shared/billingRules.js";
import { resolveMusicGenerationModel } from "./music.service.js";

test("maps legacy music model inputs to the server configured model", () => {
  assert.equal(resolveMusicGenerationModel("music-2.6-free"), config.kie.musicModel);
  assert.equal(resolveMusicGenerationModel("music-3.0"), config.kie.musicModel);
  assert.equal(resolveMusicGenerationModel("V5_5"), config.kie.musicModel);
});

test("charges a fixed 150 points per music generation request", () => {
  assert.equal(calculateMusicPoints(), 150);
  assert.equal(calculateMusicPoints(30), 150);
  assert.equal(calculateMusicPoints(480), 150);
});
