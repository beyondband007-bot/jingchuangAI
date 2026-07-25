import React, { useEffect, useMemo, useState } from "react";
import { Plus, Sparkles, X } from "lucide-react";
import { CustomSelect } from "../../../components/CustomSelect";
import { HistoryEmptyState } from "../../../components/HistoryEmptyState";
import { AvatarCard } from "./AvatarCard";
import { AvatarConfirmOverlay } from "./AvatarConfirmOverlay";
import { VoiceAudioLibraryPanel } from "./VoiceAudioLibraryPanel";
import {
  ASPECT_RATIO_OPTIONS,
  FILL_MODE_OPTIONS,
  getDigitalHumanMineLibraryItems,
  normalizePublicAvatars,
} from "../utils";

export function AvatarLibraryPanel({
  avatars,
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
  onVoiceSaved,
  refreshCredits,
  onClose,
}) {
  const [previewAvatar, setPreviewAvatar] = useState(null);
  const [activeTab, setActiveTab] = useState(avatarSource === "mine" ? "mine" : "official");
  const isMine = activeTab === "mine";
  const isAudio = activeTab === "audio";
  const officialList = useMemo(() => {
    const source = normalizePublicAvatars(avatars.public);
    if (aspectRatio === "all") return source;
    return source.filter((item) => {
      const ratio = String(item.aspectRatio || item.ratio || "").trim();
      return !ratio || ratio === aspectRatio;
    });
  }, [aspectRatio, avatars.public]);
  const mineList = useMemo(
    () => getDigitalHumanMineLibraryItems(avatars.mine),
    [avatars.mine],
  );
  const list = isMine ? mineList : officialList;
  const clonedVoiceCount = voices.filter((voice) => voice.source === "voice-clone").length;

  useEffect(() => {
    if (avatarSource === "official" || avatarSource === "mine") {
      setActiveTab(avatarSource);
    }
  }, [avatarSource]);

  function switchAvatarTab(nextSource) {
    setActiveTab(nextSource);
    onAvatarSourceChange?.(nextSource);
  }

  function handleSelect(item) {
    if (isMine) {
      onSelectMineItem?.(item);
      return;
    }
    setPreviewAvatar(item);
  }

  return (
    <main className={`dhv2-library${isMine || isAudio ? " dhv2-library--mine" : ""}`} aria-label="形象库">
      <header className="dhv2-library__toolbar">
        <div className="dhv2-library__toolbar-left">
          {onClose ? (
            <button type="button" className="dhv2-library__close" onClick={onClose} aria-label="关闭形象库">
              <X size={20} />
            </button>
          ) : null}
          <div className="dhv2-library__tabs" role="tablist" aria-label="资源来源">
            <button
              type="button"
              role="tab"
              className={activeTab === "official" ? "is-active" : ""}
              aria-selected={activeTab === "official"}
              onClick={() => switchAvatarTab("official")}
            >
              官方形象
            </button>
            <button
              type="button"
              role="tab"
              className={activeTab === "mine" ? "is-active" : ""}
              aria-selected={activeTab === "mine"}
              onClick={() => switchAvatarTab("mine")}
            >
              我的形象
            </button>
            <button
              type="button"
              role="tab"
              className={isAudio ? "is-active" : ""}
              aria-selected={isAudio}
              onClick={() => setActiveTab("audio")}
            >
              我的音色
            </button>
          </div>
          <span className="dhv2-library__count">
            {isAudio
              ? `我的音色：共计 ${clonedVoiceCount} 个`
              : isMine
                ? `我的形象：共计 ${mineList.length} 个`
                : `官方形象：共计 ${officialList.length} 个`}
          </span>
        </div>
        {!isMine && !isAudio ? (
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
        ) : isMine ? (
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
        ) : null}
      </header>

      {isMine ? (
        <div className="dhv2-library__banner">
          使用 AI 定制创建专属数字人形象，生成后会展示在这里
        </div>
      ) : null}

      {isAudio ? (
        <div className="dhv2-library__banner">
          上传参考音频后需确认解析，解析将消耗 2000 积分；完成后会保存到我的音色，可在左侧配音内容里复用。
        </div>
      ) : null}

      {isAudio ? (
        <VoiceAudioLibraryPanel
          voices={voices}
          voiceId={voiceId}
          onVoiceIdChange={onVoiceIdChange}
          onVoiceSaved={onVoiceSaved}
          refreshCredits={refreshCredits}
        />
      ) : (
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
            <HistoryEmptyState
              className="dhv2-library__empty"
              title="暂无可用官方形象"
              compact
              borderless
            />
          ) : null}
          {!list.length && isMine ? (
            <HistoryEmptyState
              className="dhv2-library__mine-empty"
              title="暂无我的形象"
              compact
              borderless
            />
          ) : null}
        </div>
      )}

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
