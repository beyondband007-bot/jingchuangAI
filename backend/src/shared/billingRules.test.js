import test from "node:test";
import assert from "node:assert/strict";
import { calculateBillingQuote } from "./billingRules.js";

test("quotes 50 points for Qwen video prompt reverse analysis", () => {
  const quote = calculateBillingQuote("replicate", { kind: "video" });
  assert.equal(quote.points, 50);
  assert.equal(quote.items[0].label, "视频反推提示词");
  assert.equal(quote.rulesVersion, "2026-07-27");
});

test("keeps image prompt reverse analysis at 5 points", () => {
  const quote = calculateBillingQuote("replicate", { kind: "image" });
  assert.equal(quote.points, 5);
});
