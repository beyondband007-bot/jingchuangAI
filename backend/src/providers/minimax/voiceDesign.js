import { requestMinimax } from "./client.js";

function hexToBase64(hex = "") {
  const cleaned = String(hex).replace(/\s+/g, "");
  if (!cleaned) return "";
  return Buffer.from(cleaned, "hex").toString("base64");
}

export async function designMinimaxVoice({ prompt, previewText, voiceId, aigcWatermark = false }) {
  const body = {
    prompt,
    preview_text: previewText,
    aigc_watermark: Boolean(aigcWatermark)
  };

  if (voiceId) body.voice_id = voiceId;

  const result = await requestMinimax("/v1/voice_design", {
    method: "POST",
    body: JSON.stringify(body)
  });

  const designedVoiceId = result.voice_id || result.data?.voice_id || voiceId || "";
  const trialAudioHex = result.trial_audio || result.data?.trial_audio || "";
  const trialAudioBase64 = hexToBase64(trialAudioHex);

  if (!designedVoiceId) {
    const error = new Error("Minimax voice design response missing voice_id");
    error.status = 502;
    error.body = result;
    throw error;
  }

  return {
    voiceId: designedVoiceId,
    trialAudioHex,
    trialAudioBase64,
    trialAudioDataUrl: trialAudioBase64 ? `data:audio/mpeg;base64,${trialAudioBase64}` : "",
    raw: result
  };
}
