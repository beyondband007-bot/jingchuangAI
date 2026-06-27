import React from "react";
import { Download, Loader2, LockKeyhole, RefreshCcw, Sparkles } from "lucide-react";

export function ActionBar({
  workflowStatus,
  canGenerate,
  isSubmitting,
  progress = 0,
  hasResult,
  privacyText,
  onGenerate,
  onRetry,
  onNewTask,
  resultUrl,
}) {
  return (
    <footer className="vgw-action-bar" data-status={workflowStatus}>
      <div className="vgw-action-bar__inner">
        {workflowStatus === "done" && hasResult ? (
          <>
            <a className="vgw-action-btn vgw-action-btn--secondary" href={resultUrl} download>
              <Download size={18} />
              下载视频
            </a>
            <button type="button" className="vgw-action-btn vgw-action-btn--ghost" onClick={onNewTask}>
              新任务
            </button>
            <button type="button" className="vgw-action-btn vgw-action-btn--primary" onClick={onRetry}>
              <RefreshCcw size={18} />
              再次生成
            </button>
          </>
        ) : workflowStatus === "failed" ? (
          <button type="button" className="vgw-action-btn vgw-action-btn--primary" onClick={onRetry}>
            <RefreshCcw size={18} />
            重试
          </button>
        ) : (
          <button
            type="button"
            className="vgw-action-btn vgw-action-btn--primary"
            onClick={onGenerate}
            disabled={!canGenerate}
          >
            {workflowStatus === "uploading" || isSubmitting ? (
              <Loader2 size={18} className="vgw-spin" />
            ) : (
              <Sparkles size={18} />
            )}
            {workflowStatus === "uploading"
              ? "上传中..."
              : workflowStatus === "processing" || workflowStatus === "rendering"
                ? `生成中 ${Math.round(progress)}%`
                : "开始生成"}
          </button>
        )}
      </div>
      {privacyText && (
        <p className="vgw-action-bar__privacy">
          <LockKeyhole size={14} />
          {privacyText}
        </p>
      )}
    </footer>
  );
}
