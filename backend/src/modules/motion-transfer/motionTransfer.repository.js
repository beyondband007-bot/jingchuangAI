import { getPool } from "../../db/pool.js";
import { getCurrentExternalId } from "../../shared/userService.js";

export async function createMotionTransferAsset(connection, { userId, kind, localUrl, filePath, storedName, originalName, mimeType, sizeBytes }) {
  const [result] = await connection.query(
    `INSERT INTO motion_transfer_assets
     (user_id, kind, local_url, file_path, stored_name, original_name, mime_type, size_bytes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, kind, localUrl, filePath, storedName, originalName, mimeType, sizeBytes]
  );
  return result.insertId;
}

export async function findMotionTransferAsset(id, kind) {
  const params = [getCurrentExternalId(), id];
  let kindClause = "";
  if (kind) {
    kindClause = " AND a.kind = ?";
    params.push(kind);
  }

  const [rows] = await getPool().query(
    `SELECT a.*
     FROM motion_transfer_assets a
     INNER JOIN users u ON u.id = a.user_id
     WHERE u.external_id = ? AND a.id = ?${kindClause}
     LIMIT 1`,
    params
  );
  return rows[0] || null;
}

export async function setMotionTransferAssetProviderUrl(id, providerUrl) {
  await getPool().query("UPDATE motion_transfer_assets SET provider_url = ? WHERE id = ?", [providerUrl, id]);
}

export async function createMotionTransferTask(connection, { userId, imageAssetId, videoAssetId, modelKey, providerModel, prompt, resolution, duration, characterOrientation, costPoints }) {
  const [result] = await connection.query(
    `INSERT INTO motion_transfer_tasks
     (user_id, image_asset_id, video_asset_id, model_key, provider_model, prompt, resolution, duration, character_orientation, cost_points, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [userId, imageAssetId, videoAssetId, modelKey, providerModel, prompt, resolution, duration, characterOrientation, costPoints]
  );
  return result.insertId;
}

export async function listMotionTransferTaskRows({ filter = "all" } = {}) {
  const params = [getCurrentExternalId()];
  let where = "u.external_id = ?";
  if (filter === "favorite") {
    where += " AND t.favorite = TRUE";
  } else if (filter === "recent") {
    where += " AND t.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)";
  }

  const [rows] = await getPool().query(
    `SELECT t.*,
            image.local_url AS image_local_url,
            image.original_name AS image_original_name,
            video.local_url AS video_local_url,
            video.original_name AS video_original_name
     FROM motion_transfer_tasks t
     INNER JOIN users u ON u.id = t.user_id
     LEFT JOIN motion_transfer_assets image ON image.id = t.image_asset_id
     LEFT JOIN motion_transfer_assets video ON video.id = t.video_asset_id
     WHERE ${where}
     ORDER BY t.created_at DESC, t.id DESC
     LIMIT 100`,
    params
  );
  return rows;
}

export async function findMotionTransferTaskRow(id) {
  const [rows] = await getPool().query(
    `SELECT t.*,
            image.local_url AS image_local_url,
            image.original_name AS image_original_name,
            video.local_url AS video_local_url,
            video.original_name AS video_original_name
     FROM motion_transfer_tasks t
     INNER JOIN users u ON u.id = t.user_id
     LEFT JOIN motion_transfer_assets image ON image.id = t.image_asset_id
     LEFT JOIN motion_transfer_assets video ON video.id = t.video_asset_id
     WHERE u.external_id = ? AND t.id = ?
     LIMIT 1`,
    [getCurrentExternalId(), id]
  );
  return rows[0] || null;
}

export async function findRefreshableMotionTransferTasks() {
  const [rows] = await getPool().query(
    `SELECT id, provider_task_id
     FROM motion_transfer_tasks
     WHERE status IN ('pending', 'processing') AND provider_task_id IS NOT NULL
     ORDER BY updated_at ASC
     LIMIT 10`
  );
  return rows;
}

export async function findMotionTransferTaskStatus(id) {
  const [rows] = await getPool().query(
    "SELECT id, provider_task_id, status FROM motion_transfer_tasks WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

export async function setMotionTransferTaskProviderTaskId(id, providerTaskId) {
  await getPool().query("UPDATE motion_transfer_tasks SET status = 'processing', provider_task_id = ?, error_message = NULL WHERE id = ?", [
    providerTaskId,
    id
  ]);
}

export async function setMotionTransferTaskProcessing(id) {
  await getPool().query("UPDATE motion_transfer_tasks SET status = 'processing' WHERE id = ?", [id]);
}

export async function setMotionTransferTaskCompleted(id, { resultUrl, thumbnailUrl }) {
  await getPool().query(
    "UPDATE motion_transfer_tasks SET status = 'completed', result_url = ?, thumbnail_url = ? WHERE id = ?",
    [resultUrl, thumbnailUrl, id]
  );
}

export async function setMotionTransferTaskError(id, message) {
  await getPool().query("UPDATE motion_transfer_tasks SET error_message = ? WHERE id = ?", [message, id]);
}

export async function lockMotionTransferTaskForRefund(connection, id) {
  const [tasks] = await connection.query(
    "SELECT user_id, cost_points, refunded FROM motion_transfer_tasks WHERE id = ? FOR UPDATE",
    [id]
  );
  return tasks[0] || null;
}

export async function setMotionTransferTaskFailed(connection, id, message) {
  await connection.query("UPDATE motion_transfer_tasks SET status = 'failed', error_message = ? WHERE id = ?", [message, id]);
}

export async function markMotionTransferTaskRefunded(connection, id) {
  await connection.query("UPDATE motion_transfer_tasks SET refunded = TRUE WHERE id = ?", [id]);
}

export async function deleteMotionTransferTask(id) {
  const [result] = await getPool().query(
    `DELETE t FROM motion_transfer_tasks t
     INNER JOIN users u ON u.id = t.user_id
     WHERE u.external_id = ? AND t.id = ?`,
    [getCurrentExternalId(), id]
  );
  return { ok: result.affectedRows > 0 };
}

export async function toggleMotionTransferTaskFavorite(id) {
  await getPool().query(
    `UPDATE motion_transfer_tasks t
     INNER JOIN users u ON u.id = t.user_id
     SET t.favorite = NOT t.favorite
     WHERE u.external_id = ? AND t.id = ?`,
    [getCurrentExternalId(), id]
  );
}
