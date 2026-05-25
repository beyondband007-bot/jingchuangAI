import { requestJson as request } from "./request.js";

export const paymentApi = {
  getCredits() {
    return request("/api/me/credits");
  },
  listOrders() {
    return request("/api/payment/recharge-orders");
  },
  createOrder(amount) {
    return request("/api/payment/recharge-orders", {
      method: "POST",
      body: JSON.stringify({ amount, provider: "alipay" })
    });
  },
  getQrCode(outTradeNo, orderToken) {
    return request(`/api/payment/recharge-orders/${encodeURIComponent(outTradeNo)}/qrcode`, {
      headers: { "X-Order-Token": orderToken }
    });
  },
  syncOrder(outTradeNo, orderToken) {
    return request(`/api/payment/recharge-orders/${encodeURIComponent(outTradeNo)}/sync`, {
      headers: { "X-Order-Token": orderToken }
    });
  },
  getCreditTransactions() {
    return request("/api/me/credit-transactions");
  }
};
