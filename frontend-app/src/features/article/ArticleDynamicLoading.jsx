import React from "react";
import { Loader2 } from "lucide-react";

export function ArticleDynamicLoading({
  title = "正在生成中",
  description,
  spinnerSize = 48,
}) {
  return (
    <div
      className="article-result-empty article-dynamic-loading"
      aria-live="polite"
      aria-busy="true"
    >
      <Loader2 size={spinnerSize} className="article-dynamic-loading__spinner" />
      <h2>{title}</h2>
      {description ? <p>{description}</p> : null}
    </div>
  );
}
