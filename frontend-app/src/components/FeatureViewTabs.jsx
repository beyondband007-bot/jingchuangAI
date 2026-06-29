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
        className={activeView === "home" ? "is-active" : ""}
        type="button"
        onClick={onHome}
      >
        {currentLabel}
      </button>
      <button
        className={activeView === "recent" ? "is-active" : ""}
        type="button"
        onClick={onHistory}
      >
        {historyLabel}
      </button>
    </div>
  );
}
