import { API_BASE } from "../apiBase.js";

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  const body = text ? JSON.parse(text) : {};

  if (!response.ok) {
    throw new Error(body.error || `Request failed with ${response.status}`);
  }

  return body;
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
  }
};
