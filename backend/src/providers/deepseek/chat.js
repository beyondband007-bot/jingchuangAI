import { config } from "../../config/index.js";
import {
  createOpenAiCompatibleChatResponse,
  createOpenAiCompatibleChatStream
} from "../openai-compatible/chat.js";

const chatTimeoutMs = Number(process.env.DEEPSEEK_CHAT_TIMEOUT_MS || 120000);

function buildReasoningBody(reasoningEffort) {
  if (!reasoningEffort || reasoningEffort === "none") {
    return { thinking: { type: "disabled" } };
  }
  return {
    thinking: { type: "enabled" },
    reasoning_effort: reasoningEffort
  };
}

function getOptions({ model, messages, reasoningEffort, onDelta, signal }) {
  return {
    providerName: "deepseek",
    apiKey: config.deepseek.apiKey,
    baseUrl: config.deepseek.baseUrl,
    timeoutMs: chatTimeoutMs,
    model,
    messages,
    reasoningEffort,
    onDelta,
    signal,
    supportsImages: false,
    includeStreamUsage: false,
    buildReasoningBody
  };
}

export function createDeepSeekChatResponse(input) {
  return createOpenAiCompatibleChatResponse(getOptions(input));
}

export function createDeepSeekChatStream(input) {
  return createOpenAiCompatibleChatStream(getOptions(input));
}
