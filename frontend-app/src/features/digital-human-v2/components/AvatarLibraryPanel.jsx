import React, { useMemo, useState } from "react";
import { CustomSelect } from "../../../components/CustomSelect";
import { AvatarCard } from "./AvatarCard";
import { AvatarConfirmOverlay } from "./AvatarConfirmOverlay";
import {
  ASPECT_RATIO_OPTIONS,
  FILL_MODE_OPTIONS,
  normalizePublicAvatars,
} from "../utils";

export function AvatarLibraryPanel({
  avatars,
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
}) {
  const [previewAvatar, setPreviewAvatar] = useState(null);
  const list = useMemo(() => {
    const source = normalizePublicAvatars(avatars.public);
    if (aspectRatio === "all") return source;
    return source.filter((item) => {
      const ratio = String(item.aspectRatio || item.ratio || "").trim();
      return !ratio || ratio === aspectRatio;
    });
  }, [aspectRatio, avatars.public]);

  function handleSelect(item) {
    setPreviewAvatar(item);
  }

  return (
    <main className="dhv2-library" aria-label="形象库">
      <header className="dhv2-library__toolbar">
        <div className="dhv2-library__toolbar-left">
          <span className="dhv2-library__count">官方形象：共计 {list.length} 个</span>
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

      <div
        className={`dhv2-library__grid ${
          fillMode === "cover" ? "is-cover" : "is-contain"
        }`}
      >
        {list.map((item) => (
          <AvatarCard
            key={item.libraryId || item.id}
            avatar={item}
            selected={selectedAvatar?.id === item.id}
            onSelect={handleSelect}
          />
        ))}
        {!list.length ? (
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
