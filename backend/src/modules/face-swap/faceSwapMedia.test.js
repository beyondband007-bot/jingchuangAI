import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import test from "node:test";
import { ffmpegPath } from "../../shared/ffmpegPath.js";
import { preserveOriginalAudio } from "../../providers/ffmpeg/video.js";
import { normalizeArkVideoErrorMessage } from "../../providers/volcengine/videoGeneration.js";
import { selectVirtualAssetReference } from "../digital-human/arkVirtualAssets.service.js";
import { buildFaceSwapPrompt } from "./faceSwapPrompt.js";

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    proc.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    proc.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-800)}`));
    });
    proc.on("error", reject);
  });
}

async function audioHash(filePath) {
  const { stdout } = await runFfmpeg([
    "-i", filePath,
    "-map", "0:a:0",
    "-c", "copy",
    "-f", "md5",
    "-"
  ]);
  return stdout.trim();
}

test("face swap prompt requests a strict edit instead of a reference-video generation", () => {
  const prompt = buildFaceSwapPrompt();
  assert.match(prompt, /严格编辑视频1/);
  assert.match(prompt, /完整保留视频1的原始音轨/);
  assert.doesNotMatch(prompt, /视频1是.*参考/);
});

test("Seedance references an active Ark asset URI instead of its public upload URL", () => {
  assert.equal(
    selectVirtualAssetReference({
      assetUri: "asset://ark-asset-123",
      publicUrl: "https://example.com/upload.jpg"
    }),
    "asset://ark-asset-123"
  );
  assert.equal(
    selectVirtualAssetReference({
      assetUri: "asset://local-placeholder",
      publicUrl: "https://example.com/upload.jpg"
    }),
    "https://example.com/upload.jpg"
  );
});

test("Ark privacy rejection is translated into an explicit user-facing message", () => {
  const message = normalizeArkVideoErrorMessage({
    error: {
      code: "InputImageSensitiveContentDetected.PrivacyInformation",
      message: "The input image may contain real person"
    },
    request_id: "request-123"
  });
  assert.match(message, /隐私内容审核/);
  assert.match(message, /request-123/);
});

test("preserveOriginalAudio copies the original compressed audio stream unchanged", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "face-swap-audio-"));
  const originalPath = path.join(tempDir, "original.mp4");
  const generatedPath = path.join(tempDir, "generated.mp4");
  const outputPath = path.join(tempDir, "output.mp4");

  try {
    await runFfmpeg([
      "-y",
      "-f", "lavfi",
      "-i", "color=c=blue:s=320x240:d=2",
      "-f", "lavfi",
      "-i", "sine=frequency=880:duration=2",
      "-c:v", "libx264",
      "-c:a", "aac",
      "-shortest",
      originalPath
    ]);
    await runFfmpeg([
      "-y",
      "-f", "lavfi",
      "-i", "color=c=red:s=320x240:d=3",
      "-c:v", "libx264",
      "-an",
      generatedPath
    ]);

    await preserveOriginalAudio({
      videoPath: generatedPath,
      originalVideoPath: originalPath,
      outputPath
    });

    assert.equal(await audioHash(outputPath), await audioHash(originalPath));
    assert.ok((await readFile(outputPath)).length > 0);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});

test("preserveOriginalAudio keeps the complete source audio when provider video is shorter", async () => {
  const tempDir = await mkdtemp(path.join(os.tmpdir(), "face-swap-short-video-"));
  const originalPath = path.join(tempDir, "original.mp4");
  const generatedPath = path.join(tempDir, "generated.mp4");
  const outputPath = path.join(tempDir, "output.mp4");

  try {
    await runFfmpeg([
      "-y",
      "-f", "lavfi",
      "-i", "color=c=blue:s=320x240:d=2",
      "-f", "lavfi",
      "-i", "sine=frequency=880:duration=2",
      "-c:v", "libx264",
      "-c:a", "aac",
      "-shortest",
      originalPath
    ]);
    await runFfmpeg([
      "-y",
      "-f", "lavfi",
      "-i", "color=c=red:s=320x240:d=1",
      "-c:v", "libx264",
      "-an",
      generatedPath
    ]);

    const result = await preserveOriginalAudio({
      videoPath: generatedPath,
      originalVideoPath: originalPath,
      outputPath
    });

    assert.equal(await audioHash(outputPath), await audioHash(originalPath));
    assert.ok(result.videoDuration >= 1.95);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
});
