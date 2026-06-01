import { requestJson as request } from "./request.js";

export const authApi = {
  async me() {
    return request("/api/auth/me");
  },

  async securityQuestions() {
    return request("/api/auth/security-questions");
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

  async loginWithPhoneCode(payload) {
    return request("/api/auth/login/phone-code", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async sendSmsCode(payload) {
    return request("/api/auth/sms-code", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async captchaConfig() {
    return request("/api/auth/captcha/config");
  },

  async logout() {
    return request("/api/auth/logout", { method: "POST" });
  },

  async createPasswordResetChallenge(payload) {
    return request("/api/auth/password-reset/challenge", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async resetPassword(payload) {
    return request("/api/auth/password-reset", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
};
