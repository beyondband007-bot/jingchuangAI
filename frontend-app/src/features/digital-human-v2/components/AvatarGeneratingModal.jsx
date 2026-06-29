import React, { useEffect, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";
import { digitalHumanApi } from "../../../api/digitalHumanApi";

const STAGE_LABELS = [
  "正在解析人设描述",
  "正在生成面部特征",
  "正在匹配五官风格",
  "正在合成形象细节",
];

export function AvatarGeneratingModal({ job, onClose, onRegenerate, onSave }) {
  const [progress, setProgress] = useState(12);
  const [stageIndex, setStageIndex] = useState(0);
  const [task, setTask] = useState(job || null);
  const [saving, setSaving] = useState(false);

  const status = task?.status || job?.status || "processing";
  const isReady = status === "preview_ready" || status === "saved";
  const isFailed = status === "failed";
  const imageUrl = task?.imageUrl || job?.imageUrl || "";

  useEffect(() => {
    setTask(job || null);
    setSaving(false);
    if (job?.progress) {
      setProgress(Math.max(12, Math.min(100, Number(job.progress) || 12)));
    }
  }, [job]);

  useEffect(() => {
    if (isReady || isFailed) return undefined;

    const progressTimer = window.setInterval(() => {
      setProgress((current) => {
        if (current >= 96) return current;
        const step = current < 60 ? 4 + Math.random() * 5 : 1 + Math.random() * 2;
        return Math.min(96, Math.round(current + step));
      });
    }, 900);

    const stageTimer = window.setInterval(() => {
      setStageIndex((current) => (current + 1) % STAGE_LABELS.length);
    }, 2600);

    return () => {
      window.clearInterval(progressTimer);
      window.clearInterval(stageTimer);
    };
  }, [isFailed, isReady]);

  useEffect(() => {
    if (!job?.id || isReady || isFailed) return undefined;
    let cancelled = false;

    async function poll() {
      try {
        const nextTask = await digitalHumanApi.getAiAvatarTask(job.id);
        if (cancelled) return;
        setTask((current) => ({ ...(current || job), ...nextTask }));
        if (nextTask?.progress) {
          setProgress((current) => Math.max(current, Math.min(100, Number(nextTask.progress) || current)));
        }
      } catch (error) {
        if (!cancelled) {
          setTask((current) => ({
            ...(current || job),
            status: "failed",
            error: error.message || "AI avatar generation failed",
          }));
        }
      }
    }

    poll();
    const timer = window.setInterval(poll, 3500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isFailed, isReady, job?.id]);

  async function handleSave() {
    if (!task?.id || saving) return;
    setSaving(true);
    try {
      await onSave?.(task);
    } finally {
      setSaving(false);
    }
  }

  function handleRegenerate() {
    if (saving) return;
    onRegenerate?.(job?.request || job);
  }

  if (!job) return null;

  return (
    <div
      className="dhv2-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="数字人形象生成中"
    >
      <div
        className="dhv2-modal dhv2-modal--generating"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="dhv2-modal__header">
          <div>
            <span>AI 定制</span>
            <strong>{isReady ? "AI 定制形象预览" : isFailed ? "AI 定制生成失败" : "正在生成数字人形象"}</strong>
          </div>
          <button type="button" className="dhv2-modal__close" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>

        <div className="dhv2-generating-modal__body">
          {isReady && imageUrl ? (
            <div className="dhv2-generating-modal__preview">
              <img src={imageUrl} alt="AI 定制形象预览" />
            </div>
          ) : (
            <div className="dhv2-generating-modal__visual" aria-hidden="true">
              <span className="dhv2-generating-modal__orbit">
                {isFailed ? <Sparkles size={34} /> : <Loader2 size={34} className="dhv2-spinner" />}
              </span>
              <Sparkles size={18} />
            </div>
          )}

          <div className="dhv2-generating-modal__meta">
            <strong>
              {isReady
                ? "满意后保存到我的形象"
                : isFailed
                  ? (task?.error || job.error || "生成失败，请重新生成")
                  : STAGE_LABELS[stageIndex]}
            </strong>
            <p>{job.request?.prompt || job.prompt}</p>
            <div className="dhv2-generating-modal__tags">
              <span>{job.gender}</span>
              <span>{job.age}</span>
              <span>{job.style}</span>
              <span>{job.ratio}</span>
            </div>
          </div>

          {!isReady ? (
            <div className="dhv2-generating-modal__progress">
              <div className="dhv2-generating-modal__progress-bar">
                <i style={{ width: `${progress}%` }} />
              </div>
              <div className="dhv2-generating-modal__progress-meta">
                <span>{progress}%</span>
                <span>{isFailed ? "可重新生成" : "预计还需 1-2 分钟"}</span>
              </div>
            </div>
          ) : null}

          {isReady || isFailed ? (
            <div className="dhv2-generating-modal__actions">
              <button type="button" className="dhv2-button-secondary" onClick={handleRegenerate} disabled={saving}>
                重新生成
              </button>
              {isReady ? (
                <button type="button" className="dhv2-button-primary" onClick={handleSave} disabled={saving}>
                  {saving ? <Loader2 size={16} className="dhv2-spinner" /> : null}
                  保存形象
                </button>
              ) : null}
            </div>
          ) : (
            <p className="dhv2-generating-modal__hint">形象生成中，请保持页面打开</p>
          )}
        </div>
      </div>
    </div>
  );
}
