import React, { useMemo, useState } from "react";
import { Plus, X } from "lucide-react";
import { CustomSelect } from "../../../components/CustomSelect";
import { AvatarCard } from "./AvatarCard";
import { AvatarConfirmOverlay } from "./AvatarConfirmOverlay";
import {
  ASPECT_RATIO_OPTIONS,
  FILL_MODE_OPTIONS,
  getDigitalHumanMineLibraryItems,
  getMineLibraryItems,
  normalizePublicAvatars,
} from "../utils";

export function AvatarLibraryPanel({
  avatarSource,
  onAvatarSourceChange,
  avatars,
  tasks = [],
  photoTasks = [],
  selectedMineLibraryId,
  onSelectMineItem,
  selectedAvatar,
  voices,
  voiceId,
  onVoiceIdChange,
  voiceSpeed,
  onVoiceSpeedChange,
  voiceEmotion,
  onVoiceEmotionChange,
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
    if (isMine) {
      return [
        ...getDigitalHumanMineLibraryItems(tasks, avatars.mine),
        ...getMineLibraryItems(photoTasks),
      ];
    }
    const source = normalizePublicAvatars(avatars.public);
    if (aspectRatio === "all") return source;
    return source.filter((item) => {
      const ratio = String(item.aspectRatio || item.ratio || "").trim();
      return !ratio || ratio === aspectRatio;
    });
  }, [aspectRatio, avatars.mine, avatars.public, isMine, photoTasks, tasks]);

  const countLabel = isMine ? "我的形象" : "官方形象";

  function handleSelect(item) {
    if (isMine) {
      onSelectMineItem?.(item);
      return;
    }
    setPreviewAvatar(item);
  }

  return (
    <main
      className={`dhv2-library${isMine ? " dhv2-library--mine" : ""}`}
      aria-label="形象库"
    >
      {isMine ? (
        <header className="dhv2-library__mine-head">
          <h2>形象库</h2>
          <div className="dhv2-library__tabs dhv2-library__tabs--underline" role="tablist">
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
        </header>
      ) : (
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
      )}

      <div
        className={`dhv2-library__grid ${
          isMine ? "dhv2-library__grid--mine" : fillMode === "cover" ? "is-cover" : "is-contain"
        }`}
      >
        {isMine ? (
          <button
            type="button"
            className="dhv2-create-card dhv2-create-card--mine"
            onClick={() => onCreateAvatar?.("ai")}
          >
            <Plus size={36} />
            <span>创建我的形象</span>
          </button>
        ) : null}
        {list.map((item) => (
          <AvatarCard
            key={item.libraryId || item.id}
            avatar={item}
            selected={
              isMine
                ? selectedMineLibraryId === item.libraryId
                : selectedAvatar?.id === item.id
            }
            variant={isMine ? "mine" : "default"}
            showPlayIcon={
              isMine &&
              (item.sourceType === "photo-task" || item.sourceType === "task") &&
              Boolean(item.resultUrl)
            }
            onSelect={handleSelect}
          />
        ))}
        {!list.length && !isMine ? (
          <div className="dhv2-library__empty">暂无可用官方形象</div>
        ) : null}
      </div>

      {previewAvatar ? (
        <AvatarConfirmOverlay
          avatar={previewAvatar}
          voices={voices}
          voiceId={voiceId}
          onVoiceIdChange={onVoiceIdChange}
          voiceSpeed={voiceSpeed}
          onVoiceSpeedChange={onVoiceSpeedChange}
          voiceEmotion={voiceEmotion}
          onVoiceEmotionChange={onVoiceEmotionChange}
          onClose={() => setPreviewAvatar(null)}
          onConfirm={({ avatar, voiceId: nextVoiceId, speed, emotion }) => {
            onVoiceIdChange?.(nextVoiceId);
            onVoiceSpeedChange?.(speed);
            onVoiceEmotionChange?.(emotion);
            onSelectAvatar?.(avatar);
            onConfirmAvatar?.(avatar);
            setPreviewAvatar(null);
          }}
        />
      ) : null}
    </main>
  );
}
