import assert from "node:assert/strict";
import test from "node:test";

import { createTaskPollingController } from "../src/api/taskPolling.js";
import {
  VIRTUAL_PROGRESS_MAX,
  createResumedRawState,
  tickRawState,
} from "../src/features/video/videoGenRawState.js";

function installBrowserStub() {
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  const intervals = new Map();
  const listeners = new Set();
  let nextIntervalId = 0;
  let visibilityState = "visible";

  globalThis.window = {
    setInterval(callback, intervalMs) {
      const intervalId = ++nextIntervalId;
      intervals.set(intervalId, { callback, intervalMs });
      return intervalId;
    },
    clearInterval(intervalId) {
      intervals.delete(intervalId);
    },
  };
  globalThis.document = {
    get visibilityState() {
      return visibilityState;
    },
    addEventListener(type, callback) {
      if (type === "visibilitychange") listeners.add(callback);
    },
    removeEventListener(type, callback) {
      if (type === "visibilitychange") listeners.delete(callback);
    },
  };

  return {
    intervals,
    listeners,
    setVisibility(nextVisibilityState) {
      visibilityState = nextVisibilityState;
      listeners.forEach((listener) => listener());
    },
    restore() {
      globalThis.window = originalWindow;
      globalThis.document = originalDocument;
    },
  };
}

test("stops background polling and refreshes once when the page becomes visible", () => {
  const browser = installBrowserStub();

  try {
    const controller = createTaskPollingController(1234);
    let notifications = 0;
    const unsubscribe = controller.subscribe(() => {
      notifications += 1;
    });

    controller.setHasRunningTasks(true);
    assert.equal(browser.intervals.size, 1);
    assert.equal([...browser.intervals.values()][0].intervalMs, 1234);
    assert.equal(browser.listeners.size, 1);

    browser.setVisibility("hidden");
    assert.equal(browser.intervals.size, 0);
    assert.equal(notifications, 0);

    browser.setVisibility("visible");
    assert.equal(browser.intervals.size, 1);
    assert.equal(notifications, 1);

    unsubscribe();
    assert.equal(browser.intervals.size, 0);
    assert.equal(browser.listeners.size, 0);
  } finally {
    browser.restore();
  }
});

test("restores a running generation from its current progress and keeps moving", () => {
  const durationMs = 300_000;
  const nowMs = 1_000_000;
  const resumed = createResumedRawState({
    progress: 68,
    durationMs,
    nowMs,
  });

  assert.equal(resumed.status, "generating");
  assert.equal(resumed.progress, 68);
  assert.equal(
    resumed.startedAtMs,
    nowMs - (68 / VIRTUAL_PROGRESS_MAX) * durationMs,
  );

  const next = tickRawState(resumed, {
    durationMs,
    nowMs: nowMs + 1_000,
  });
  assert.ok(next.progress > resumed.progress);
  assert.ok(next.progress <= VIRTUAL_PROGRESS_MAX);
});
