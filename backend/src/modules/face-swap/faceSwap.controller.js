import { sendError } from "../../shared/http.js";
import * as service from "./faceSwap.service.js";

export function getFaceSwapModels(_req, res) {
  res.json(service.getModels());
}

export async function uploadFaceSwapImage(req, res) {
  try {
    res.status(201).json(await service.createAsset({ kind: "image", file: req.file, user: req.user }));
  } catch (error) {
    sendError(res, error);
  }
}

export async function uploadFaceSwapVideo(req, res) {
  try {
    res.status(201).json(await service.createAsset({ kind: "video", file: req.file, user: req.user }));
  } catch (error) {
    sendError(res, error);
  }
}

export async function listFaceSwapTasks(req, res) {
  try {
    res.json(await service.listTasks({ filter: req.query.filter || "all" }));
  } catch (error) {
    sendError(res, error);
  }
}

export async function getFaceSwapTask(req, res) {
  try {
    const task = await service.getTask(req.params.id);
    if (!task) return res.status(404).json({ error: "task not found" });
    return res.json(task);
  } catch (error) {
    return sendError(res, error);
  }
}

export async function createFaceSwapTask(req, res) {
  try {
    res.status(201).json(await service.createTask(req.body || {}));
  } catch (error) {
    sendError(res, error);
  }
}

export async function toggleFaceSwapFavorite(req, res) {
  try {
    const task = await service.toggleFavorite(req.params.id);
    if (!task) return res.status(404).json({ error: "task not found" });
    return res.json(task);
  } catch (error) {
    return sendError(res, error);
  }
}

export async function deleteFaceSwapTask(req, res) {
  try {
    res.json(await service.deleteTask(req.params.id));
  } catch (error) {
    sendError(res, error);
  }
}
