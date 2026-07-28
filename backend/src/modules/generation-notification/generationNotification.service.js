import { getRunningTaskSummary } from "./generationNotification.repository.js";

export async function getRunningSummary(userId) {
  const rows = await getRunningTaskSummary(userId);
  const bySource = {};
  let totalRunningCount = 0;

  rows.forEach((row) => {
    const runningCount = Number(row.running_count || 0);
    totalRunningCount += runningCount;
    bySource[row.source_type] = { runningCount };
  });

  return { totalRunningCount, bySource, generatedAt: new Date().toISOString() };
}
