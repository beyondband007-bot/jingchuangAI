import assert from "node:assert/strict";
import test from "node:test";
import {
  createGenerationResultReadService,
  normalizeGenerationResultReadInput,
} from "./generationResultRead.service.js";

function createRegistry(enabledAdapter, registeredAdapter = enabledAdapter) {
  return {
    get: () => registeredAdapter,
    getEnabledAdapter: () => enabledAdapter,
    getSourceEnabledAt: () => new Date("2026-08-08T00:00:00.000Z"),
    getHistoryWindowSize: () => 20,
  };
}

test("mark read input accepts only the public identity fields", () => {
  assert.deepEqual(
    normalizeGenerationResultReadInput({ sourceType: "image", resourceKey: "thread-test_1" }),
    { sourceType: "image", resourceKey: "thread-test_1" },
  );
  assert.throws(
    () => normalizeGenerationResultReadInput({ sourceType: "image", resourceKey: "task-1", userId: 99 }),
    (error) => error.status === 400,
  );
  assert.throws(
    () => normalizeGenerationResultReadInput({ sourceType: "image", resourceKey: "bad key" }),
    (error) => error.status === 400,
  );
});

test("mark read does nothing for disabled or invisible resources", async () => {
  let writes = 0;
  const readRepository = { insertReadReceipt: async () => { writes += 1; } };
  const registeredAdapter = {
    validateResourceKey: () => true,
    findOwnedReadableResource: async () => true,
  };
  const disabledService = createGenerationResultReadService({
    registry: createRegistry(null, registeredAdapter),
    readRepository,
  });
  assert.equal(await disabledService.markResultRead({
    userId: 7,
    input: { sourceType: "image", resourceKey: "task-1" },
  }), false);

  const invisibleService = createGenerationResultReadService({
    registry: createRegistry({
      validateResourceKey: () => true,
      findOwnedReadableResource: async () => false,
    }),
    readRepository,
  });
  assert.equal(await invisibleService.markResultRead({
    userId: 7,
    input: { sourceType: "image", resourceKey: "task-1" },
  }), false);
  assert.equal(writes, 0);
});

test("mark read rejects an unregistered source instead of reporting success", async () => {
  const service = createGenerationResultReadService({
    registry: createRegistry(null, null),
    readRepository: {
      insertReadReceipt: async () => {
        throw new Error("must not write");
      },
    },
  });

  await assert.rejects(
    () => service.markResultRead({
      userId: 7,
      input: { sourceType: "unknown-source", resourceKey: "task-1" },
    }),
    (error) => error.status === 400 && error.message === "Invalid sourceType",
  );
});

test("mark read verifies ownership and window before idempotent receipt insertion", async () => {
  const verifierCalls = [];
  const writes = [];
  const service = createGenerationResultReadService({
    registry: createRegistry({
      validateResourceKey: (key) => key.startsWith("task-"),
      async findOwnedReadableResource(input) {
        verifierCalls.push(input);
        return true;
      },
    }),
    readRepository: {
      insertReadReceipt: async (input) => writes.push(input),
    },
  });

  assert.equal(await service.markResultRead({
    userId: 7,
    input: { sourceType: "image", resourceKey: "task-1" },
  }), true);
  assert.equal(verifierCalls.length, 1);
  assert.equal(verifierCalls[0].userId, 7);
  assert.equal(verifierCalls[0].windowSize, 20);
  assert.equal(verifierCalls[0].sourceEnabledAt.toISOString(), "2026-08-08T00:00:00.000Z");
  assert.deepEqual(writes, [{ userId: 7, sourceType: "image", resourceKey: "task-1" }]);
});
