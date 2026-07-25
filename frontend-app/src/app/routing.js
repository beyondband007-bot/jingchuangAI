import { appNavIdSet } from "../layouts/navigation";

export const appEntryStorageKey = "jingchuang:enter-app";
const legalDocumentKeys = new Set(["user-agreement", "privacy-policy"]);

function getLegalDocumentKeyFromLocation() {
  const hashView = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  const path = window.location.pathname.replace(/^\/+/, "");
  const legalKey = [hashView, path]
    .map((value) => value.replace(/^legal\/?/, ""))
    .find((value) => legalDocumentKeys.has(value));
  return legalKey || "";
}

export function getRouteView() {
  const hashView = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  const legalDocumentKey = getLegalDocumentKeyFromLocation();
  if (legalDocumentKey) return `legal:${legalDocumentKey}`;
  if (appNavIdSet.has(hashView)) return hashView;
  if (window.location.pathname === "/chat" || hashView === "chat")
    return "chat";
  if (window.location.pathname === "/home" || hashView === "home")
    return "home";
  if (
    window.location.pathname === "/image-digital-human" ||
    hashView === "image-digital-human"
  )
    return "digital-human";
  if (
    window.location.pathname === "/digital-human" ||
    hashView === "digital-human"
  )
    return "digital-human";
  if (window.location.pathname === "/motion-transfer" || hashView === "motion")
    return "motion";
  if (window.location.pathname === "/face-swap" || hashView === "face-swap")
    return "face-swap";
  if (window.location.pathname === "/watermark" || hashView === "watermark")
    return "watermark";
  if (
    window.location.pathname === "/voice-conversion" ||
    hashView === "voice-convert"
  )
    return "voice-convert";
  if (window.location.pathname === "/transcribe" || hashView === "transcribe")
    return "transcribe";
  if (window.location.pathname === "/article" || hashView === "article")
    return "article";
  if (window.location.pathname === "/music" || hashView === "music")
    return "music";
  if (window.location.pathname === "/replicate" || hashView === "replicate")
    return "replicate";
  if (window.location.pathname === "/enhance" || hashView === "enhance")
    return "enhance";
  if (window.location.pathname === "/remove-bg" || hashView === "remove-bg")
    return "remove-bg";
  if (window.location.pathname === "/voice" || hashView === "voice")
    return "voice";
  if (window.location.pathname === "/video" || hashView === "video")
    return "video";
  if (window.location.pathname === "/image" || hashView === "image")
    return "image";
  return "home";
}

export function getInitialView() {
  const routeView = getRouteView();
  if (routeView !== "splash") return routeView;

  const shouldEnterApp =
    window.sessionStorage.getItem(appEntryStorageKey) === "1";
  if (shouldEnterApp) {
    window.sessionStorage.removeItem(appEntryStorageKey);
    return "home";
  }
  if (window.location.pathname !== "/" || window.location.hash) {
    window.history.replaceState(null, "", "/");
  }
  return "splash";
}
