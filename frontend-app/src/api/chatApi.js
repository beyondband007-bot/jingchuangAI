import { requestJson as request } from "./request.js";

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
