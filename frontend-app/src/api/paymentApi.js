import { requestJson as request } from "./request.js";

export const paymentApi = {
  getCredits() {
    return request("/api/me/credits");
  },
  listOrders() {
    return request("/api/payment/recharge-orders");
  },
  createOrder(amount, provider = "alipay") {
    return request("/api/payment/recharge-orders", {
      method: "POST",
      body: JSON.stringify({ amount, provider })
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
  getCreditTransactions(params = {}) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") searchParams.set(key, value);
    });
    const query = searchParams.toString();
    return request(`/api/me/credit-transactions${query ? `?${query}` : ""}`);
  }
};
