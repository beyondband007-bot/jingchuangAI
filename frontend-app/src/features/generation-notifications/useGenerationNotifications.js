import { useCallback, useEffect, useRef, useState } from "react";
import { generationNotificationApi } from "../../api/generationNotificationApi.js";

const EMPTY_SUMMARY = { totalRunningCount: 0, bySource: {} };
const EMPTY_CENTER = { systemNotifications: [], taskNotifications: [], unreadCount: 0, unreadByCategory: { system: 0, task: 0 }, pagination: { category: "system", page: 1, pageSize: 20, total: 0, totalPages: 1 } };
// A single indexed summary request keeps loading badges responsive without each
// feature polling its own complete task list.
const REFRESH_INTERVAL_MS = 10_000;
const FOCUS_REFRESH_MIN_INTERVAL_MS = 30_000;

export function useGenerationNotifications(authUser) {
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [center, setCenter] = useState(EMPTY_CENTER);
  const requestRef = useRef(null);
  const centerRequestIdRef = useRef(0);
  const lastFetchedAtRef = useRef(0);
  const centerPageRef = useRef({ category: "system", page: 1 });
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

  const refreshCenter = useCallback(async (category = "system", page = 1) => {
    const requestId = ++centerRequestIdRef.current;
    try {
      const next = await generationNotificationApi.getCenter({ category, page });
      if (requestId !== centerRequestIdRef.current) return next;
      centerPageRef.current = {
        category: next?.pagination?.category || category,
        page: next?.pagination?.page || page,
      };
      setCenter(next || EMPTY_CENTER);
      return next;
    } catch {
      if (requestId !== centerRequestIdRef.current) return EMPTY_CENTER;
      return EMPTY_CENTER;
    }
  }, []);

  const markCenterRead = useCallback(async (notificationIds) => {
    if (!notificationIds?.length) return;
    await generationNotificationApi.markCenterRead(notificationIds);
    setCenter((current) => ({
      ...current,
      unreadCount: Math.max(0, current.unreadCount - notificationIds.length),
      unreadByCategory: {
        system: Math.max(0, current.unreadByCategory.system - current.systemNotifications.filter((item) => notificationIds.includes(item.id) && !item.isRead).length),
        task: Math.max(0, current.unreadByCategory.task - current.taskNotifications.filter((item) => notificationIds.includes(item.id) && !item.isRead).length),
      },
      systemNotifications: current.systemNotifications.map((item) => notificationIds.includes(item.id) ? { ...item, isRead: true } : item),
      taskNotifications: current.taskNotifications.map((item) => notificationIds.includes(item.id) ? { ...item, isRead: true } : item),
    }));
  }, []);

  const markAllCenterRead = useCallback(async (category) => {
    await generationNotificationApi.markAllCenterRead(category);
    setCenter((current) => {
      const changed = (category === "system" ? current.systemNotifications : current.taskNotifications)
        .filter((item) => !item.isRead).length;
      return {
        ...current,
        unreadCount: Math.max(0, current.unreadCount - changed),
        unreadByCategory: {
          ...current.unreadByCategory,
          [category]: Math.max(0, current.unreadByCategory[category] - changed),
        },
        systemNotifications: category === "system" ? current.systemNotifications.map((item) => ({ ...item, isRead: true })) : current.systemNotifications,
        taskNotifications: category === "task" ? current.taskNotifications.map((item) => ({ ...item, isRead: true })) : current.taskNotifications,
      };
    });
  }, []);

  useEffect(() => {
    lastFetchedAtRef.current = 0;
    setSummary(EMPTY_SUMMARY);
    setCenter(EMPTY_CENTER);
    refresh();
    refreshCenter("system");
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refresh();
        refreshCenter(centerPageRef.current.category, centerPageRef.current.page);
      }
    }, REFRESH_INTERVAL_MS);
    const refreshOnForeground = () => {
      if (Date.now() - lastFetchedAtRef.current >= FOCUS_REFRESH_MIN_INTERVAL_MS) {
        refresh();
        refreshCenter(centerPageRef.current.category, centerPageRef.current.page);
      }
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
  }, [authUser?.id, refresh, refreshCenter]);

  return { summary, refresh, center, refreshCenter, markCenterRead, markAllCenterRead };
}
