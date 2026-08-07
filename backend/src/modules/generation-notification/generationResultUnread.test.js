import assert from "node:assert/strict";
import test from "node:test";
import { decorateGenerationResults } from "./generationResultUnread.js";

function createRegistry(adapter) {
  const enabledAt = new Date("2026-08-08T00:00:00.000Z");
  return {
    getEnabledAdapter: () => adapter,
    getSourceEnabledAt: () => enabledAt,
    getHistoryWindowSize: () => 20,
  };
}

test("history decorator batches readability and receipts without mutating items", async () => {
  const items = [{ id: 1 }, { id: 2 }, { id: 3 }];
  const calls = { readable: 0, read: 0 };
  const adapter = {
    validateResourceKey: (key) => /^task-\d+$/.test(key),
    async listReadableResourceKeys(input) {
      calls.readable += 1;
      assert.deepEqual(input.resourceKeys, ["task-1", "task-2", "task-3"]);
      assert.equal(input.windowSize, 20);
      assert.equal(input.sourceEnabledAt.toISOString(), "2026-08-08T00:00:00.000Z");
      return new Set(["task-1", "task-2"]);
    },
  };
  const readRepository = {
    async listReadResourceKeys(input) {
      calls.read += 1;
      assert.deepEqual(input.resourceKeys, ["task-1", "task-2"]);
      return new Set(["task-2"]);
    },
  };

  const decorated = await decorateGenerationResults({
    userId: 7,
    sourceType: "image",
    items,
    getResourceKey: (item) => `task-${item.id}`,
    registry: createRegistry(adapter),
    readRepository,
  });

  assert.deepEqual(items, [{ id: 1 }, { id: 2 }, { id: 3 }]);
  assert.deepEqual(decorated.map(({ resourceKey, isUnread }) => ({ resourceKey, isUnread })), [
    { resourceKey: "task-1", isUnread: true },
    { resourceKey: "task-2", isUnread: false },
    { resourceKey: "task-3", isUnread: false },
  ]);
  assert.deepEqual(calls, { readable: 1, read: 1 });
});

test("history decorator fails closed when unread storage is unavailable", async () => {
  const decorated = await decorateGenerationResults({
    userId: 7,
    sourceType: "image",
    items: [{ id: 1 }],
    getResourceKey: (item) => `task-${item.id}`,
    registry: createRegistry({
      validateResourceKey: () => true,
      listReadableResourceKeys: async () => new Set(["task-1"]),
    }),
    readRepository: {
      listReadResourceKeys: async () => {
        throw new Error("receipt table unavailable");
      },
    },
    logError: () => {},
  });
  assert.equal(decorated[0].isUnread, false);
});

test("history decorator isolates resource identity failures to the affected item", async () => {
  const errors = [];
  const decorated = await decorateGenerationResults({
    userId: 7,
    sourceType: "image",
    items: [{ id: 1 }, { id: 2 }],
    getResourceKey: (item) => {
      if (item.id === 1) throw new Error("legacy item has no identity");
      return `task-${item.id}`;
    },
    registry: createRegistry({
      validateResourceKey: (key) => key === "task-2",
      listReadableResourceKeys: async () => new Set(["task-2"]),
    }),
    readRepository: { listReadResourceKeys: async () => new Set() },
    logError: (...args) => errors.push(args),
  });

  assert.deepEqual(decorated.map(({ resourceKey, isUnread }) => ({ resourceKey, isUnread })), [
    { resourceKey: "", isUnread: false },
    { resourceKey: "task-2", isUnread: true },
  ]);
  assert.equal(errors.length, 1);
});

test("history decorator fails closed when a source validator throws", async () => {
  const errors = [];
  const decorated = await decorateGenerationResults({
    userId: 7,
    sourceType: "image",
    items: [{ id: 1 }],
    getResourceKey: (item) => `task-${item.id}`,
    registry: createRegistry({
      validateResourceKey: () => {
        throw new Error("validator unavailable");
      },
    }),
    logError: (...args) => errors.push(args),
  });

  assert.equal(decorated[0].isUnread, false);
  assert.equal(errors.length, 1);
});
