import { requireLoggedIn, sendError } from "../../shared/http.js";
import {
  createTask,
  deleteTask,
  getModels,
  getTask,
  listTasks,
  toggleFavorite,
  uploadReferenceImage,
  uploadReferenceAudio,
  uploadReferenceVideo
} from "./video.service.js";

export async function getVideoModels(_req, res) {
  try {
    res.json(await getModels());
  } catch (error) {
    sendError(res, error);
  }
}

export async function listVideoTasks(req, res) {
  try {
    const source = req.query.source === "all" ? undefined : req.query.source || "video";
    res.json(await listTasks({
      userId: req.user.id,
      filter: req.query.filter || "all",
      source
    }));
  } catch (error) {
    sendError(res, error);
  }
}

export async function createVideoTask(req, res) {
  try {
    requireLoggedIn(req.user);
    const task = await createTask(req.body, req.user.id);
    res.status(201).json(task);
  } catch (error) {
    sendError(res, error);
  }
}

export async function uploadVideoReferenceImage(req, res) {
  try {
    res.status(201).json(await uploadReferenceImage({ file: req.file }));
  } catch (error) {
    sendError(res, error);
  }
}

export async function uploadVideoReferenceVideo(req, res) {
  try {
    res.status(201).json(await uploadReferenceVideo({ file: req.file }));
  } catch (error) {
    sendError(res, error);
  }
}

export async function uploadVideoReferenceAudio(req, res) {
  try {
    res.status(201).json(await uploadReferenceAudio({ file: req.file }));
  } catch (error) {
    sendError(res, error);
  }
}

export async function getVideoTask(req, res) {
  try {
    const task = await getTask(req.params.id, req.user.id);
    if (!task) {
      res.status(404).json({ error: "task not found" });
      return;
    }
    res.json(task);
  } catch (error) {
    sendError(res, error);
  }
}

export async function toggleVideoFavorite(req, res) {
  try {
    const task = await toggleFavorite(req.params.id, req.user.id);
    if (!task) {
      res.status(404).json({ error: "task not found" });
      return;
    }
    res.json(task);
  } catch (error) {
    sendError(res, error);
  }
}

export async function deleteVideoTask(req, res) {
  try {
    res.json(await deleteTask(req.params.id, req.user.id));
  } catch (error) {
    sendError(res, error);
  }
}
