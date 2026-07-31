import { getPool } from "../../db/pool.js";

export async function createMusicTaskRow({
  id,
  userId,
  prompt,
  title = "",
  coverUrl = "",
  lyrics,
  model,
  isInstrumental
}) {
  await getPool().query(
    `INSERT INTO music_tasks
     (id, user_id, prompt, title, cover_url, lyrics, model, is_instrumental, audio_url, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', 'processing')`,
    [id, userId, prompt, title || null, coverUrl || null, lyrics, model, isInstrumental]
  );
}

export async function completeMusicTaskRow({
  id,
  audioUrl,
  durationMs,
  sampleRate,
  channel,
  bitrate,
  musicSize,
  traceId
}) {
  await getPool().query(
    `UPDATE music_tasks
     SET status = 'completed',
         audio_url = ?,
         duration_ms = ?,
         sample_rate = ?,
         channel = ?,
         bitrate = ?,
         music_size = ?,
         trace_id = ?,
         error_message = NULL
     WHERE id = ?`,
    [
      audioUrl,
      durationMs || 0,
      sampleRate || null,
      channel || null,
      bitrate || null,
      musicSize || null,
      traceId || null,
      id
    ]
  );
}

export async function failMusicTaskRow(id, errorMessage) {
  await getPool().query(
    `UPDATE music_tasks
     SET status = 'failed', error_message = ?
     WHERE id = ?`,
    [String(errorMessage || "music generation failed").slice(0, 1000), id]
  );
}

export async function findMusicTaskRow({ id, userId }) {
  const [rows] = await getPool().query(
    `SELECT *
     FROM music_tasks
     WHERE id = ? AND user_id = ?
     LIMIT 1`,
    [id, userId]
  );
  return rows[0] || null;
}

export async function listMusicTaskRows({ userId }) {
  const [rows] = await getPool().query(
    `SELECT *
     FROM music_tasks
     WHERE user_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT 100`,
    [userId]
  );
  return rows;
}

export async function updateMusicLyricsSyncStatus(id, { status, errorMessage = "" }) {
  await getPool().query(
    `UPDATE music_tasks
     SET lyrics_sync_status = ?, lyrics_sync_error = ?
     WHERE id = ?`,
    [status, errorMessage || null, id]
  );
}

export async function saveMusicLyricsTimeline(id, timeline) {
  await getPool().query(
    `UPDATE music_tasks
     SET lyrics_timeline = ?,
         lyrics_sync_status = 'completed',
         lyrics_sync_error = NULL
     WHERE id = ?`,
    [JSON.stringify(timeline || []), id]
  );
}

export async function updateMusicTaskAudioMeta(id, { musicSize, bitrate }) {
  await getPool().query(
    `UPDATE music_tasks
     SET music_size = ?, bitrate = ?
     WHERE id = ?`,
    [musicSize || null, bitrate || null, id]
  );
}

export async function updateMusicTaskCoverUrl(id, coverUrl) {
  await getPool().query(
    `UPDATE music_tasks
     SET cover_url = ?
     WHERE id = ?`,
    [coverUrl || null, id]
  );
}

export async function updateMusicTaskTitle(id, userId, title) {
  const [result] = await getPool().query(
    `UPDATE music_tasks
     SET title = ?
     WHERE id = ? AND user_id = ?`,
    [title, id, userId]
  );
  return result.affectedRows > 0;
}

export async function deleteMusicTaskRow(id, userId) {
  const [result] = await getPool().query(
    `DELETE FROM music_tasks
     WHERE user_id = ? AND id = ?`,
    [userId, id]
  );
  return { ok: result.affectedRows > 0 };
}
