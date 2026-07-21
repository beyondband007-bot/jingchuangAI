import { getPool } from "../../db/pool.js";

function parseJson(value, fallback) {
  if (value == null) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function mapCanvasProject(row, { includeGraph = false } = {}) {
  if (!row) return null;
  const project = {
    id: row.id,
    name: row.name,
    thumbnailUrl: row.thumbnail_url || "",
    schemaVersion: Number(row.schema_version || 1),
    revision: Number(row.revision || 1),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (includeGraph) {
    project.graph = parseJson(row.graph_json, { nodes: [], edges: [] });
    project.viewport = parseJson(row.viewport_json, { x: 100, y: 50, zoom: 0.8 });
  }
  return project;
}

export async function listProjectRows(userId) {
  const [rows] = await getPool().query(
    `SELECT id, name, thumbnail_url, schema_version, revision, created_at, updated_at
     FROM canvas_projects
     WHERE user_id = ? AND deleted_at IS NULL
     ORDER BY updated_at DESC`,
    [userId],
  );
  return rows;
}

export async function findProjectRow(id, userId) {
  const [rows] = await getPool().query(
    `SELECT * FROM canvas_projects
     WHERE id = ? AND user_id = ? AND deleted_at IS NULL
     LIMIT 1`,
    [id, userId],
  );
  return rows[0] || null;
}

export async function insertProject({ id, userId, name, graph, viewport, thumbnailUrl = "" }) {
  await getPool().query(
    `INSERT INTO canvas_projects
       (id, user_id, name, thumbnail_url, graph_json, viewport_json, schema_version, revision)
     VALUES (?, ?, ?, ?, ?, ?, 1, 1)`,
    [id, userId, name, thumbnailUrl || null, JSON.stringify(graph), JSON.stringify(viewport)],
  );
  return findProjectRow(id, userId);
}

export async function patchProjectRow(id, userId, { name, thumbnailUrl }) {
  const updates = [];
  const values = [];
  if (typeof name === "string") {
    updates.push("name = ?");
    values.push(name);
  }
  if (typeof thumbnailUrl === "string") {
    updates.push("thumbnail_url = ?");
    values.push(thumbnailUrl || null);
  }
  if (!updates.length) return { affectedRows: 0, row: await findProjectRow(id, userId) };
  values.push(id, userId);
  const [result] = await getPool().query(
    `UPDATE canvas_projects
     SET ${updates.join(", ")}, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
    values,
  );
  return { affectedRows: result.affectedRows, row: await findProjectRow(id, userId) };
}

export async function updateProjectGraphRow(id, userId, { graph, viewport, revision, thumbnailUrl }) {
  const [result] = await getPool().query(
    `UPDATE canvas_projects
     SET graph_json = ?, viewport_json = ?, thumbnail_url = ?,
         schema_version = 1, revision = revision + 1, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ? AND deleted_at IS NULL AND revision = ?`,
    [JSON.stringify(graph), JSON.stringify(viewport), thumbnailUrl || null, id, userId, revision],
  );
  return { affectedRows: result.affectedRows, row: await findProjectRow(id, userId) };
}

export async function softDeleteProjectRow(id, userId) {
  const [result] = await getPool().query(
    `UPDATE canvas_projects
     SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
     WHERE id = ? AND user_id = ? AND deleted_at IS NULL`,
    [id, userId],
  );
  return result.affectedRows > 0;
}

export async function insertNodeTask({ projectId, userId, nodeId, taskType, taskId, inputHash }) {
  await getPool().query(
    `INSERT INTO canvas_node_tasks
       (project_id, user_id, node_id, task_type, task_id, input_hash)
     VALUES (?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE input_hash = VALUES(input_hash)`,
    [projectId, userId, nodeId, taskType, taskId, inputHash || null],
  );
}

export async function listNodeTaskRows(projectId, userId) {
  const [rows] = await getPool().query(
    `SELECT id, project_id, node_id, task_type, task_id, input_hash, created_at
     FROM canvas_node_tasks
     WHERE project_id = ? AND user_id = ?
     ORDER BY id ASC`,
    [projectId, userId],
  );
  return rows;
}
