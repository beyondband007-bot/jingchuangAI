import test from "node:test";
import assert from "node:assert/strict";

process.env.QWEN_API_KEY ||= "test-key";

const {
  analyzeVideoForPrompt,
  analyzeVideoFramesForPrompt,
  normalizeVideoReverseAnalysis,
  parseVideoReverseJson
} = await import("./videoReverse.js");

const validAnalysis = {
  summary: "一名人物从画面左侧走向右侧，镜头平稳跟拍。",
  subjects: [{ name: "人物", appearance: "深色外套", consistency_notes: "主体一致" }],
  shots: [{
    start_seconds: 0,
    end_seconds: 4,
    subject: "人物",
    action: "从左向右行走",
    scene: "室外街道",
    composition: "中景",
    camera: "平稳跟拍",
    lighting: "自然光",
    transition: "无"
  }],
  global_style: "写实",
  color_and_lighting: "自然色彩",
  motion_and_pacing: "节奏平稳",
  generation_prompt: "一名身穿深色外套的人物在室外街道从左向右行走，中景平稳跟拍，自然光，写实风格。",
  tags: ["人物", "街道", "跟拍"],
  uncertain_items: [],
  confidence: 0.91
};

function createJsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "x-request-id": "qwen-test-request" }
  });
}

test("parses fenced JSON and normalizes the video analysis schema", () => {
  const parsed = parseVideoReverseJson(`\`\`\`json\n${JSON.stringify(validAnalysis)}\n\`\`\``);
  const normalized = normalizeVideoReverseAnalysis(parsed, {
    model: "qwen3.7-plus",
    analysisMode: "direct_video"
  });

  assert.equal(normalized.model, "qwen3.7-plus");
  assert.equal(normalized.analysisMode, "direct_video");
  assert.equal(normalized.analysis.shots.length, 1);
  assert.equal(normalized.analysis.confidence, 0.91);
  assert.match(normalized.prompt, /平稳跟拍/);
});

test("sends a native video_url request with bounded fps", async () => {
  let requestBody;
  const fetchImpl = async (_url, options) => {
    requestBody = JSON.parse(options.body);
    return createJsonResponse({
      id: "chatcmpl-video-test",
      choices: [{ message: { content: JSON.stringify(validAnalysis) } }],
      usage: { prompt_tokens: 100, completion_tokens: 50 }
    });
  };

  const result = await analyzeVideoForPrompt({
    videoUrl: "https://example.com/video.mp4",
    fps: 99,
    fetchImpl
  });

  assert.equal(requestBody.model, "qwen3.7-plus");
  assert.equal(requestBody.enable_thinking, false);
  assert.deepEqual(requestBody.response_format, { type: "json_object" });
  assert.equal(requestBody.messages[0].content[0].type, "video_url");
  assert.equal(requestBody.messages[0].content[0].fps, 10);
  assert.equal(result.providerRequestId, "qwen-test-request");
  assert.equal(result.analysisMode, "direct_video");
});

test("enables DashScope OSS resolution for temporary video URLs", async () => {
  let requestHeaders;
  await analyzeVideoForPrompt({
    videoUrl: "oss://dashscope-instant/example/video.mp4",
    fetchImpl: async (_url, options) => {
      requestHeaders = options.headers;
      return createJsonResponse({
        id: "chatcmpl-oss-test",
        choices: [{ message: { content: JSON.stringify(validAnalysis) } }]
      });
    }
  });

  assert.equal(requestHeaders["X-DashScope-OssResourceResolve"], "enable");
});

test("requires at least four frames for fallback analysis", async () => {
  await assert.rejects(
    () => analyzeVideoFramesForPrompt({
      frames: [{ base64: "a", timestampSeconds: 0 }]
    }),
    (error) => error.code === "INSUFFICIENT_VISUAL_EVIDENCE"
  );
});
