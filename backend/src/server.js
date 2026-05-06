import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { checkDatabase } from "./db.js";
import {
  createTask,
  deleteTask,
  getCredits,
  getModels,
  getTask,
  listTasks,
  toggleFavorite
} from "./imageService.js";

const app = express();

app.use(cors({ origin: true }));
app.use(express.json({ limit: "1mb" }));

app.get("/health", async (_req, res) => {
  try {
    const db = await checkDatabase();
    res.json({ ok: true, port: config.port, db });
  } catch (error) {
    res.status(503).json({
      ok: false,
      port: config.port,
      db: { ok: false, error: error.message }
    });
  }
});

app.get("/api/me/credits", async (_req, res) => {
  try {
    res.json(await getCredits());
  } catch (error) {
    res.status(503).json({ error: error.message });
  }
});

app.get("/api/image/models", async (_req, res) => {
  try {
    res.json(await getModels());
  } catch (error) {
    res.status(503).json({ error: error.message });
  }
});

app.get("/api/image/tasks", async (req, res) => {
  try {
    res.json(await listTasks({ filter: req.query.filter || "all" }));
  } catch (error) {
    res.status(503).json({ error: error.message });
  }
});

app.post("/api/image/tasks", async (req, res) => {
  try {
    const task = await createTask(req.body);
    res.status(201).json(task);
  } catch (error) {
    res.status(error.status || 503).json({ error: error.message });
  }
});

app.get("/api/image/tasks/:id", async (req, res) => {
  try {
    const task = await getTask(req.params.id);
    if (!task) {
      res.status(404).json({ error: "task not found" });
      return;
    }
    res.json(task);
  } catch (error) {
    res.status(503).json({ error: error.message });
  }
});

app.post("/api/image/tasks/:id/favorite", async (req, res) => {
  try {
    const task = await toggleFavorite(req.params.id);
    if (!task) {
      res.status(404).json({ error: "task not found" });
      return;
    }
    res.json(task);
  } catch (error) {
    res.status(503).json({ error: error.message });
  }
});

app.delete("/api/image/tasks/:id", async (req, res) => {
  try {
    res.json(await deleteTask(req.params.id));
  } catch (error) {
    res.status(503).json({ error: error.message });
  }
});

app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
});

app.listen(config.port, "127.0.0.1", () => {
  console.log(`Backend listening on http://127.0.0.1:${config.port}`);
});
