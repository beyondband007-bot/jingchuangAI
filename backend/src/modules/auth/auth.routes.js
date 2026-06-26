import { mkdirSync } from "fs";
import path from "path";
import { Router } from "express";
import multer from "multer";
import { sendError } from "../../shared/http.js";
import { resolveCurrentUser } from "../../shared/userService.js";
import {
  captchaConfig,
  changePassword,
  changePhone,
  login,
  logout,
  me,
  passwordReset,
  passwordResetChallenge,
  phoneCodeLogin,
  register,
  securityQuestions,
  selectAvatar,
  smsCode,
  updateProfile,
  uploadAvatar,
  verifyCurrentPhone
} from "./auth.controller.js";

export const authRouter = Router();

const avatarUploadDir = path.resolve(
  process.cwd(),
  "..",
  "frontend-app",
  "public",
  "assets",
  "avatars",
  "upload"
);
mkdirSync(avatarUploadDir, { recursive: true });

function safeAvatarOwner(req) {
  const value = String(req.avatarOwnerExternalId || "user").trim();
  return value.replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80) || "user";
}

const avatarUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      callback(null, avatarUploadDir);
    },
    filename: (req, file, callback) => {
      const extension = path.extname(file.originalname || "").toLowerCase();
      const ext = extension === ".webp" ? ".webp" : ".jpg";
      callback(null, `${safeAvatarOwner(req)}-${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`);
    }
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowedTypes.has(String(file.mimetype || ""))) {
      callback(new Error("file must be a JPEG, PNG, or WebP image"));
      return;
    }
    callback(null, true);
  }
});

function uploadAvatarFile(req, res, next) {
  avatarUpload.single("file")(req, res, (error) => {
    if (!error) {
      next();
      return undefined;
    }
    const message = error.code === "LIMIT_FILE_SIZE" ? "头像图片不能超过 2MB" : error.message;
    return res.status(400).json({ error: message });
  });
}

async function requireAvatarUploadUser(req, res, next) {
  try {
    const user = await resolveCurrentUser(req);
    if (!user?.id || user.isGuest) {
      res.status(401).json({ error: "请先登录" });
      return;
    }
    req.avatarOwnerExternalId = user.externalId;
    next();
  } catch (error) {
    sendError(res, error);
  }
}

authRouter.get("/me", me);
authRouter.get("/security-questions", securityQuestions);
authRouter.get("/captcha/config", captchaConfig);
authRouter.post("/sms-code", smsCode);
authRouter.post("/register", register);
authRouter.post("/login", login);
authRouter.post("/login/phone-code", phoneCodeLogin);
authRouter.post("/logout", logout);
authRouter.post("/password-reset/challenge", passwordResetChallenge);
authRouter.post("/password-reset", passwordReset);
authRouter.patch("/profile", updateProfile);
authRouter.post("/avatar/select", selectAvatar);
authRouter.post("/avatar/upload", requireAvatarUploadUser, uploadAvatarFile, uploadAvatar);
authRouter.post("/phone/verify-current", verifyCurrentPhone);
authRouter.post("/phone/change", changePhone);
authRouter.post("/password/change", changePassword);
