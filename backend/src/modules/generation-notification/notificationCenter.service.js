import { createHttpError } from "../../shared/http.js";
import {
  countNotifications,
  listNotifications,
  markNotificationsRead,
  synchronizeTaskNotifications,
} from "./notificationCenter.repository.js";

const categories = new Set(["system", "task"]);

export async function getNotificationCenter(userId, input = {}) {
  const category = categories.has(input.category) ? input.category : "system";
  const page = Math.max(1, Number.parseInt(input.page, 10) || 1);
  const pageSize = 20;
  await synchronizeTaskNotifications(userId);
  const [total, unreadCount, systemUnreadCount, taskUnreadCount] = await Promise.all([
    countNotifications({ userId, category }),
    countNotifications({ userId, unreadOnly: true }),
    countNotifications({ userId, category: "system", unreadOnly: true }),
    countNotifications({ userId, category: "task", unreadOnly: true }),
  ]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, totalPages);
  const items = await listNotifications({
    userId, category, limit: pageSize, offset: (safePage - 1) * pageSize,
  });
  return {
    systemNotifications: category === "system" ? items : [],
    taskNotifications: category === "task" ? items : [],
    unreadCount,
    unreadByCategory: { system: systemUnreadCount, task: taskUnreadCount },
    pagination: { category, page: safePage, pageSize, total, totalPages },
  };
}

export async function readNotificationCenterItems(userId, input) {
  const notificationIds = Array.isArray(input?.notificationIds)
    ? [...new Set(input.notificationIds.map(Number).filter(Number.isSafeInteger))]
    : [];
  if (!notificationIds.length) throw createHttpError("请选择要标记的通知", 400);
  await markNotificationsRead({ userId, notificationIds });
}

export async function readAllNotificationCenterItems(userId, input) {
  const category = typeof input?.category === "string" ? input.category : "";
  if (category && !categories.has(category)) throw createHttpError("无效的通知类型", 400);
  const notifications = await listNotifications({ userId, category, limit: 10000 });
  await markNotificationsRead({
    userId,
    notificationIds: notifications.filter((item) => !item.isRead).map((item) => item.id),
  });
}
