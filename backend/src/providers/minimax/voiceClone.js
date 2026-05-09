import { requestMinimax } from "./client.js";

function getFileId(result) {
  return result?.file?.file_id || result?.data?.file?.file_id || result?.file_id || result?.data?.file_id || "";
}

function normalizeFile(result, fallbackPurpose) {
  const file = result?.file || result?.data?.file || {};
  const fileId = getFileId(result);
  if (!fileId) {
    const error = new Error("Minimax upload response missing file_id");
    error.status = 502;
    error.body = result;
    throw error;
  }

  return {
    fileId: String(fileId),
    bytes: Number(file.bytes || 0),
    createdAt: Number(file.created_at || 0),
    fileName: file.filename || "",
    purpose: file.purpose || fallbackPurpose,
    raw: result
  };
}

function buildUploadForm({ buffer, fileName, mimeType, purpose }) {
  const formData = new FormData();
  formData.append("purpose", purpose);
  formData.append("file", new Blob([buffer], { type: mimeType || "application/octet-stream" }), fileName || "audio.mp3");
  return formData;
}

export async function uploadMinimaxVoiceFile({ buffer, fileName, mimeType, purpose }) {
  const result = await requestMinimax("/v1/files/upload", {
    method: "POST",
    body: buildUploadForm({ buffer, fileName, mimeType, purpose })
  });

  return normalizeFile(result, purpose);
}

export async function cloneMinimaxVoice({
  cloneAudioFileId,
  voiceId,
  promptAudioFileId,
  promptText,
  previewText,
  model
}) {
  const body = {
    file_id: Number(cloneAudioFileId),
    voice_id: voiceId
  };

  if (promptAudioFileId || promptText) {
    body.clone_prompt = {};
    if (promptAudioFileId) body.clone_prompt.prompt_audio = Number(promptAudioFileId);
    if (promptText) body.clone_prompt.prompt_text = promptText;
  }

  if (previewText) body.text = previewText;
  if (model) body.model = model;

  const result = await requestMinimax("/v1/voice_clone", {
    method: "POST",
    body: JSON.stringify(body)
  });

  return {
    voiceId,
    demoAudio: result.demo_audio || result.data?.demo_audio || "",
    inputSensitive: Boolean(result.input_sensitive || result.data?.input_sensitive),
    inputSensitiveType: Number(result.input_sensitive_type || result.data?.input_sensitive_type || 0),
    extraInfo: result.extra_info || result.data?.extra_info || null,
    raw: result
  };
}
