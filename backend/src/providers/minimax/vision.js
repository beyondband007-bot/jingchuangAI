import { requestMinimax } from "./client.js";

const visionModel = "MiniMax-Text-01";

const imagePrompt = `请直接观察上传的图片，反推出可复用的中文 AI 生成提示词。
只返回合法 JSON，不要输出 Markdown，不要解释。格式如下：
{
  "description": "用中文客观描述图片中真实可见的主体、场景、构图、色彩、光线和细节。不要编造图片里没有的内容。",
  "style": "用中文概括视觉风格。",
  "mood": "用中文概括情绪和氛围。",
  "prompt": "中文 AI 生成提示词，逗号分隔，可直接用于图像或视频生成，必须忠实于图片真实内容。",
  "tags": ["中文标签1", "中文标签2", "中文标签3"]
}`;

const videoFramePrompt = `请直接观察这个视频帧，反推出可复用的中文 AI 生成提示词片段。
只返回合法 JSON，不要输出 Markdown，不要解释。格式如下：
{
  "description": "用中文客观描述当前帧真实可见的主体、场景、构图、色彩、光线和细节。不要编造画面里没有的内容。",
  "style": "用中文概括当前帧的视觉风格。",
  "mood": "用中文概括当前帧的情绪和氛围。",
  "prompt": "中文 AI 生成提示词片段，必须忠实于当前帧真实内容。",
  "tags": ["中文标签1", "中文标签2", "中文标签3"]
}`;

function buildVisionMessage({ imageBase64, mimeType = "image/jpeg", isVideoFrame = false }) {
  return {
    model: visionModel,
    messages: [
      {
        role: "system",
        content:
          "你是专业的视觉提示词工程师。必须基于用户上传的真实图像内容分析，不要凭空想象，不要使用英文输出。"
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text: isVideoFrame ? videoFramePrompt : imagePrompt
          },
          {
            type: "image_url",
            image_url: {
              url: `data:${mimeType};base64,${imageBase64}`
            }
          }
        ]
      }
    ]
  };
}

function stripJsonFence(text) {
  return String(text || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

function parseJsonObject(text) {
  const cleaned = stripJsonFence(text);
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;

  try {
    return JSON.parse(cleaned.slice(start, end + 1));
  } catch {
    return null;
  }
}

function normalizeTags(tags, fallbackText = "") {
  if (Array.isArray(tags)) {
    return tags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 10);
  }

  if (typeof tags === "string") {
    return tags
      .split(/[,，、\n]/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 10);
  }

  const hashTags = Array.from(String(fallbackText).matchAll(/#([^\s#,，、]+)/g))
    .map((match) => match[1].trim())
    .filter(Boolean);
  return Array.from(new Set(hashTags)).slice(0, 10);
}

function extractByLabel(text, labels) {
  for (const label of labels) {
    const pattern = new RegExp(`${label}\\s*[:：]\\s*([\\s\\S]+?)(?=\\n\\s*(?:[A-Za-z ]+|[\\u4e00-\\u9fa5]+)\\s*[:：]|$)`, "i");
    const match = String(text).match(pattern);
    if (match?.[1]) return match[1].trim();
  }
  return "";
}

function extractPromptFromResponse(content = "") {
  const text = String(content || "").trim();
  const parsed = parseJsonObject(text);

  if (parsed) {
    return {
      fullText: text,
      prompt: String(parsed.prompt || parsed.aiPrompt || "").trim() || text.slice(0, 500),
      description: String(parsed.description || "").trim() || text.slice(0, 240),
      style: String(parsed.style || "").trim(),
      mood: String(parsed.mood || parsed.atmosphere || "").trim(),
      tags: normalizeTags(parsed.tags, text)
    };
  }

  const prompt = extractByLabel(text, ["prompt", "ai prompt", "AI生成提示词", "提示词"]);
  const description = extractByLabel(text, ["description", "内容描述", "画面描述"]);
  const style = extractByLabel(text, ["style", "风格", "风格特点"]);
  const mood = extractByLabel(text, ["mood", "atmosphere", "氛围", "情绪"]);

  return {
    fullText: text,
    prompt: prompt || text.slice(0, 500),
    description: description || text.slice(0, 240),
    style,
    mood,
    tags: normalizeTags(undefined, text)
  };
}

function getContentFromResult(result) {
  const message = result.choices?.[0]?.message;
  if (Array.isArray(message?.content)) {
    return message.content
      .map((part) => (typeof part === "string" ? part : part?.text || ""))
      .join("\n")
      .trim();
  }

  return message?.content || result.content || "";
}

export async function analyzeImageWithMinimax({ imageBase64, mimeType }) {
  const body = buildVisionMessage({ imageBase64, mimeType });

  const result = await requestMinimax("/v1/chat/completions", {
    method: "POST",
    body: JSON.stringify(body)
  });

  const analysis = extractPromptFromResponse(getContentFromResult(result));
  return {
    ...analysis,
    model: visionModel,
    raw: result
  };
}

export async function analyzeVideoFramesWithMinimax({ framesBase64 }) {
  if (!Array.isArray(framesBase64) || !framesBase64.length) {
    const error = new Error("video frames are required");
    error.status = 400;
    throw error;
  }

  const frameAnalyses = [];

  for (let index = 0; index < framesBase64.length; index += 1) {
    const body = buildVisionMessage({
      imageBase64: framesBase64[index],
      mimeType: "image/jpeg",
      isVideoFrame: true
    });

    const result = await requestMinimax("/v1/chat/completions", {
      method: "POST",
      body: JSON.stringify(body)
    });

    frameAnalyses.push(extractPromptFromResponse(getContentFromResult(result)));
  }

  const allPrompts = frameAnalyses.map((analysis) => analysis.prompt).filter(Boolean);
  const allDescriptions = frameAnalyses.map((analysis) => analysis.description).filter(Boolean);
  const uniqueTags = Array.from(new Set(frameAnalyses.flatMap((analysis) => analysis.tags))).slice(0, 10);

  return {
    fullText: frameAnalyses.map((analysis, index) => `第 ${index + 1} 帧：\n${analysis.fullText}`).join("\n\n"),
    prompt: allPrompts.length > 1 ? `视频序列，${allPrompts.join("；")}` : allPrompts[0] || "",
    description: allDescriptions.join("；"),
    style: frameAnalyses[0]?.style || "",
    mood: frameAnalyses[0]?.mood || "",
    tags: uniqueTags,
    frameCount: framesBase64.length,
    model: visionModel,
    raw: frameAnalyses
  };
}
