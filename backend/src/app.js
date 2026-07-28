import cors from "cors";
import express from "express";
import path from "path";
import { config } from "./config/index.js";
import { checkDatabase } from "./db/pool.js";
import { articleRouter } from "./modules/article/article.routes.js";
import { authRouter } from "./modules/auth/auth.routes.js";
import { chatRouter } from "./modules/chat/chat.routes.js";
import { digitalHumanRouter } from "./modules/digital-human/digitalHuman.routes.js";
import { enhanceRouter } from "./modules/enhance/enhance.routes.js";
import { faceSwapRouter } from "./modules/face-swap/faceSwap.routes.js";
import { imageDigitalHumanRouter } from "./modules/image-digital-human/imageDigitalHuman.routes.js";
import { imageRouter } from "./modules/image/image.routes.js";
import { invitationRouter } from "./modules/invitations/invitation.routes.js";
import { motionTransferRouter } from "./modules/motion-transfer/motionTransfer.routes.js";
import { removeBgRouter } from "./modules/remove-bg/removeBg.routes.js";
import { watermarkRouter } from "./modules/watermark/watermark.routes.js";
import { voiceRouter } from "./modules/voice/voice.routes.js";
import { videoRouter } from "./modules/video/video.routes.js";
import { voiceConvertRouter } from "./modules/voice-convert/voiceConvert.routes.js";
import { transcribeRouter } from "./modules/transcribe/transcribe.routes.js";
import { musicRouter } from "./modules/music/music.routes.js";
import { paymentPublicRouter, paymentRouter } from "./modules/payment/payment.routes.js";
import { replicateRouter } from "./modules/replicate/replicate.routes.js";
import { videoDubRouter } from "./modules/video-dub/video-dub.routes.js";
import { billingRouter } from "./modules/billing/billing.routes.js";
import { canvasRouter } from "./modules/canvas/canvas.routes.js";
import { generationNotificationRouter } from "./modules/generation-notification/generationNotification.routes.js";
import { sendError } from "./shared/http.js";
import { attachCurrentUser, getUserCredits } from "./shared/userService.js";
import { fetchProxiedMedia } from "./shared/mediaProxy.js";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({
    limit: "1mb",
    verify: (req, _res, buffer) => {
      req.rawBody = buffer;
    }
  }));
  app.use(express.urlencoded({ extended: false, limit: "1mb" }));
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

  app.use("/api/auth", authRouter);
  app.use("/api/payment", paymentPublicRouter);
  app.use("/api/v1", paymentPublicRouter);
  app.use("/api", attachCurrentUser);
  app.use("/api/me/generation-notifications", generationNotificationRouter);

  app.get("/api/me/credits", async (req, res) => {
    try {
      res.json(await getUserCredits(req.user.id));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/me/credit-transactions", async (req, res) => {
    try {
      if (req.user?.isGuest) {
        res.status(401).json({ error: "请先登录" });
        return;
      }
      const { listCreditTransactions } = await import("./modules/payment/payment.service.js");
      res.json(await listCreditTransactions(req.user.id, req.query));
    } catch (error) {
      sendError(res, error);
    }
  });

  app.get("/api/media/proxy", async (req, res) => {
    try {
      const { buffer, contentType } = await fetchProxiedMedia(req.query.url);
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "private, max-age=300");
      res.send(buffer);
    } catch (error) {
      sendError(res, error);
    }
  });

  app.use("/api/image", imageRouter);
  app.use("/api/invitations", invitationRouter);
  app.use("/api/article", articleRouter);
  app.use("/api/video", videoRouter);
  app.use("/api/chat", chatRouter);
  app.use("/api/digital-human", digitalHumanRouter);
  app.use("/api/enhance", enhanceRouter);
  app.use("/api/image-digital-human", imageDigitalHumanRouter);
  app.use("/api/motion-transfer", motionTransferRouter);
  app.use("/api/remove-bg", removeBgRouter);
  app.use("/api/face-swap", faceSwapRouter);
  app.use("/api/watermark", watermarkRouter);
  app.use("/api/voice", voiceRouter);
  app.use("/api/voice-convert", voiceConvertRouter);
  app.use("/api/transcribe", transcribeRouter);
  app.use("/api/music", musicRouter);
  app.use("/api/payment", paymentRouter);
  app.use("/api/replicate", replicateRouter);
  app.use("/api/video-dub", videoDubRouter);
  app.use("/api/billing", billingRouter);
  app.use("/api/canvas", canvasRouter);

  app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` });
  });

  return app;
}
