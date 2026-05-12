import { requestMinimax } from "./client.js";

const visionModel = "MiniMax-Text-01";

const imagePrompt = `Analyze the uploaded image and reverse-engineer a reusable AI generation prompt.
Return ONLY valid JSON with this exact shape:
{
  "description": "Chinese description of the visible subject, scene, composition, color, lighting, and details.",
  "style": "Chinese summary of the visual style.",
  "mood": "Chinese summary of the mood or atmosphere.",
  "prompt": "English generation prompt, comma-separated, directly usable in image/video generation tools.",
  "tags": ["tag1", "tag2", "tag3"]
}`;

const videoFramePrompt = `Analyze this video frame and reverse-engineer generation prompt details.
Return ONLY valid JSON with this exact shape:
{
  "description": "Chinese description of this frame.",
  "style": "Chinese summary of the visual style.",
  "mood": "Chinese summary of the mood or atmosphere.",
  "prompt": "English prompt fragment for recreating this frame.",
  "tags": ["tag1", "tag2", "tag3"]
}`;

function buildVisionMessage({ imageBase64, mimeType = "image/jpeg", isVideoFrame = false }) {
  return {
    model: visionModel,
    messages: [
      {
        role: "system",
        content:
          "You are a professional visual prompt engineer. Extract concrete visual details and produce concise, reusable generation prompts."
      },
      {
        role: "user",
        content: `${isVideoFrame ? videoFramePrompt : imagePrompt}\n\n[image_base64:${mimeType};base64,${imageBase64}]`
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
    fullText: frameAnalyses.map((analysis, index) => `Frame ${index + 1}:\n${analysis.fullText}`).join("\n\n"),
    prompt: allPrompts.length > 1 ? `Video sequence, ${allPrompts.join("; ")}` : allPrompts[0] || "",
    description: allDescriptions.join("；"),
    style: frameAnalyses[0]?.style || "",
    mood: frameAnalyses[0]?.mood || "",
    tags: uniqueTags,
    frameCount: framesBase64.length,
    model: visionModel,
    raw: frameAnalyses
  };
}
