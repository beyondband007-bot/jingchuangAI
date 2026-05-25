import { getPool } from "../../db/pool.js";

export async function createVoiceConvertTaskRow({
  id,
  userId,
  title,
  voiceId,
  voiceName,
  sourceFileName,
  audioUrl,
  durationMs,
  sourceDurationMs,
  mimeType,
  rhythmMeta
}) {
  await getPool().query(
    `INSERT INTO voice_convert_tasks
     (id, user_id, title, voice_id, voice_name, source_file_name, audio_url, duration_ms,
      source_duration_ms, mime_type, rhythm_meta)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      title,
      voiceId || null,
      voiceName || null,
      sourceFileName || null,
      audioUrl,
      durationMs || 0,
      sourceDurationMs || 0,
      mimeType || null,
      rhythmMeta ? JSON.stringify(rhythmMeta) : null
    ]
  );
}

export async function listVoiceConvertTaskRows({ userId }) {
  const [rows] = await getPool().query(
    `SELECT *
     FROM voice_convert_tasks
     WHERE user_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT 100`,
    [userId]
  );
  return rows;
}

