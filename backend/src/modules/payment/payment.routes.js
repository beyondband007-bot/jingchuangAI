import express from "express";
import { sendError } from "../../shared/http.js";
import {
  createRechargeOrder,
  getPaymentQrCode,
  handleAlipayNotify,
  handleWechatPayNotify,
  listRechargeOrders,
  syncPaymentOrder
} from "./payment.service.js";

export const paymentRouter = express.Router();
export const paymentPublicRouter = express.Router();

function getOrderToken(req) {
  return req.headers["x-order-token"] || req.query.orderToken || req.body?.orderToken || "";
}

paymentRouter.get("/recharge-orders", async (req, res) => {
  try {
    if (req.user?.isGuest) {
      res.status(401).json({ error: "请先登录后再充值" });
      return;
    }
    res.json(await listRechargeOrders(req.user.id));
  } catch (error) {
    sendError(res, error);
  }
});

paymentRouter.post("/recharge-orders", async (req, res) => {
  try {
    res.status(201).json(await createRechargeOrder(req.user, req.body || {}));
  } catch (error) {
    sendError(res, error);
  }
});

paymentRouter.get("/recharge-orders/:outTradeNo/qrcode", async (req, res) => {
  try {
    res.json(await getPaymentQrCode(req.user, req.params.outTradeNo, getOrderToken(req)));
  } catch (error) {
    sendError(res, error);
  }
});

paymentRouter.get("/recharge-orders/:outTradeNo/sync", async (req, res) => {
  try {
    res.json(await syncPaymentOrder(req.user, req.params.outTradeNo, getOrderToken(req)));
  } catch (error) {
    sendError(res, error);
  }
});

paymentPublicRouter.post("/alipay/notify", async (req, res) => {
  try {
    const accepted = await handleAlipayNotify(req.body || {});
    res.type("text/plain").send(accepted ? "success" : "failure");
  } catch {
    res.type("text/plain").send("failure");
  }
});

paymentPublicRouter.post("/wechatpay/notify", async (req, res) => {
  try {
    const accepted = await handleWechatPayNotify({
      headers: req.headers,
      rawBody: req.rawBody?.toString("utf8") || "",
      body: req.body || {}
    });
    res.json(accepted ? { code: "SUCCESS", message: "成功" } : { code: "FAIL", message: "失败" });
  } catch {
    res.json({ code: "FAIL", message: "失败" });
  }
});
