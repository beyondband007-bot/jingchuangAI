import { config } from "../../config/index.js";
import { createHttpError } from "../../shared/http.js";

function ensureKey() {
  if (!config.qwen.apiKey) {
    const error = new Error("QWEN_API_KEY / DASHSCOPE_API_KEY is not configured");
    error.status = 500;
    throw error;
  }
}

export async function analyzeVideoWithQwen({ videoUrl, prompt }) {
  ensureKey();

  const defaultPrompt = `请分析这个视频的内容，输出以下信息（严格按 JSON 格式）：
{
  "text": "视频的完整文本脚本或内容描述",
  "style": "整体风格，如：温馨治愈、紧张刺激、科技未来感、怀旧复古",
  "mood": "情绪基调，如：轻松愉快、忧郁沉静、激昂振奋、宁静安详",
  "genre": "推荐背景音乐类型，如：轻柔钢琴、电子氛围、古典弦乐、民谣吉他",
  "emotion_tag": "配音情绪标签，从以下选一个：happy, sad, angry, calm, fluent, neutral, surprised, fearful"
}`;

  const body = {
    model: config.qwen.model,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "video_url",
            video_url: { url: videoUrl }
          },
          {
            type: "text",
            text: prompt || defaultPrompt
          }
        ]
      }
    ]
  };

  const response = await fetch(`${config.qwen.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.qwen.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  let result;
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = { raw: text };
  }

  if (!response.ok || result.error) {
    const rawMessage = result.error?.message || result.message || `Qwen request failed with ${response.status}`;
    const error = new Error(rawMessage);
    error.status = response.ok ? 502 : response.status;
    error.body = result;
    throw error;
  }

  const content = result.choices?.[0]?.message?.content || "";
  const parsed = extractJsonFromContent(content);

  return {
    text: parsed?.text || content.slice(0, 500),
    style: parsed?.style || "",
    mood: parsed?.mood || "",
    genre: parsed?.genre || "",
    emotionTag: parsed?.emotion_tag || parsed?.emotionTag || "neutral",
    raw: result
  };
}

function extractJsonFromContent(content = "") {
  const text = String(content || "").trim();
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

export async function analyzeFramesWithQwen({ framesBase64, prompt }) {
  ensureKey();

  const defaultPrompt = `请分析这些视频帧，输出以下信息（严格按 JSON 格式）：
{
  "text": "视频内容的完整文本描述",
  "style": "整体风格",
  "mood": "情绪基调",
  "genre": "推荐背景音乐类型",
  "emotion_tag": "配音情绪标签：happy, sad, angry, calm, fluent, neutral, surprised, fearful"
}`;

  const imageContents = framesBase64.map((b64) => ({
    type: "image_url",
    image_url: { url: `data:image/jpeg;base64,${b64}` }
  }));

  const body = {
    model: config.qwen.model,
    messages: [
      {
        role: "user",
        content: [
          ...imageContents,
          { type: "text", text: prompt || defaultPrompt }
        ]
      }
    ]
  };

  const response = await fetch(`${config.qwen.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.qwen.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const text = await response.text();
  let result;
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = { raw: text };
  }

  if (!response.ok || result.error) {
    const rawMessage = result.error?.message || result.message || `Qwen request failed with ${response.status}`;
    const error = new Error(rawMessage);
    error.status = response.ok ? 502 : response.status;
    error.body = result;
    throw error;
  }

  const content = result.choices?.[0]?.message?.content || "";
  const parsed = extractJsonFromContent(content);

  return {
    text: parsed?.text || content.slice(0, 500),
    style: parsed?.style || "",
    mood: parsed?.mood || "",
    genre: parsed?.genre || "",
    emotionTag: parsed?.emotion_tag || parsed?.emotionTag || "neutral",
    raw: result
  };
}
