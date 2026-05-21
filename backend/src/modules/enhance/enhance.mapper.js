import { formatBeijingClock } from "../../shared/time.js";
export function mapEnhanceAsset(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    kind: row.kind,
    localUrl: row.local_url,
    fileName: row.original_name || row.stored_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes || 0),
    providerUrl: row.provider_url || "",
    createdAt: row.created_at
  };
}

export function mapEnhanceTask(row) {
  const status = row.status === "pending" ? "processing" : row.status;
  const points = Number(row.cost_points || 0);
  return {
    id: String(row.id),
    model: row.model_key,
    mediaType: row.media_type,
    upscaleFactor: row.upscale_factor,
    sourceAssetId: String(row.source_asset_id),
    sourceUrl: row.source_local_url || "",
    sourceFileName: row.source_original_name || "",
    sourceMimeType: row.source_mime_type || "",
    status,
    progress: row.status === "completed" ? 100 : row.status === "failed" ? 0 : row.provider_task_id ? 68 : 24,
    resultUrl: row.result_url || "",
    thumbnailUrl: row.thumbnail_url || "",
    providerTaskId: row.provider_task_id || "",
    favorite: Boolean(row.favorite),
    error: row.error_message || "",
    points,
    price: `${points} \u79ef\u5206`,
    time: formatBeijingClock(row.created_at)
  };
}
