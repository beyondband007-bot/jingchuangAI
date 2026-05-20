import { API_BASE } from "../apiBase.js";
import { requestJson as request } from "./request.js";

function parseStreamEvent(block) {
  const lines = block.split(/\r?\n/);
  const event = lines.find((line) => line.startsWith("event:"))?.slice(6).trim() || "message";
  const data = lines
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice(5).trim())
    .join("\n");
  if (!data) return { event, data: null };
  try {
    return { event, data: JSON.parse(data) };
  } catch {
    return { event, data };
  }
}

export const chatApi = {
  async getCredits() {
    return request("/api/me/credits");
  },

  async getModels() {
    return request("/api/chat/models");
  },

  async getConversations() {
    return request("/api/chat/conversations");
  },

  async getMessages(conversationId) {
    return request(`/api/chat/conversations/${conversationId}/messages`);
  },

  async sendMessage(payload) {
    return request("/api/chat/messages", {
      method: "POST",
      body: JSON.stringify({ ...payload, stream: false })
    });
  },

  async streamMessage(payload, { onDelta } = {}) {
    const response = await fetch(`${API_BASE}/api/chat/messages/stream`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ ...payload, stream: true })
    });

    if (!response.ok || !response.body) {
      const text = await response.text();
      let body = {};
      try {
        body = text ? JSON.parse(text) : {};
      } catch {
        body = { error: text };
      }
      throw new Error(body.error || `Request failed with ${response.status}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let finalResult = null;

    while (true) {
      const { value, done } = await reader.read();
      buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
      const parts = buffer.split(/\r?\n\r?\n/);
      buffer = parts.pop() || "";

      for (const part of parts) {
        const { event, data } = parseStreamEvent(part);
        if (event === "delta" && data?.delta) {
          onDelta?.(data.delta);
        } else if (event === "done") {
          finalResult = data;
        } else if (event === "error") {
          throw new Error(data?.error || "流式对话失败");
        }
      }

      if (done) break;
    }

    if (buffer.trim()) {
      const { event, data } = parseStreamEvent(buffer);
      if (event === "done") finalResult = data;
      if (event === "error") throw new Error(data?.error || "流式对话失败");
    }

    if (!finalResult) {
      throw new Error("流式对话未返回完成状态");
    }
    return finalResult;
  }
};
