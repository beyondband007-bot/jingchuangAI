import React, { useMemo, useState } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import { CustomSelect } from "../../../components/CustomSelect";
import { AvatarCard } from "./AvatarCard";
import { AvatarConfirmOverlay } from "./AvatarConfirmOverlay";
import {
  ASPECT_RATIO_OPTIONS,
  FILL_MODE_OPTIONS,
  getDigitalHumanMineLibraryItems,
  normalizePublicAvatars,
} from "../utils";

export function AvatarLibraryPanel({
  avatars,
  tasks = [],
  selectedAvatar,
  selectedMineLibraryId,
  avatarSource = "official",
  onAvatarSourceChange,
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
  onSelectMineItem,
  onConfirmAvatar,
  onCreateAvatar,
  onClose,
}) {
  const [previewAvatar, setPreviewAvatar] = useState(null);
  const isMine = avatarSource === "mine";
  const officialList = useMemo(() => {
    const source = normalizePublicAvatars(avatars.public);
    if (aspectRatio === "all") return source;
    return source.filter((item) => {
      const ratio = String(item.aspectRatio || item.ratio || "").trim();
      return !ratio || ratio === aspectRatio;
    });
  }, [aspectRatio, avatars.public]);
  const mineList = useMemo(
    () => getDigitalHumanMineLibraryItems(tasks, avatars.mine),
    [avatars.mine, tasks],
  );
  const list = isMine ? mineList : officialList;

  function handleSelect(item) {
    if (isMine) {
      onSelectMineItem?.(item);
      return;
    }
    setPreviewAvatar(item);
  }

  return (
    <main className={`dhv2-library${isMine ? " dhv2-library--mine" : ""}`} aria-label="形象库">
      <header className="dhv2-library__toolbar">
        <div className="dhv2-library__toolbar-left">
          {onClose ? (
            <button type="button" className="dhv2-library__close" onClick={onClose} aria-label="关闭形象库">
              <X size={20} />
            </button>
          ) : null}
          <div className="dhv2-library__tabs" role="tablist" aria-label="形象来源">
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
            {isMine ? `我的形象：共计 ${mineList.length} 个` : `官方形象：共计 ${officialList.length} 个`}
          </span>
        </div>
        {!isMine ? (
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
              ariaLabel="填充方式"
              value={fillMode}
              onChange={onFillModeChange}
              options={FILL_MODE_OPTIONS}
            />
          </div>
        ) : (
          <div className="dhv2-library__filters">
            <button type="button" className="dhv2-mine-create-btn" onClick={() => onCreateAvatar?.("upload")}>
              <Plus size={15} />
              上传形象
            </button>
            <button type="button" className="dhv2-mine-create-btn is-primary" onClick={() => onCreateAvatar?.("ai")}>
              <Sparkles size={15} />
              AI 定制
            </button>
          </div>
        )}
      </header>

      {isMine ? (
        <div className="dhv2-library__banner">
          上传本地图或从历史作品导入，创建专属数字人形象
        </div>
      ) : null}

      <div
        className={`dhv2-library__grid ${isMine ? "dhv2-library__grid--mine" : ""} ${
          fillMode === "cover" ? "is-cover" : "is-contain"
        }`}
      >
        {isMine ? (
          <button type="button" className="dhv2-create-card dhv2-create-card--mine" onClick={() => onCreateAvatar?.("ai")}>
            <Plus size={24} />
            <span>创建我的形象</span>
          </button>
        ) : null}

        {list.map((item) => (
          <AvatarCard
            key={item.libraryId || item.id}
            avatar={item}
            selected={isMine ? selectedMineLibraryId === item.libraryId : selectedAvatar?.id === item.id}
            onSelect={handleSelect}
            variant={isMine ? "mine" : "default"}
            showPlayIcon={isMine && Boolean(item.resultUrl)}
          />
        ))}
        {!list.length && !isMine ? (
          <div className="dhv2-library__empty">暂无可用官方形象</div>
        ) : null}
        {!list.length && isMine ? (
          <div className="dhv2-library__mine-empty">
            <p>暂无我的形象，可上传照片或使用 AI 定制创建</p>
          </div>
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
