import { config } from "../../config/index.js";
import { requestKie } from "./client.js";

const chatTimeoutMs = Number(process.env.KIE_CHAT_TIMEOUT_MS || 60000);

function mapMessage(message) {
  return {
    role: message.role,
    content: [
      {
        type: "input_text",
        text: message.content
      }
    ]
  };
}

function flattenMessagesForKie(messages) {
  if (messages.length <= 1) return messages;

  const transcript = messages
    .map((message) => {
      if (message.role === "system") return `System: ${message.content}`;
      if (message.role === "assistant") return `Assistant: ${message.content}`;
      return `User: ${message.content}`;
    })
    .join("\n\n");

  return [
    {
      role: "user",
      content: `Continue the conversation using the transcript below. Answer the latest user message.\n\n${transcript}`
    }
  ];
}

export function extractChatText(record) {
  if (typeof record?.output_text === "string" && record.output_text.trim()) {
    return record.output_text.trim();
  }

  const chunks = [];
  for (const item of record?.output || []) {
    for (const content of item.content || []) {
      if (typeof content.text === "string") chunks.push(content.text);
      if (typeof content.output_text === "string") chunks.push(content.output_text);
    }
  }

  return chunks.join("").trim();
}

export function extractKieCredits(record) {
  const value = record?.credits_consumed ?? record?.data?.credits_consumed ?? record?.usage?.credits_consumed;
  const credits = Number(value);
  return Number.isFinite(credits) && credits > 0 ? credits : 0;
}

function extractStreamDelta(record) {
  const candidates = [
    record?.delta,
    record?.text,
    record?.output_text_delta,
    record?.content,
    record?.data?.delta,
    record?.data?.text,
    record?.data?.output_text_delta,
    record?.data?.content
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value) return value;
  }

  for (const item of record?.output || []) {
    for (const content of item.content || []) {
      if (typeof content.delta === "string") return content.delta;
      if (typeof content.text === "string") return content.text;
      if (typeof content.output_text === "string") return content.output_text;
    }
  }

  return "";
}

function extractStreamText(record) {
  return extractChatText(record) || extractStreamDelta(record);
}

function ensureKieKey() {
  if (!config.kie.apiKey) {
    const error = new Error("KIE_API_KEY is not configured");
    error.status = 500;
    throw error;
  }
}

function buildChatBody({ model, messages, reasoningEffort, stream }) {
  const body = {
    model: model.provider_model,
    input: flattenMessagesForKie(messages).map(mapMessage),
    stream
  };

  if (reasoningEffort && reasoningEffort !== "none") {
    body.reasoning = { effort: reasoningEffort };
  }

  return body;
}

export async function createKieChatResponse({ model, messages, reasoningEffort }) {
  const body = buildChatBody({ model, messages, reasoningEffort, stream: false });

  const result = await requestKie("/codex/v1/responses", {
    method: "POST",
    signal: AbortSignal.timeout(chatTimeoutMs),
    body: JSON.stringify(body)
  });

  const text = extractChatText(result);
  if (!text) {
    const error = new Error("KIE chat response missing text");
    error.status = 502;
    error.body = result;
    throw error;
  }

  return {
    text,
    usage: result.usage || result.data?.usage || null,
    kieCreditsConsumed: extractKieCredits(result),
    raw: result
  };
}

export async function createKieChatStream({ model, messages, reasoningEffort, onDelta }) {
  ensureKieKey();

  const response = await fetch(`${config.kie.baseUrl}/codex/v1/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.kie.apiKey}`,
      "Content-Type": "application/json"
    },
    signal: AbortSignal.timeout(chatTimeoutMs),
    body: JSON.stringify(buildChatBody({ model, messages, reasoningEffort, stream: true }))
  });

  if (!response.ok) {
    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: text };
    }
    const error = new Error(body.msg || body.error || `KIE request failed with ${response.status}`);
    error.status = response.status || 502;
    error.body = body;
    throw error;
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let finalRecord = null;
  let text = "";

  async function handlePayload(payload) {
    const trimmed = payload.trim();
    if (!trimmed || trimmed === "[DONE]") return;

    let record;
    try {
      record = JSON.parse(trimmed);
    } catch {
      return;
    }

    finalRecord = record;
    const delta = extractStreamDelta(record);
    if (delta) {
      text += delta;
      await onDelta(delta);
      return;
    }

    const fullText = extractStreamText(record);
    if (fullText && fullText !== text) {
      const nextDelta = fullText.startsWith(text) ? fullText.slice(text.length) : fullText;
      text = fullText;
      if (nextDelta) await onDelta(nextDelta);
    }
  }

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const parts = buffer.split(/\r?\n\r?\n/);
    buffer = parts.pop() || "";

    for (const part of parts) {
      const dataLines = part
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trim());
      if (dataLines.length) {
        await handlePayload(dataLines.join("\n"));
      }
    }
  }

  const tail = buffer + decoder.decode();
  if (tail.trim()) {
    const dataLines = tail
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trim());
    if (dataLines.length) {
      await handlePayload(dataLines.join("\n"));
    }
  }

  if (!text.trim()) {
    const error = new Error("KIE chat stream missing text");
    error.status = 502;
    error.body = finalRecord;
    throw error;
  }

  return {
    text: text.trim(),
    usage: finalRecord?.usage || finalRecord?.data?.usage || null,
    kieCreditsConsumed: extractKieCredits(finalRecord),
    raw: finalRecord
  };
}
