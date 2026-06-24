import React from "react";
import { CircleAlert, X } from "lucide-react";

export function isRechargeRequiredMessage(message) {
  return /积分不够|余额不足|请充值|Payment Required|402/i.test(
    String(message || ""),
  );
}

export function CreditAlertDialog({
  title = "操作没有成功",
  message = "积分不够，请充值",
  icon = <CircleAlert size={28} />,
  onClose,
  onRecharge,
}) {
  return (
    <div
      className="remove-bg-alert-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="credit-alert-title"
    >
      <button
        className="remove-bg-alert-backdrop"
        type="button"
        aria-label="关闭提醒"
        onClick={onClose}
      />
      <section className="remove-bg-alert-dialog">
        <button
          className="remove-bg-alert-close"
          type="button"
          aria-label="关闭提醒"
          onClick={onClose}
        >
          <X size={18} />
        </button>
        <span className="remove-bg-alert-icon" aria-hidden="true">
          {icon}
        </span>
        <div className="remove-bg-alert-copy">
          <strong id="credit-alert-title">{title}</strong>
          <p>{message}</p>
        </div>
        <div className="remove-bg-alert-actions">
          <button type="button" onClick={onClose}>
            关闭
          </button>
          <button type="button" className="is-primary" onClick={onRecharge}>
            去充值
          </button>
        </div>
      </section>
    </div>
  );
}
