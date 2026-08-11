import { requireLoggedIn, sendError } from "../../shared/http.js";
import {
  getGenerationSummary,
  getRunningSummary,
} from "./generationNotification.service.js";
import { markGenerationResultRead } from "./generationResultRead.service.js";
import {
  getNotificationCenter,
  readAllNotificationCenterItems,
  readNotificationCenterItems,
} from "./notificationCenter.service.js";

export async function getGenerationRunningSummary(req, res) {
  try {
    if (req.user?.isGuest) {
      res.json({ totalRunningCount: 0, bySource: {}, generatedAt: new Date().toISOString() });
      return;
    }
    res.json(await getRunningSummary(req.user.id));
  } catch (error) {
    sendError(res, error);
  }
}

export async function getGenerationNotificationSummary(req, res) {
  try {
    if (req.user?.isGuest) {
      res.json({
        totalRunningCount: 0,
        totalUnreadCount: 0,
        unreadAvailable: true,
        bySource: {},
        generatedAt: new Date().toISOString(),
      });
      return;
    }
    res.json(await getGenerationSummary(req.user.id));
  } catch (error) {
    sendError(res, error);
  }
}

export async function markGenerationNotificationResultRead(req, res) {
  try {
    requireLoggedIn(req.user);
    await markGenerationResultRead({ userId: req.user.id, input: req.body });
    res.status(204).end();
  } catch (error) {
    if (error?.status === 400 || error?.status === 401) {
      sendError(res, error);
      return;
    }
    console.error("[generation-unread] mark read unavailable", {
      error: error?.message || String(error),
    });
    res.status(503).json({ error: "Unable to mark generation result as read" });
  }
}

export async function getNotificationCenterItems(req, res) {
  try {
    requireLoggedIn(req.user);
    res.json(await getNotificationCenter(req.user.id, req.query));
  } catch (error) {
    sendError(res, error);
  }
}

export async function markNotificationCenterItemsRead(req, res) {
  try {
    requireLoggedIn(req.user);
    await readNotificationCenterItems(req.user.id, req.body);
    res.status(204).end();
  } catch (error) {
    sendError(res, error);
  }
}

export async function markAllNotificationCenterItemsRead(req, res) {
  try {
    requireLoggedIn(req.user);
    await readAllNotificationCenterItems(req.user.id, req.body);
    res.status(204).end();
  } catch (error) {
    sendError(res, error);
  }
}
