import { sendError } from "../../shared/http.js";
import { getRunningSummary } from "./generationNotification.service.js";

export async function getGenerationRunningSummary(req, res) {
  try {
    if (req.user?.isGuest) {
      res.json({ totalRunningCount: 0, bySource: {}, generatedAt: new Date().toISOString() });
      return;
    }
    res.json(await getRunningSummary(req.user.id));
  } catch (error) {
    sendError(res, error);
  }
}
