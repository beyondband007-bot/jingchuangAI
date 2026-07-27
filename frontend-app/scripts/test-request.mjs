import assert from "node:assert/strict";
import test from "node:test";

import { requestJson } from "../src/api/request.js";

function jsonResponse(body, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(body),
  };
}

test("shares concurrent equivalent GET requests but makes a fresh request after completion", async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  let resolveFetch;
  globalThis.fetch = () => {
    requestCount += 1;
    return new Promise((resolve) => {
      resolveFetch = () => resolve(jsonResponse({ requestCount }));
    });
  };

  try {
    const first = requestJson("/tasks", { headers: { "X-View": "history" } });
    const second = requestJson("/tasks", { headers: { "x-view": "history" } });
    assert.equal(requestCount, 1);

    resolveFetch();
    assert.deepEqual(await first, { requestCount: 1 });
    assert.deepEqual(await second, { requestCount: 1 });

    const next = requestJson("/tasks", { headers: { "X-View": "history" } });
    assert.equal(requestCount, 2);
    resolveFetch();
    assert.deepEqual(await next, { requestCount: 2 });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not merge write requests", async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    return jsonResponse({ ok: true });
  };

  try {
    await Promise.all([
      requestJson("/tasks", { method: "POST", body: JSON.stringify({ name: "first" }) }),
      requestJson("/tasks", { method: "POST", body: JSON.stringify({ name: "second" }) }),
    ]);
    assert.equal(requestCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("does not merge GET requests with independent cancellation or cache semantics", async () => {
  const originalFetch = globalThis.fetch;
  let requestCount = 0;
  globalThis.fetch = async () => {
    requestCount += 1;
    return jsonResponse({ requestCount });
  };

  try {
    const firstController = new AbortController();
    const secondController = new AbortController();
    await Promise.all([
      requestJson("/tasks", { signal: firstController.signal }),
      requestJson("/tasks", { signal: secondController.signal }),
      requestJson("/tasks", { cache: "no-store" }),
    ]);
    assert.equal(requestCount, 3);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
