import { requestJson as request } from "./request.js";

export const invitationApi = {
  me() {
    return request("/api/invitations/me");
  },
  track(eventType, inviteCode, payload = {}) {
    return request("/api/invitations/track", {
      method: "POST",
      body: JSON.stringify({ eventType, inviteCode, payload })
    }).catch(() => ({ ok: false }));
  }
};
