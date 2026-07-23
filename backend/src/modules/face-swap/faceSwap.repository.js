import { getPool } from "../../db/pool.js";
import { getCurrentExternalId } from "../../shared/userService.js";

export async function createFaceSwapAsset(connection, { userId, kind, localUrl, filePath, storedName, originalName, mimeType, sizeBytes }) {
  const [result] = await connection.query(
    `INSERT INTO face_swap_assets
     (user_id, kind, local_url, file_path, stored_name, original_name, mime_type, size_bytes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [userId, kind, localUrl, filePath, storedName, originalName, mimeType, sizeBytes]
  );
  return result.insertId;
}

export async function findFaceSwapAsset(id, kind) {
  const params = [getCurrentExternalId(), id];
  let kindClause = "";
  if (kind) {
    kindClause = " AND a.kind = ?";
    params.push(kind);
  }

  const [rows] = await getPool().query(
    `SELECT a.*
     FROM face_swap_assets a
     INNER JOIN users u ON u.id = a.user_id
     WHERE u.external_id = ? AND a.id = ?${kindClause}
     LIMIT 1`,
    params
  );
  return rows[0] || null;
}

export async function findFaceSwapAssetByIdForUser(id, kind, userId) {
  const params = [userId, id];
  let kindClause = "";
  if (kind) {
    kindClause = " AND kind = ?";
    params.push(kind);
  }

  const [rows] = await getPool().query(
    `SELECT *
     FROM face_swap_assets
     WHERE user_id = ? AND id = ?${kindClause}
     LIMIT 1`,
    params
  );
  return rows[0] || null;
}

export async function setFaceSwapAssetProviderUrl(id, providerUrl) {
  await getPool().query("UPDATE face_swap_assets SET provider_url = ? WHERE id = ?", [providerUrl, id]);
}

export async function createFaceSwapTask(connection, { userId, imageAssetId, videoAssetId, modelKey, providerModel, prompt, resolution, duration, costPoints }) {
  const [result] = await connection.query(
    `INSERT INTO face_swap_tasks
     (user_id, image_asset_id, video_asset_id, model_key, provider_model, prompt, resolution, duration, cost_points, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [userId, imageAssetId, videoAssetId, modelKey, providerModel, prompt, resolution, duration, costPoints]
  );
  return result.insertId;
}

export async function listFaceSwapTaskRows({ filter = "all" } = {}) {
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
     FROM face_swap_tasks t
     INNER JOIN users u ON u.id = t.user_id
     LEFT JOIN face_swap_assets image ON image.id = t.image_asset_id
     LEFT JOIN face_swap_assets video ON video.id = t.video_asset_id
     WHERE ${where}
     ORDER BY t.created_at DESC, t.id DESC
     LIMIT 100`,
    params
  );
  return rows;
}

export async function findFaceSwapTaskRow(id) {
  const [rows] = await getPool().query(
    `SELECT t.*,
            image.local_url AS image_local_url,
            image.original_name AS image_original_name,
            video.local_url AS video_local_url,
            video.original_name AS video_original_name
     FROM face_swap_tasks t
     INNER JOIN users u ON u.id = t.user_id
     LEFT JOIN face_swap_assets image ON image.id = t.image_asset_id
     LEFT JOIN face_swap_assets video ON video.id = t.video_asset_id
     WHERE u.external_id = ? AND t.id = ?
     LIMIT 1`,
    [getCurrentExternalId(), id]
  );
  return rows[0] || null;
}

export async function findRefreshableFaceSwapTasks() {
  const [rows] = await getPool().query(
    `SELECT id, provider_task_id
     FROM face_swap_tasks
     WHERE status IN ('pending', 'processing') AND provider_task_id IS NOT NULL
     ORDER BY updated_at ASC
     LIMIT 10`
  );
  return rows;
}

export async function findFaceSwapTaskStatus(id) {
  const [rows] = await getPool().query(
    `SELECT t.id, t.provider_task_id, t.status,
            video.file_path AS video_file_path
     FROM face_swap_tasks t
     LEFT JOIN face_swap_assets video ON video.id = t.video_asset_id
     WHERE t.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function setFaceSwapTaskProviderTaskId(id, providerTaskId) {
  await getPool().query("UPDATE face_swap_tasks SET status = 'processing', provider_task_id = ?, error_message = NULL WHERE id = ?", [
    providerTaskId,
    id
  ]);
}

export async function setFaceSwapTaskProcessing(id) {
  await getPool().query("UPDATE face_swap_tasks SET status = 'processing' WHERE id = ?", [id]);
}

export async function setFaceSwapTaskCompleted(id, { resultUrl, thumbnailUrl }) {
  await getPool().query(
    "UPDATE face_swap_tasks SET status = 'completed', result_url = ?, thumbnail_url = ? WHERE id = ?",
    [resultUrl, thumbnailUrl, id]
  );
}

export async function setFaceSwapTaskError(id, message) {
  await getPool().query("UPDATE face_swap_tasks SET error_message = ? WHERE id = ?", [message, id]);
}

export async function lockFaceSwapTaskForRefund(connection, id) {
  const [tasks] = await connection.query(
    "SELECT user_id, cost_points, refunded FROM face_swap_tasks WHERE id = ? FOR UPDATE",
    [id]
  );
  return tasks[0] || null;
}

export async function setFaceSwapTaskFailed(connection, id, message) {
  await connection.query("UPDATE face_swap_tasks SET status = 'failed', error_message = ? WHERE id = ?", [message, id]);
}

export async function markFaceSwapTaskRefunded(connection, id) {
  await connection.query("UPDATE face_swap_tasks SET refunded = TRUE WHERE id = ?", [id]);
}

export async function deleteFaceSwapTask(id) {
  const [result] = await getPool().query(
    `DELETE t FROM face_swap_tasks t
     INNER JOIN users u ON u.id = t.user_id
     WHERE u.external_id = ? AND t.id = ?`,
    [getCurrentExternalId(), id]
  );
  return { ok: result.affectedRows > 0 };
}

export async function toggleFaceSwapTaskFavorite(id) {
  await getPool().query(
    `UPDATE face_swap_tasks t
     INNER JOIN users u ON u.id = t.user_id
     SET t.favorite = NOT t.favorite
     WHERE u.external_id = ? AND t.id = ?`,
    [getCurrentExternalId(), id]
  );
}
