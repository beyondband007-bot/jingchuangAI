export const emptyVideoOptions = {
  models: [],
  ratios: [],
  durations: [],
  counts: [1],
  modes: [],
};

function getVideoTaskTimestamp(task) {
  const value =
    task?.createdAt || task?.created_at || task?.updatedAt || task?.updated_at;
  const timestamp = value ? new Date(value).getTime() : NaN;
  if (Number.isFinite(timestamp)) return timestamp;
  return Number(task?.id) || 0;
}

export function sortVideoTasksByNewest(tasks) {
  return [...tasks].sort((a, b) => {
    const timestampDiff = getVideoTaskTimestamp(b) - getVideoTaskTimestamp(a);
    if (timestampDiff !== 0) return timestampDiff;
    return (Number(b?.id) || 0) - (Number(a?.id) || 0);
  });
}

export function parseVideoAspectRatio(value) {
  const match = String(value || "")
    .trim()
    .match(/^(\d+(?:\.\d+)?)\s*[:/x×]\s*(\d+(?:\.\d+)?)$/i);
  if (!match) return null;

  const width = Number(match[1]);
  const height = Number(match[2]);
  if (!(width > 0) || !(height > 0)) return null;

  return {
    css: `${width} / ${height}`,
    value: width / height,
  };
}
