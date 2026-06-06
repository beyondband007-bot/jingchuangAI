export const RUNNING_TASK_STATUSES = new Set(["pending", "processing"]);
export const TASK_POLL_INTERVAL_MS = 20000;

export function hasRunningTasks(tasks = []) {
  return tasks.some((task) => RUNNING_TASK_STATUSES.has(task?.status));
}

export function taskStatusSignature(tasks = []) {
  return tasks
    .map((task) => `${task?.id ?? ""}:${task?.status ?? ""}`)
    .sort()
    .join("|");
}

export function createTaskPollingController(intervalMs = TASK_POLL_INTERVAL_MS) {
  const listeners = new Set();
  let pollTimer;
  let hasRunning = false;

  function notify() {
    listeners.forEach((listener) => listener());
  }

  function stopPolling() {
    if (!pollTimer) return;
    window.clearInterval(pollTimer);
    pollTimer = undefined;
  }

  function syncPolling() {
    if (!hasRunning || listeners.size === 0) {
      stopPolling();
      return;
    }
    if (!pollTimer) {
      pollTimer = window.setInterval(notify, intervalMs);
    }
  }

  return {
    subscribe(listener) {
      listeners.add(listener);
      syncPolling();
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          hasRunning = false;
        }
        syncPolling();
      };
    },
    notifyNow() {
      notify();
    },
    setHasRunningTasks(value) {
      hasRunning = Boolean(value);
      syncPolling();
    },
  };
}
