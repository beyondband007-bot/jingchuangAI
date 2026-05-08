import { requestKie } from "./client.js";

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
    input: messages.map(mapMessage),
    stream: false
  };

  if (reasoningEffort && reasoningEffort !== "none") {
    body.reasoning = { effort: reasoningEffort };
  }

  const result = await requestKie("/codex/v1/responses", {
    method: "POST",
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
