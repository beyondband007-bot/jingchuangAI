import assert from "node:assert/strict";
import test from "node:test";
import { calculateBillingQuote, calculateMotionTransferPoints } from "./billingRules.js";
import { config } from "../config/index.js";

test("quotes 50 points for Qwen video prompt reverse analysis", () => {
  const quote = calculateBillingQuote("replicate", { kind: "video" });
  assert.equal(quote.points, 50);
  assert.equal(quote.items[0].label, "视频反推提示词");
  assert.equal(quote.rulesVersion, "2026-08-22");
});

test("keeps image prompt reverse analysis at 5 points", () => {
  const quote = calculateBillingQuote("replicate", { kind: "image" });
  assert.equal(quote.points, 5);
});

test("quotes configured points for image enhancement", () => {
  const quote = calculateBillingQuote("enhance", { kind: "image" });
  assert.equal(quote.points, config.kie.enhanceImagePoints);
  assert.equal(quote.items[0].label, "图片画质提升");
});

test("quotes configured points for video enhancement", () => {
  const quote = calculateBillingQuote("enhance", { kind: "video" });
  assert.equal(quote.points, config.kie.enhanceVideoPoints);
  assert.equal(quote.items[0].label, "视频画质提升");
});

test("motion transfer charges by resolution as well as source duration", () => {
  assert.equal(calculateMotionTransferPoints(14, "720p"), 1680);
  assert.equal(calculateMotionTransferPoints(14, "1080p"), 3780);
});

test("music is billed once per generation regardless of requested duration", () => {
  assert.equal(calculateBillingQuote("music", {}).points, 150);
  assert.equal(calculateBillingQuote("music", { durationSeconds: 480 }).points, 150);
});
