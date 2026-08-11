import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { ffmpegPath } from "./ffmpegPath.js";
import sharp from "sharp";
import {
  persistGeneratedImages,
  removeStoredGeneratedImages,
  GENERATED_IMAGE_THUMBNAIL
} from "./generatedImageStorage.js";

const execFileAsync = promisify(execFile);

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
    const sourcePath = path.join(storageDir, "source.png");
    await execFileAsync(ffmpegPath, [
      "-y",
      "-f",
      "lavfi",
      "-i",
      "color=c=#3264a8:s=1200x600",
      "-frames:v",
      "1",
      sourcePath
    ]);
    const imageBytes = await readFile(sourcePath);
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
    const thumbnail = await readFile(path.join(storageDir, "generated", "images", "42", "thumbnail-1.jpg"));
    assert.deepEqual(thumbnail.subarray(0, 2), Buffer.from([0xff, 0xd8]));
    const thumbnailMetadata = await sharp(thumbnail).metadata();
    assert.equal(thumbnailMetadata.format, "jpeg");
    assert.equal(thumbnailMetadata.width, GENERATED_IMAGE_THUMBNAIL.width);
    assert.equal(GENERATED_IMAGE_THUMBNAIL.jpegQuality, 90);
    await removeStoredGeneratedImages({ taskId: 42, storageDir });
    await assert.rejects(
      readFile(path.join(storageDir, "generated", "images", "42", "result-1.png")),
      /ENOENT/
    );
    await assert.rejects(
      stat(path.join(storageDir, "generated", "images", "42", "thumbnail-1.jpg")),
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
