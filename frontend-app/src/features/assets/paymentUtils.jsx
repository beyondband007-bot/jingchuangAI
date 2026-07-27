import { IconAlipayCircle, IconWechat } from "@arco-design/web-react/icon";
import { CheckCircle2, CircleAlert, RefreshCcw, Timer, X } from "lucide-react";

export const rechargePresets = [1, 10, 30, 50, 100, 200];
export const paymentCodeTtlSeconds = 3 * 60;
export const paymentResultTtlSeconds = 3;
export const paymentProviderOptions = [
  { value: "alipay", label: "支付宝支付", icon: IconAlipayCircle },
  { value: "wechat", label: "微信支付", icon: IconWechat },
];

export const finalPaymentStatuses = new Set([
  "PAID",
  "CLOSED",
  "CANCELED",
  "REFUNDED",
  "AMOUNT_MISMATCH",
]);

export function paymentProviderText(provider) {
  return (
    paymentProviderOptions.find((item) => item.value === provider)?.label ||
    "支付宝支付"
  );
}

export function paymentProviderOrderTitle(provider) {
  return provider === "wechat" ? "微信订单码" : "支付宝订单码";
}

export function formatPaymentCountdown(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function getPaymentExpiresAt(order) {
  const expiresInSeconds = Number(order?.expiresInSeconds);
  if (Number.isFinite(expiresInSeconds)) {
    return Date.now() + Math.max(0, expiresInSeconds) * 1000;
  }
  return Date.now() + paymentCodeTtlSeconds * 1000;
}

export function paymentStatusText(status) {
  return (
    {
      CREATED: "已创建",
      QR_READY: "待扫码",
      WAITING_PAYMENT: "待支付",
      SCANNED: "已扫码",
      PAID: "已到账",
      CLOSED: "已关闭",
      CANCELED: "已取消",
      AMOUNT_MISMATCH: "异常",
    }[status] ||
    status ||
    "-"
  );
}

export function paymentResultInfo(status) {
  return (
    {
      PAID: {
        tone: "success",
        title: "支付成功",
        message: "积分已到账，资产余额已刷新",
        icon: CheckCircle2,
      },
      CLOSED: {
        tone: "cancel",
        title: "订单已关闭",
        message: "订单已关闭，未产生积分变动",
        icon: X,
      },
      CANCELED: {
        tone: "cancel",
        title: "已取消支付",
        message: "已关闭订单码弹窗，未确认支付结果",
        icon: X,
      },
      EXPIRED: {
        tone: "cancel",
        title: "订单码已过期",
        message: "订单码有效期已结束，请重新发起充值",
        icon: Timer,
      },
      AMOUNT_MISMATCH: {
        tone: "danger",
        title: "支付异常",
        message: "订单金额校验异常，请联系管理员处理",
        icon: CircleAlert,
      },
      REFUNDED: {
        tone: "cancel",
        title: "订单已退款",
        message: "订单已退款，积分变动以积分明细为准",
        icon: RefreshCcw,
      },
    }[status] || {
      tone: "danger",
      title: "支付失败",
      message: "暂未完成支付，请稍后在充值订单中确认状态",
      icon: CircleAlert,
    }
  );
}
