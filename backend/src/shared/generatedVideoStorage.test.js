import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";
import { ffmpegPath } from "./ffmpegPath.js";
import {
  createGeneratedVideoThumbnail,
  persistGeneratedVideos,
  removeStoredGeneratedVideos
} from "./generatedVideoStorage.js";

const execFileAsync = promisify(execFile);

async function withTempStorage(run) {
  const storageDir = await mkdtemp(path.join(os.tmpdir(), "generated-video-storage-"));
  try {
    await run(storageDir);
  } finally {
    await rm(storageDir, { recursive: true, force: true });
  }
}

test("persists generated videos under a stable public media URL", async () => {
  await withTempStorage(async (storageDir) => {
    const videoBytes = Buffer.from("test-video");
    const urls = await persistGeneratedVideos({
      taskId: 42,
      urls: ["https://ark-acg-cn-beijing.tos-cn-beijing.volces.com/example.mp4"],
      storageDir,
      attempts: 1,
      fetchImpl: async () =>
        new Response(videoBytes, {
          status: 200,
          headers: {
            "content-type": "video/mp4",
            "content-length": String(videoBytes.length)
          }
        })
    });

    assert.deepEqual(urls, ["/media/generated/videos/42/result-1.mp4"]);
    assert.deepEqual(
      await readFile(path.join(storageDir, "generated", "videos", "42", "result-1.mp4")),
      videoBytes
    );
    await removeStoredGeneratedVideos({ taskId: 42, storageDir });
    await assert.rejects(
      readFile(path.join(storageDir, "generated", "videos", "42", "result-1.mp4")),
      /ENOENT/
    );
  });
});

test("rejects a non-video provider response", async () => {
  await withTempStorage(async (storageDir) => {
    await assert.rejects(
      persistGeneratedVideos({
        taskId: 43,
        urls: ["https://ark-acg-cn-beijing.tos-cn-beijing.volces.com/error"],
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

test("keeps task ids isolated by feature", async () => {
  await withTempStorage(async (storageDir) => {
    const urls = await persistGeneratedVideos({
      taskId: 42,
      feature: "digital-human-videos",
      urls: ["https://ark-acg-cn-beijing.tos-cn-beijing.volces.com/example.mp4"],
      storageDir,
      fetchImpl: async () =>
        new Response(Buffer.from("digital-human-video"), {
          status: 200,
          headers: { "content-type": "video/mp4" }
        })
    });

    assert.deepEqual(urls, ["/media/generated/digital-human-videos/42/result-1.mp4"]);
    assert.equal(
      String(await readFile(path.join(storageDir, "generated", "digital-human-videos", "42", "result-1.mp4"))),
      "digital-human-video"
    );
  });
});

test("removes a partial file when the configured limit is exceeded", async () => {
  await withTempStorage(async (storageDir) => {
    await assert.rejects(
      persistGeneratedVideos({
        taskId: 44,
        urls: ["https://ark-acg-cn-beijing.tos-cn-beijing.volces.com/large.mp4"],
        storageDir,
        maxBytes: 4,
        attempts: 1,
        fetchImpl: async () =>
          new Response(Buffer.from("12345"), {
            status: 200,
            headers: { "content-type": "video/mp4" }
          })
      }),
      /exceeds/
    );

    const taskDir = path.join(storageDir, "generated", "videos", "44");
    const entries = await import("node:fs/promises").then(({ readdir }) => readdir(taskDir));
    assert.deepEqual(entries, []);
  });
});

test("creates a 500px JPEG thumbnail from a non-black generated video frame", async () => {
  await withTempStorage(async (storageDir) => {
    const taskDir = path.join(storageDir, "generated", "videos", "45");
    await import("node:fs/promises").then(({ mkdir }) => mkdir(taskDir, { recursive: true }));
    const videoPath = path.join(taskDir, "result-1.mp4");
    await execFileAsync(ffmpegPath, [
      "-y",
      "-f", "lavfi", "-i", "color=c=black:s=640x360:d=1",
      "-f", "lavfi", "-i", "color=c=red:s=640x360:d=2",
      "-filter_complex", "[0:v][1:v]concat=n=2:v=1:a=0",
      "-c:v", "libx264", "-pix_fmt", "yuv420p", videoPath
    ]);

    const thumbnailUrl = await createGeneratedVideoThumbnail({
      taskId: 45,
      videoUrl: "/media/generated/videos/45/result-1.mp4",
      storageDir
    });
    const thumbnail = await readFile(path.join(taskDir, "result-1-thumbnail.jpg"));
    assert.equal(thumbnailUrl, "/media/generated/videos/45/result-1-thumbnail.jpg");
    assert.deepEqual([...thumbnail.subarray(0, 2)], [0xff, 0xd8]);
    assert.ok(thumbnail.length > 1_000);
  });
});
