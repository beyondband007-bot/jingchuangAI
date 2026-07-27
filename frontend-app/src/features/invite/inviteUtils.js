import { invitationApi } from "../../api/invitationApi";

const pendingInviteCodeStorageKey = "facemini:pending-invite-code";

export const pendingInviteBonusStorageKey = "facemini:pending-invite-bonus";
export const registerGrantPoints = 200;
export const inviteRewardPoints = 200;

export function buildClientInviteLink(inviteCode) {
  const code = String(inviteCode || "").trim();
  if (!code) return "";
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "http://127.0.0.1:8088";
  return `${origin}/#/home?invite=${encodeURIComponent(code)}`;
}

export function normalizeInviteCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 32);
}

export function readInviteCodeFromLocation() {
  const candidates = [];
  try {
    candidates.push(new URLSearchParams(window.location.search).get("invite"));
    const hash = window.location.hash || "";
    const queryIndex = hash.indexOf("?");
    if (queryIndex >= 0) {
      candidates.push(
        new URLSearchParams(hash.slice(queryIndex + 1)).get("invite"),
      );
    }
  } catch {
    // Ignore malformed URLs; invitation capture is best-effort.
  }
  return normalizeInviteCode(candidates.find(Boolean));
}

export function captureInviteCodeFromLocation() {
  const inviteCode = readInviteCodeFromLocation();
  if (inviteCode) {
    try {
      window.localStorage.setItem(pendingInviteCodeStorageKey, inviteCode);
    } catch {
      // Local storage can be unavailable in restricted browser contexts.
    }
  }
  return inviteCode;
}

export function getPendingInviteCode() {
  try {
    return normalizeInviteCode(
      window.localStorage.getItem(pendingInviteCodeStorageKey),
    );
  } catch {
    return "";
  }
}

export function isLoggedInUser(authUser) {
  return Boolean(authUser && !authUser.isGuest);
}

export function clearPendingInviteCode() {
  try {
    window.localStorage.removeItem(pendingInviteCodeStorageKey);
  } catch {
    // Local storage can be unavailable in restricted browser contexts.
  }
}

export function captureInviteCodeForCurrentLocation() {
  const inviteCode = captureInviteCodeFromLocation();
  if (inviteCode) {
    invitationApi.track("invite.link_visit", inviteCode, {
      path: window.location.pathname,
      hash: window.location.hash,
    });
  }
  return inviteCode;
}
