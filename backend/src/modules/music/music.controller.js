import { sendError } from "../../shared/http.js";
import * as service from "./music.service.js";
import { syncMusicLyrics } from "./lyricsSync.service.js";

export async function getConfig(req, res) {
  try {
    res.json(service.getConfig());
  } catch (error) {
    sendError(res, error);
  }
}

export async function getRecent(req, res) {
  try {
    res.json(await service.getRecentMusic(req.user.id));
  } catch (error) {
    sendError(res, error);
  }
}

export async function getTask(req, res) {
  try {
    const task = await service.getMusicTask(req.params.id, req.user.id);
    if (!task) {
      res.status(404).json({ error: "音乐任务不存在" });
      return;
    }
    res.json(task);
  } catch (error) {
    sendError(res, error);
  }
}

export async function generate(req, res) {
  try {
    const result = await service.generateMusic(req.body || {}, req.user.id);
    res.status(202).json(result);
  } catch (error) {
    sendError(res, error);
  }
}

export async function syncLyrics(req, res) {
  try {
    const force = req.query.force === "1" || req.query.force === "true";
    const result = await syncMusicLyrics(req.params.id, req.user.id, { force });
    res.json(result);
  } catch (error) {
    sendError(res, error);
  }
}

export async function deleteTask(req, res) {
  try {
    res.json(await service.deleteMusicTask(req.params.id, req.user.id));
  } catch (error) {
    sendError(res, error);
  }
}
