import { getPool } from "../../db/pool.js";
import { DEMO_USER } from "../../shared/userService.js";

export async function createImageDigitalHumanTaskRow(
  connection,
  {
    userId,
    modelKey,
    providerModel,
    fallbackProviderModel,
    text,
    voiceId,
    voiceName,
    speed,
    volume,
    pitch,
    emotion,
    portraitUrl,
    costPoints
  }
) {
  const [result] = await connection.query(
    `INSERT INTO image_digital_human_tasks
     (user_id, model_key, provider_model, fallback_provider_model, text, voice_id, voice_name,
      speed, volume, pitch, emotion, portrait_url, cost_points, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      userId,
      modelKey,
      providerModel,
      fallbackProviderModel,
      text,
      voiceId,
      voiceName,
      speed,
      volume,
      pitch,
      emotion,
      portraitUrl,
      costPoints
    ]
  );
  return result.insertId;
}

export async function listImageDigitalHumanTaskRows() {
  const [rows] = await getPool().query(
    `SELECT t.*
     FROM image_digital_human_tasks t
     INNER JOIN users u ON u.id = t.user_id
     WHERE u.external_id = ?
     ORDER BY t.created_at DESC, t.id DESC
     LIMIT 100`,
    [DEMO_USER]
  );
  return rows;
}

export async function findImageDigitalHumanTaskRow(id) {
  const [rows] = await getPool().query(
    `SELECT t.*
     FROM image_digital_human_tasks t
     INNER JOIN users u ON u.id = t.user_id
     WHERE u.external_id = ? AND t.id = ?
     LIMIT 1`,
    [DEMO_USER, id]
  );
  return rows[0] || null;
}

export async function findRefreshableImageDigitalHumanTasks() {
  const [rows] = await getPool().query(
    `SELECT id, provider_task_id
     FROM image_digital_human_tasks
     WHERE status IN ('pending', 'processing') AND provider_task_id IS NOT NULL
     ORDER BY updated_at ASC
     LIMIT 10`
  );
  return rows;
}

export async function setImageDigitalHumanTaskProviderStarted(
  id,
  { providerTaskId, usedProviderModel, audioUrl, audioProviderUrl, portraitProviderUrl, audioDurationMs }
) {
  await getPool().query(
    `UPDATE image_digital_human_tasks
     SET status = 'processing', provider_task_id = ?, used_provider_model = ?,
         audio_url = ?, audio_provider_url = ?, portrait_provider_url = ?, audio_duration_ms = ?,
         error_message = NULL
     WHERE id = ?`,
    [providerTaskId, usedProviderModel, audioUrl, audioProviderUrl, portraitProviderUrl, audioDurationMs, id]
  );
}

export async function setImageDigitalHumanTaskProcessing(id) {
  await getPool().query("UPDATE image_digital_human_tasks SET status = 'processing' WHERE id = ?", [id]);
}

export async function setImageDigitalHumanTaskCompleted(id, { resultUrl, thumbnailUrl }) {
  await getPool().query(
    "UPDATE image_digital_human_tasks SET status = 'completed', result_url = ?, thumbnail_url = ? WHERE id = ?",
    [resultUrl, thumbnailUrl, id]
  );
}

export async function setImageDigitalHumanTaskError(id, message) {
  await getPool().query("UPDATE image_digital_human_tasks SET error_message = ? WHERE id = ?", [message, id]);
}

export async function lockImageDigitalHumanTaskForRefund(connection, id) {
  const [rows] = await connection.query(
    "SELECT user_id, cost_points, refunded FROM image_digital_human_tasks WHERE id = ? FOR UPDATE",
    [id]
  );
  return rows[0] || null;
}

export async function setImageDigitalHumanTaskFailed(connection, id, message) {
  await connection.query("UPDATE image_digital_human_tasks SET status = 'failed', error_message = ? WHERE id = ?", [
    message,
    id
  ]);
}

export async function markImageDigitalHumanTaskRefunded(connection, id) {
  await connection.query("UPDATE image_digital_human_tasks SET refunded = TRUE WHERE id = ?", [id]);
}

export async function deleteImageDigitalHumanTaskRow(id) {
  const [result] = await getPool().query(
    `DELETE t FROM image_digital_human_tasks t
     INNER JOIN users u ON u.id = t.user_id
     WHERE u.external_id = ? AND t.id = ?`,
    [DEMO_USER, id]
  );
  return { ok: result.affectedRows > 0 };
}
