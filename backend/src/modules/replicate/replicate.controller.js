import { sendError } from "../../shared/http.js";
import * as service from "./replicate.service.js";

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

export async function analyzeImage(req, res) {
  try {
    const result = await service.analyzeImage({ file: req.file, userId: req.user.id });
    res.status(201).json(result);
  } catch (error) {
    sendError(res, error);
  }
}

export async function analyzeVideo(req, res) {
  try {
    const result = await service.analyzeVideo({ file: req.file, userId: req.user.id });
    res.status(201).json(result);
  } catch (error) {
    sendError(res, error);
  }
}
