import React from "react";
import { History } from "lucide-react";
import { WORKFLOW_STATUS_LABELS } from "../utils";

export function WorkflowHeader({
  eyebrow,
  title,
  description,
  workflowStatus,
  credits,
  onOpenHistory,
}) {
  const statusLabel = WORKFLOW_STATUS_LABELS[workflowStatus] || workflowStatus;

  return (
    <header className="vgw-header">
      <div className="vgw-header__copy">
        {eyebrow && <span className="vgw-header__eyebrow">{eyebrow}</span>}
        <div className="vgw-header__title-row">
          <h1>{title}</h1>
          <span className={`vgw-status-pill is-${workflowStatus}`}>{statusLabel}</span>
        </div>
        {description && <p>{description}</p>}
      </div>
      <div className="vgw-header__actions">
        {credits && <span className="vgw-credits">积分 {credits.balance}</span>}
        {onOpenHistory && (
          <button type="button" className="vgw-history-btn" onClick={onOpenHistory}>
            <History size={16} />
            历史
          </button>
        )}
      </div>
    </header>
  );
}
