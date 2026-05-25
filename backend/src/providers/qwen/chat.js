import { config } from "../../config/index.js";

function ensureKey() {
  if (!config.qwen.apiKey) {
    const error = new Error("QWEN_API_KEY / DASHSCOPE_API_KEY is not configured");
    error.status = 500;
    throw error;
  }
}

function mapReasoningEffort(reasoningEffort) {
  if (reasoningEffort === "high") return "Think carefully before answering.";
  if (reasoningEffort === "medium") return "Reason through the request before answering.";
  if (reasoningEffort === "low") return "Answer concisely.";
  return "";
}

export async function createQwenChatResponse({ messages, reasoningEffort }) {
  ensureKey();

  const systemHint = mapReasoningEffort(reasoningEffort);
  const requestMessages = systemHint
    ? [{ role: "system", content: systemHint }, ...messages]
    : messages;

  const response = await fetch(`${config.qwen.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.qwen.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: config.qwen.model,
      messages: requestMessages,
      stream: false
    })
  });

  const text = await response.text();
  let result;
  try {
    result = text ? JSON.parse(text) : {};
  } catch {
    result = { raw: text };
  }

  if (!response.ok || result.error) {
    const message = result.error?.message || result.message || `Qwen request failed with ${response.status}`;
    const error = new Error(message);
    error.status = response.ok ? 502 : response.status;
    error.body = result;
    throw error;
  }

  const content = result.choices?.[0]?.message?.content?.trim();
  if (!content) {
    const error = new Error("Qwen chat response missing text");
    error.status = 502;
    error.body = result;
    throw error;
  }

  return {
    text: content,
    usage: result.usage || null,
    kieCreditsConsumed: 0,
    raw: result,
    source: "qwen"
  };
}
