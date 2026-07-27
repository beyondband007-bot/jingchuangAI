import React from "react";

export function FeatureViewTabs({
  currentLabel,
  historyLabel = "历史记录",
  activeView,
  onHome,
  onHistory,
  className = "",
}) {
  const rootClass = ["feature-view-tabs", className].filter(Boolean).join(" ");

  return (
    <div className={rootClass} aria-label={`${currentLabel}页面切换`}>
      <button
        className={`ui-feature-title ${activeView === "home" ? "is-active" : ""}`.trim()}
        type="button"
        onClick={onHome}
      >
        {currentLabel}
      </button>
      <button
        className={`ui-feature-title ${activeView === "recent" ? "is-active" : ""}`.trim()}
        type="button"
        onClick={onHistory}
      >
        {historyLabel}
      </button>
    </div>
  );
}
