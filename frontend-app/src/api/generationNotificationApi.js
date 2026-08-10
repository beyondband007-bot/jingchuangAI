import { requestJson } from "./request.js";

export const generationNotificationApi = {
  getRunningSummary() {
    return requestJson("/api/me/generation-notifications/running-summary");
  },
  getCenter({ category = "system", page = 1 } = {}) {
    return requestJson(`/api/me/generation-notifications/center?category=${encodeURIComponent(category)}&page=${encodeURIComponent(page)}`);
  },
  markCenterRead(notificationIds) {
    return requestJson("/api/me/generation-notifications/center/read", {
      method: "POST",
      body: JSON.stringify({ notificationIds }),
    });
  },
  markAllCenterRead(category) {
    return requestJson("/api/me/generation-notifications/center/read-all", {
      method: "POST",
      body: JSON.stringify({ category }),
    });
  },
};
