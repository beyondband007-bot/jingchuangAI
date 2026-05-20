import { formatBeijingClock } from "../../shared/time.js";
function parseJson(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function mapImageTask(row) {
  const urls = parseJson(row.result_urls, []);
  return {
    id: row.id,
    model: row.display_name || row.model_key,
    modelKey: row.model_key,
    source: row.source || "image",
    ratio: row.ratio,
    quality: row.quality,
    count: row.image_count,
    time: formatBeijingClock(row.created_at),
    price: `${row.cost_points} 积分`,
    points: row.cost_points,
    prompt: row.prompt,
    referenceImageUrl: row.reference_image_url || null,
    image: urls[0] || null,
    grid: row.image_count > 1,
    status: row.status,
    providerTaskId: row.provider_task_id || null,
    favorite: Boolean(row.favorite),
    error: row.error_message || null
  };
}
