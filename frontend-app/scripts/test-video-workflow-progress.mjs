import assert from "node:assert/strict";
import test from "node:test";

import {
  createSimulatedProgressDuration,
  deriveWorkflowStatus,
  getSimulatedProgress,
  isRestorableWorkflowTask,
} from "../src/features/video-workflow/utils.js";

test("simulated video progress starts at 1% and holds at 90%", () => {
  const startedAt = 1_000;
  const durationMs = 240_000;

  assert.equal(getSimulatedProgress({ startedAt, durationMs, now: startedAt }), 1);
  assert.equal(
    getSimulatedProgress({ startedAt, durationMs, now: startedAt + durationMs / 2 }),
    45.5,
  );
  assert.equal(
    getSimulatedProgress({ startedAt, durationMs, now: startedAt + durationMs }),
    90,
  );
  assert.equal(
    getSimulatedProgress({ startedAt, durationMs, now: startedAt + durationMs * 2 }),
    90,
  );
});

test("simulated video progress duration stays within the configured 3-5 minute range", () => {
  const min = 3 * 60 * 1000;
  const max = 5 * 60 * 1000;

  assert.equal(createSimulatedProgressDuration(min, max, () => 0), min);
  assert.equal(createSimulatedProgressDuration(min, max, () => 1), max);
  assert.equal(createSimulatedProgressDuration(min, max, () => 0.5), 4 * 60 * 1000);
});

test("the completion animation remains in rendering until progress reaches 100%", () => {
  assert.equal(
    deriveWorkflowStatus({ taskStatus: "finishing", progress: 90 }),
    "rendering",
  );
  assert.equal(
    deriveWorkflowStatus({ taskStatus: "done", progress: 100 }),
    "done",
  );
});

test("failed tasks are not restored as the active workflow after a refresh", () => {
  assert.equal(isRestorableWorkflowTask({ status: "processing" }), true);
  assert.equal(isRestorableWorkflowTask({ status: "completed" }), true);
  assert.equal(isRestorableWorkflowTask({ status: "failed" }), false);
  assert.equal(isRestorableWorkflowTask(null), false);
});
