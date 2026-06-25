import React, { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { CustomSelect } from "../../../components/CustomSelect";
import { AvatarCard } from "./AvatarCard";
import { AvatarConfirmOverlay } from "./AvatarConfirmOverlay";
import {
  ASPECT_RATIO_OPTIONS,
  FILL_MODE_OPTIONS,
  normalizePublicAvatars,
} from "../utils";

export function AvatarLibraryPanel({
  avatarSource,
  onAvatarSourceChange,
  avatars,
  selectedAvatar,
  voices,
  voiceId,
  onVoiceIdChange,
  aspectRatio,
  onAspectRatioChange,
  fillMode,
  onFillModeChange,
  onSelectAvatar,
  onConfirmAvatar,
  onClose,
  onCreateAvatar,
}) {
  const isMine = avatarSource === "mine";
  const [previewAvatar, setPreviewAvatar] = useState(null);
  const list = useMemo(() => {
    const source = isMine
      ? Array.isArray(avatars.mine) ? avatars.mine : []
      : normalizePublicAvatars(avatars.public);
    if (aspectRatio === "all") return source;
    return source.filter((item) => {
      const ratio = String(item.aspectRatio || item.ratio || "").trim();
      return !ratio || ratio === aspectRatio;
    });
  }, [aspectRatio, avatars.mine, avatars.public, isMine]);

  const countLabel = isMine ? "我的形象" : "官方形象";
  const isMineEmpty = isMine && !list.length;

  function handleSelect(avatar) {
    setPreviewAvatar(avatar);
  }

  return (
    <main className="dhv2-library" aria-label="形象库">
      <header className="dhv2-library__toolbar">
        <div className="dhv2-library__toolbar-left">
          <button
            type="button"
            className="dhv2-library__close"
            onClick={onClose}
            aria-label="关闭形象库"
          >
            <X size={22} />
          </button>
          <div className="dhv2-library__tabs" role="tablist" aria-label="形象库来源">
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
            </button>
          </div>
          <span className="dhv2-library__count">
            {countLabel}：共计 {list.length} 个
          </span>
        </div>
        <div className="dhv2-library__filters">
          <CustomSelect
            className="dhv2-filter-select custom-select-theme-dh"
            ariaLabel="画面比例"
            value={aspectRatio}
            onChange={onAspectRatioChange}
            options={ASPECT_RATIO_OPTIONS}
          />
          <CustomSelect
            className="dhv2-filter-select custom-select-theme-dh"
            ariaLabel="充满画面"
            value={fillMode}
            onChange={onFillModeChange}
            options={FILL_MODE_OPTIONS}
          />
        </div>
      </header>

      {isMine ? (
        <div className="dhv2-library__banner">
          上传本地图片或从历史作品导入，创建专属数字人形象
        </div>
      ) : null}

      {isMineEmpty ? (
        <div className="dhv2-library__mine-empty">
          <p>暂无形象，可上传人脸或 AI 生成专属 IP</p>
          <button type="button" onClick={() => onCreateAvatar?.("ai")}>
            <Plus size={15} />
            创建我的形象
          </button>
        </div>
      ) : (
        <div className={`dhv2-library__grid ${fillMode === "cover" ? "is-cover" : "is-contain"}`}>
          {isMine ? (
            <button
              type="button"
              className="dhv2-create-card"
              onClick={() => onCreateAvatar?.("ai")}
            >
              <Plus size={40} />
              <strong>创建我的形象</strong>
            </button>
          ) : null}
          {list.map((avatar) => (
            <AvatarCard
              key={avatar.id}
              avatar={avatar}
              selected={selectedAvatar?.id === avatar.id}
              onSelect={handleSelect}
            />
          ))}
          {!list.length && !isMine ? (
            <div className="dhv2-library__empty">暂无可用官方形象</div>
          ) : null}
        </div>
      )}

      {previewAvatar ? (
        <AvatarConfirmOverlay
          avatar={previewAvatar}
          voices={voices}
          voiceId={voiceId}
          onVoiceIdChange={onVoiceIdChange}
          onClose={() => setPreviewAvatar(null)}
          onConfirm={({ avatar, voiceId: nextVoiceId }) => {
            onVoiceIdChange?.(nextVoiceId);
            onSelectAvatar?.(avatar);
            onConfirmAvatar?.(avatar);
            setPreviewAvatar(null);
          }}
        />
      ) : null}
    </main>
  );
}
