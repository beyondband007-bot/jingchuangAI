import assert from "node:assert/strict";
import test from "node:test";
import { getRechargeTier } from "./rechargeTiers.js";

test("recharge tiers include bonus points", () => {
  for (const [amount, points] of [
    [50, 5000],
    [200, 21000],
    [1000, 110000],
    [5000, 550000],
  ]) {
    assert.deepEqual(getRechargeTier(amount), { amount, points });
  }
});

test("amounts outside the four recharge tiers are rejected", () => {
  for (const amount of [1, 10, 30, 100, 201, 5001, 50.5, null, undefined]) {
    assert.throws(() => getRechargeTier(amount), { status: 400 });
  }
});
