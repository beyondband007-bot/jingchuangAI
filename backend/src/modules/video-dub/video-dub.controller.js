import { createHttpError, sendError } from "../../shared/http.js";
import * as service from "./video-dub.service.js";

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

export async function uploadVideo(req, res) {
  try {
    requireCredits(req.user);
    const result = await service.uploadVideo({ file: req.file });
    res.status(201).json(result);
  } catch (error) {
    sendError(res, error);
  }
}

export async function createTask(req, res) {
  try {
    requireCredits(req.user);
    const result = await service.createTask({
      sourceAssetId: req.body?.sourceAssetId,
      voiceId: req.body?.voiceId,
      language: req.body?.language,
      bgmEnabled: req.body?.bgmEnabled,
      bgmVolume: req.body?.bgmVolume,
      qwenMode: req.body?.qwenMode,
      userId: req.user.id
    });
    res.status(202).json(result);
  } catch (error) {
    sendError(res, error);
  }
}

export async function getTask(req, res) {
  try {
    const result = service.getTaskById(req.params?.taskId);
    res.json(result);
  } catch (error) {
    sendError(res, error);
  }
}

export async function getTasks(req, res) {
  try {
    const result = service.getRecentTasks();
    res.json(result);
  } catch (error) {
    sendError(res, error);
  }
}

export async function deleteTask(req, res) {
  try {
    const result = await service.deleteTask(req.params?.taskId);
    res.json(result);
  } catch (error) {
    sendError(res, error);
  }
}
