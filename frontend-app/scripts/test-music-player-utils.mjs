import assert from "node:assert/strict";
import test from "node:test";

import { needsLyricTimelineRepair } from "../src/features/music/musicPlayerUtils.js";

test("does not repair a valid fast-starting lyric timeline", () => {
  const timeline = [
    { startMs: 0, endMs: 3500 },
    { startMs: 4000, endMs: 7500 },
    { startMs: 8000, endMs: 11500 },
    { startMs: 12000, endMs: 15500 },
  ];

  assert.equal(needsLyricTimelineRepair(timeline, 60000), false);
});

test("repairs timelines with an out-of-order lyric", () => {
  const timeline = [
    { startMs: 1000, endMs: 4000 },
    { startMs: 5000, endMs: 8000 },
    { startMs: 3000, endMs: 6000 },
  ];

  assert.equal(needsLyricTimelineRepair(timeline, 30000), true);
});

test("repairs timelines with an implausible internal gap", () => {
  const timeline = [
    { startMs: 1000, endMs: 4000 },
    { startMs: 23000, endMs: 26000 },
  ];

  assert.equal(needsLyricTimelineRepair(timeline, 30000), true);
});

test("repairs timelines that run beyond the audio duration", () => {
  const timeline = [
    { startMs: 1000, endMs: 4000 },
    { startMs: 5000, endMs: 33000 },
  ];

  assert.equal(needsLyricTimelineRepair(timeline, 30000), true);
});
