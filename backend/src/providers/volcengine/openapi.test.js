import assert from "node:assert/strict";
import test from "node:test";
import {
  requestArkOpenApi,
  retryArkCreateWithReconciliation
} from "./openapi.js";

function transientFetchError(code = "UND_ERR_SOCKET") {
  const error = new TypeError("fetch failed");
  error.cause = { code };
  return error;
}

test("read-only Ark requests retry transient network failures", { concurrency: false }, async () => {
  const originalFetch = globalThis.fetch;
  const originalWarn = console.warn;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    if (calls < 3) throw transientFetchError();
    return new Response(JSON.stringify({ Result: { Items: [] } }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };
  console.warn = () => {};

  try {
    const result = await requestArkOpenApi("ListAssets", {});
    assert.deepEqual(result, { Items: [] });
    assert.equal(calls, 3);
  } finally {
    globalThis.fetch = originalFetch;
    console.warn = originalWarn;
  }
});

test("non-idempotent Ark creates are not blindly retried", { concurrency: false }, async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  globalThis.fetch = async () => {
    calls += 1;
    throw transientFetchError();
  };

  try {
    await assert.rejects(() => requestArkOpenApi("CreateAsset", {}), /fetch failed/);
    assert.equal(calls, 1);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("guarded create recovers a resource created before the response was lost", async () => {
  const recovered = { Id: "asset-recovered" };
  let lookupCalls = 0;
  let createCalls = 0;

  const result = await retryArkCreateWithReconciliation({
    label: "CreateAsset:Image",
    findExisting: async () => {
      lookupCalls += 1;
      return lookupCalls >= 2 ? recovered : null;
    },
    create: async () => {
      createCalls += 1;
      throw transientFetchError();
    },
    recoveryDelaysMs: [0],
    sleep: async () => {}
  });

  assert.equal(result, recovered);
  assert.equal(createCalls, 1);
  assert.equal(lookupCalls, 2);
});

test("guarded create retries only after reconciliation finds no remote resource", async () => {
  let createCalls = 0;

  const result = await retryArkCreateWithReconciliation({
    label: "CreateAssetGroup:test",
    findExisting: async () => null,
    create: async () => {
      createCalls += 1;
      if (createCalls === 1) throw transientFetchError("ECONNRESET");
      return { Id: "group-created" };
    },
    maxAttempts: 2,
    recoveryDelaysMs: [0],
    sleep: async () => {}
  });

  assert.deepEqual(result, { Id: "group-created" });
  assert.equal(createCalls, 2);
});
