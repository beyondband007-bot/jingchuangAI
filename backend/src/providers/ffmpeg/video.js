import { spawn } from "child_process";
import { createHash } from "crypto";
import { mkdir, readFile, readdir, stat } from "fs/promises";
import path from "path";
import { ffmpegPath } from "../../shared/ffmpegPath.js";
import { ffprobePath } from "../../shared/ffprobePath.js";

function runFfmpeg(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, args, { windowsHide: true });
    let stderr = "";
    proc.stderr.on("data", (data) => { stderr += data.toString(); });
    proc.on("close", (code) => {
      if (code === 0) resolve(stderr);
      else reject(new Error(`ffmpeg exited ${code}: ${stderr.slice(-400)}`));
    });
    proc.on("error", reject);
  });
}

function runFfprobe(args, timeoutMs = 30000) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffprobePath, args, { windowsHide: true });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error("ffprobe timed out"));
    }, timeoutMs);
    proc.stdout.on("data", (data) => { stdout += data.toString(); });
    proc.stderr.on("data", (data) => { stderr += data.toString(); });
    proc.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(stdout);
      else reject(new Error(`ffprobe exited ${code}: ${stderr.slice(-400)}`));
    });
    proc.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

async function probeVideoWithFfmpeg(videoPath) {
  const output = await runFfmpeg([
    "-hide_banner",
    "-i", videoPath,
    "-map", "0:v:0",
    "-frames:v", "1",
    "-f", "null",
    "-"
  ]);
  const durationMatch = output.match(/Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/i);
  const videoMatch = output.match(/Video:\s*([^,\s]+).*?(\d{2,5})x(\d{2,5})/i);
  const formatMatch = output.match(/Input #0,\s*(.+?),\s*from\s/i);
  if (!durationMatch || !videoMatch) {
    throw new Error("ffmpeg returned incomplete video metadata");
  }
  const duration = (
    Number(durationMatch[1]) * 3600
    + Number(durationMatch[2]) * 60
    + Number(durationMatch[3])
  );
  if (!Number.isFinite(duration) || duration <= 0) {
    throw new Error("video duration is invalid");
  }
  const fileStat = await stat(videoPath);
  return {
    durationSeconds: duration,
    width: Number(videoMatch[2] || 0),
    height: Number(videoMatch[3] || 0),
    codec: videoMatch[1] || "",
    format: formatMatch?.[1] || "",
    hasAudio: /Stream #.*Audio:/i.test(output),
    sizeBytes: fileStat.size
  };
}

export async function probeVideo(videoPath) {
  let output;
  try {
    output = await runFfprobe([
      "-v", "error",
      "-show_streams",
      "-show_format",
      "-of", "json",
      videoPath
    ]);
  } catch (error) {
    console.warn(`[FFmpeg] ffprobe unavailable, using ffmpeg metadata fallback: ${error.message}`);
    return probeVideoWithFfmpeg(videoPath);
  }
  let metadata;
  try {
    metadata = JSON.parse(output);
  } catch {
    throw new Error("ffprobe returned invalid metadata");
  }

  const videoStream = metadata.streams?.find((stream) => stream.codec_type === "video");
  if (!videoStream) throw new Error("video stream not found");
  const duration = Number(metadata.format?.duration || videoStream.duration);
  if (!Number.isFinite(duration) || duration <= 0) throw new Error("video duration is invalid");

  return {
    durationSeconds: duration,
    width: Number(videoStream.width || 0),
    height: Number(videoStream.height || 0),
    codec: videoStream.codec_name || "",
    format: metadata.format?.format_name || "",
    hasAudio: Boolean(metadata.streams?.some((stream) => stream.codec_type === "audio")),
    sizeBytes: Number(metadata.format?.size || 0)
  };
}

export async function getVideoDuration(videoPath) {
  const metadata = await probeVideo(videoPath);
  return metadata.durationSeconds;
}

export async function normalizeVideoToSource({ videoPath, sourcePath, outputPath }) {
  const source = await probeVideo(sourcePath);
  const duration = source.durationSeconds;
  const padDuration = Math.max(0, duration - (await getVideoDuration(videoPath)));
  const videoFilter = [
    `scale=${source.width}:${source.height}:force_original_aspect_ratio=decrease`,
    `pad=${source.width}:${source.height}:(ow-iw)/2:(oh-ih)/2`,
    ...(padDuration > 0.01 ? [`tpad=stop_mode=clone:stop_duration=${padDuration.toFixed(3)}`] : [])
  ].join(",");
  await runFfmpeg([
    "-y",
    "-i", videoPath,
    "-vf", videoFilter,
    "-af", "apad",
    "-map", "0:v:0",
    "-map", "0:a?",
    "-c:v", "libx264",
    "-crf", "18",
    "-preset", "medium",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-t", duration.toFixed(3),
    "-movflags", "+faststart",
    outputPath
  ]);
  return { outputPath, width: source.width, height: source.height, durationSeconds: duration };
}

export async function preserveOriginalAudio({ videoPath, originalVideoPath, outputPath }) {
  const [generatedDuration, originalDuration] = await Promise.all([
    getVideoDuration(videoPath),
    getVideoDuration(originalVideoPath)
  ]);
  const padDuration = Math.max(0, originalDuration - generatedDuration);
  const args = [
    "-y",
    "-i", videoPath,
    "-i", originalVideoPath,
    "-map", "0:v:0",
    "-map", "1:a?",
    ...(padDuration > 0.05
      ? [
          "-vf", `tpad=stop_mode=clone:stop_duration=${padDuration.toFixed(3)}`,
          "-c:v", "libx264",
          "-preset", "medium",
          "-crf", "18",
          "-pix_fmt", "yuv420p"
        ]
      : ["-c:v", "copy"]),
    "-c:a", "copy",
    "-map_metadata", "1",
    "-map_chapters", "1",
    "-t", originalDuration.toFixed(3),
    "-movflags", "+faststart",
    outputPath
  ];
  await runFfmpeg(args);
  return {
    outputPath,
    videoDuration: await getVideoDuration(outputPath)
  };
}

function buildAtempoFilter(ratio) {
  let remaining = Number(ratio) || 1;
  const filters = [];
  while (remaining > 2) {
    filters.push("atempo=2");
    remaining /= 2;
  }
  while (remaining < 0.5) {
    filters.push("atempo=0.5");
    remaining /= 0.5;
  }
  filters.push(`atempo=${remaining.toFixed(3)}`);
  return filters.join(",");
}

export async function extractKeyFrames(videoPath, framesDir, count = 3) {
  await mkdir(framesDir, { recursive: true });
  const duration = await getVideoDuration(videoPath);
  // Avoid seeking too close to the end; leave 0.5s margin for the last frame
  const maxPos = Math.max(0, duration - 0.5);
  const positions = [];
  for (let i = 1; i <= count; i++) {
    positions.push(Math.min(maxPos, (duration * i) / (count + 1)));
  }

  const frames = [];
  for (let i = 0; i < positions.length; i++) {
    const time = positions[i];
    const outFile = path.join(framesDir, `frame_${String(i + 1).padStart(3, "0")}.jpg`);
    const args = [
      "-ss", String(time),
      "-i", videoPath,
      "-frames:v", "1",
      "-q:v", "2",
      "-y",
      outFile
    ];
    try {
      await runFfmpeg(args);
      const st = await stat(outFile);
      if (!st.isFile() || st.size === 0) throw new Error("ffmpeg produced empty frame");
      const buf = await readFile(outFile);
      frames.push(buf.toString("base64"));
    } catch (err) {
      console.warn(`[FFmpeg] Frame ${i + 1} at ${time}s failed: ${err.message}`);
      // Continue with remaining frames
    }
  }
  if (frames.length === 0) {
    throw new Error("failed to extract any frames from video");
  }
  return frames;
}

async function readAnalysisFrame(filePath, timestampSeconds) {
  const buffer = await readFile(filePath);
  if (!buffer.length) throw new Error("ffmpeg produced empty frame");
  return {
    base64: buffer.toString("base64"),
    timestampSeconds: Math.max(0, Number(timestampSeconds) || 0),
    hash: createHash("sha256").update(buffer).digest("hex")
  };
}

async function extractFrameAt(videoPath, outputPath, timestampSeconds) {
  await runFfmpeg([
    "-ss", String(Math.max(0, timestampSeconds)),
    "-i", videoPath,
    "-frames:v", "1",
    "-vf", "scale=1280:-2:force_original_aspect_ratio=decrease",
    "-q:v", "3",
    "-y",
    outputPath
  ]);
  const fileStat = await stat(outputPath);
  if (!fileStat.isFile() || !fileStat.size) throw new Error("ffmpeg produced empty frame");
  return readAnalysisFrame(outputPath, timestampSeconds);
}

export async function extractVideoAnalysisFrames(videoPath, framesDir, {
  count = 12,
  sceneThreshold = 0.28,
  metadata
} = {}) {
  await mkdir(framesDir, { recursive: true });
  const videoMetadata = metadata || await probeVideo(videoPath);
  const duration = videoMetadata.durationSeconds;
  const targetCount = Math.max(4, Math.min(24, Math.round(Number(count) || 12)));
  const sceneLimit = Math.max(2, Math.floor(targetCount / 2));
  const candidates = [];

  const scenePattern = path.join(framesDir, "scene_%03d.jpg");
  try {
    const sceneOutput = await runFfmpeg([
      "-i", videoPath,
      "-vf", `select=gt(scene\\,${Number(sceneThreshold) || 0.28}),showinfo,scale=1280:-2:force_original_aspect_ratio=decrease`,
      "-vsync", "vfr",
      "-frames:v", String(sceneLimit),
      "-q:v", "3",
      "-y",
      scenePattern
    ]);
    const timestamps = Array.from(sceneOutput.matchAll(/pts_time:([0-9.]+)/g))
      .map((match) => Number(match[1]))
      .filter(Number.isFinite);
    const sceneFiles = (await readdir(framesDir))
      .filter((name) => /^scene_\d+\.jpg$/i.test(name))
      .sort();
    for (let index = 0; index < sceneFiles.length; index += 1) {
      candidates.push(await readAnalysisFrame(
        path.join(framesDir, sceneFiles[index]),
        timestamps[index] ?? (duration * (index + 1)) / (sceneFiles.length + 1)
      ));
    }
  } catch (error) {
    console.warn(`[FFmpeg] Scene frame extraction failed, using uniform frames: ${error.message}`);
  }

  const uniformCount = targetCount;
  const endPosition = Math.max(0, duration - Math.min(0.1, duration / 10));
  for (let index = 0; index < uniformCount; index += 1) {
    const ratio = uniformCount === 1 ? 0.5 : index / (uniformCount - 1);
    const timestamp = Math.min(endPosition, Math.max(0, duration * ratio));
    const outputPath = path.join(framesDir, `uniform_${String(index + 1).padStart(3, "0")}.jpg`);
    try {
      candidates.push(await extractFrameAt(videoPath, outputPath, timestamp));
    } catch (error) {
      console.warn(`[FFmpeg] Uniform frame ${index + 1} at ${timestamp}s failed: ${error.message}`);
    }
  }

  const unique = [];
  const hashes = new Set();
  for (const frame of candidates.sort((left, right) => left.timestampSeconds - right.timestampSeconds)) {
    if (hashes.has(frame.hash)) continue;
    hashes.add(frame.hash);
    unique.push({
      base64: frame.base64,
      timestampSeconds: frame.timestampSeconds
    });
  }

  if (unique.length < 4) {
    throw new Error(`insufficient valid video frames: ${unique.length}`);
  }

  if (unique.length <= targetCount) return unique;
  const selected = [];
  for (let index = 0; index < targetCount; index += 1) {
    const sourceIndex = Math.round((index * (unique.length - 1)) / (targetCount - 1));
    selected.push(unique[sourceIndex]);
  }
  return selected;
}

export async function composeFinalVideo({ videoPath, voicePath, bgmPath, bgmVolume, outputPath }) {
  const duration = await getVideoDuration(videoPath);
  const voiceDuration = await getVideoDuration(voicePath);
  const durStr = String(duration);
  const voiceFilter =
    voiceDuration > duration + 0.25
      ? `${buildAtempoFilter(voiceDuration / duration)},apad,atrim=0:${durStr}`
      : `apad,atrim=0:${durStr}`;

  const args = ["-y", "-i", videoPath, "-i", voicePath];

  if (bgmPath) {
    // 3 inputs: video, voice, bgm
    // Pad/trim voice to video duration; loop/trim BGM to video duration; mix
    args.push("-i", bgmPath);
    args.push(
      "-filter_complex",
      `[1:a]${voiceFilter}[voice];` +
      `[2:a]aloop=loop=-1:size=2e+09,atrim=0:${durStr},volume=${bgmVolume}[bgm];` +
      `[voice][bgm]amix=inputs=2:duration=first:dropout_transition=0[aout]`,
      "-map", "0:v:0",
      "-map", "[aout]",
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "192k",
      "-t", durStr,
      outputPath
    );
  } else {
    // 2 inputs: video + voice only
    // Pad/trim voice to video duration
    args.push(
      "-filter_complex",
      `[1:a]${voiceFilter}[aout]`,
      "-map", "0:v:0",
      "-map", "[aout]",
      "-c:v", "copy",
      "-c:a", "aac",
      "-b:a", "192k",
      "-t", durStr,
      outputPath
    );
  }

  await runFfmpeg(args);
  return {
    outputPath,
    videoDuration: duration,
    voiceDuration,
    voiceTempo: voiceDuration > duration + 0.25 ? voiceDuration / duration : 1
  };
}
