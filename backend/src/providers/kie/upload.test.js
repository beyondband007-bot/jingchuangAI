import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "fs/promises";
import os from "os";
import path from "path";
import test from "node:test";
import { config } from "../../config/index.js";
import { uploadFileToKie } from "./upload.js";

test("uses a content-hash filename and reuses only the fresh upload cache", async () => {
  const originalFetch = globalThis.fetch;
  const originalApiKey = config.kie.apiKey;
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "kie-upload-"));
  const firstPath = path.join(tempDir, "first.png");
  const secondPath = path.join(tempDir, "second.png");
  await writeFile(firstPath, Buffer.from("same-image-content"));
  await writeFile(secondPath, Buffer.from("same-image-content"));
  let calls = 0;
  let uploadedFileName = "";

  config.kie.apiKey = "test-key";
  globalThis.fetch = async (_url, options) => {
    calls += 1;
    uploadedFileName = options.body.get("fileName");
    return new Response(JSON.stringify({
      code: 200,
      data: { fileUrl: "https://tempfile.example.com/reference.png" }
    }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  };

  try {
    const uploadPath = `video-references/test-${Date.now()}`;
    const first = await uploadFileToKie({
      filePath: firstPath,
      fileName: "original.png",
      mimeType: "image/png",
      uploadPath
    });
    const second = await uploadFileToKie({
      filePath: secondPath,
      fileName: "renamed.png",
      mimeType: "image/png",
      uploadPath
    });

    assert.equal(calls, 1);
    assert.match(uploadedFileName, /^[a-f0-9]{64}\.png$/);
    assert.equal(first.contentHash, second.contentHash);
    assert.equal(second.cached, true);
  } finally {
    globalThis.fetch = originalFetch;
    config.kie.apiKey = originalApiKey;
    await rm(tempDir, { recursive: true, force: true });
  }
});
