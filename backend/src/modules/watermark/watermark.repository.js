import { getPool } from "../../db/pool.js";
import { getCurrentExternalId } from "../../shared/userService.js";

export async function createWatermarkAsset(connection, { userId, kind, localUrl, filePath, storedName, originalName, mimeType, sizeBytes }) {
  const [result] = await connection.query(
    `INSERT INTO watermark_assets
     (user_id, kind, local_url, file_path, stored_name, original_name, mime_type, size_bytes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, kind, localUrl, filePath, storedName, originalName, mimeType, sizeBytes]
  );
  return result.insertId;
}

export async function findWatermarkAsset(id, kind) {
  const params = [getCurrentExternalId(), id];
  let kindClause = "";
  if (kind) {
    kindClause = " AND a.kind = ?";
    params.push(kind);
  }

  const [rows] = await getPool().query(
    `SELECT a.*
     FROM watermark_assets a
     INNER JOIN users u ON u.id = a.user_id
     WHERE u.external_id = ? AND a.id = ?${kindClause}
     LIMIT 1`,
    params
  );
  return rows[0] || null;
}

export async function findWatermarkAssetForUser(id, userId, kind) {
  const params = [userId, id];
  let kindClause = "";
  if (kind) {
    kindClause = " AND kind = ?";
    params.push(kind);
  }

  const [rows] = await getPool().query(
    `SELECT *
     FROM watermark_assets
     WHERE user_id = ? AND id = ?${kindClause}
     LIMIT 1`,
    params
  );
  return rows[0] || null;
}

export async function setWatermarkAssetProviderUrl(id, providerUrl) {
  await getPool().query("UPDATE watermark_assets SET provider_url = ? WHERE id = ?", [providerUrl, id]);
}

export async function createWatermarkTask(connection, { userId, sourceAssetId, mediaType, modelKey, providerModel, prompt, resolution, costPoints }) {
  const [result] = await connection.query(
    `INSERT INTO watermark_tasks
     (user_id, source_asset_id, media_type, model_key, provider_model, prompt, resolution, cost_points, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [userId, sourceAssetId, mediaType, modelKey, providerModel, prompt, resolution, costPoints]
  );
  return result.insertId;
}

export async function listWatermarkTaskRows({ filter = "all" } = {}) {
  const params = [getCurrentExternalId()];
  let where = "u.external_id = ?";
  if (filter === "favorite") {
    where += " AND t.favorite = TRUE";
  }

  const [rows] = await getPool().query(
    `SELECT t.*,
            source.local_url AS source_local_url,
            source.original_name AS source_original_name,
            source.mime_type AS source_mime_type
     FROM watermark_tasks t
     INNER JOIN users u ON u.id = t.user_id
     LEFT JOIN watermark_assets source ON source.id = t.source_asset_id
     WHERE ${where}
     ORDER BY t.created_at DESC, t.id DESC
     LIMIT 100`,
    params
  );
  return rows;
}

export async function findWatermarkTaskRow(id) {
  const [rows] = await getPool().query(
    `SELECT t.*,
            source.local_url AS source_local_url,
            source.original_name AS source_original_name,
            source.mime_type AS source_mime_type
     FROM watermark_tasks t
     INNER JOIN users u ON u.id = t.user_id
     LEFT JOIN watermark_assets source ON source.id = t.source_asset_id
     WHERE u.external_id = ? AND t.id = ?
     LIMIT 1`,
    [getCurrentExternalId(), id]
  );
  return rows[0] || null;
}

export async function findRefreshableWatermarkTasks() {
  const [rows] = await getPool().query(
    `SELECT id, provider_task_id
     FROM watermark_tasks
     WHERE status IN ('pending', 'processing') AND provider_task_id IS NOT NULL
     ORDER BY updated_at ASC
     LIMIT 10`
  );
  return rows;
}

export async function findWatermarkTaskStatus(id) {
  const [rows] = await getPool().query(
    "SELECT id, provider_task_id, status, media_type FROM watermark_tasks WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

export async function setWatermarkTaskProviderTaskId(id, providerTaskId) {
  await getPool().query("UPDATE watermark_tasks SET status = 'processing', provider_task_id = ?, error_message = NULL WHERE id = ?", [
    providerTaskId,
    id
  ]);
}

export async function setWatermarkTaskProcessing(id) {
  await getPool().query("UPDATE watermark_tasks SET status = 'processing' WHERE id = ?", [id]);
}

export async function setWatermarkTaskCompleted(id, { resultUrl, thumbnailUrl }) {
  await getPool().query(
    "UPDATE watermark_tasks SET status = 'completed', result_url = ?, thumbnail_url = ? WHERE id = ?",
    [resultUrl, thumbnailUrl, id]
  );
}

export async function setWatermarkTaskError(id, message) {
  await getPool().query("UPDATE watermark_tasks SET error_message = ? WHERE id = ?", [message, id]);
}

export async function lockWatermarkTaskForRefund(connection, id) {
  const [tasks] = await connection.query(
    "SELECT user_id, cost_points, refunded FROM watermark_tasks WHERE id = ? FOR UPDATE",
    [id]
  );
  return tasks[0] || null;
}

export async function setWatermarkTaskFailed(connection, id, message) {
  await connection.query("UPDATE watermark_tasks SET status = 'failed', error_message = ? WHERE id = ?", [message, id]);
}

export async function markWatermarkTaskRefunded(connection, id) {
  await connection.query("UPDATE watermark_tasks SET refunded = TRUE WHERE id = ?", [id]);
}

export async function deleteWatermarkTask(id) {
  const [result] = await getPool().query(
    `DELETE t FROM watermark_tasks t
     INNER JOIN users u ON u.id = t.user_id
     WHERE u.external_id = ? AND t.id = ?`,
    [getCurrentExternalId(), id]
  );
  return { ok: result.affectedRows > 0 };
}

export async function toggleWatermarkTaskFavorite(id) {
  await getPool().query(
    `UPDATE watermark_tasks t
     INNER JOIN users u ON u.id = t.user_id
     SET t.favorite = NOT t.favorite
     WHERE u.external_id = ? AND t.id = ?`,
    [getCurrentExternalId(), id]
  );
}
