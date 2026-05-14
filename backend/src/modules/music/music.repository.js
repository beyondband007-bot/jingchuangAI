import { getPool } from "../../db/pool.js";

export async function createMusicTaskRow({
  id,
  userId,
  prompt,
  lyrics,
  model,
  isInstrumental,
  audioUrl,
  durationMs,
  sampleRate,
  channel,
  bitrate,
  musicSize,
  traceId
}) {
  await getPool().query(
    `INSERT INTO music_tasks
     (id, user_id, prompt, lyrics, model, is_instrumental, audio_url, duration_ms,
      sample_rate, channel, bitrate, music_size, trace_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      userId,
      prompt,
      lyrics,
      model,
      isInstrumental,
      audioUrl,
      durationMs || 0,
      sampleRate || null,
      channel || null,
      bitrate || null,
      musicSize || null,
      traceId || null
    ]
  );
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

