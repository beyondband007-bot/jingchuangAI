import { requestJson } from "./request.js";

export const generationNotificationApi = {
  getRunningSummary() {
    return requestJson("/api/me/generation-notifications/running-summary");
  },
};
