import { config } from "../../config/index.js";

export function isMinimaxDigitalHumanConfigured() {
  return Boolean(config.minimax.apiKey && config.minimax.groupId);
}

function createNotConfiguredError() {
  const error = new Error("Minimax digital human API is not configured");
  error.status = 501;
  error.code = "MINIMAX_NOT_CONFIGURED";
  return error;
}

export async function createMinimaxDigitalHumanTask() {
  if (!isMinimaxDigitalHumanConfigured()) {
    throw createNotConfiguredError();
  }

  const error = new Error("Minimax digital human task creation is reserved for API integration");
  error.status = 501;
  error.code = "MINIMAX_NOT_IMPLEMENTED";
  throw error;
}

export async function getMinimaxDigitalHumanTask() {
  if (!isMinimaxDigitalHumanConfigured()) {
    throw createNotConfiguredError();
  }

  const error = new Error("Minimax digital human task polling is reserved for API integration");
  error.status = 501;
  error.code = "MINIMAX_NOT_IMPLEMENTED";
  throw error;
}

export function mapMinimaxDigitalHumanState(record) {
  const state = String(record?.status || record?.data?.status || "").toLowerCase();
  if (["success", "completed", "done"].includes(state)) return "completed";
  if (["fail", "failed", "error"].includes(state)) return "failed";
  return "processing";
}

export function extractMinimaxDigitalHumanResult(record) {
  return {
    resultUrl: record?.result_url || record?.data?.result_url || record?.data?.video_url || "",
    thumbnailUrl: record?.thumbnail_url || record?.data?.thumbnail_url || ""
  };
}
