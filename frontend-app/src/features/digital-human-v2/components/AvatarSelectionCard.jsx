import React from "react";
import { Drama, History, Plus, Upload, UserRound } from "lucide-react";
import {
  getAvatarTags,
  isVideoCover,
} from "../utils";

export function AvatarSelectionCard({
  avatarSource,
  onAvatarSourceChange,
  selectedAvatar,
  onOpenCreate,
}) {
  const isMine = avatarSource === "mine";
  const cover = selectedAvatar?.cover;
  const isVideo = isVideoCover(cover);
  const tags = selectedAvatar ? getAvatarTags(selectedAvatar) : [];

  return (
    <section className="dhv2-card dhv2-avatar-card-panel" aria-label="选择形象">
      <header className="dhv2-card__head">
        <div>
          <h2>{isMine ? "上传正面人像照片" : "选择官方形象"}</h2>
          <p>
            {isMine
              ? "建议上传半身 / 全身正面照，数字人还原效果更好"
              : "官方形象已配置好音色，选择后即可使用"}
          </p>
        </div>
      </header>

      <div className="dhv2-segmented-tabs" role="tablist" aria-label="形象来源">
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

      {isMine && !selectedAvatar ? (
        <div className="dhv2-mine-actions">
          <button type="button" onClick={() => onOpenCreate?.("ai")}>
            <Plus size={15} />
            AI 定制
          </button>
          <button type="button" onClick={() => onOpenCreate?.("upload")}>
            <Upload size={15} />
            本地上传
          </button>
          <button type="button" onClick={() => onOpenCreate?.("history")}>
            <History size={15} />
            从历史作品选择
          </button>
        </div>
      ) : (
        <div className={`dhv2-avatar-preview ${selectedAvatar ? "has-avatar" : ""}`}>
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

              <div className="dhv2-avatar-preview__summary">
                <strong>{selectedAvatar.name}</strong>
                <div className="dhv2-avatar-preview__tags">
                  {tags.map((tag) => (
                    <span key={tag}>{tag}</span>
                  ))}
                </div>
              </div>

              {!isMine ? (
                <p className="dhv2-avatar-preview__official-hint">
                  选择形象后，可在下方配置系统音色
                </p>
              ) : null}
            </>
          ) : (
            <div className="dhv2-avatar-preview__placeholder">
              <Drama size={36} />
              <p>选择形象后，可在此配置配音及口型</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
