import React from "react";
import { SystemVoiceCard } from "./SystemVoiceCard";

export const VOICE_DUBBING_MODES = {
  system: "system",
  clone: "clone",
};

export function VoiceDubbingModeCard({
  voiceMode,
  onVoiceModeChange,
  showCloneTab = true,
  selectedAvatar,
  voices,
  voiceId,
  onVoiceIdChange,
  voiceSpeed,
  onVoiceSpeedChange,
  voiceEmotion,
  onVoiceEmotionChange,
}) {
  const isClone = showCloneTab && voiceMode === VOICE_DUBBING_MODES.clone;

  return (
    <section className="dhv2-card dhv2-voice-mode-card" aria-label="配音选型">
      {showCloneTab ? (
        <header className="dhv2-card__head">
          <h2>配音选型</h2>
          <p>选择系统音色，或上传参考音频进行音色克隆</p>
        </header>
      ) : null}

      {showCloneTab ? (
        <div className="dhv2-segmented-tabs dhv2-voice-mode-tabs" role="tablist" aria-label="配音方式">
          <button
            type="button"
            role="tab"
            className={!isClone ? "is-active" : ""}
            aria-selected={!isClone}
            onClick={() => onVoiceModeChange?.(VOICE_DUBBING_MODES.system)}
          >
            系统音色
          </button>
          <button
            type="button"
            role="tab"
            className={isClone ? "is-active" : ""}
            aria-selected={isClone}
            onClick={() => onVoiceModeChange?.(VOICE_DUBBING_MODES.clone)}
          >
            音色克隆
          </button>
        </div>
      ) : null}

      <div className="dhv2-voice-mode-card__body" role="tabpanel">
        {isClone ? (
          <div className="dhv2-voice-clone-hint">
            <p>请在下方「配音内容」中上传参考音频，并填写口播文案后生成。</p>
          </div>
        ) : (
          <SystemVoiceCard
            embedded
            selectedAvatar={selectedAvatar}
            voices={voices}
            voiceId={voiceId}
            onVoiceIdChange={onVoiceIdChange}
            voiceSpeed={voiceSpeed}
            onVoiceSpeedChange={onVoiceSpeedChange}
            voiceEmotion={voiceEmotion}
            onVoiceEmotionChange={onVoiceEmotionChange}
          />
        )}
      </div>
    </section>
  );
}
