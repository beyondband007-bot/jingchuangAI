import { getPool } from "../../db/pool.js";

export async function createVoiceSynthesisTaskRow({
  id,
  userId,
  title,
  voiceId,
  voiceName,
  text,
  audioUrl,
  durationMs,
  mimeType
}) {
  await getPool().query(
    `INSERT INTO voice_synthesis_tasks
     (id, user_id, title, voice_id, voice_name, text, audio_url, duration_ms, mime_type)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, title, voiceId, voiceName || null, text, audioUrl, durationMs || 0, mimeType || null]
  );
}

export async function listVoiceSynthesisTaskRows({ userId }) {
  const [rows] = await getPool().query(
    `SELECT *
     FROM voice_synthesis_tasks
     WHERE user_id = ?
     ORDER BY created_at DESC, id DESC
     LIMIT 100`,
    [userId]
  );
  return rows;
}

