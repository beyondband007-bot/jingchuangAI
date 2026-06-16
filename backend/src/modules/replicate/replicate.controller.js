import { createHttpError, sendError } from "../../shared/http.js";
import * as service from "./replicate.service.js";

function requireCredits(user) {
  if (user?.isGuest) throw createHttpError("积分不够，请充值", 402);
}

export async function getConfig(req, res) {
  try {
    res.json(service.getConfig());
  } catch (error) {
    sendError(res, error);
  }
}

export async function getRecent(req, res) {
  try {
    res.json(await service.getRecentReplicates(req.user.id));
  } catch (error) {
    sendError(res, error);
  }
}

export async function getTask(req, res) {
  try {
    const task = await service.getReplicateTask(req.params.id, req.user.id);
    if (!task) {
      res.status(404).json({ error: "任务不存在" });
      return;
    }
    res.json(task);
  } catch (error) {
    sendError(res, error);
  }
}

export async function analyzeImage(req, res) {
  try {
    requireCredits(req.user);
    const result = await service.analyzeImage({ file: req.file, userId: req.user.id });
    res.status(202).json(result);
  } catch (error) {
    sendError(res, error);
  }
}

export async function analyzeVideo(req, res) {
  try {
    requireCredits(req.user);
    const result = await service.analyzeVideo({ file: req.file, userId: req.user.id });
    res.status(202).json(result);
  } catch (error) {
    sendError(res, error);
  }
}
