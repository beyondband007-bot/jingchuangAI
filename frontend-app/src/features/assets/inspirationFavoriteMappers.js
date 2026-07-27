import {
  fmDigitalHumanInspirations,
  fmImageGenerationInspirations,
  fmImageInspirations,
  resolveFaceminiInspirationImageUrl,
  videoInspirationItems,
} from "../../data/faceminiData";

const favoriteTypeByCategory = {
  "图片灵感": "AI 图片",
  "视频灵感": "AI 视频",
  "数字人形象": "数字人",
  "爆款图文": "爆款图文",
};

const launchTargetByCategory = {
  "图片灵感": "image",
  "视频灵感": "video",
  "数字人形象": "digital-human",
  "爆款图文": "article",
};

function getTimestamp(value) {
  const timestamp = new Date(value || "").getTime();
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getCatalogEntries() {
  return [
    ...fmImageGenerationInspirations.map((item) => ({ item })),
    ...fmImageInspirations.map((item) => ({ item })),
    ...fmDigitalHumanInspirations.map((item) => ({ item })),
    ...videoInspirationItems.map((item) => ({
      item: { ...item, category: "视频灵感" },
      aliases: [`creation-${item.id}`],
    })),
  ];
}

function buildCatalog() {
  const catalog = new Map();
  getCatalogEntries().forEach(({ item, aliases = [] }) => {
    const canonicalId = String(item?.id || "");
    if (!canonicalId) return;
    const entry = { item, canonicalId };
    catalog.set(canonicalId, entry);
    aliases.forEach((alias) => catalog.set(String(alias), entry));
  });
  return catalog;
}

const inspirationCatalog = buildCatalog();

function mapFavoriteToCard(favorite, entry) {
  const { item, canonicalId } = entry;
  const category = item.category || "图片灵感";
  const type = favoriteTypeByCategory[category] || "AI 图片";
  const isVideo = Boolean(
    item.video || item.videoSrc || item.videoUrl || category === "视频灵感" || category === "数字人形象",
  );
  const image =
    item.thumbnail ||
    item.image ||
    item.poster ||
    (!isVideo ? resolveFaceminiInspirationImageUrl(item) : "");
  const video = item.videoSrc || item.video || item.videoUrl || "";

  return {
    id: `inspiration-${canonicalId}`,
    rawId: favorite.id,
    favoriteKey: favorite.id,
    type,
    category,
    title: item.title || "灵感素材",
    prompt: item.prompt || "",
    model: item.model || "",
    ratio: item.ratio || (isVideo ? "16:9" : ""),
    src: isVideo ? image || item.poster || "" : image,
    image,
    imageUrl: isVideo ? image : item.source || item.imageUrl || image,
    poster: item.poster || image,
    video,
    videoUrl: video,
    videoSrc: video,
    material: item.material || (isVideo ? "视频素材" : "高清原图"),
    feature: item.feature || "",
    isVideo,
    favorite: true,
    isInspiration: true,
    launchTarget: launchTargetByCategory[category] || "image",
    sortTime: getTimestamp(favorite.createdAt),
  };
}

export function mapInspirationFavoriteCards(favorites = []) {
  const seenCanonicalIds = new Set();
  return (Array.isArray(favorites) ? favorites : [])
    .map((favorite) => {
      const id = String(favorite?.id || "");
      const entry = inspirationCatalog.get(id);
      if (!entry || seenCanonicalIds.has(entry.canonicalId)) return null;
      seenCanonicalIds.add(entry.canonicalId);
      return mapFavoriteToCard({ ...favorite, id }, entry);
    })
    .filter(Boolean);
}
