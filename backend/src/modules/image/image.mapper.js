import { existsSync } from "fs";
import path from "path";
import { config } from "../../config/index.js";
import { formatBeijingHistoryTime } from "../../shared/time.js";
function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function getThumbnailUrl(row, urls) {
  const taskId = String(row.id || "").trim();
  const originalUrl = String(urls[0] || "");
  const publicDir = `/media/generated/images/${taskId}`;
  if (!taskId || !originalUrl.startsWith(`${publicDir}/`)) return null;

  const thumbnailPath = path.resolve(
    process.cwd(),
    config.media.storageDir,
    "generated",
    "images",
    taskId,
    "thumbnail-1.jpg"
  );
  return existsSync(thumbnailPath) ? `${publicDir}/thumbnail-1.jpg` : null;
}

export function mapImageTask(row) {
  const urls = parseJson(row.result_urls, []);
  const thumbnailUrl = getThumbnailUrl(row, urls);
  return {
    id: row.id,
    threadId: row.thread_id || null,
    model: row.display_name || row.model_key,
    modelKey: row.model_key,
    source: row.source || "image",
    ratio: row.ratio,
    quality: row.quality,
    count: row.image_count,
    time: formatBeijingHistoryTime(row.created_at),
    price: `${row.cost_points} 积分`,
    points: row.cost_points,
    prompt: row.prompt,
    referenceImageUrl: row.reference_image_url || null,
    image: thumbnailUrl || urls[0] || null,
    thumbnailUrl: thumbnailUrl || null,
    imageUrl: urls[urls.length - 1] || urls[0] || null,
    grid: row.image_count > 1,
    status: row.status,
    providerTaskId: row.provider_task_id || null,
    favorite: Boolean(row.favorite),
    error: row.error_message || null
  };
}
