import React, { useRef } from "react";
import { ImagePlus, X } from "lucide-react";
import { AvatarSelectionCard } from "./AvatarSelectionCard";
import { AvatarLibraryPanel } from "./AvatarLibraryPanel";
import { GenerateFooter, VideoSpecField } from "./GenerateFooter";
import { PreviewPanel } from "./PreviewPanel";
import { ScriptCard } from "./ScriptCard";

function SceneUploadCard({ scene, isUploading = false, onPickScene, onClearScene }) {
  const inputRef = useRef(null);
  const previewUrl = scene?.localUrl || scene?.url || "";

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onPickScene?.(file);
  }

  function handleDropzoneKeyDown(event) {
    if (isUploading) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      inputRef.current?.click();
    }
  }

  return (
    <section className="dhv2-scene-card">
      <div className="dhv2-scene-card__head">
        <div>
          <strong>场景背景</strong>
          <span>{scene ? scene.originalName || scene.name : "可选，不上传则使用当前数字人默认背景"}</span>
        </div>
      </div>
      <div
        role="button"
        tabIndex={isUploading ? -1 : 0}
        className={`dhv2-scene-card__dropzone${previewUrl ? " has-preview" : ""}`}
        onClick={() => { if (!isUploading) inputRef.current?.click(); }}
        onKeyDown={handleDropzoneKeyDown}
        aria-disabled={isUploading}
      >
        {previewUrl ? (
          <>
            <img src={previewUrl} alt={scene?.originalName || "场景背景"} />
            <button
              type="button"
              className="dhv2-scene-card__clear"
              onClick={(event) => { event.stopPropagation(); onClearScene?.(); }}
              aria-label="清除场景"
            >
              <X size={15} />
            </button>
          </>
        ) : (
          <>
            <ImagePlus size={20} />
            <span>{isUploading ? "上传中..." : "上传场景图"}</span>
          </>
        )}
      </div>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
    </section>
  );
}

export function DigitalHumanWorkspace(props) {
  const {
    selectedAvatar, avatarSource, onAvatarSourceChange, onCreateAvatar,
    text, onTextChange, onOptimizeRequest, voiceId, onVoiceIdChange,
    voiceSpeed, onVoiceSpeedChange, voiceEmotion, onVoiceEmotionChange,
    voiceMode, onVoiceModeChange, isMineAvatar, cloneAudio, onCloneAudioChange,
    onSpeechDurationMsChange, voices, previewRequestId, previewPhase,
    onPreviewStateChange, onRegeneratePreview, selectedScene, isUploadingScene,
    onPickScene, onClearScene, videoSpec, onVideoSpecChange, canGenerate,
    isSubmitting, isCloneMode, estimatedCredits, isAudioPreviewing, isSpeechTooLong,
    onPreviewAudio, onConfirmAudio, onGenerate, showLibrary, avatars,
    selectedMineLibraryId, aspectRatio, onAspectRatioChange, fillMode,
    onFillModeChange, onSelectAvatar, onSelectMineItem, onConfirmAvatar,
    onCloseLibrary, activeTask, onDeleteTask, onRegenerateTask, onReset,
    onSaveDraft, drafts, onApplyDraft, onDeleteDraft, onOpenAssets,
  } = props;

  return (
    <div className="dhv2-workspace">
      <aside className="dhv2-sidebar">
        <div className="dhv2-sidebar__scroll">
          <AvatarSelectionCard
            selectedAvatar={selectedAvatar}
            avatarSource={avatarSource}
            onAvatarSourceChange={onAvatarSourceChange}
            onCreateAvatar={onCreateAvatar}
          />
          <ScriptCard
            text={text}
            onTextChange={onTextChange}
            onOptimizeRequest={onOptimizeRequest}
            voiceId={voiceId}
            voiceSpeed={voiceSpeed}
            voiceEmotion={voiceEmotion}
            voiceMode={voiceMode}
            onVoiceModeChange={onVoiceModeChange}
            showCloneUpload={isMineAvatar}
            cloneAudio={cloneAudio}
            onCloneAudioChange={onCloneAudioChange}
            onSpeechDurationMsChange={onSpeechDurationMsChange}
            selectedAvatar={selectedAvatar}
            voices={voices}
            onVoiceIdChange={onVoiceIdChange}
            onVoiceSpeedChange={onVoiceSpeedChange}
            onVoiceEmotionChange={onVoiceEmotionChange}
            previewRequestId={previewRequestId}
            previewPhase={previewPhase}
            onPreviewStateChange={onPreviewStateChange}
            onRegeneratePreview={onRegeneratePreview}
          />
          <SceneUploadCard scene={selectedScene} isUploading={isUploadingScene} onPickScene={onPickScene} onClearScene={onClearScene} />
          <VideoSpecField videoSpec={videoSpec} onVideoSpecChange={onVideoSpecChange} />
        </div>
        <GenerateFooter
          canGenerate={canGenerate}
          isSubmitting={isSubmitting}
          isCloneMode={isCloneMode}
          estimatedCredits={estimatedCredits}
          audioPreviewPhase={previewPhase}
          isAudioPreviewing={isAudioPreviewing}
          isSpeechTooLong={isSpeechTooLong}
          onPreviewAudio={onPreviewAudio}
          onConfirmAudio={onConfirmAudio}
          onGenerate={onGenerate}
        />
      </aside>

      {showLibrary ? (
        <AvatarLibraryPanel
          avatars={avatars}
          selectedAvatar={selectedAvatar}
          selectedMineLibraryId={selectedMineLibraryId}
          avatarSource={avatarSource}
          onAvatarSourceChange={onAvatarSourceChange}
          voices={voices}
          voiceId={voiceId}
          onVoiceIdChange={onVoiceIdChange}
          voiceSpeed={voiceSpeed}
          onVoiceSpeedChange={onVoiceSpeedChange}
          voiceEmotion={voiceEmotion}
          onVoiceEmotionChange={onVoiceEmotionChange}
          aspectRatio={aspectRatio}
          onAspectRatioChange={onAspectRatioChange}
          fillMode={fillMode}
          onFillModeChange={onFillModeChange}
          onSelectAvatar={onSelectAvatar}
          onSelectMineItem={onSelectMineItem}
          onConfirmAvatar={onConfirmAvatar}
          onCreateAvatar={onCreateAvatar}
          onClose={selectedAvatar ? onCloseLibrary : null}
        />
      ) : (
        <PreviewPanel
          selectedAvatar={selectedAvatar}
          activeTask={activeTask}
          isSubmitting={isSubmitting}
          onDeleteTask={onDeleteTask}
          onRegenerateTask={onRegenerateTask}
          onReset={onReset}
          onSaveDraft={onSaveDraft}
          drafts={drafts}
          avatarSource={avatarSource}
          onApplyDraft={onApplyDraft}
          onDeleteDraft={onDeleteDraft}
          onOpenAssets={onOpenAssets}
          scriptText={text}
          videoSpec={videoSpec}
        />
      )}
    </div>
  );
}
