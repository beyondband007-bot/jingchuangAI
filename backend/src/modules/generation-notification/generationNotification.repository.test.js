import assert from "node:assert/strict";
import test from "node:test";
import { getUnreadTaskSummary } from "./generationNotification.repository.js";

function createRegistry(adapters) {
  return {
    listEnabledAdapters: () => adapters,
    getSourceEnabledAt: (sourceType) => new Date(sourceType === "image"
      ? "2026-08-08T00:00:00.000Z"
      : "2026-08-09T00:00:00.000Z"),
    getHistoryWindowSize: () => 20,
  };
}

test("unread summary composes all static fragments into one UNION ALL query", async () => {
  const buildCalls = [];
  const adapters = ["image", "video"].map((sourceType) => ({
    sourceType,
    buildUnreadCountFragment(input) {
      buildCalls.push({ sourceType, input });
      return {
        sql: "SELECT ? AS source_type, ? AS unread_count",
        params: [sourceType, sourceType === "image" ? 2 : 0],
      };
    },
  }));
  const queries = [];
  const rows = await getUnreadTaskSummary(7, {
    registry: createRegistry(adapters),
    pool: {
      async query(sql, params) {
        queries.push({ sql, params });
        return [[
          { source_type: "image", unread_count: 2 },
          { source_type: "video", unread_count: 0 },
        ]];
      },
    },
  });

  assert.equal(queries.length, 1);
  assert.match(queries[0].sql, /UNION ALL/);
  assert.deepEqual(queries[0].params, ["image", 2, "video", 0]);
  assert.equal(buildCalls[0].input.userId, 7);
  assert.equal(buildCalls[0].input.windowSize, 20);
  assert.deepEqual(rows, [{ source_type: "image", unread_count: 2 }]);
});

test("unread summary performs no database query when no source adapter is enabled", async () => {
  let queryCount = 0;
  const rows = await getUnreadTaskSummary(7, {
    registry: createRegistry([]),
    pool: { query: async () => { queryCount += 1; } },
  });
  assert.deepEqual(rows, []);
  assert.equal(queryCount, 0);
});

test("unread summary rejects malformed count rows instead of returning partial data", async () => {
  const registry = createRegistry([{
    sourceType: "image",
    buildUnreadCountFragment: () => ({ sql: "SELECT 1", params: [] }),
  }]);

  await assert.rejects(
    () => getUnreadTaskSummary(7, {
      registry,
      pool: { query: async () => [[{ source_type: "image", unreadCount: 2 }]] },
    }),
    /Invalid unread summary row/,
  );
});

test("unread summary rejects unexpected and duplicate source rows", async () => {
  const registry = createRegistry([{
    sourceType: "image",
    buildUnreadCountFragment: () => ({ sql: "SELECT 1", params: [] }),
  }]);
  const invalidRowSets = [
    [{ source_type: "video", unread_count: 1 }],
    [
      { source_type: "image", unread_count: 1 },
      { source_type: "image", unread_count: 2 },
    ],
  ];

  for (const rows of invalidRowSets) {
    await assert.rejects(
      () => getUnreadTaskSummary(7, {
        registry,
        pool: { query: async () => [rows] },
      }),
      /Invalid unread summary row/,
    );
  }
});
