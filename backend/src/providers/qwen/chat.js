import { config } from "../../config/index.js";
import {
  createOpenAiCompatibleChatResponse,
  createOpenAiCompatibleChatStream
} from "../openai-compatible/chat.js";

const chatTimeoutMs = Number(process.env.QWEN_CHAT_TIMEOUT_MS || 120000);

function buildReasoningBody(reasoningEffort) {
  return {
    enable_thinking: Boolean(reasoningEffort && reasoningEffort !== "none")
  };
}

function getOptions({ model, messages, reasoningEffort, onDelta, signal }) {
  return {
    providerName: "qwen",
    apiKey: config.qwen.apiKey,
    baseUrl: config.qwen.baseUrl,
    timeoutMs: chatTimeoutMs,
    model,
    messages,
    reasoningEffort,
    onDelta,
    signal,
    supportsImages: true,
    includeStreamUsage: true,
    buildReasoningBody
  };
}

export function createQwenChatResponse(input) {
  return createOpenAiCompatibleChatResponse(getOptions(input));
}

export function createQwenChatStream(input) {
  return createOpenAiCompatibleChatStream(getOptions(input));
}
