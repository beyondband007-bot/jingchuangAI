import { randomUUID } from "crypto";
import { createHttpError } from "../../shared/http.js";
import {
  findProjectRow,
  insertNodeTask,
  insertProject,
  listNodeTaskRows,
  listProjectRows,
  mapCanvasProject,
  patchProjectRow,
  softDeleteProjectRow,
  updateProjectGraphRow,
} from "./canvas.repository.js";

const MAX_PROJECT_NAME = 160;
const MAX_NODES = 500;
const MAX_EDGES = 1000;
const MAX_GRAPH_BYTES = 900 * 1024;
const TASK_TYPES = new Set(["image", "video", "chat"]);

function normalizeName(value, fallback = "未命名项目") {
  const name = String(value || "").trim() || fallback;
  return name.slice(0, MAX_PROJECT_NAME);
}

function defaultGraph() {
  return { nodes: [], edges: [] };
}

function defaultViewport() {
  return { x: 100, y: 50, zoom: 0.8 };
}

function containsDataUrl(value, depth = 0) {
  if (depth > 12 || value == null) return false;
  if (typeof value === "string") return /^data:/i.test(value);
  if (Array.isArray(value)) return value.some((item) => containsDataUrl(item, depth + 1));
  if (typeof value === "object") {
    return Object.values(value).some((item) => containsDataUrl(item, depth + 1));
  }
  return false;
}

function validateGraph(value) {
  const graph = value && typeof value === "object" ? value : defaultGraph();
  if (!Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
    throw createHttpError("graph must contain nodes and edges arrays", 400);
  }
  if (graph.nodes.length > MAX_NODES || graph.edges.length > MAX_EDGES) {
    throw createHttpError("canvas graph is too large", 413);
  }
  const encoded = JSON.stringify({ nodes: graph.nodes, edges: graph.edges });
  if (Buffer.byteLength(encoded, "utf8") > MAX_GRAPH_BYTES) {
    throw createHttpError("canvas graph exceeds 900KB", 413);
  }
  if (containsDataUrl(graph)) {
    throw createHttpError("canvas graph cannot contain data URLs; upload assets first", 400);
  }
  return { nodes: graph.nodes, edges: graph.edges };
}

function validateViewport(value) {
  const viewport = value && typeof value === "object" ? value : defaultViewport();
  const x = Number(viewport.x);
  const y = Number(viewport.y);
  const zoom = Number(viewport.zoom);
  if (![x, y, zoom].every(Number.isFinite) || zoom <= 0 || zoom > 8) {
    throw createHttpError("invalid canvas viewport", 400);
  }
  return { x, y, zoom };
}

function mapNodeTask(row) {
  return {
    id: row.id,
    projectId: row.project_id,
    nodeId: row.node_id,
    taskType: row.task_type,
    taskId: row.task_id,
    inputHash: row.input_hash || "",
    createdAt: row.created_at,
  };
}

async function requireProject(id, userId) {
  const row = await findProjectRow(id, userId);
  if (!row) throw createHttpError("canvas project not found", 404);
  return row;
}

export async function listProjects(userId) {
  return (await listProjectRows(userId)).map((row) => mapCanvasProject(row));
}

export async function getProject(id, userId) {
  return mapCanvasProject(await requireProject(id, userId), { includeGraph: true });
}

export async function createProject(payload, userId) {
  const graph = validateGraph(payload?.graph || defaultGraph());
  const viewport = validateViewport(payload?.viewport || defaultViewport());
  const id = `canvas-${randomUUID()}`;
  const row = await insertProject({
    id,
    userId,
    name: normalizeName(payload?.name),
    graph,
    viewport,
    thumbnailUrl: String(payload?.thumbnailUrl || "").slice(0, 2000),
  });
  return mapCanvasProject(row, { includeGraph: true });
}

export async function patchProject(id, payload, userId) {
  await requireProject(id, userId);
  const result = await patchProjectRow(id, userId, {
    ...(Object.prototype.hasOwnProperty.call(payload || {}, "name")
      ? { name: normalizeName(payload.name) }
      : {}),
    ...(Object.prototype.hasOwnProperty.call(payload || {}, "thumbnailUrl")
      ? { thumbnailUrl: String(payload.thumbnailUrl || "").slice(0, 2000) }
      : {}),
  });
  return mapCanvasProject(result.row, { includeGraph: true });
}

export async function saveProjectGraph(id, payload, userId) {
  await requireProject(id, userId);
  const revision = Number(payload?.revision);
  if (!Number.isInteger(revision) || revision < 1) {
    throw createHttpError("valid revision is required", 400);
  }
  const result = await updateProjectGraphRow(id, userId, {
    graph: validateGraph(payload?.graph),
    viewport: validateViewport(payload?.viewport),
    revision,
    thumbnailUrl: String(payload?.thumbnailUrl || "").slice(0, 2000),
  });
  if (!result.affectedRows) {
    throw createHttpError("canvas project changed in another window", 409);
  }
  return mapCanvasProject(result.row, { includeGraph: true });
}

export async function duplicateProject(id, userId) {
  const source = mapCanvasProject(await requireProject(id, userId), { includeGraph: true });
  return createProject(
    {
      name: `${source.name} 副本`,
      graph: source.graph,
      viewport: source.viewport,
      thumbnailUrl: source.thumbnailUrl,
    },
    userId,
  );
}

export async function deleteProject(id, userId) {
  const deleted = await softDeleteProjectRow(id, userId);
  if (!deleted) throw createHttpError("canvas project not found", 404);
  return { success: true, id };
}

export async function addNodeTask(projectId, payload, userId) {
  await requireProject(projectId, userId);
  const nodeId = String(payload?.nodeId || "").trim().slice(0, 80);
  const taskType = String(payload?.taskType || "").trim();
  const taskId = String(payload?.taskId || "").trim().slice(0, 80);
  const inputHash = String(payload?.inputHash || "").trim().slice(0, 64);
  if (!nodeId || !taskId || !TASK_TYPES.has(taskType)) {
    throw createHttpError("nodeId, taskType and taskId are required", 400);
  }
  await insertNodeTask({ projectId, userId, nodeId, taskType, taskId, inputHash });
  return { projectId, nodeId, taskType, taskId, inputHash };
}

export async function listNodeTasks(projectId, userId) {
  await requireProject(projectId, userId);
  return (await listNodeTaskRows(projectId, userId)).map(mapNodeTask);
}
