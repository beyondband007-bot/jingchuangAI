import assert from "node:assert/strict";
import test from "node:test";
import { createGenerationNotificationService } from "./generationNotification.service.js";

test("summary merges running and unread counts by source", async () => {
  const service = createGenerationNotificationService({
    loadRunningSummary: async () => [
      { source_type: "image", running_count: 1 },
      { source_type: "image", running_count: 2 },
      { source_type: "music", running_count: 1 },
    ],
    loadUnreadSummary: async () => [
      { source_type: "image", unread_count: 2 },
      { source_type: "video", unread_count: 3 },
    ],
  });

  const summary = await service.getSummary(7);
  assert.equal(summary.totalRunningCount, 4);
  assert.equal(summary.totalUnreadCount, 5);
  assert.equal(summary.unreadAvailable, true);
  assert.deepEqual(summary.bySource, {
    image: { runningCount: 3, unreadCount: 2 },
    music: { runningCount: 1, unreadCount: 0 },
    video: { runningCount: 0, unreadCount: 3 },
  });
});

test("unread failure keeps accurate running counts and returns no partial unread total", async () => {
  const errors = [];
  const service = createGenerationNotificationService({
    loadRunningSummary: async () => [{ source_type: "music", running_count: 2 }],
    loadUnreadSummary: async () => {
      throw new Error("receipt table unavailable");
    },
    logError: (...args) => errors.push(args),
  });

  const summary = await service.getSummary(7);
  assert.equal(summary.totalRunningCount, 2);
  assert.equal(summary.totalUnreadCount, 0);
  assert.equal(summary.unreadAvailable, false);
  assert.deepEqual(summary.bySource, { music: { runningCount: 2, unreadCount: 0 } });
  assert.equal(errors.length, 1);
});

test("running failure preserves the existing error behavior", async () => {
  const service = createGenerationNotificationService({
    loadRunningSummary: async () => {
      throw new Error("running query failed");
    },
    loadUnreadSummary: async () => [],
  });
  await assert.rejects(() => service.getSummary(7), /running query failed/);
});

test("legacy running summary never enters the unread dependency", async () => {
  let unreadCalls = 0;
  const service = createGenerationNotificationService({
    loadRunningSummary: async () => [{ source_type: "image", running_count: 1 }],
    loadUnreadSummary: async () => {
      unreadCalls += 1;
      throw new Error("receipt table unavailable");
    },
  });

  const summary = await service.getRunningSummary(7);
  assert.equal(summary.totalRunningCount, 1);
  assert.deepEqual(summary.bySource, { image: { runningCount: 1 } });
  assert.equal(unreadCalls, 0);
});
