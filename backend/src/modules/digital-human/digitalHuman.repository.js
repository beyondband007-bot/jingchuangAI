import { getPool } from "../../db/pool.js";
import { getCurrentExternalId } from "../../shared/userService.js";

export async function createDigitalHumanTaskRow(
  connection,
  { userId, avatarId, avatarName, modelKey, providerModel, driveMode, text, voiceId, voiceName, speed, volume, pitch, emotion, costPoints }
) {
  const [result] = await connection.query(
    `INSERT INTO digital_human_tasks
     (user_id, avatar_id, avatar_name, model_key, provider_model, drive_mode, text, voice_id, voice_name,
      speed, volume, pitch, emotion, cost_points, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [userId, avatarId, avatarName, modelKey, providerModel, driveMode, text, voiceId, voiceName, speed, volume, pitch, emotion, costPoints]
  );
  return result.insertId;
}

export async function listDigitalHumanTaskRows() {
  const [rows] = await getPool().query(
    `SELECT t.*
     FROM digital_human_tasks t
     INNER JOIN users u ON u.id = t.user_id
     WHERE u.external_id = ?
     ORDER BY t.created_at DESC, t.id DESC
     LIMIT 100`,
    [getCurrentExternalId()]
  );
  return rows;
}

export async function findDigitalHumanTaskRow(id) {
  const [rows] = await getPool().query(
    `SELECT t.*
     FROM digital_human_tasks t
     INNER JOIN users u ON u.id = t.user_id
     WHERE u.external_id = ? AND t.id = ?
     LIMIT 1`,
    [getCurrentExternalId(), id]
  );
  return rows[0] || null;
}

export async function findRefreshableDigitalHumanTasks() {
  const [rows] = await getPool().query(
    `SELECT id, provider_task_id
     FROM digital_human_tasks
     WHERE status IN ('pending', 'processing') AND provider_task_id IS NOT NULL
     ORDER BY updated_at ASC
     LIMIT 10`
  );
  return rows;
}

export async function setDigitalHumanTaskProviderStarted(id, { providerTaskId, providerModel, audioUrl, audioProviderUrl, avatarProviderUrl, audioDurationMs }) {
  if (providerModel) {
    await getPool().query(
      `UPDATE digital_human_tasks
       SET status = 'processing', provider_task_id = ?, provider_model = ?, audio_url = ?, audio_provider_url = ?, avatar_provider_url = ?, audio_duration_ms = ?, error_message = NULL
       WHERE id = ?`,
      [providerTaskId, providerModel, audioUrl, audioProviderUrl, avatarProviderUrl, audioDurationMs, id]
    );
    return;
  }

  await getPool().query(
    `UPDATE digital_human_tasks
     SET status = 'processing', provider_task_id = ?, audio_url = ?, audio_provider_url = ?, avatar_provider_url = ?, audio_duration_ms = ?, error_message = NULL
     WHERE id = ?`,
    [providerTaskId, audioUrl, audioProviderUrl, avatarProviderUrl, audioDurationMs, id]
  );
}

export async function setDigitalHumanTaskProcessing(id) {
  await getPool().query("UPDATE digital_human_tasks SET status = 'processing', error_message = NULL WHERE id = ?", [id]);
}

export async function setDigitalHumanTaskCompleted(id, { resultUrl, thumbnailUrl }) {
  await getPool().query(
    "UPDATE digital_human_tasks SET status = 'completed', result_url = ?, thumbnail_url = ?, error_message = NULL WHERE id = ?",
    [resultUrl, thumbnailUrl, id]
  );
}

export async function setDigitalHumanTaskError(id, message) {
  await getPool().query("UPDATE digital_human_tasks SET error_message = ? WHERE id = ?", [message, id]);
}

export async function lockDigitalHumanTaskForRefund(connection, id) {
  const [rows] = await connection.query(
    "SELECT user_id, cost_points, refunded FROM digital_human_tasks WHERE id = ? FOR UPDATE",
    [id]
  );
  return rows[0] || null;
}

export async function setDigitalHumanTaskFailed(connection, id, message) {
  await connection.query("UPDATE digital_human_tasks SET status = 'failed', error_message = ? WHERE id = ?", [message, id]);
}

export async function markDigitalHumanTaskRefunded(connection, id) {
  await connection.query("UPDATE digital_human_tasks SET refunded = TRUE WHERE id = ?", [id]);
}

export async function deleteDigitalHumanTaskRow(id) {
  const [result] = await getPool().query(
    `DELETE t FROM digital_human_tasks t
     INNER JOIN users u ON u.id = t.user_id
     WHERE u.external_id = ? AND t.id = ?`,
    [getCurrentExternalId(), id]
  );
  return { ok: result.affectedRows > 0 };
}
