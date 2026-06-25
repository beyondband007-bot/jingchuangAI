import React, { useEffect, useState } from "react";
import { Loader2, Sparkles, X } from "lucide-react";

const STAGE_LABELS = [
  "正在解析人设描述",
  "正在生成面部特征",
  "正在匹配五官风格",
  "正在合成形象细节",
];

export function AvatarGeneratingModal({ job, onClose }) {
  const [progress, setProgress] = useState(12);
  const [stageIndex, setStageIndex] = useState(0);

  useEffect(() => {
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
  }, []);

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
            <strong>正在生成数字人形象</strong>
          </div>
          <button type="button" className="dhv2-modal__close" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </header>

        <div className="dhv2-generating-modal__body">
          <div className="dhv2-generating-modal__visual" aria-hidden="true">
            <span className="dhv2-generating-modal__orbit">
              <Loader2 size={34} className="dhv2-spinner" />
            </span>
            <Sparkles size={18} />
          </div>

          <div className="dhv2-generating-modal__meta">
            <strong>{STAGE_LABELS[stageIndex]}</strong>
            <p>{job.prompt}</p>
            <div className="dhv2-generating-modal__tags">
              <span>{job.gender}</span>
              <span>{job.age}</span>
              <span>{job.style}</span>
              <span>{job.ratio}</span>
            </div>
          </div>

          <div className="dhv2-generating-modal__progress">
            <div className="dhv2-generating-modal__progress-bar">
              <i style={{ width: `${progress}%` }} />
            </div>
            <div className="dhv2-generating-modal__progress-meta">
              <span>{progress}%</span>
              <span>预计还需 1-2 分钟</span>
            </div>
          </div>

          <p className="dhv2-generating-modal__hint">形象生成中，请保持页面打开</p>
        </div>
      </div>
    </div>
  );
}
