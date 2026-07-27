import { config } from "../../config/index.js";

const VIDEO_REVERSE_PROMPT = `你是专业的视频生成提示词分析师。请完整理解视频的时间顺序，不要把它当作互不相关的静态图片。

只返回合法 JSON，不要输出 Markdown，不要解释。必须遵循以下结构：
{
  "summary": "对视频真实可见内容的客观概述",
  "subjects": [
    {
      "name": "主体称谓",
      "appearance": "外观、服装或材质",
      "consistency_notes": "跨镜头的一致性或变化"
    }
  ],
  "shots": [
    {
      "start_seconds": 0,
      "end_seconds": 0,
      "subject": "当前镜头主体",
      "action": "动作、方向、速度及变化过程",
      "scene": "场景与环境",
      "composition": "景别、构图、机位",
      "camera": "推、拉、摇、移、跟拍、环绕、固定等运镜；看不出则写固定镜头或无法确认",
      "lighting": "光线和色彩",
      "transition": "与下一镜头的转场关系"
    }
  ],
  "global_style": "整体视觉风格",
  "color_and_lighting": "整体色彩与光线",
  "motion_and_pacing": "动作节奏、运镜节奏和剪辑节奏",
  "generation_prompt": "可直接用于 AI 视频生成的中文提示词。按主体、连续动作、场景、镜头语言、色彩光线、风格氛围组织；多镜头必须按镜头一、镜头二依次描述",
  "tags": ["中文标签"],
  "uncertain_items": ["无法从视频确认的内容"],
  "confidence": 0.0
}

要求：
1. 只描述真实可见内容，不猜测人物身份、品牌、地点或故事背景。
2. 准确描述连续动作、镜头运动、转场和先后顺序。
3. 不把字幕、贴纸或界面文字当成真实场景物体。
4. 如果无法确认某项，写入 uncertain_items，不要编造。
5. generation_prompt 必须完整、连贯、可直接用于视频生成，不能只是若干图片描述的拼接。`;

function createQwenError(message, status = 502, body = null, code = "PROVIDER_UNAVAILABLE") {
  const error = new Error(message);
  error.status = status;
  error.body = body;
  error.code = code;
  error.provider = "qwen";
  return error;
}

function ensureQwenConfig() {
  if (!config.qwen.apiKey) {
    throw createQwenError("QWEN_API_KEY / DASHSCOPE_API_KEY is not configured", 500, null, "PROVIDER_NOT_CONFIGURED");
  }
}

function stripJsonFence(text) {
  return String(text || "")
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

export function parseVideoReverseJson(content) {
  const text = stripJsonFence(content);
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw createQwenError("视频分析结果不是有效 JSON", 502, { content: text.slice(0, 1000) }, "OUTPUT_SCHEMA_INVALID");
  }

  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    throw createQwenError("视频分析结果 JSON 解析失败", 502, { content: text.slice(0, 1000) }, "OUTPUT_SCHEMA_INVALID");
  }
}

function normalizeText(value) {
  return String(value || "").trim();
}

function normalizeTags(value) {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map(normalizeText).filter(Boolean))).slice(0, 12);
  }
  if (typeof value === "string") {
    return Array.from(new Set(value.split(/[,，、\n]/).map(normalizeText).filter(Boolean))).slice(0, 12);
  }
  return [];
}

function normalizeShots(value) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 40).map((shot, index) => ({
    index: index + 1,
    startSeconds: Number.isFinite(Number(shot?.start_seconds)) ? Number(shot.start_seconds) : null,
    endSeconds: Number.isFinite(Number(shot?.end_seconds)) ? Number(shot.end_seconds) : null,
    subject: normalizeText(shot?.subject),
    action: normalizeText(shot?.action),
    scene: normalizeText(shot?.scene),
    composition: normalizeText(shot?.composition),
    camera: normalizeText(shot?.camera),
    lighting: normalizeText(shot?.lighting),
    transition: normalizeText(shot?.transition)
  }));
}

export function normalizeVideoReverseAnalysis(parsed, metadata = {}) {
  const prompt = normalizeText(parsed?.generation_prompt || parsed?.prompt || parsed?.aiPrompt);
  const description = normalizeText(parsed?.summary || parsed?.description);
  if (!prompt && !description) {
    throw createQwenError("视频分析未生成可用提示词", 502, parsed, "OUTPUT_SCHEMA_INVALID");
  }

  const confidenceValue = Number(parsed?.confidence);
  const confidence = Number.isFinite(confidenceValue)
    ? Math.max(0, Math.min(1, confidenceValue))
    : null;
  const shots = normalizeShots(parsed?.shots);
  const uncertainItems = Array.isArray(parsed?.uncertain_items)
    ? parsed.uncertain_items.map(normalizeText).filter(Boolean).slice(0, 20)
    : [];

  return {
    prompt: prompt || description,
    description: description || prompt.slice(0, 300),
    style: normalizeText(parsed?.global_style || parsed?.style),
    mood: normalizeText(parsed?.motion_and_pacing || parsed?.mood),
    tags: normalizeTags(parsed?.tags),
    model: metadata.model || config.qwen.videoReverseModel,
    provider: "qwen",
    analysisMode: metadata.analysisMode || "direct_video",
    frameCount: metadata.frameCount,
    providerRequestId: metadata.providerRequestId || "",
    providerStatusCode: metadata.providerStatusCode || 200,
    latencyMs: metadata.latencyMs,
    attemptCount: metadata.attemptCount || 1,
    qualityWarning: metadata.qualityWarning || "",
    analysis: {
      summary: description,
      subjects: Array.isArray(parsed?.subjects) ? parsed.subjects.slice(0, 20) : [],
      shots,
      globalStyle: normalizeText(parsed?.global_style || parsed?.style),
      colorAndLighting: normalizeText(parsed?.color_and_lighting),
      motionAndPacing: normalizeText(parsed?.motion_and_pacing),
      uncertainItems,
      confidence
    }
  };
}

function extractResponseText(result) {
  const content = result?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map((part) => (typeof part === "string" ? part : part?.text || ""))
    .join("\n")
    .trim();
}

function shouldRetry(status, error) {
  if (error?.code === "OUTPUT_SCHEMA_INVALID") return false;
  if ([429, 502, 503, 504].includes(Number(status))) return true;
  return error?.name === "TimeoutError" || error?.name === "AbortError" || error instanceof TypeError;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function requestQwenVideoAnalysis({
  content,
  model = config.qwen.videoReverseModel,
  fetchImpl = fetch,
  timeoutMs = config.qwen.videoReverseTimeoutMs,
  maxAttempts = config.qwen.videoReverseMaxAttempts,
  resolveOssResource = false
}) {
  ensureQwenConfig();
  const attemptsLimit = Math.max(1, Number(maxAttempts) || 1);
  const startedAt = Date.now();
  let lastError;

  for (let attempt = 1; attempt <= attemptsLimit; attempt += 1) {
    try {
      const response = await fetchImpl(`${config.qwen.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.qwen.apiKey}`,
          "Content-Type": "application/json",
          ...(resolveOssResource ? { "X-DashScope-OssResourceResolve": "enable" } : {})
        },
        signal: AbortSignal.timeout(Math.max(1000, Number(timeoutMs) || 180000)),
        body: JSON.stringify({
          model,
          messages: [{ role: "user", content }],
          enable_thinking: false,
          response_format: { type: "json_object" },
          temperature: 0.1
        })
      });

      const responseText = await response.text();
      let result;
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch {
        result = { raw: responseText };
      }

      if (!response.ok || result.error) {
        const message =
          result.error?.message ||
          result.message ||
          `Qwen request failed with ${response.status}`;
        const errorCode = response.status === 429
          ? "PROVIDER_RATE_LIMITED"
          : [502, 503, 504].includes(response.status)
            ? "PROVIDER_UNAVAILABLE"
            : "PROVIDER_BAD_RESPONSE";
        const error = createQwenError(message, response.status, result, errorCode);
        if (attempt < attemptsLimit && shouldRetry(response.status, error)) {
          await sleep(800 * (2 ** (attempt - 1)) + Math.floor(Math.random() * 250));
          continue;
        }
        throw error;
      }

      const text = extractResponseText(result);
      if (!text) {
        throw createQwenError("Qwen 视频分析响应缺少文本", 502, result, "OUTPUT_SCHEMA_INVALID");
      }

      return {
        parsed: parseVideoReverseJson(text),
        model,
        attemptCount: attempt,
        providerRequestId:
          response.headers?.get?.("x-request-id") ||
          response.headers?.get?.("x-dashscope-request-id") ||
          result.id ||
          result.request_id ||
          "",
        providerStatusCode: response.status,
        latencyMs: Date.now() - startedAt,
        usage: result.usage || null
      };
    } catch (error) {
      lastError = error;
      error.attemptCount = attempt;
      error.latencyMs = Date.now() - startedAt;
      if (attempt < attemptsLimit && shouldRetry(error?.status, error)) {
        await sleep(800 * (2 ** (attempt - 1)) + Math.floor(Math.random() * 250));
        continue;
      }
      if (error?.name === "TimeoutError" || error?.name === "AbortError") {
        throw createQwenError("Qwen 视频分析请求超时", 504, null, "PROVIDER_TIMEOUT");
      }
      throw error;
    }
  }

  throw lastError || createQwenError("Qwen 视频分析失败");
}

export async function analyzeVideoForPrompt({
  videoUrl,
  fps = 2,
  model,
  fetchImpl
}) {
  if (!String(videoUrl || "").trim()) {
    throw createQwenError("视频 URL 不能为空", 400, null, "MEDIA_URL_UNREACHABLE");
  }

  const response = await requestQwenVideoAnalysis({
    model,
    fetchImpl,
    resolveOssResource: /^oss:\/\//i.test(videoUrl),
    content: [
      {
        type: "video_url",
        video_url: { url: videoUrl },
        fps: Math.max(0.1, Math.min(10, Number(fps) || 2))
      },
      { type: "text", text: VIDEO_REVERSE_PROMPT }
    ]
  });

  return {
    ...normalizeVideoReverseAnalysis(response.parsed, {
      ...response,
      analysisMode: "direct_video"
    }),
    usage: response.usage
  };
}

export async function analyzeVideoFramesForPrompt({
  frames,
  model,
  fetchImpl
}) {
  if (!Array.isArray(frames) || frames.length < 4) {
    throw createQwenError("视频降级分析至少需要 4 张有效关键帧", 400, null, "INSUFFICIENT_VISUAL_EVIDENCE");
  }

  const frameContent = frames.flatMap((frame, index) => [
    {
      type: "text",
      text: `关键帧 ${index + 1}，时间 ${Number(frame.timestampSeconds || 0).toFixed(3)} 秒`
    },
    {
      type: "image_url",
      image_url: { url: `data:image/jpeg;base64,${frame.base64}` }
    }
  ]);
  const response = await requestQwenVideoAnalysis({
    model,
    fetchImpl,
    content: [
      {
        type: "text",
        text:
          `${VIDEO_REVERSE_PROMPT}\n\n` +
          "下面是按时间排序的视频关键帧。请比较相邻帧变化推断动作和运镜，但无法确认的连续运动必须写入 uncertain_items。"
      },
      ...frameContent
    ]
  });

  return {
    ...normalizeVideoReverseAnalysis(response.parsed, {
      ...response,
      analysisMode: "scene_frames",
      frameCount: frames.length,
      qualityWarning: "原生视频理解失败，本结果基于关键帧联合分析，快速动作或复杂运镜可能不完整。"
    }),
    usage: response.usage
  };
}
