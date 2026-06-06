import { config } from "../../config/index.js";
import { requestKie } from "./client.js";

const chatTimeoutMs = Number(process.env.KIE_CHAT_TIMEOUT_MS || 60000);

function hasAttachments(message) {
  return Array.isArray(message.attachments) && message.attachments.length > 0;
}

function mapCodexContent(message) {
  const content = [];
  if (message.content) {
    content.push({
      type: "input_text",
      text: message.content
    });
  }

  for (const attachment of message.attachments || []) {
    if (attachment.kind === "image") {
      content.push({
        type: "input_image",
        image_url: attachment.url
      });
    } else {
      content.push({
        type: "input_file",
        file_url: attachment.url
      });
    }
  }

  return content.length ? content : [{ type: "input_text", text: "" }];
}

function mapOpenAiContent(message) {
  const content = [];
  if (message.content) {
    content.push({
      type: "text",
      text: message.content
    });
  }

  for (const attachment of message.attachments || []) {
    content.push({
      type: "image_url",
      image_url: {
        url: attachment.url
      }
    });
  }

  return content.length ? content : "";
}

function mapMessage(message) {
  return {
    role: message.role,
    content: mapCodexContent(message)
  };
}

function mapOpenAiMessage(message) {
  return {
    role: message.role,
    content: hasAttachments(message) ? mapOpenAiContent(message) : message.content
  };
}

function splitClaudeMessages(messages) {
  const system = messages
    .filter((message) => message.role === "system")
    .map((message) => message.content)
    .join("\n\n");
  const chatMessages = messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content
    }));

  if (!chatMessages.length) {
    chatMessages.push({ role: "user", content: system || "Hello" });
    return { system: "", messages: chatMessages };
  }

  return { system, messages: chatMessages };
}

function flattenMessagesForKie(messages) {
  if (messages.length <= 1) return messages;

  const latestUserMessage = [...messages].reverse().find((message) => message.role === "user");

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
      content: `Continue the conversation using the transcript below. Answer the latest user message.\n\n${transcript}`,
      attachments: latestUserMessage?.attachments || []
    }
  ];
}

function getChatProvider(model) {
  const providerModel = String(model.provider_model || model.model_key || "");
  if (providerModel.startsWith("gemini-")) return "gemini";
  if (providerModel.startsWith("claude-")) return "claude";
  return "codex";
}

function getCodexResponsePath(model) {
  const providerModel = String(model.provider_model || model.model_key || "");
  return providerModel.includes("codex") ? "/api/v1/responses" : "/codex/v1/responses";
}

function getGeminiChatPath(model) {
  const providerModel = String(model.provider_model || model.model_key || "");
  const endpointModel = providerModel.replace(/-openai$/, "");
  return `/${endpointModel}/v1/chat/completions`;
}

export function extractChatText(record) {
  if (typeof record?.output_text === "string" && record.output_text.trim()) {
    return record.output_text.trim();
  }
  if (typeof record?.response?.output_text === "string" && record.response.output_text.trim()) {
    return record.response.output_text.trim();
  }

  const chunks = [];
  for (const item of record?.output || record?.response?.output || []) {
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
    record?.output_text_delta,
    record?.data?.delta,
    record?.data?.output_text_delta,
    record?.response?.delta,
    record?.response?.output_text_delta
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value) return value;
  }

  for (const item of record?.output || []) {
    for (const content of item.content || []) {
      if (typeof content.delta === "string") return content.delta;
      if (typeof content.output_text_delta === "string") return content.output_text_delta;
    }
  }

  return "";
}

function extractStreamText(record) {
  if (typeof record?.output_text === "string" && record.output_text) return record.output_text;
  if (typeof record?.text === "string" && record.text) return record.text;
  if (typeof record?.content === "string" && record.content) return record.content;
  if (typeof record?.data?.output_text === "string" && record.data.output_text) return record.data.output_text;
  if (typeof record?.data?.text === "string" && record.data.text) return record.data.text;
  if (typeof record?.data?.content === "string" && record.data.content) return record.data.content;
  if (typeof record?.response?.output_text === "string" && record.response.output_text) return record.response.output_text;
  if (typeof record?.response?.text === "string" && record.response.text) return record.response.text;
  if (typeof record?.response?.content === "string" && record.response.content) return record.response.content;
  return extractChatText(record);
}

function extractOpenAiChatText(record) {
  if (typeof record?.choices?.[0]?.message?.content === "string") {
    return record.choices[0].message.content.trim();
  }
  if (typeof record?.data?.choices?.[0]?.message?.content === "string") {
    return record.data.choices[0].message.content.trim();
  }
  return extractStreamText(record).trim();
}

function extractClaudeText(record) {
  if (typeof record?.content === "string") return record.content.trim();

  const chunks = [];
  for (const item of record?.content || record?.data?.content || []) {
    if (typeof item?.text === "string") chunks.push(item.text);
  }
  return chunks.join("").trim() || extractStreamText(record).trim();
}

function appendFromSnapshot(current, snapshot) {
  if (!snapshot) return { text: current, delta: "" };
  if (!current) return { text: snapshot, delta: snapshot };
  if (snapshot === current) return { text: current, delta: "" };
  if (snapshot.startsWith(current)) {
    return { text: snapshot, delta: snapshot.slice(current.length) };
  }

  const maxOverlap = Math.min(current.length, snapshot.length);
  for (let size = maxOverlap; size > 0; size -= 1) {
    if (current.endsWith(snapshot.slice(0, size))) {
      const delta = snapshot.slice(size);
      return { text: current + delta, delta };
    }
  }

  return { text: snapshot, delta: snapshot };
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

function buildOpenAiChatBody({ model, messages, reasoningEffort, stream }) {
  const body = {
    model: model.provider_model,
    messages: messages.map(mapOpenAiMessage),
    stream
  };

  if (reasoningEffort && reasoningEffort !== "none") {
    body.reasoning_effort = reasoningEffort;
  }

  return body;
}

function buildClaudeBody({ model, messages, reasoningEffort, stream }) {
  if (messages.some(hasAttachments)) {
    const error = new Error("当前模型不支持该附件类型");
    error.status = 400;
    throw error;
  }

  const { system, messages: claudeMessages } = splitClaudeMessages(messages);
  const body = {
    model: model.provider_model,
    max_tokens: 4096,
    messages: claudeMessages,
    stream
  };

  if (system) body.system = system;
  if (reasoningEffort && reasoningEffort !== "none") body.thinkingFlag = true;

  return body;
}

function getEndpointAndBody({ model, messages, reasoningEffort, stream }) {
  const provider = getChatProvider(model);
  if (provider === "gemini") {
    return {
      provider,
      path: getGeminiChatPath(model),
      body: buildOpenAiChatBody({ model, messages, reasoningEffort, stream })
    };
  }
  if (provider === "claude") {
    return {
      provider,
      path: "/claude/v1/messages",
      body: buildClaudeBody({ model, messages, reasoningEffort, stream })
    };
  }
  return {
    provider,
    path: getCodexResponsePath(model),
    body: buildChatBody({ model, messages, reasoningEffort, stream })
  };
}

export async function createKieChatResponse({ model, messages, reasoningEffort }) {
  const request = getEndpointAndBody({ model, messages, reasoningEffort, stream: false });

  const result = await requestKie(request.path, {
    method: "POST",
    signal: AbortSignal.timeout(chatTimeoutMs),
    body: JSON.stringify(request.body)
  });

  const text =
    request.provider === "gemini" ? extractOpenAiChatText(result) :
    request.provider === "claude" ? extractClaudeText(result) :
    extractChatText(result);
  if (!text) {
    const error = new Error("chat response missing text");
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
  const request = getEndpointAndBody({ model, messages, reasoningEffort, stream: true });

  const response = await fetch(`${config.kie.baseUrl}${request.path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.kie.apiKey}`,
      "Content-Type": "application/json"
    },
    signal: AbortSignal.timeout(chatTimeoutMs),
    body: JSON.stringify(request.body)
  });

  if (!response.ok) {
    const text = await response.text();
    let body;
    try {
      body = text ? JSON.parse(text) : {};
    } catch {
      body = { raw: text };
    }
    const error = new Error(body.msg || body.error || `request failed with ${response.status}`);
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
    const delta =
      request.provider === "gemini" ? record?.choices?.[0]?.delta?.content || record?.data?.choices?.[0]?.delta?.content || "" :
      request.provider === "claude" ? record?.delta?.text || record?.content_block?.text || "" :
      extractStreamDelta(record);
    if (delta) {
      text += delta;
      await onDelta(delta);
      return;
    }

    const fullText =
      request.provider === "gemini" ? extractOpenAiChatText(record) :
      request.provider === "claude" ? extractClaudeText(record) :
      extractStreamText(record);
    if (fullText) {
      const next = appendFromSnapshot(text, fullText);
      text = next.text;
      if (next.delta) await onDelta(next.delta);
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
    const error = new Error("chat stream missing text");
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
