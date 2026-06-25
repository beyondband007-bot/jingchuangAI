import { createRequire } from "module";

const require = createRequire(import.meta.url);

function resolveFfmpegPath() {
  const configuredPath = String(process.env.FFMPEG_PATH || "").trim();
  if (configuredPath) return configuredPath;

  try {
    const installer = require("@ffmpeg-installer/ffmpeg");
    if (installer?.path) return installer.path;
  } catch {
    // Docker images provide the system binary; local installs may use the npm installer.
  }

  return "ffmpeg";
}

export const ffmpegPath = resolveFfmpegPath();
