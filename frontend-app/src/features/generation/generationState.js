import { imageApi } from "../../api/imageApi";

const inspirationFavoritesStorageKey = "facemini:inspiration-favorites";
export const inspirationFavoritesChangedEvent =
  "facemini-inspiration-favorites-changed";

export const favoriteModuleTabs = ["图片灵感", "视频灵感", "数字人形象", "爆款图文"];
export const favoriteTabToAssetType = {
  图片灵感: "AI 图片",
  视频灵感: "AI 视频",
  数字人形象: "数字人",
  爆款图文: "爆款图文",
};

export function getInspirationFavoriteId(item) {
  return item?.id ? String(item.id) : "";
}

export function readInspirationFavoriteIds() {
  try {
    const value = window.localStorage.getItem(inspirationFavoritesStorageKey);
    const ids = JSON.parse(value || "[]");
    return new Set(Array.isArray(ids) ? ids.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeInspirationFavoriteIds(ids) {
  try {
    window.localStorage.setItem(
      inspirationFavoritesStorageKey,
      JSON.stringify([...ids]),
    );
    window.dispatchEvent(
      new CustomEvent(inspirationFavoritesChangedEvent, {
        detail: { ids: [...ids] },
      }),
    );
  } catch {
    // Local storage can be unavailable in restricted browser contexts.
  }
}

function publishInspirationFavoriteIds(ids) {
  writeInspirationFavoriteIds(ids);
}

export async function loadInspirationFavoriteIds({ allowFallback = true } = {}) {
  const favorites = await loadInspirationFavorites({ allowFallback });
  return new Set(favorites.map((favorite) => favorite.id));
}

export async function loadInspirationFavorites({ allowFallback = true } = {}) {
  try {
    const result = await imageApi.getInspirationFavorites();
    const rawFavorites = Array.isArray(result?.favorites) ? result.favorites : [];
    const favorites = rawFavorites.length
      ? rawFavorites
          .map((favorite) => ({
            id: String(favorite?.id || ""),
            createdAt: favorite?.createdAt || null,
          }))
          .filter((favorite) => favorite.id)
      : (Array.isArray(result?.ids) ? result.ids : []).map((id) => ({
          id: String(id),
          createdAt: null,
        }));
    const ids = new Set(favorites.map((favorite) => favorite.id));
    publishInspirationFavoriteIds(ids);
    return favorites;
  } catch (error) {
    if (allowFallback) {
      return [...readInspirationFavoriteIds()].map((id) => ({
        id,
        createdAt: null,
      }));
    }
    throw error;
  }
}

export async function toggleInspirationFavoriteId(id) {
  const favoriteId = String(id || "");
  if (!favoriteId) return false;
  const result = await imageApi.toggleInspirationFavorite(favoriteId);
  const nextValue = Boolean(result?.favorite);
  const ids = readInspirationFavoriteIds();
  if (nextValue) ids.add(favoriteId);
  else ids.delete(favoriteId);
  publishInspirationFavoriteIds(ids);
  return nextValue;
}

export function isInspirationFavorite(item) {
  const id = getInspirationFavoriteId(item);
  return Boolean(id && readInspirationFavoriteIds().has(id));
}

const pendingGenerationSeedKey = "facemini:pending-generation-seed";
const pendingGenerationSeedMemory = {
  image: null,
  video: null,
  "digital-human": null,
  article: null,
};

export function writePendingGenerationSeed(seed) {
  const normalized = { ...seed, createdAt: Date.now() };
  if (seed?.target) {
    pendingGenerationSeedMemory[seed.target] = normalized;
  }
  try {
    window.sessionStorage.setItem(
      pendingGenerationSeedKey,
      JSON.stringify(normalized),
    );
  } catch {
    // Session storage can be unavailable in restricted browser contexts.
  }
}

export function peekPendingGenerationSeed(target) {
  if (pendingGenerationSeedMemory[target]) {
    return pendingGenerationSeedMemory[target];
  }
  try {
    const raw = window.sessionStorage.getItem(pendingGenerationSeedKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.target === target ? parsed : null;
  } catch {
    return null;
  }
}

export function clearPendingGenerationSeed(target) {
  if (target) {
    pendingGenerationSeedMemory[target] = null;
  }
  try {
    const raw = window.sessionStorage.getItem(pendingGenerationSeedKey);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!target || parsed?.target === target) {
      window.sessionStorage.removeItem(pendingGenerationSeedKey);
    }
  } catch {
    // Ignore storage failures.
  }
}

export function takePendingGenerationSeed(target) {
  const pendingSeed = peekPendingGenerationSeed(target);
  if (!pendingSeed) return null;
  clearPendingGenerationSeed(target);
  return pendingSeed;
}

export function hasPendingGenerationSeed(target) {
  return Boolean(peekPendingGenerationSeed(target));
}

export function buildImageComposerSeedFromPending(pendingSeed) {
  if (!pendingSeed) return null;
  const prompt = pendingSeed.prompt || "";
  const referenceImage = pendingSeed.referenceImage?.url
    ? pendingSeed.referenceImage
    : null;
  if (!prompt && !referenceImage) return null;
  return {
    id: `pending-image-${pendingSeed.createdAt || Date.now()}`,
    prompt,
    referenceImage,
    model: pendingSeed.model || null,
    ratio: pendingSeed.ratio || null,
    quality: pendingSeed.quality || null,
    notice: pendingSeed.notice || "",
  };
}

export function buildImageLaunchSeedPayload(seed = {}) {
  return {
    prompt: seed.prompt || "",
    referenceImage: seed.referenceImage || null,
    model: seed.model || null,
    ratio: seed.ratio || null,
    quality: seed.quality || null,
    notice: seed.notice || "",
    createdAt: Date.now(),
  };
}
