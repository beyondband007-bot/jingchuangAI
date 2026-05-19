import { requestJson as request } from "./request.js";

export const authApi = {
  async me() {
    return request("/api/auth/me");
  },

  async register(payload) {
    return request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async login(payload) {
    return request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async logout() {
    return request("/api/auth/logout", { method: "POST" });
  }
};
