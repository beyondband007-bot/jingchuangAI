export function formatAudioTime(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export function getActiveLyricIndex(timeline, currentTimeSec) {
  if (!Array.isArray(timeline) || !timeline.length) return -1;
  const currentMs = currentTimeSec * 1000;
  let activeIndex = -1;
  for (let index = 0; index < timeline.length; index += 1) {
    const startMs = Number(timeline[index].startMs || 0);
    if (currentMs < startMs) break;
    if (activeIndex === -1 || startMs > Number(timeline[activeIndex].startMs || 0)) {
      activeIndex = index;
    }
  }
  return activeIndex;
}

export function getLineProgress(line, currentMs) {
  const start = Number(line?.startMs);
  const end = Number(line?.endMs);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return Math.min(1, Math.max(0, (currentMs - start) / (end - start)));
}

export function getLyricSubtitle(item) {
  const timeline = item?.lyricsTimeline || [];
  if (timeline[0]?.text) return timeline[0].text;
  const firstLine = String(item?.lyrics || "").split(/\r?\n/).map((t) => t.trim()).find(Boolean);
  return firstLine || item?.prompt || "AI 音乐";
}
