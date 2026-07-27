import { History } from "lucide-react";
import { formatBeijingDateTime } from "../../utils/time";
import { HistoryEmptyState } from "../../components/HistoryEmptyState";
import { transactionFilterOptions, txTypeMap } from "./assetMappers";

export function CreditTransactionsPanel({
  transactions,
  transactionsPage,
  transactionsTotalPages,
  transactionMeta,
  transactionFilter,
  isLoading,
  onFilterChange,
  onPageChange,
  timeFilterControl,
}) {
  return (
    <div className="fm-assets-transactions-view">
      <div className="fm-transaction-toolbar">
        <div className="fm-transaction-filters" aria-label="账单分类">
          {transactionFilterOptions.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={transactionFilter === value ? "is-active" : ""}
              onClick={() => onFilterChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {timeFilterControl}
      </div>
      {transactions.length ? (
        <>
          <div className="assets-transactions-table fm-transactions-table">
            <div className="assets-transactions-header">
              <span>时间</span>
              <span>类型</span>
              <span>变动</span>
              <span>余额</span>
              <span>备注</span>
            </div>
            {transactions.map((tx) => {
              const typeInfo = txTypeMap[tx.type] || {
                label: tx.type,
                color: "#64748b",
              };
              const isIncome = Number(tx.amount || 0) > 0;
              return (
                <div className="assets-transaction-row" key={tx.id}>
                  <span>{formatBeijingDateTime(tx.createdAt)}</span>
                  <span style={{ color: typeInfo.color }}>
                    {typeInfo.label}
                  </span>
                  <span
                    style={{
                      color: isIncome ? "#16a34a" : "#dc2626",
                      fontWeight: 500,
                    }}
                  >
                    {isIncome ? "+" : ""}
                    {tx.amount}
                  </span>
                  <span>{tx.balanceAfter}</span>
                  <span data-tooltip={tx.memo || ""}>{tx.memo || "-"}</span>
                </div>
              );
            })}
          </div>
          <div className="assets-pagination">
            <span>
              第 {transactionMeta.page || transactionsPage} / {transactionsTotalPages} 页 · 共 {transactionMeta.total || 0} 条
            </span>
            <div>
              <button
                type="button"
                onClick={() => onPageChange(Math.max(1, transactionsPage - 1))}
                disabled={transactionsPage <= 1 || isLoading}
              >
                上一页
              </button>
              <button
                type="button"
                onClick={() =>
                  onPageChange(
                    Math.min(transactionsTotalPages, transactionsPage + 1),
                  )
                }
                disabled={
                  transactionsPage >= transactionsTotalPages || isLoading
                }
              >
                下一页
              </button>
            </div>
          </div>
        </>
      ) : (
        <HistoryEmptyState
          className="fm-assets-empty-state"
          title={isLoading ? "正在加载明细" : "暂无积分明细"}
        />
      )}
    </div>
  );
}
