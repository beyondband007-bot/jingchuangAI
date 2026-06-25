import { Router } from "express";
import { calculateBillingQuote, getPublicBillingRules } from "../../shared/billingRules.js";

export const billingRouter = Router();

billingRouter.get("/rules", (_req, res) => {
  res.json(getPublicBillingRules());
});

billingRouter.post("/quote", (req, res) => {
  try {
    res.json(calculateBillingQuote(req.body?.feature, req.body?.payload || {}));
  } catch (error) {
    res.status(400).json({ message: error.message || "无法计算计费报价" });
  }
});
