import { sendError } from "../../shared/http.js";
import { getInvitationProfile, trackInvitationEvent } from "./invitation.service.js";

function requestOrigin(req) {
  const proto = String(req.headers["x-forwarded-proto"] || req.protocol || "http").split(",")[0].trim();
  const host = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim();
  return host ? `${proto}://${host}` : "";
}

export async function me(req, res) {
  try {
    res.json(await getInvitationProfile(req.user, requestOrigin(req)));
  } catch (error) {
    sendError(res, error);
  }
}

export async function track(req, res) {
  try {
    res.json(await trackInvitationEvent({
      eventType: req.body?.eventType,
      inviteCode: req.body?.inviteCode,
      userId: req.user?.isGuest ? null : req.user?.id,
      payload: req.body?.payload
    }));
  } catch (error) {
    sendError(res, error);
  }
}
