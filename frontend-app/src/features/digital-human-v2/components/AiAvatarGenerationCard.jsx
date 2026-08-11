import React from "react";
import { Loader2, RefreshCcw, Sparkles } from "lucide-react";

export function AiAvatarGenerationCard({ job, onRetry }) {
  if (!job) return null;

  const status = String(job.status || "processing");
  const isFailed = status === "failed" || status === "save_failed";
  const isSaving = status === "saving";
  const progress = Math.max(1, Math.min(100, Number(job.progress) || 12));
  const failureText = status === "save_failed" ? "自动保存失败" : "生成失败";

  return (
    <article
      className={`dhv2-ai-generation-card${isFailed ? " is-failed" : ""}`}
      aria-label={isFailed ? `AI 定制形象${failureText}` : "AI 定制形象正在生成"}
    >
      <div className="dhv2-ai-generation-card__visual" aria-hidden="true">
        <span className="dhv2-ai-generation-card__icon">
          {isFailed ? (
            <Sparkles size={24} />
          ) : (
            <Loader2 size={24} className="dhv2-spinner" />
          )}
        </span>
        {!isFailed ? (
          <span className="dhv2-ai-generation-card__progress">
            <i style={{ width: `${progress}%` }} />
          </span>
        ) : null}
      </div>
      <div className="dhv2-ai-generation-card__meta">
        <strong>{isFailed ? failureText : isSaving ? "正在自动保存" : "正在生成"}</strong>
        <span>
          {isFailed
            ? job.error || "请稍后重试"
            : isSaving
              ? "完成后将出现在我的形象"
              : `${progress}% · 完成后自动保存`}
        </span>
        {isFailed ? (
          <button type="button" onClick={() => onRetry?.(job)}>
            <RefreshCcw size={13} />
            重新尝试
          </button>
        ) : null}
      </div>
    </article>
  );
}
