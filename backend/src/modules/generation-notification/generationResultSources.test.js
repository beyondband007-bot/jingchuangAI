import assert from "node:assert/strict";
import test from "node:test";
import { createGenerationResultSourceRegistry } from "./generationResultSources.js";

function createAdapter(sourceType, navId = sourceType) {
  return {
    sourceType,
    navId,
    validateResourceKey: () => true,
    buildUnreadCountFragment: () => ({ sql: "SELECT 1", params: [] }),
    listReadableResourceKeys: async () => new Set(),
    findOwnedReadableResource: async () => false,
  };
}

function unreadConfig(enabledSources, sourceEnabledAt) {
  return { enabledSources, sourceEnabledAt, historyWindowSize: 20 };
}

test("source registry rejects duplicate and incomplete static adapters", () => {
  assert.throws(
    () => createGenerationResultSourceRegistry(
      [createAdapter("image"), createAdapter("image")],
      unreadConfig(new Set(), new Map()),
    ),
    /Duplicate generation result source adapter/,
  );
  assert.throws(
    () => createGenerationResultSourceRegistry(
      [{ sourceType: "image", navId: "image" }],
      unreadConfig(new Set(), new Map()),
    ),
    /requires validateResourceKey/,
  );
  assert.throws(
    () => createGenerationResultSourceRegistry(
      [createAdapter("unknown-source")],
      unreadConfig(new Set(["unknown-source"]), new Map([
        ["unknown-source", new Date("2026-08-08T00:00:00.000Z")],
      ])),
    ),
    /Unknown generation result source adapter/,
  );
});

test("source registry only exposes configured adapters with their own timestamp", () => {
  const imageDate = new Date("2026-08-08T00:00:00.000Z");
  const registry = createGenerationResultSourceRegistry(
    [createAdapter("image"), createAdapter("video")],
    unreadConfig(new Set(["image", "video", "unknown"]), new Map([
      ["image", imageDate],
      ["unknown", new Date("2026-08-09T00:00:00.000Z")],
    ])),
  );

  assert.equal(registry.getEnabledAdapter("image")?.sourceType, "image");
  assert.equal(registry.getEnabledAdapter("video"), null);
  assert.equal(registry.getEnabledAdapter("unknown"), null);
  assert.equal(registry.getSourceEnabledAt("image"), imageDate);
  assert.deepEqual(registry.listEnabledAdapters().map((adapter) => adapter.sourceType), ["image"]);
});
