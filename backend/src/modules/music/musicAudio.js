import { execFile } from "child_process";
import { rename, stat } from "fs/promises";
import { promisify } from "util";
import ffmpeg from "@ffmpeg-installer/ffmpeg";

export const MUSIC_COMPRESS_THRESHOLD_BYTES = 5 * 1024 * 1024;
const execFileAsync = promisify(execFile);

function parseBitrateValue(bitrate) {
  const value = String(bitrate || "").replace(/k$/i, "");
  const number = Number(value || 0);
  return number > 0 ? number * 1000 : 128000;
}

export async function compressMusicAudioFile(filePath) {
  const tempPath = `${filePath}.compressing.mp3`;
  const bitrates = ["128k", "96k", "64k", "48k", "32k"];
  let lastSize = 0;
  let lastBitrate = "128k";

  for (const bitrate of bitrates) {
    await execFileAsync(ffmpeg.path, [
      "-y",
      "-i", filePath,
      "-vn",
      "-ac", "2",
      "-ar", "44100",
      "-b:a", bitrate,
      tempPath
    ]);

    const fileStat = await stat(tempPath);
    lastSize = fileStat.size;
    lastBitrate = bitrate;

    if (fileStat.size <= MUSIC_COMPRESS_THRESHOLD_BYTES) {
      break;
    }
  }

  await rename(tempPath, filePath);

  return {
    size: lastSize,
    bitrate: parseBitrateValue(lastBitrate)
  };
}
