export const txTypeMap = {
  grant: { label: "系统赠送", color: "#a855f7" },
  debit: { label: "消费扣费", color: "#dc2626" },
  refund: { label: "积分退回", color: "#2563eb" },
  recharge: { label: "充值到账", color: "#16a34a" },
  invitegift: { label: "邀请有礼", color: "#16a34a" },
};

export const transactionsPageSize = 20;
export const transactionFilterOptions = [
  ["all", "全部"],
  ["invitegift", "邀请有礼"],
  ["recharge", "充值"],
  ["grant", "注册赠送"],
  ["debit", "消费"],
  ["refund", "退款"],
];
export const assetTimeFilterOptions = [
  ["all", "全部时间"],
  ["today", "今天"],
  ["7d", "近 7 天"],
  ["30d", "近 30 天"],
  ["custom", "自定义"],
];

const articleImageSource = "article";
const articlePromptMarker = "爆款图文设计";

function formatDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getAssetTimeRange(preset, startDate, endDate) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let rangeStart = null;
  let rangeEnd = null;

  if (preset === "today") {
    rangeStart = todayStart;
    rangeEnd = new Date(todayStart);
  } else if (preset === "7d") {
    rangeStart = new Date(todayStart);
    rangeStart.setDate(rangeStart.getDate() - 6);
    rangeEnd = new Date(todayStart);
  } else if (preset === "30d") {
    rangeStart = new Date(todayStart);
    rangeStart.setDate(rangeStart.getDate() - 29);
    rangeEnd = new Date(todayStart);
  } else if (preset === "custom") {
    if (startDate) rangeStart = new Date(`${startDate}T00:00:00`);
    if (endDate) rangeEnd = new Date(`${endDate}T00:00:00`);
  }

  const startMs =
    rangeStart instanceof Date && Number.isFinite(rangeStart.getTime())
      ? new Date(
          rangeStart.getFullYear(),
          rangeStart.getMonth(),
          rangeStart.getDate(),
        ).getTime()
      : null;
  const endMs =
    rangeEnd instanceof Date && Number.isFinite(rangeEnd.getTime())
      ? new Date(
          rangeEnd.getFullYear(),
          rangeEnd.getMonth(),
          rangeEnd.getDate(),
          23,
          59,
          59,
          999,
        ).getTime()
      : null;

  return {
    startDate: startMs !== null ? formatDateInputValue(new Date(startMs)) : "",
    endDate: endMs !== null ? formatDateInputValue(new Date(endMs)) : "",
    startMs,
    endMs,
  };
}

export function isTimestampInRange(timestamp, range) {
  if (!timestamp) return false;
  if (range.startMs !== null && timestamp < range.startMs) return false;
  if (range.endMs !== null && timestamp > range.endMs) return false;
  return true;
}

export function isArticleImageTask(task) {
  return (
    task?.source === articleImageSource ||
    String(task?.prompt || "").includes(articlePromptMarker)
  );
}

function getAssetTaskTime(task) {
  const value = task?.createdAt || task?.updatedAt || task?.time || "";
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getAssetTaskTitle(type, task) {
  return (
    task?.title ||
    task?.avatarName ||
    task?.sourceFileName ||
    task?.videoFileName ||
    task?.prompt ||
    {
      "AI 图片": "AI 图片作品",
      "AI 视频": "AI 视频作品",
      数字人: "数字人作品",
      照片数字人: "照片数字人作品",
      爆款图文: "爆款图文作品",
    }[type] ||
    "作品"
  );
}

function isVideoMediaUrl(url = "") {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(String(url || "").split("#")[0]);
}

function firstImageMediaUrl(...urls) {
  return urls.find((url) => url && !isVideoMediaUrl(url)) || "";
}

function getAssetTaskPreview(type, task) {
  if (type === "AI 图片") {
    return firstImageMediaUrl(
      task?.thumbnailUrl,
      task?.image,
      task?.imageUrl,
      task?.resultUrl,
    );
  }
  if (type === "AI 视频" || type === "视频配音")
    return task?.poster || task?.thumbnailUrl || task?.image || task?.cover || "";
  if (type === "数字人" || type === "照片数字人")
    return (
      task?.thumbnailUrl ||
      task?.poster ||
      task?.portraitUrl ||
      task?.imageUrl ||
      task?.cover ||
      ""
    );
  return task?.thumbnailUrl || task?.image || task?.cover || "";
}

function getAssetTaskResolution(task) {
  const explicitResolution = String(task?.resolution || "").trim();
  if (explicitResolution) return explicitResolution;

  // Image tasks call this setting `quality`; keep the details modal's
  // terminology consistent without losing the value returned by the API.
  const quality = String(task?.quality || "").trim();
  if (quality) return quality;

  // Video records created before the resolution column was added do not have
  // a dedicated value. Some model names contain an unambiguous output tier,
  // which lets their existing history display correctly as well.
  const modelDescription = [task?.model, task?.modelKey, task?.providerModel, task?.mode]
    .filter(Boolean)
    .join(" ")
    .replace(/[_-]/g, " ");
  const match = modelDescription.match(/\b(\d{3,4}\s*p|\d+\s*k)\b/i);
  return match ? match[1].replace(/\s+/g, "").toUpperCase() : "";
}

export function isDigitalHumanAssetType(type) {
  return type === "数字人" || type === "照片数字人";
}

export function matchesAssetGalleryTab(item, tab) {
  if (tab === "全部") return true;
  if (tab === "数字人") return isDigitalHumanAssetType(item.type);
  return item.type === tab;
}

export function mapAssetTasks(type, tasks = []) {
  const source = Array.isArray(tasks) ? tasks : [];
  return source.map((task) => {
    const preview = getAssetTaskPreview(type, task);
    const video =
      type === "AI 视频" || type === "视频配音" || isDigitalHumanAssetType(type)
        ? task?.video || task?.resultUrl || task?.result?.videoUrl || task?.url || ""
        : "";
    const isVideo =
      Boolean(video) || type === "AI 视频" || type === "视频配音" || isDigitalHumanAssetType(type);
    const highRes =
      type === "AI 图片"
        ? firstImageMediaUrl(task?.imageUrl, task?.image, preview) || preview
        : "";
    return {
      id: `${type}-${task.id}`,
      rawId: task.id,
      assetAction: task.assetAction || "",
      type,
      src: isVideo ? preview : preview || video,
      image: preview,
      imageUrl: highRes,
      poster: preview || task?.poster || task?.thumbnailUrl || "",
      video,
      videoUrl: video,
      posterUrl: preview || task?.poster || task?.thumbnailUrl || "",
      prompt:
        task.prompt || task.text || task.error || getAssetTaskTitle(type, task),
      title: getAssetTaskTitle(type, task),
      avatarId: task.avatarId || task.avatar?.id || "",
      avatarName: task.avatarName || task.avatar?.name || "",
      voiceId: task.voiceId || "",
      voiceName: task.voiceName || "",
      category: type,
      model: task.model || task.modelKey || task.providerModel || "",
      resolution: getAssetTaskResolution(task),
      ratio:
        task.ratio ||
        task.resolution ||
        (task.duration ? `${task.duration}s` : ""),
      isVideo,
      favorite: Boolean(task.favorite),
      status: task.status || "",
      sortTime: getAssetTaskTime(task),
    };
  });
}

export function mapArticleAssets(tasks = []) {
  const source = Array.isArray(tasks) ? tasks : [];
  return source.map((task) => {
    const imageTasks = Array.isArray(task?.imageTasks) ? task.imageTasks : [];
    const images = imageTasks
      .map((item) => item?.imageUrl || item?.image)
      .filter(Boolean);
    const thumbnails = imageTasks
      .map((item) => item?.thumbnailUrl || item?.image)
      .filter(Boolean);
    const preview =
      thumbnails[0] ||
      task?.thumbnailUrl ||
      task?.image ||
      task?.images?.[0] ||
      images[0] ||
      task?.imageUrl ||
      "";
    const fullImage =
      images[0] ||
      task?.imageUrl ||
      task?.images?.[0] ||
      task?.image ||
      preview;
    const title =
      task?.copy?.title ||
      task?.title ||
      String(task?.copy?.body || "").trim().slice(0, 40) ||
      "爆款图文作品";
    return {
      id: `爆款图文-${task.id}`,
      rawId: task.id,
      type: "爆款图文",
      src: preview,
      image: preview,
      imageUrl: fullImage,
      images: images.length ? images : (task?.images || [fullImage]).filter(Boolean),
      imageTasks,
      poster: preview,
      video: "",
      videoUrl: "",
      posterUrl: preview,
      prompt: task?.copy?.body || task?.prompt || title,
      title,
      category: "爆款图文",
      model: task.model || task.modelKey || "",
      ratio: task.ratio || "",
      isVideo: false,
      favorite: Boolean(task.favorite),
      status: task.status || "",
      sortTime: getAssetTaskTime(task),
    };
  });
}

export function canFavoriteAsset(card) {
  const status = String(card?.status || "").toLowerCase();
  return status !== "failed" && status !== "error";
}

export function isBuiltInAvatarUrl(value) {
  return /^\/assets\/avatars\/(?:[1-9]|1\d|2[0-5])\.jpg$/.test(
    String(value || ""),
  );
}
