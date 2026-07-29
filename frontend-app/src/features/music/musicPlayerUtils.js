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

  // During an intro there is no current lyric. Marking the first line active
  // here used to scroll the panel before the singer had started.
  if (currentMs < firstStartMs) return -1;
  if (currentMs >= lastEndMs) return lastIndex;

  let activeIndex = 0;
  for (let index = 0; index < timeline.length; index += 1) {
    const startMs = Number(timeline[index].startMs || 0);
    if (currentMs < startMs) break;
    activeIndex = index;
  }

  return activeIndex;
}

export function isLyricTimelineUsable(timeline, durationMs = 0) {
  if (!Array.isArray(timeline) || timeline.length < 2) return false;

  const points = timeline.map((line) => ({
    startMs: Number(line?.startMs),
    endMs: Number(line?.endMs)
  }));

  if (points.some((point) => !Number.isFinite(point.startMs)
    || !Number.isFinite(point.endMs)
    || point.endMs <= point.startMs)) {
    return false;
  }

  let duplicateStarts = 0;
  for (let index = 1; index < points.length; index += 1) {
    const previous = points[index - 1];
    const current = points[index];
    if (current.startMs < previous.startMs) return false;
    if (current.startMs === previous.startMs) duplicateStarts += 1;
  }

  // A batch of identical timestamps means ASR did not find those lyrics. Do
  // not treat a long gap as invalid: it can be a legitimate intro or interlude.
  if (duplicateStarts >= 2) return false;

  const totalDuration = Number(durationMs);
  const finalEndMs = points[points.length - 1].endMs;
  if (Number.isFinite(totalDuration) && totalDuration > 0 && finalEndMs > totalDuration + 2000) {
    return false;
  }
  return !Number.isFinite(totalDuration)
    || totalDuration <= 0
    || finalEndMs >= totalDuration * 0.45;
}

export function hasOutOfOrderLyricTimeline(timeline) {
  if (!Array.isArray(timeline)) return false;
  let previousStartMs = -1;

  return timeline.some((line) => {
    const startMs = Number(line?.startMs);
    if (!Number.isFinite(startMs)) return false;
    const isOutOfOrder = startMs < previousStartMs;
    previousStartMs = Math.max(previousStartMs, startMs);
    return isOutOfOrder;
  });
}

export function needsLyricTimelineRepair(timeline, durationMs = 0) {
  if (hasOutOfOrderLyricTimeline(timeline)) return true;
  if (!Array.isArray(timeline) || !timeline.length) return false;

  for (let index = 1; index < timeline.length; index += 1) {
    const previousEndMs = Number(timeline[index - 1]?.endMs);
    const startMs = Number(timeline[index]?.startMs);
    if (Number.isFinite(previousEndMs) && Number.isFinite(startMs)
      && startMs - previousEndMs > 18000) {
      return true;
    }
  }

  const finalEndMs = Number(timeline[timeline.length - 1]?.endMs);
  const totalDuration = Number(durationMs);
  if (Number.isFinite(finalEndMs)
    && Number.isFinite(totalDuration)
    && totalDuration > 0
    && finalEndMs > totalDuration + 2000) {
    return true;
  }

  return false;
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
