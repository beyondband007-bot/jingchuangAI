import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateTencentMpsWatermarkPoints,
  getTencentMpsWatermarkRate,
  getTencentMpsWatermarkResolutionTier
} from "./watermark.pricing.js";

test("maps Tencent MPS rates by the source video's short edge", () => {
  assert.equal(getTencentMpsWatermarkResolutionTier({ width: 1280, height: 720 }), "hd");
  assert.equal(getTencentMpsWatermarkResolutionTier({ width: 1920, height: 1080 }), "fhd");
  assert.equal(getTencentMpsWatermarkRate({ width: 1280, height: 720, model: "basic" }).rmbPerMinute, 0.17);
  assert.equal(getTencentMpsWatermarkRate({ width: 1920, height: 1080, model: "advanced" }).rmbPerMinute, 3);
});

test("charges each started minute at supplier cost times 1.2 and 100 points per RMB", () => {
  assert.equal(calculateTencentMpsWatermarkPoints({
    durationSeconds: 15,
    width: 1280,
    height: 720,
    model: "basic"
  }), 21);
  assert.equal(calculateTencentMpsWatermarkPoints({
    durationSeconds: 60,
    width: 1280,
    height: 720,
    model: "basic"
  }), 21);
  assert.equal(calculateTencentMpsWatermarkPoints({
    durationSeconds: 61,
    width: 1280,
    height: 720,
    model: "basic"
  }), 41);
  assert.equal(calculateTencentMpsWatermarkPoints({
    durationSeconds: 60,
    width: 1920,
    height: 1080,
    model: "basic"
  }), 41);
  assert.equal(calculateTencentMpsWatermarkPoints({
    durationSeconds: 15,
    width: 1280,
    height: 720,
    model: "advanced"
  }), 180);
});
