import assert from "node:assert/strict";
import test from "node:test";
import { createGenerationResultReadRepository } from "./generationResultRead.repository.js";

test("read repository batches resource keys and returns a Set", async () => {
  const calls = [];
  const repository = createGenerationResultReadRepository({
    async query(sql, params) {
      calls.push({ sql, params });
      return [[{ resource_key: "task-2" }]];
    },
  });

  const result = await repository.listReadResourceKeys({
    userId: 7,
    sourceType: "image",
    resourceKeys: ["task-1", "task-2", "task-2"],
  });

  assert.deepEqual([...result], ["task-2"]);
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].params, [7, "image", "task-1", "task-2"]);
  assert.match(calls[0].sql, /resource_key IN \(\?,\?\)/);
});

test("read repository skips empty batches and preserves the first read time", async () => {
  const calls = [];
  const repository = createGenerationResultReadRepository({
    async query(sql, params) {
      calls.push({ sql, params });
      return [[]];
    },
  });

  assert.deepEqual(
    [...await repository.listReadResourceKeys({ userId: 7, sourceType: "image", resourceKeys: [] })],
    [],
  );
  assert.equal(calls.length, 0);

  await repository.insertReadReceipt({ userId: 7, sourceType: "image", resourceKey: "task-1" });
  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0].params, [7, "image", "task-1"]);
  assert.match(calls[0].sql, /ON DUPLICATE KEY UPDATE read_at = read_at/);
});
