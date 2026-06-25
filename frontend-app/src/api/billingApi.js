import { requestJson } from "./request.js";

export const billingApi = {
  getRules() {
    return requestJson("/api/billing/rules");
  },
  quote(feature, payload = {}) {
    return requestJson("/api/billing/quote", {
      method: "POST",
      body: JSON.stringify({ feature, payload })
    });
  }
};
