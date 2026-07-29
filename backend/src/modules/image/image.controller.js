import { requireLoggedIn, sendError } from "../../shared/http.js";
import {
  createTask,
  deleteTask,
  getModels,
  getTask,
  listInspirationFavorites,
  listTasks,
  toggleFavorite,
  toggleInspirationFavorite,
  uploadReferenceImage
} from "./image.service.js";

export async function getImageModels(_req, res) {
  try {
    res.json(await getModels());
  } catch (error) {
    sendError(res, error);
  }
}

export async function listImageTasks(req, res) {
  try {
    const source = req.query.source === "all" ? undefined : req.query.source || "image";
    res.json(await listTasks({
      userId: req.user.id,
      filter: req.query.filter || "all",
      source
    }));
  } catch (error) {
    sendError(res, error);
  }
}

export async function createImageTask(req, res) {
  try {
    requireLoggedIn(req.user);
    const task = await createTask(req.body, req.user.id);
    res.status(201).json(task);
  } catch (error) {
    sendError(res, error);
  }
}

export async function uploadImageReference(req, res) {
  try {
    res.status(201).json(await uploadReferenceImage({ file: req.file }));
  } catch (error) {
    sendError(res, error);
  }
}

export async function getImageTask(req, res) {
  try {
    const task = await getTask(req.params.id, req.user.id);
    if (!task) {
      res.status(404).json({ error: "task not found" });
      return;
    }
    res.set("Cache-Control", "no-store");
    res.json(task);
  } catch (error) {
    sendError(res, error);
  }
}

export async function toggleImageFavorite(req, res) {
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

export async function listImageInspirationFavorites(req, res) {
  try {
    requireLoggedIn(req.user);
    res.json(await listInspirationFavorites(req.user.id));
  } catch (error) {
    sendError(res, error);
  }
}

export async function toggleImageInspirationFavorite(req, res) {
  try {
    requireLoggedIn(req.user);
    res.json(await toggleInspirationFavorite(req.params.id, req.user.id));
  } catch (error) {
    sendError(res, error);
  }
}

export async function deleteImageTask(req, res) {
  try {
    res.json(await deleteTask(req.params.id, req.user.id));
  } catch (error) {
    sendError(res, error);
  }
}
