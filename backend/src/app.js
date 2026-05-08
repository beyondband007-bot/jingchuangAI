import cors from "cors";
import express from "express";
import path from "path";
import { config } from "./config/index.js";
import { checkDatabase } from "./db/pool.js";
import { chatRouter } from "./modules/chat/chat.routes.js";
import { digitalHumanRouter } from "./modules/digital-human/digitalHuman.routes.js";
import { imageDigitalHumanRouter } from "./modules/image-digital-human/imageDigitalHuman.routes.js";
import { imageRouter } from "./modules/image/image.routes.js";
import { videoRouter } from "./modules/video/video.routes.js";
import { sendError } from "./shared/http.js";
import { getDemoUserCredits } from "./shared/userService.js";

export function createApp() {
  const app = express();

  app.use(cors({ origin: true }));
  app.use(express.json({ limit: "1mb" }));
  app.use("/media", express.static(path.resolve(process.cwd(), config.media.storageDir)));

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
  app.use("/api/video", videoRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/digital-human", digitalHumanRouter);
  app.use("/api/image-digital-human", imageDigitalHumanRouter);

  app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
  });

  return app;
}
