function createProviderError(providerName, message, status = 502, body = null) {
  const error = new Error(message);
  error.status = status;
  error.body = body;
  error.provider = providerName;
  return error;
}

function ensureProviderConfig({ providerName, apiKey, baseUrl }) {
  if (!apiKey) {
    throw createProviderError(providerName, `${providerName.toUpperCase()}_API_KEY is not configured`, 500);
  }
  if (!baseUrl) {
    throw createProviderError(providerName, `${providerName} base URL is not configured`, 500);
  }
}

function hasAttachments(message) {
  return Array.isArray(message.attachments) && message.attachments.length > 0;
}

function mapMessageContent(message, { supportsImages }) {
  if (!hasAttachments(message)) return message.content;

  const content = [];
  if (message.content) {
    content.push({ type: "text", text: message.content });
  }

  for (const attachment of message.attachments) {
    if (!supportsImages || attachment.kind !== "image") {
      throw createProviderError(
        supportsImages ? "qwen" : "deepseek",
        supportsImages ? "当前模型仅支持图片附件" : "当前模型暂不支持附件",
        400
      );
    }
    content.push({
      type: "image_url",
      image_url: { url: attachment.url }
    });
  }

  return content;
}

function mapMessages(messages, capabilities) {
  return messages.map((message) => ({
    role: message.role,
    content: mapMessageContent(message, capabilities)
  }));
}

function parseJson(text) {
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { raw: text };
  }
}

function extractMessageText(result) {
  const content = result?.choices?.[0]?.message?.content;
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map((item) => (typeof item?.text === "string" ? item.text : ""))
    .join("")
    .trim();
}

function extractDeltaText(record) {
  const content = record?.choices?.[0]?.delta?.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return "";
  return content
    .map((item) => (typeof item?.text === "string" ? item.text : ""))
    .join("");
}

function buildRequestBody({
  model,
  messages,
  reasoningEffort,
  stream,
  supportsImages,
  buildReasoningBody,
  includeStreamUsage
}) {
  return {
    model: model.provider_model,
    messages: mapMessages(messages, { supportsImages }),
    stream,
    ...(stream && includeStreamUsage ? { stream_options: { include_usage: true } } : {}),
    ...buildReasoningBody(reasoningEffort)
  };
}

async function requestChatCompletion(options, stream) {
  ensureProviderConfig(options);
  const response = await fetch(`${options.baseUrl.replace(/\/+$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      "Content-Type": "application/json"
    },
    signal: AbortSignal.timeout(options.timeoutMs),
    body: JSON.stringify(buildRequestBody({ ...options, stream }))
  });

  if (!response.ok) {
    const result = parseJson(await response.text());
    throw createProviderError(
      options.providerName,
      result.error?.message || result.message || `${options.providerName} request failed with ${response.status}`,
      response.status,
      result
    );
  }

  return response;
}

export async function createOpenAiCompatibleChatResponse(options) {
  const response = await requestChatCompletion(options, false);
  const result = parseJson(await response.text());
  const text = extractMessageText(result);
  if (!text) {
    throw createProviderError(options.providerName, `${options.providerName} chat response missing text`, 502, result);
  }

  return {
    text,
    usage: result.usage || null,
    kieCreditsConsumed: 0,
    raw: result,
    source: options.providerName
  };
}

export async function createOpenAiCompatibleChatStream(options) {
  const response = await requestChatCompletion(options, true);
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let usage = null;
  let finalRecord = null;

  async function handleLine(line) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("data:")) return;
    const payload = trimmed.slice(5).trim();
    if (!payload || payload === "[DONE]") return;

    const record = parseJson(payload);
    finalRecord = record;
    if (record.usage) usage = record.usage;
    const delta = extractDeltaText(record);
    if (delta) {
      text += delta;
      await options.onDelta(delta);
    }
  }

  for await (const chunk of response.body) {
    buffer += decoder.decode(chunk, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    for (const line of lines) {
      await handleLine(line);
    }
  }

  buffer += decoder.decode();
  if (buffer.trim()) await handleLine(buffer);

  if (!text.trim()) {
    throw createProviderError(options.providerName, `${options.providerName} chat stream missing text`, 502, finalRecord);
  }

  return {
    text: text.trim(),
    usage,
    kieCreditsConsumed: 0,
    raw: finalRecord,
    source: options.providerName
  };
}
