import { getPool } from "../../db/pool.js";

function mapVoiceCloneAssetRow(row) {
  if (!row) return null;
  return {
    id: row.voice_id,
    assetId: row.id,
    name: row.voice_name || row.voice_id,
    description: "MiniMax saved voice",
    provider: "minimax",
    source: "voice-clone",
    demoAudio: row.demo_audio || "",
    audioHash: row.audio_sha256 || "",
    status: row.status || "completed",
    providerActivatedAt: row.provider_activated_at,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at
  };
}

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

export async function listVoiceCloneAssetRows({ userId }) {
  const [rows] = await getPool().query(
    `SELECT *
     FROM voice_clone_assets
     WHERE user_id = ? AND status = 'completed'
     ORDER BY updated_at DESC, id DESC
     LIMIT 100`,
    [userId]
  );
  return rows.map(mapVoiceCloneAssetRow);
}

export async function findCompletedVoiceCloneAssetByVoiceId({ userId, voiceId }) {
  if (!voiceId) return null;
  const [rows] = await getPool().query(
    `SELECT *
     FROM voice_clone_assets
     WHERE user_id = ? AND voice_id = ? AND status = 'completed'
     LIMIT 1`,
    [userId, voiceId]
  );
  return mapVoiceCloneAssetRow(rows[0]);
}

export async function findCompletedVoiceCloneAssetByHash({ userId, audioHash }) {
  if (!audioHash) return null;
  const [rows] = await getPool().query(
    `SELECT *
     FROM voice_clone_assets
     WHERE user_id = ? AND audio_sha256 = ? AND status = 'completed'
     LIMIT 1`,
    [userId, audioHash]
  );
  return mapVoiceCloneAssetRow(rows[0]);
}

export async function findVoiceCloneAssetByHash({ userId, audioHash }) {
  if (!audioHash) return null;
  const [rows] = await getPool().query(
    `SELECT *
     FROM voice_clone_assets
     WHERE user_id = ? AND audio_sha256 = ?
     LIMIT 1`,
    [userId, audioHash]
  );
  return mapVoiceCloneAssetRow(rows[0]);
}

export async function createVoiceCloneAssetProcessing({
  userId,
  audioHash,
  voiceId,
  voiceName,
  sourceFileName,
  sourceMimeType,
  sourceSize,
  durationMs
}) {
  await getPool().query(
    `INSERT INTO voice_clone_assets
     (user_id, audio_sha256, voice_id, voice_name, source_file_name, source_mime_type, source_size, duration_ms, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'processing')`,
    [
      userId,
      audioHash || null,
      voiceId,
      voiceName || null,
      sourceFileName || null,
      sourceMimeType || null,
      sourceSize || 0,
      durationMs || 0
    ]
  );
}

export async function completeVoiceCloneAsset({ userId, audioHash, voiceId, voiceName, demoAudio, durationMs }) {
  await getPool().query(
    `UPDATE voice_clone_assets
     SET voice_id = ?, voice_name = ?, demo_audio = ?, duration_ms = COALESCE(NULLIF(?, 0), duration_ms),
         status = 'completed', provider_activated_at = COALESCE(provider_activated_at, CURRENT_TIMESTAMP),
         last_used_at = CURRENT_TIMESTAMP, error_message = NULL
     WHERE user_id = ? AND audio_sha256 = ?`,
    [voiceId, voiceName || null, demoAudio || null, durationMs || 0, userId, audioHash]
  );
}

export async function failVoiceCloneAsset({ userId, audioHash, errorMessage }) {
  if (!audioHash) return;
  await getPool().query(
    `UPDATE voice_clone_assets
     SET status = 'failed', error_message = ?
     WHERE user_id = ? AND audio_sha256 = ? AND status = 'processing'`,
    [String(errorMessage || "").slice(0, 1000), userId, audioHash]
  );
}

export async function markVoiceCloneAssetExpired({ userId, voiceId, errorMessage }) {
  if (!voiceId) return;
  await getPool().query(
    `UPDATE voice_clone_assets
     SET status = 'expired', error_message = ?
     WHERE user_id = ? AND voice_id = ? AND status = 'completed'`,
    [String(errorMessage || "provider voice is unavailable").slice(0, 1000), userId, voiceId]
  );
}

export async function touchVoiceCloneAssetLastUsed({ userId, voiceId }) {
  if (!voiceId) return;
  await getPool().query(
    `UPDATE voice_clone_assets
     SET last_used_at = CURRENT_TIMESTAMP
     WHERE user_id = ? AND voice_id = ? AND status = 'completed'`,
    [userId, voiceId]
  );
}

export async function retryFailedVoiceCloneAssetProcessing({
  userId,
  audioHash,
  voiceId,
  voiceName,
  sourceFileName,
  sourceMimeType,
  sourceSize,
  durationMs
}) {
  const [result] = await getPool().query(
    `UPDATE voice_clone_assets
     SET voice_id = ?, voice_name = ?, source_file_name = ?, source_mime_type = ?,
         source_size = ?, duration_ms = ?, status = 'processing', error_message = NULL
     WHERE user_id = ? AND audio_sha256 = ? AND status IN ('failed', 'expired')`,
    [
      voiceId,
      voiceName || null,
      sourceFileName || null,
      sourceMimeType || null,
      sourceSize || 0,
      durationMs || 0,
      userId,
      audioHash
    ]
  );
  return Number(result.affectedRows || 0) > 0;
}
