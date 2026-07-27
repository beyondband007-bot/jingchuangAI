import { emitCreditsUpdated } from "../../api/creditsEvents";

export function applyCreditsUpdate(setCredits, credits) {
  if (!credits) return;
  setCredits(credits);
  emitCreditsUpdated(credits);
}
