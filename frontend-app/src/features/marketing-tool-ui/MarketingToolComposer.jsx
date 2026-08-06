import React from "react";
import { Loader2 } from "lucide-react";

export function MarketingToolComposer({
  ariaLabel,
  className = "",
  tabs = [],
  activeTabId,
  onTabChange,
  tabsDisabled = false,
  upload,
  footerHint = "",
  footerStatus,
  footerExtra = null,
  actionIcon,
  actionLabel,
  onAction,
  actionDisabled = false,
  actionLoading = false,
}) {
  return (
    <div
      className={`marketing-composer marketing-composer--inline marketing-tool-card marketing-tool-composer ${className}`.trim()}
      aria-label={ariaLabel}
    >
      {tabs.length > 0 ? (
        <div
          className="marketing-composer__tabs marketing-tool-tabs marketing-tool-composer__tabs"
          aria-label={ariaLabel ? `${ariaLabel}类型切换` : undefined}
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={activeTabId === tab.id ? "is-active" : ""}
              disabled={tabsDisabled || tab.disabled}
              onClick={() => onTabChange?.(tab.id)}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      ) : null}

      <div className="marketing-composer__upload-wrap marketing-tool-composer__upload-wrap">
        {upload}
      </div>

      <div className="marketing-composer__footer marketing-tool-footer marketing-tool-composer__footer">
        {footerHint ? <span>{footerHint}</span> : null}
        <strong>{footerStatus}</strong>
        {footerExtra}
        <button
          className="ui-send-button"
          type="button"
          onClick={onAction}
          disabled={actionDisabled}
          aria-label={actionLabel}
        >
          {actionLoading ? <Loader2 size={18} className="is-spinning" /> : actionIcon}
        </button>
      </div>
    </div>
  );
}
