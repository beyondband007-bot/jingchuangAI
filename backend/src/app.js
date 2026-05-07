import cors from "cors";
import express from "express";
import { config } from "./config/index.js";
import { checkDatabase } from "./db/pool.js";
import { imageRouter } from "./modules/image/image.routes.js";
import { sendError } from "./shared/http.js";
import { getDemoUserCredits } from "./shared/userService.js";

export function createApp() {
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
      res.json(await getDemoUserCredits());
    } catch (error) {
      sendError(res, error);
    }
  });

  app.use("/api/image", imageRouter);

  app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
  });

  return app;
}
