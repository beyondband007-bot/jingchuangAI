import { sendError } from "../../shared/http.js";
import * as service from "./motionTransfer.service.js";

export function getMotionTransferModels(_req, res) {
  res.json(service.getModels());
}

export async function uploadMotionTransferImage(req, res) {
  try {
    res.status(201).json(await service.createAsset({ kind: "image", file: req.file }));
  } catch (error) {
    sendError(res, error);
  }
}

export async function uploadMotionTransferVideo(req, res) {
  try {
    res.status(201).json(await service.createAsset({ kind: "video", file: req.file }));
  } catch (error) {
    sendError(res, error);
  }
}

export async function listMotionTransferTasks(req, res) {
  try {
    res.json(await service.listTasks({ filter: req.query.filter || "all" }));
  } catch (error) {
    sendError(res, error);
  }
}

export async function getMotionTransferTask(req, res) {
  try {
    const task = await service.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: "task not found" });
    return res.json(task);
  } catch (error) {
    return sendError(res, error);
  }
}

export async function createMotionTransferTask(req, res) {
  try {
    res.status(201).json(await service.createTask(req.body || {}));
  } catch (error) {
    sendError(res, error);
  }
}

export async function toggleMotionTransferFavorite(req, res) {
  try {
    const task = await service.toggleFavorite(req.params.id);
    if (!task) return res.status(404).json({ error: "task not found" });
    return res.json(task);
  } catch (error) {
    return sendError(res, error);
  }
}

export async function deleteMotionTransferTask(req, res) {
  try {
    res.json(await service.deleteTask(req.params.id));
  } catch (error) {
    sendError(res, error);
  }
}
