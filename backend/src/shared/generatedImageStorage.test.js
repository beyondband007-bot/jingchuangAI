import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  persistGeneratedImages,
  removeStoredGeneratedImages
} from "./generatedImageStorage.js";

async function withTempStorage(run) {
  const storageDir = await mkdtemp(path.join(os.tmpdir(), "generated-image-storage-"));
  try {
    await run(storageDir);
  } finally {
    await rm(storageDir, { recursive: true, force: true });
  }
}

test("persists generated images under a stable public media URL", async () => {
  await withTempStorage(async (storageDir) => {
    const imageBytes = Buffer.from("test-image");
    const urls = await persistGeneratedImages({
      taskId: 42,
      urls: ["https://tempfile.aiquickdraw.com/example.png"],
      storageDir,
      attempts: 1,
      fetchImpl: async () =>
        new Response(imageBytes, {
          status: 200,
          headers: {
            "content-type": "image/png",
            "content-length": String(imageBytes.length)
          }
        })
    });

    assert.deepEqual(urls, ["/media/generated/images/42/result-1.png"]);
    assert.deepEqual(
      await readFile(path.join(storageDir, "generated", "images", "42", "result-1.png")),
      imageBytes
    );
    await removeStoredGeneratedImages({ taskId: 42, storageDir });
    await assert.rejects(
      readFile(path.join(storageDir, "generated", "images", "42", "result-1.png")),
      /ENOENT/
    );
  });
});

test("rejects a non-image provider response", async () => {
  await withTempStorage(async (storageDir) => {
    await assert.rejects(
      persistGeneratedImages({
        taskId: 43,
        urls: ["https://tempfile.aiquickdraw.com/error"],
        storageDir,
        attempts: 1,
        fetchImpl: async () =>
          new Response("<html>error</html>", {
            status: 200,
            headers: { "content-type": "text/html" }
          })
      }),
      /unsupported content type/
    );
  });
});

test("rejects an image larger than the configured limit", async () => {
  await withTempStorage(async (storageDir) => {
    await assert.rejects(
      persistGeneratedImages({
        taskId: 44,
        urls: ["https://tempfile.aiquickdraw.com/large.jpg"],
        storageDir,
        maxBytes: 4,
        attempts: 1,
        fetchImpl: async () =>
          new Response(Buffer.from("12345"), {
            status: 200,
            headers: {
              "content-type": "image/jpeg",
              "content-length": "5"
            }
          })
      }),
      /exceeds/
    );
  });
});
