import React from "react";
import { FeedbackState } from "./FeedbackState";

/** Shared empty state for result and history views. */
export function HistoryEmptyState({
  title,
  className = "",
  fill = false,
  compact = false,
  borderless = false,
}) {
  const variantClasses = [
    "ui-history-empty",
    fill && "ui-history-empty--fill",
    compact && "ui-history-empty--compact",
    borderless && "ui-history-empty--borderless",
    className,
  ].filter(Boolean).join(" ");

  return (
    <FeedbackState
      className={variantClasses}
      title={title}
    />
  );
}
