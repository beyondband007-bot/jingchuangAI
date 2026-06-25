import { spawn } from "child_process";
import { mkdir, readFile, stat } from "fs/promises";
import path from "path";
import { ffmpegPath } from "../../shared/ffmpegPath.js";

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

export async function getVideoDuration(videoPath) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath, ["-i", videoPath], { windowsHide: true });
    let stderr = "";
    proc.stderr.on("data", (data) => { stderr += data.toString(); });
    proc.on("close", () => {
      const m = stderr.match(/Duration:\s+(\d+):(\d+):(\d+\.\d+)/);
      if (m) {
        const duration = parseInt(m[1]) * 3600 + parseInt(m[2]) * 60 + parseFloat(m[3]);
        resolve(duration);
      } else {
        reject(new Error("cannot parse video duration from ffmpeg output"));
      }
    });
    proc.on("error", reject);
  });
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
