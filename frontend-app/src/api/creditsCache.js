import { requestJson as request } from "./request.js";

let creditsPromise;

export function getCachedCredits() {
  if (!creditsPromise) {
    creditsPromise = request("/api/me/credits").catch((err) => {
      creditsPromise = undefined;
      return Promise.reject(err);
    });
  }
  return creditsPromise;
}

export function refreshCachedCredits() {
  creditsPromise = request("/api/me/credits").catch((err) => {
    creditsPromise = undefined;
    return Promise.reject(err);
  });
  return creditsPromise;
}
