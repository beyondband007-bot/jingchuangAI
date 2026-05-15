import { requestKie } from "./client.js";

const chatTimeoutMs = Number(process.env.KIE_CHAT_TIMEOUT_MS || 5000);

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

export async function createKieChatResponse({ model, messages, reasoningEffort }) {
  const body = {
    model: model.provider_model,
    input: flattenMessagesForKie(messages).map(mapMessage),
    stream: false
  };

  if (reasoningEffort && reasoningEffort !== "none") {
    body.reasoning = { effort: reasoningEffort };
  }

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
