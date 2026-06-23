import { requireLoggedIn, sendError } from "../../shared/http.js";
import {
  createCopyDraft,
  createPackage,
  createTask,
  deleteTask,
  getModels,
  downloadPackageImagesZip,
  getPackage,
  getTask,
  listTasks,
  toggleFavorite
} from "./article.service.js";

export async function getArticleModels(_req, res) {
  try {
    res.json(await getModels());
  } catch (error) {
    sendError(res, error);
  }
}

export async function listArticleTasks(req, res) {
  try {
    res.json(await listTasks({ userId: req.user.id, filter: req.query.filter || "all" }));
  } catch (error) {
    sendError(res, error);
  }
}

export async function createArticleCopyDraft(req, res) {
  try {
    requireLoggedIn(req.user);
    res.json(await createCopyDraft(req.body || {}));
  } catch (error) {
    sendError(res, error);
  }
}

export async function createArticlePackage(req, res) {
  try {
    requireLoggedIn(req.user);
    res.status(201).json(await createPackage(req.body || {}, req.user.id));
  } catch (error) {
    sendError(res, error);
  }
}

export async function getArticlePackage(req, res) {
  try {
    const item = await getPackage(req.params.id, req.user.id);
    if (!item) {
      res.status(404).json({ error: "package not found" });
      return;
    }
    res.json(item);
  } catch (error) {
    sendError(res, error);
  }
}

export async function downloadArticlePackageImages(req, res) {
  try {
    const result = await downloadPackageImagesZip(req.params.id, req.user.id);
    if (!result) {
      res.status(404).json({ error: "package not found" });
      return;
    }
    res.setHeader("Content-Type", "application/zip");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(result.fileName)}`,
    );
    res.send(result.buffer);
  } catch (error) {
    sendError(res, error);
  }
}

export async function createArticleTask(req, res) {
  try {
    requireLoggedIn(req.user);
    res.status(201).json(await createTask(req.body || {}, req.user.id));
  } catch (error) {
    sendError(res, error);
  }
}

export async function getArticleTask(req, res) {
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

export async function toggleArticleFavorite(req, res) {
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

export async function deleteArticleTask(req, res) {
  try {
    res.json(await deleteTask(req.params.id, req.user.id));
  } catch (error) {
    sendError(res, error);
  }
}
