export function formatAudioTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function getActiveLyricIndex(timeline, currentTimeSec) {
  if (!Array.isArray(timeline) || !timeline.length) return -1;

  const currentMs = currentTimeSec * 1000;
  const lastIndex = timeline.length - 1;
  const firstStartMs = Number(timeline[0].startMs || 0);
  const lastEndMs = Number(timeline[lastIndex].endMs || timeline[lastIndex].startMs || 0);

  if (currentMs < firstStartMs) return 0;
  if (currentMs >= lastEndMs) return lastIndex;

  let activeIndex = 0;
  for (let index = 0; index < timeline.length; index += 1) {
    const startMs = Number(timeline[index].startMs || 0);
    if (currentMs < startMs) break;
    activeIndex = index;
  }

  return activeIndex;
}

export function getLyricSubtitle(item) {
  const customTitle = String(item?.title || "").trim();
  if (customTitle) return customTitle;
  const timeline = item?.lyricsTimeline || [];
  if (timeline[0]?.text) return timeline[0].text;
  const firstLine = String(item?.lyrics || "").split(/\r?\n/).map((t) => t.trim()).find(Boolean);
  return firstLine || item?.prompt || "AI 音乐";
}

export function isAudioElementReady(audio) {
  return Boolean(audio && audio.readyState >= HTMLMediaElement.HAVE_METADATA);
}

export function attachAudioElement(audio, { onReady, onError } = {}) {
  if (!audio) return () => {};

  function handleReady() {
    if (!isAudioElementReady(audio)) return;
    onReady?.(audio);
  }

  function handleError() {
    onError?.(audio);
  }

  audio.addEventListener("loadedmetadata", handleReady);
  audio.addEventListener("canplay", handleReady);
  audio.addEventListener("error", handleError);
  handleReady();

  return () => {
    audio.removeEventListener("loadedmetadata", handleReady);
    audio.removeEventListener("canplay", handleReady);
    audio.removeEventListener("error", handleError);
  };
}
