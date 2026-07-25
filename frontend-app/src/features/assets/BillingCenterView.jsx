import { FileText, History, Loader2, Wallet, X } from "lucide-react";
import { formatBeijingDateTime } from "../../utils/time";
import { HistoryEmptyState } from "../../components/HistoryEmptyState";
import { CreditTransactionsPanel } from "./CreditTransactionsPanel";
import { txTypeMap } from "./assetMappers";
import {
  formatPaymentCountdown,
  paymentProviderOptions,
  paymentProviderOrderTitle,
  paymentProviderText,
  paymentStatusText,
  rechargePresets,
} from "./paymentUtils";

export function BillingCenterView({
  isGuest,
  authUser,
  credits,
  amount,
  points,
  activePreset,
  paymentProvider,
  error,
  isCreating,
  recentRechargeOrders,
  latestTransaction,
  showTransactionsModal,
  transactionsPage,
  transactionsTotalPages,
  transactionMeta,
  transactionFilter,
  visibleTransactions,
  isLoading,
  assetTimeFilterControl,
  paymentDialog,
  paymentCountdown,
  paymentResultDialog,
  paymentResultCountdown,
  onOpenAuth,
  onSelectPreset,
  onUpdateAmount,
  onPaymentProviderChange,
  onCreateOrder,
  onShowTransactionsModalChange,
  onTransactionFilterChange,
  onTransactionsPageChange,
  onShowPaymentResult,
  onPaymentResultDialogChange,
}) {
  const displayBalance = Number(
    credits?.balance ?? authUser?.credits ?? 0,
  ).toLocaleString("zh-CN");
  const latestTypeInfo = latestTransaction
    ? txTypeMap[latestTransaction.type] || {
        label: latestTransaction.type,
        color: "#64748b",
      }
    : null;
  const latestIsIncome = latestTransaction
    ? Number(latestTransaction.amount || 0) > 0
    : false;
  const latestDescription = latestTransaction
    ? (() => {
        const memo = String(latestTransaction.memo || "").trim();
        const label = latestTypeInfo?.label || "";
        if (memo && label && !memo.includes(label)) {
          return `${label} · ${memo}`;
        }
        return memo || label || "积分变动";
      })()
    : "";
  const latestTimeLabel = latestTransaction
    ? formatBeijingDateTime(latestTransaction.createdAt)
    : "";

  return (
    <section className="assets-view-root fm-profile-billing-view">
      {isGuest ? (
        <div className="assets-login-panel">
          <Wallet size={32} />
          <strong>登录后进行积分充值</strong>
          <p>登录后可查看积分余额、充值记录和消费明细</p>
          <button type="button" onClick={() => onOpenAuth("login")}>
            登录
          </button>
        </div>
      ) : (
        <>
          <div className="assets-balance-hero fm-billing-balance-hero">
            <div className="assets-balance-info">
              <span>可用积分</span>
              <strong>{displayBalance}</strong>
              <small>1 元 = 100 积分</small>
            </div>
            <div className="assets-balance-actions">
              <button
                type="button"
                onClick={() => onShowTransactionsModalChange(true)}
              >
                <History size={18} />
                积分明细
              </button>
            </div>
          </div>

          <div className="fm-billing-workspace">
            <div
              className="fm-billing-recharge-card"
              id="fm-billing-recharge"
            >
              <div className="assets-section-title">
                <Wallet size={18} />
                <strong>在线充值</strong>
              </div>
              <div className="assets-presets">
                {rechargePresets.map((value) => (
                  <button
                    className={activePreset === value ? "is-active" : ""}
                    key={value}
                    type="button"
                    onClick={() => onSelectPreset(value)}
                  >
                    <span>{value} 元</span>
                    <small>{value * 100} 积分</small>
                  </button>
                ))}
              </div>
              <div className="fm-billing-pay-row">
                <label className="assets-custom-amount fm-billing-custom-field">
                  <span>自定义金额</span>
                  <div className="fm-billing-custom-control">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={amount}
                      onChange={(event) => onUpdateAmount(event.target.value)}
                    />
                    <em>{points} 积分</em>
                  </div>
                </label>
                <div className="assets-payment-method-row fm-billing-payment-field">
                  <span>支付方式</span>
                  <div
                    className="assets-payment-methods"
                    aria-label="选择支付方式"
                  >
                    {paymentProviderOptions.map((option) => {
                      const PaymentIcon = option.icon;
                      return (
                        <button
                          className={
                            paymentProvider === option.value ? "is-active" : ""
                          }
                          key={option.value}
                          type="button"
                          onClick={() => onPaymentProviderChange(option.value)}
                        >
                          <PaymentIcon />
                          <span>{option.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
              {error && <div className="assets-error">{error}</div>}
              <button
                className="assets-primary-action"
                type="button"
                onClick={onCreateOrder}
                disabled={isCreating}
              >
                {isCreating ? (
                  <Loader2 size={18} className="is-spinning" />
                ) : (
                  <Wallet size={18} />
                )}
                <span>立即支付</span>
              </button>
            </div>

            <div className="fm-billing-side">
              <div className="fm-billing-side-card fm-billing-records-card">
                <div className="assets-section-title">
                  <History size={18} />
                  <strong>最近支出</strong>
                </div>
                {latestTransaction ? (
                  <button
                    className="fm-billing-latest-tx"
                    type="button"
                    onClick={() => onShowTransactionsModalChange(true)}
                  >
                    <div className="fm-billing-latest-main">
                      <div className="fm-billing-latest-head">
                        <span
                          className="fm-billing-latest-type"
                          style={{ color: latestTypeInfo?.color }}
                        >
                          {latestTypeInfo?.label}
                        </span>
                        <strong>{latestDescription}</strong>
                      </div>
                      <small>{latestTimeLabel}</small>
                    </div>
                    <em
                      className="fm-billing-latest-amount"
                      style={{
                        color: latestIsIncome ? "#16a34a" : "#dc2626",
                      }}
                    >
                      {latestIsIncome ? "+" : ""}
                      {latestTransaction.amount} 积分
                    </em>
                  </button>
                ) : (
                  <HistoryEmptyState compact borderless title="暂无积分明细" />
                )}
                <button
                  className="fm-billing-side-link"
                  type="button"
                  onClick={() => onShowTransactionsModalChange(true)}
                >
                  查看全部积分明细
                </button>
              </div>

              <div className="fm-billing-side-card fm-billing-orders-card">
                <div className="assets-section-title">
                  <FileText size={18} />
                  <strong>近期充值订单</strong>
                </div>
                <div className="assets-order-list">
                  {recentRechargeOrders.length ? (
                    recentRechargeOrders.map((order) => (
                      <div
                        className={`assets-order-row status-${order.status}`}
                        key={order.outTradeNo}
                      >
                        <div>
                          <strong>{order.totalAmount} 元</strong>
                          <span>
                            {paymentProviderText(order.provider)} ·{" "}
                            {order.outTradeNo}
                          </span>
                        </div>
                        <div>
                          <strong>{order.points} 积分</strong>
                          <span>{paymentStatusText(order.status)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <HistoryEmptyState compact borderless title="近一个月暂无充值订单" />
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showTransactionsModal && (
        <div
          className="fm-transactions-modal-backdrop"
          role="presentation"
          onClick={() => onShowTransactionsModalChange(false)}
        >
          <div
            className="fm-transactions-modal"
            role="dialog"
            aria-modal="true"
            aria-label="积分明细"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="fm-transactions-modal-head">
              <div>
                <strong>积分明细</strong>
                <span>积分流水明细</span>
              </div>
              <button
                className="assets-dialog-close"
                type="button"
                onClick={() => onShowTransactionsModalChange(false)}
                aria-label="关闭"
              >
                <X size={18} />
              </button>
            </div>
            <CreditTransactionsPanel
              transactions={visibleTransactions}
              transactionsPage={transactionsPage}
              transactionsTotalPages={transactionsTotalPages}
              transactionMeta={transactionMeta}
              transactionFilter={transactionFilter}
              isLoading={isLoading}
              onFilterChange={onTransactionFilterChange}
              onPageChange={onTransactionsPageChange}
              timeFilterControl={assetTimeFilterControl}
            />
          </div>
        </div>
      )}

      {paymentDialog && (
        <div
          className="assets-payment-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`${paymentProviderText(paymentDialog.order?.provider || paymentDialog.provider)}二维码`}
        >
          <div className="assets-payment-dialog">
            <button
              className="assets-dialog-close"
              type="button"
              onClick={() => onShowPaymentResult(paymentDialog.order, "CANCELED")}
              aria-label="关闭"
            >
              <X size={18} />
            </button>
            <div className="assets-payment-dialog-head">
              <span>
                {paymentProviderText(
                  paymentDialog.order?.provider || paymentDialog.provider,
                )}
              </span>
              <strong>
                {paymentDialog.order?.status === "PAID"
                  ? "充值成功"
                  : paymentProviderOrderTitle(
                      paymentDialog.order?.provider || paymentDialog.provider,
                    )}
              </strong>
            </div>
            <div className="assets-qr-box">
              {paymentDialog.qrCodeDataUrl ? (
                <img
                  src={paymentDialog.qrCodeDataUrl}
                  alt={`${paymentProviderText(paymentDialog.order?.provider || paymentDialog.provider)}充值二维码`}
                />
              ) : (
                <Loader2 size={28} className="is-spinning" />
              )}
            </div>
            <div className="assets-dialog-meta-card">
              <span>订单号</span>
              <strong>{paymentDialog.order?.outTradeNo}</strong>
              <span>支付金额</span>
              <em>
                ¥ {Number(paymentDialog.order?.totalAmount || 0).toFixed(0)}
              </em>
              <span>到账积分</span>
              <strong>
                {Number(paymentDialog.order?.points || 0).toLocaleString(
                  "zh-CN",
                )}{" "}
                积分
              </strong>
            </div>
            <div className="assets-dialog-countdown">
              <span>订单码有效期</span>
              <strong>{formatPaymentCountdown(paymentCountdown)}</strong>
            </div>
            {paymentDialog.error && (
              <div className="assets-error">{paymentDialog.error}</div>
            )}
          </div>
        </div>
      )}

      {paymentResultDialog && (
        <div
          className="assets-payment-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={paymentResultDialog.title}
        >
          <div
            className={`assets-payment-result-dialog tone-${paymentResultDialog.tone}`}
          >
            <button
              className="assets-dialog-close"
              type="button"
              onClick={() => onPaymentResultDialogChange(null)}
              aria-label="关闭"
            >
              <X size={18} />
            </button>
            <div className="assets-payment-dialog-head">
              <span>
                {paymentProviderText(
                  paymentResultDialog.order?.provider || paymentProvider,
                )}
              </span>
              <strong>{paymentResultDialog.title}</strong>
            </div>
            <p className="assets-result-message">{paymentResultDialog.message}</p>
            {paymentResultDialog.order?.outTradeNo && (
              <div className="assets-dialog-meta-card">
                <span>订单号</span>
                <strong>{paymentResultDialog.order.outTradeNo}</strong>
                <span>支付金额</span>
                <em>
                  ¥{" "}
                  {Number(paymentResultDialog.order.totalAmount || 0).toFixed(
                    0,
                  )}
                </em>
                <span>订单状态</span>
                <strong>{paymentStatusText(paymentResultDialog.status)}</strong>
              </div>
            )}
            <div className="assets-dialog-countdown">
              <span>弹窗自动关闭</span>
              <strong>{paymentResultCountdown}s</strong>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
