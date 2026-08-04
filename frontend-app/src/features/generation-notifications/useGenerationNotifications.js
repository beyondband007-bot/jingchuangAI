import { useCallback, useEffect, useRef, useState } from "react";
import { generationNotificationApi } from "../../api/generationNotificationApi.js";

const EMPTY_SUMMARY = { totalRunningCount: 0, bySource: {} };
// A single indexed summary request keeps loading badges responsive without each
// feature polling its own complete task list.
const REFRESH_INTERVAL_MS = 10_000;
const FOCUS_REFRESH_MIN_INTERVAL_MS = 30_000;

export function useGenerationNotifications(authUser) {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const requestRef = useRef(null);
  const lastFetchedAtRef = useRef(0);
  const refresh = useCallback(async () => {
    if (requestRef.current) return requestRef.current;
    const request = generationNotificationApi
      .getRunningSummary()
      .then((next) => {
        lastFetchedAtRef.current = Date.now();
        setSummary(next || EMPTY_SUMMARY);
        return next;
      })
      .catch(() => {
        // Do not retain a previous running-task badge when the summary request
        // fails. Keeping it turns a transient network error into a stale red dot.
        setSummary(EMPTY_SUMMARY);
        return EMPTY_SUMMARY;
      })
      .finally(() => {
        requestRef.current = null;
      });
    requestRef.current = request;
    return request;
  }, []);

  useEffect(() => {
    lastFetchedAtRef.current = 0;
    setSummary(EMPTY_SUMMARY);
    refresh();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") refresh();
    }, REFRESH_INTERVAL_MS);
    const refreshOnForeground = () => {
      if (Date.now() - lastFetchedAtRef.current >= FOCUS_REFRESH_MIN_INTERVAL_MS) refresh();
    };
    window.addEventListener("focus", refreshOnForeground);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshOnForeground();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshOnForeground);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [authUser?.id, refresh]);

  return { summary, refresh };
}
