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
  },

  async updateProfile(payload) {
    return request("/api/auth/profile", {
      method: "PATCH",
      body: JSON.stringify(payload)
    });
  },

  async selectAvatar(payload) {
    return request("/api/auth/avatar/select", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async uploadAvatar({ file, owner }) {
    const formData = new FormData();
    if (owner) formData.append("owner", owner);
    formData.append("file", file);
    return request("/api/auth/avatar/upload", {
      method: "POST",
      body: formData
    });
  },

  async changePhone(payload) {
    return request("/api/auth/phone/change", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async verifyCurrentPhone(payload) {
    return request("/api/auth/phone/verify-current", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  },

  async changePassword(payload) {
    return request("/api/auth/password/change", {
      method: "POST",
      body: JSON.stringify(payload)
    });
  }
};
