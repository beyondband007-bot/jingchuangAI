export const RUNNING_TASK_STATUSES = new Set(["pending", "processing", "partial_completed"]);
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
  let isVisibilityListenerAttached = false;

  function notify() {
    listeners.forEach((listener) => listener());
  }

  function stopPolling() {
    if (!pollTimer) return;
    window.clearInterval(pollTimer);
    pollTimer = undefined;
  }

  function isPageVisible() {
    return typeof document === "undefined" || document.visibilityState !== "hidden";
  }

  function handleVisibilityChange() {
    syncPolling();
    if (isPageVisible() && hasRunning && listeners.size > 0) {
      notify();
    }
  }

  function syncVisibilityListener() {
    if (typeof document === "undefined") return;
    const shouldListen = listeners.size > 0;
    if (shouldListen && !isVisibilityListenerAttached) {
      document.addEventListener("visibilitychange", handleVisibilityChange);
      isVisibilityListenerAttached = true;
    } else if (!shouldListen && isVisibilityListenerAttached) {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      isVisibilityListenerAttached = false;
    }
  }

  function syncPolling() {
    syncVisibilityListener();
    if (!hasRunning || listeners.size === 0 || !isPageVisible()) {
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
