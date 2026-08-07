import {
  getRunningTaskSummary,
  getUnreadTaskSummary,
} from "./generationNotification.repository.js";

function accumulateRows(rows, countField, outputField, bySource) {
  let total = 0;
  rows.forEach((row) => {
    const sourceType = row.source_type;
    const count = Number(row[countField] || 0);
    if (!sourceType || count <= 0) return;
    total += count;
    const current = bySource[sourceType] || { runningCount: 0, unreadCount: 0 };
    current[outputField] += count;
    bySource[sourceType] = current;
  });
  return total;
}

export function createGenerationNotificationService({
  loadRunningSummary = getRunningTaskSummary,
  loadUnreadSummary = getUnreadTaskSummary,
  logError = console.error,
} = {}) {
  return Object.freeze({
    async getRunningSummary(userId) {
      const rows = await loadRunningSummary(userId);
      const bySource = {};
      let totalRunningCount = 0;

      rows.forEach((row) => {
        const runningCount = Number(row.running_count || 0);
        totalRunningCount += runningCount;
        const previousCount = bySource[row.source_type]?.runningCount || 0;
        bySource[row.source_type] = { runningCount: previousCount + runningCount };
      });

      return { totalRunningCount, bySource, generatedAt: new Date().toISOString() };
    },

    async getSummary(userId) {
      const runningRows = await loadRunningSummary(userId);
      const bySource = {};
      const totalRunningCount = accumulateRows(
        runningRows,
        "running_count",
        "runningCount",
        bySource,
      );

      let unreadRows = [];
      let unreadAvailable = true;
      try {
        unreadRows = await loadUnreadSummary(userId);
      } catch (error) {
        unreadAvailable = false;
        logError("[generation-unread] summary unavailable", {
          error: error?.message || String(error),
        });
      }

      const totalUnreadCount = unreadAvailable
        ? accumulateRows(unreadRows, "unread_count", "unreadCount", bySource)
        : 0;

      Object.values(bySource).forEach((counts) => {
        counts.runningCount ||= 0;
        counts.unreadCount ||= 0;
      });

      return {
        totalRunningCount,
        totalUnreadCount,
        unreadAvailable,
        bySource,
        generatedAt: new Date().toISOString(),
      };
    },
  });
}

const generationNotificationService = createGenerationNotificationService();

export async function getRunningSummary(userId) {
  return generationNotificationService.getRunningSummary(userId);
}

export async function getGenerationSummary(userId) {
  return generationNotificationService.getSummary(userId);
}
