import { getPool } from "../../db/pool.js";

function parseJson(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function mapRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    status: row.status,
    stage: row.stage,
    sourceAssetId: row.id,
    sourceUrl: row.source_url,
    sourceFileName: row.source_file_name,
    filePath: row.file_path,
    fileSize: Number(row.file_size || 0),
    mimeType: row.mime_type,
    thumbnailUrl: row.thumbnail_url,
    voiceId: row.voice_id,
    language: row.language,
    bgmEnabled: Boolean(row.bgm_enabled),
    bgmVolume: Number(row.bgm_volume || 0.25),
    qwenMode: row.qwen_mode,
    sourceDurationSeconds: Number(row.source_duration_seconds || 0),
    costPoints: Number(row.cost_points || 0),
    analysis: parseJson(row.analysis_json),
    dubbing: parseJson(row.dubbing_json),
    bgm: parseJson(row.bgm_json),
    result: parseJson(row.result_json),
    billing: parseJson(row.billing_json),
    error: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function createVideoDubTask(task) {
  await getPool().query(
    `INSERT INTO video_dub_tasks
     (id, user_id, status, stage, source_file_name, source_url, file_path, file_size, mime_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [task.id, task.userId, task.status, task.stage, task.sourceFileName, task.sourceUrl, task.filePath, task.fileSize || 0, task.mimeType || null]
  );
}

export async function updateVideoDubTask(task) {
  await getPool().query(
    `UPDATE video_dub_tasks
     SET status = ?, stage = ?, thumbnail_url = ?, voice_id = ?, language = ?, bgm_enabled = ?, bgm_volume = ?,
         qwen_mode = ?, source_duration_seconds = ?, cost_points = ?, analysis_json = ?, dubbing_json = ?,
         bgm_json = ?, result_json = ?, billing_json = ?, error_message = ?
     WHERE id = ? AND user_id = ?`,
    [
      task.status, task.stage, task.thumbnailUrl || null, task.voiceId || null, task.language || null,
      Boolean(task.bgmEnabled), task.bgmVolume || 0.25, task.qwenMode || null,
      task.sourceDurationSeconds || null, task.costPoints || 0,
      task.analysis ? JSON.stringify(task.analysis) : null,
      task.dubbing ? JSON.stringify(task.dubbing) : null,
      task.bgm ? JSON.stringify(task.bgm) : null,
      task.result ? JSON.stringify(task.result) : null,
      task.billing ? JSON.stringify(task.billing) : null,
      task.error || null, task.id, task.userId
    ]
  );
}

export async function findVideoDubTask({ id, userId }) {
  const [rows] = await getPool().query(
    "SELECT * FROM video_dub_tasks WHERE id = ? AND user_id = ? LIMIT 1",
    [id, userId]
  );
  return mapRow(rows[0]);
}

export async function listVideoDubTasks({ userId, limit = 100 }) {
  const [rows] = await getPool().query(
    "SELECT * FROM video_dub_tasks WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT ?",
    [userId, Math.max(1, Math.min(Number(limit) || 100, 200))]
  );
  return rows.map(mapRow);
}

export async function deleteVideoDubTask({ id, userId }) {
  const [result] = await getPool().query(
    "DELETE FROM video_dub_tasks WHERE id = ? AND user_id = ?",
    [id, userId]
  );
  return result.affectedRows > 0;
}
