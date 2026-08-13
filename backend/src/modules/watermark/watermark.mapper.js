import { formatBeijingDateTime } from "../../shared/time.js";
import {
  getProviderTaskProgress,
  normalizeProviderTaskStatus,
} from "../../shared/taskStatus.js";
export function mapWatermarkAsset(row) {
  if (!row) return null;
  return {
    id: String(row.id),
    kind: row.kind,
    localUrl: row.local_url,
    fileName: row.original_name || row.stored_name,
    mimeType: row.mime_type,
    sizeBytes: Number(row.size_bytes || 0),
    providerUrl: row.provider_url || "",
    providerAssetId: row.provider_asset_id || "",
    durationSeconds: Number(row.duration_seconds || 0),
    width: Number(row.width || 0),
    height: Number(row.height || 0),
    createdAt: row.created_at
  };
}

export function mapWatermarkTask(row) {
  const status = normalizeProviderTaskStatus(row.status);
  return {
    id: String(row.id),
    model: row.model_key,
    providerModel: row.provider_model,
    mediaType: row.media_type,
    prompt: row.prompt,
    resolution: row.resolution,
    sourceAssetId: String(row.source_asset_id),
    sourceUrl: row.source_local_url || "",
    sourceFileName: row.source_original_name || "",
    sourceMimeType: row.source_mime_type || "",
    status,
    progress: getProviderTaskProgress({
      status: row.status,
      providerTaskId: row.provider_task_id,
    }),
    resultUrl: row.result_url || "",
    thumbnailUrl: row.thumbnail_url || "",
    providerTaskId: row.provider_task_id || "",
    favorite: Boolean(row.favorite),
    error: row.error_message || "",
    points: Number(row.cost_points || 0),
    price: `${row.cost_points || 0} 积分`,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    time: formatBeijingDateTime(row.created_at)
  };
}
