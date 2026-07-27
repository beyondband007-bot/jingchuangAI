import { createRequire } from "module";

const require = createRequire(import.meta.url);

function resolveFfprobePath() {
  const configuredPath = String(process.env.FFPROBE_PATH || "").trim();
  if (configuredPath) return configuredPath;

  try {
    const installer = require("@ffprobe-installer/ffprobe");
    if (installer?.path) return installer.path;
  } catch {
    // Docker images can provide the system binary.
  }

  return "ffprobe";
}

export const ffprobePath = resolveFfprobePath();
