import React from "react";
import { Drama, History, Sparkles, Upload, UserRound } from "lucide-react";
import {
  isVideoCover,
} from "../utils";

export function AvatarSelectionCard({
  selectedAvatar,
  avatarSource = "official",
  onAvatarSourceChange,
  onCreateAvatar,
}) {
  const cover = selectedAvatar?.cover;
  const isVideo = isVideoCover(cover);
  const isMine = avatarSource === "mine";

  return (
    <section className="dhv2-card dhv2-avatar-card-panel" aria-label="选择形象">
      <header className="dhv2-card__head">
        <h2>{isMine ? "选择我的形象" : "选择官方形象"}</h2>
      </header>

      <div className="dhv2-segmented-tabs dhv2-avatar-source-tabs" role="tablist" aria-label="形象来源">
        <button
          type="button"
          role="tab"
          className={!isMine ? "is-active" : ""}
          aria-selected={!isMine}
          onClick={() => onAvatarSourceChange?.("official")}
        >
          官方形象
        </button>
        <button
          type="button"
          role="tab"
          className={isMine ? "is-active" : ""}
          aria-selected={isMine}
          onClick={() => onAvatarSourceChange?.("mine")}
        >
          我的形象
          <span className="dhv2-badge">AI 定制</span>
        </button>
      </div>

      <div className={`dhv2-avatar-preview ${selectedAvatar ? "has-avatar" : ""}${isMine ? " is-mine" : ""}`}>
        {selectedAvatar ? (
          <>
            <div className="dhv2-avatar-preview__media">
              {cover ? (
                isVideo ? (
                  <video
                    src={cover}
                    poster={selectedAvatar.poster || undefined}
                    muted
                    playsInline
                    controls
                  />
                ) : (
                  <img src={cover} alt={selectedAvatar.name} />
                )
              ) : (
                <div className="dhv2-avatar-preview__empty">
                  <UserRound size={40} />
                </div>
              )}
            </div>
          </>
        ) : isMine ? (
          <div className="dhv2-avatar-preview__mine-actions">
            <button type="button" onClick={() => onCreateAvatar?.("ai")}>
              <Sparkles size={14} />
              <span>AI 定制</span>
            </button>
            <button type="button" onClick={() => onCreateAvatar?.("upload")}>
              <Upload size={14} />
              <span>本地上传</span>
            </button>
            <button type="button" onClick={() => onCreateAvatar?.("history")}>
              <History size={14} />
              <span>从历史作品选择</span>
            </button>
          </div>
        ) : (
          <div className="dhv2-avatar-preview__placeholder">
            <Drama size={36} />
            <p>选择形象后，可在此配置配音及口型</p>
          </div>
        )}
      </div>
    </section>
  );
}
