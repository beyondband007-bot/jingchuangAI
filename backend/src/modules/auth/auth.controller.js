import { sendError } from "../../shared/http.js";
import { SESSION_COOKIE_NAME } from "../../shared/userService.js";
import { getAuthState, loginUser, logoutUser, registerUser } from "./auth.service.js";

function isSecureRequest(req) {
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  return req.secure || forwardedProto === "https";
}

function cookieOptions(req, expiresAt) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(req),
    path: "/",
    expires: expiresAt
  };
}

function setSessionCookie(req, res, session) {
  res.cookie(SESSION_COOKIE_NAME, session.token, cookieOptions(req, session.expiresAt));
}

function clearSessionCookie(req, res) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: isSecureRequest(req),
    path: "/"
  });
}

export async function me(req, res) {
  try {
    res.json(await getAuthState(req));
  } catch (error) {
    sendError(res, error);
  }
}

export async function register(req, res) {
  try {
    const result = await registerUser(req.body);
    setSessionCookie(req, res, result.session);
    res.status(201).json({ user: result.user });
  } catch (error) {
    sendError(res, error);
  }
}

export async function login(req, res) {
  try {
    const result = await loginUser(req.body);
    setSessionCookie(req, res, result.session);
    res.json({ user: result.user });
  } catch (error) {
    sendError(res, error);
  }
}

export async function logout(req, res) {
  try {
    await logoutUser(req);
    clearSessionCookie(req, res);
    res.json({ ok: true });
  } catch (error) {
    sendError(res, error);
  }
}
