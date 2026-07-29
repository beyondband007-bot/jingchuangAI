import test from "node:test";
import assert from "node:assert/strict";

const {
  appendStreamFragment,
  extractGeminiCandidateText,
  extractKieUsage,
  extractOpenAiChatText,
  getEndpointAndBody,
  getGeminiChatPath
} = await import("./chat.js");

const messages = [
  {
    role: "user",
    content: "请分析这张图",
    attachments: [
      {
        kind: "image",
        url: "https://example.com/image.png"
      }
    ]
  }
];

test("maps GPT5.6-codex to the GPT-5.6 Sol responses endpoint", () => {
  const request = getEndpointAndBody({
    model: {
      model_key: "gpt-5-6-codex",
      provider_model: "gpt-5-6-sol"
    },
    messages,
    reasoningEffort: "low",
    stream: true
  });

  assert.equal(request.provider, "codex");
  assert.equal(request.path, "/codex/v1/responses");
  assert.equal(request.body.model, "gpt-5-6-sol");
  assert.equal(request.body.stream, true);
  assert.deepEqual(request.body.reasoning, { effort: "low" });
  assert.deepEqual(request.body.input[0].content, [
    { type: "input_text", text: "请分析这张图" },
    { type: "input_image", image_url: "https://example.com/image.png" }
  ]);
});

test("keeps the OpenAI suffix for the Gemini 3.6 endpoint", () => {
  const model = {
    model_key: "gemini-3-6-flash-openai",
    provider_model: "gemini-3-6-flash-openai"
  };
  const request = getEndpointAndBody({
    model,
    messages,
    reasoningEffort: "low",
    stream: true
  });

  assert.equal(getGeminiChatPath(model), "/gemini-3-6-flash-openai/v1/chat/completions");
  assert.equal(request.provider, "gemini");
  assert.equal(request.path, "/gemini-3-6-flash-openai/v1/chat/completions");
  assert.equal(request.body.model, "gemini-3-6-flash-openai");
  assert.equal(request.body.reasoning_effort, "low");
  assert.deepEqual(request.body.messages[0].content, [
    { type: "text", text: "请分析这张图" },
    {
      type: "image_url",
      image_url: { url: "https://example.com/image.png" }
    }
  ]);
});

test("preserves the existing Gemini 3.1 endpoint compatibility", () => {
  assert.equal(
    getGeminiChatPath({
      provider_model: "gemini-3.1-pro-openai"
    }),
    "/gemini-3.1-pro/v1/chat/completions"
  );
});

test("extracts Gemini candidate text and usage metadata", () => {
  const record = {
    candidates: [
      {
        content: {
          parts: [{ text: "你好，" }, { text: "世界" }]
        }
      }
    ],
    usageMetadata: {
      promptTokenCount: 12,
      candidatesTokenCount: 5,
      totalTokenCount: 17
    }
  };

  assert.equal(extractGeminiCandidateText(record), "你好，世界");
  assert.equal(extractOpenAiChatText(record), "你好，世界");
  assert.deepEqual(extractKieUsage(record), record.usageMetadata);
});

test("combines incremental and cumulative Gemini stream fragments", () => {
  let state = appendStreamFragment("", "你好");
  assert.deepEqual(state, { text: "你好", delta: "你好" });

  state = appendStreamFragment(state.text, "，世界");
  assert.deepEqual(state, { text: "你好，世界", delta: "，世界" });

  state = appendStreamFragment(state.text, "你好，世界！");
  assert.deepEqual(state, { text: "你好，世界！", delta: "！" });
});
