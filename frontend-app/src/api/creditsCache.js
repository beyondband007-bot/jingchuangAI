import { requestJson as request } from "./request.js";

let creditsPromise;
let latestCreditsPromise;
let creditsRequestVersion = 0;

function requestCredits() {
  const requestVersion = ++creditsRequestVersion;
  const pendingRequest = request("/api/me/credits");
  const guardedRequest = pendingRequest
    .then((credits) => {
      if (requestVersion !== creditsRequestVersion) {
        return latestCreditsPromise;
      }
      return credits;
    })
    .catch((err) => {
      if (requestVersion === creditsRequestVersion) {
        creditsPromise = undefined;
      }
      return Promise.reject(err);
    });

  latestCreditsPromise = guardedRequest;
  creditsPromise = guardedRequest;
  return guardedRequest;
}

export function getCachedCredits() {
  if (!creditsPromise) {
    return requestCredits();
  }
  return creditsPromise;
}

export function refreshCachedCredits() {
  return requestCredits();
}
