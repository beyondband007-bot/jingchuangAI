import React from "react";
import { UserRound } from "lucide-react";
import "./DigitalHumanShowcaseCard.css";

function formatModeLabel(mode) {
  return mode === "audio" ? "音频驱动" : "文本驱动";
}

function getPosterPath(value) {
  const source = String(value || "").split(/[?#]/)[0];
  const match = source.match(/^(.+)\/([^/]+)\.(mp4|webm|mov)$/i);
  if (!match) return "";
  return `${match[1]}/posters/${match[2]}.jpg`;
}

export function DigitalHumanShowcaseCard({
  selectedAvatar,
  selectedAvatarIsVideo,
  driveMode,
  textLength,
  estimateMinutes,
  selectedVoiceName,
  selectedModelLabel,
  isSubmitting
}) {
  const title = selectedAvatar?.name || "待选择数字人模板";
  const description = selectedAvatar?.description || "从左侧挑选模板后，这里会同步展示当前数字人配置。";

  return (
    <section className="dh-showcase-card" aria-label="数字人展示卡片">
      <div className="dh-showcase-hero">
        <div className="dh-showcase-media">
          {selectedAvatar?.cover ? (
            selectedAvatarIsVideo ? (
              <video
                src={selectedAvatar.cover}
                poster={selectedAvatar.poster || getPosterPath(selectedAvatar.cover)}
                muted
                loop
                playsInline
                autoPlay
                preload="metadata"
              />
            ) : (
              <img src={selectedAvatar.cover} alt={title} />
            )
          ) : (
            <div className="dh-showcase-placeholder">
              <UserRound size={32} />
            </div>
          )}
        </div>
        <div className="dh-showcase-copy">
          <span className="dh-showcase-badge">{formatModeLabel(driveMode)}</span>
          <strong>{title}</strong>
          <p>{description}</p>
        </div>
      </div>

      <div className="dh-showcase-stats">
        <div>
          <span>音色</span>
          <strong>{selectedVoiceName || "待选择"}</strong>
        </div>
        <div>
          <span>模型</span>
          <strong>{selectedModelLabel || "待加载"}</strong>
        </div>
        <div>
          <span>时长估计</span>
          <strong>{estimateMinutes} 分钟</strong>
        </div>
      </div>

      <div className="dh-showcase-steps">
        <div className="is-active">
          <span>1</span>
          <div>
            <strong>选择模板</strong>
            <small>锁定数字人形象</small>
          </div>
        </div>
        <div className="is-active">
          <span>2</span>
          <div>
            <strong>编辑脚本</strong>
            <small>当前 {textLength} / 2000 字</small>
          </div>
        </div>
        <div className={isSubmitting ? "is-active" : ""}>
          <span>3</span>
          <div>
            <strong>生成视频</strong>
            <small>{isSubmitting ? "任务提交中" : "等待发起生成"}</small>
          </div>
        </div>
      </div>
    </section>
  );
}
