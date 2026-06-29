import React, { useEffect, useMemo, useRef, useState } from "react";
import { Message } from "@arco-design/web-react";
import { ImagePlus, X } from "lucide-react";
import { digitalHumanApi } from "../../api/digitalHumanApi";
import { voiceApi } from "../voice/voiceApi";
import {
  useDeleteConfirmation,
  useRegenerateConfirmation,
} from "../../components/DeleteConfirmDialog";
import { useDigitalHumanData } from "./hooks/useDigitalHumanData";
import { AvatarSelectionCard } from "./components/AvatarSelectionCard";
import { VOICE_DUBBING_MODES } from "./components/VoiceDubbingModeCard";
import { ScriptCard } from "./components/ScriptCard";
import { GenerateFooter, VideoSpecField } from "./components/GenerateFooter";
import { AvatarLibraryPanel } from "./components/AvatarLibraryPanel";
import { PreviewPanel } from "./components/PreviewPanel";
import { CreateAvatarModal } from "./components/CreateAvatarModal";
import { AvatarGeneratingModal } from "./components/AvatarGeneratingModal";
import { ScriptOptimizeModal } from "./components/ScriptOptimizeModal";
import {
  VIDEO_SPEC_OPTIONS,
  VOICE_UNAVAILABLE_HINT,
  createWorkspaceDraft,
  DHV2_DRAFTS_MAX,
  estimateSpeechSeconds,
  getVoiceEmotionLabel,
  getVoiceEmotionValue,
  isDigitalHumanVoiceEnabled,
  loadWorkspaceDrafts,
  matchVoiceForAvatar,
  persistWorkspaceDrafts,
  photoTaskToSelectedAvatar,
  pickEnabledVoiceId,
  replaceScriptSegment,
  resolveAvatarFromDraft,
  snapshotAvatar,
} from "./utils";
import "./digitalHumanV2.css";

const DEFAULT_SCRIPT = "";

function SceneUploadCard({
  scene,
  isUploading = false,
  onPickScene,
  onClearScene,
}) {
  const inputRef = useRef(null);
  const previewUrl = scene?.localUrl || scene?.url || "";

  function handleFileChange(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) onPickScene?.(file);
  }

  return (
    <section className="dhv2-scene-card">
      <div className="dhv2-scene-card__head">
        <div>
          <strong>场景背景</strong>
          <span>{scene ? scene.originalName || scene.name : "可选，不上传则使用当前数字人默认背景"}</span>
        </div>
        {scene ? (
          <button type="button" className="dhv2-scene-card__clear" onClick={onClearScene} aria-label="清除场景">
            <X size={15} />
          </button>
        ) : null}
      </div>

      <button
        type="button"
        className={`dhv2-scene-card__dropzone${previewUrl ? " has-preview" : ""}`}
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
      >
        {previewUrl ? (
          <img src={previewUrl} alt={scene?.originalName || "场景背景"} />
        ) : (
          <>
            <ImagePlus size={20} />
            <span>{isUploading ? "上传中..." : "上传场景图"}</span>
          </>
        )}
      </button>
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFileChange} />
    </section>
  );
}

export function DigitalHumanV2View({ isActive = true, onOpenAssets }) {
  const {
    options,
    avatars,
    voices,
    tasks,
    photoTasks,
    selectedAvatar,
    setSelectedAvatar,
    loading,
    error,
    setError,
    refreshCredits,
  } = useDigitalHumanData({ isActive });

  const [avatarSource, setAvatarSource] = useState("official");
  const [rightView, setRightView] = useState("library");
  const [aspectRatio, setAspectRatio] = useState("all");
  const [fillMode, setFillMode] = useState("cover");
  const [videoSpec, setVideoSpec] = useState(VIDEO_SPEC_OPTIONS[0].value);
  const [text, setText] = useState(DEFAULT_SCRIPT);
  const [voiceId, setVoiceId] = useState("");
  const [voiceSpeed, setVoiceSpeed] = useState(1);
  const [voiceEmotion, setVoiceEmotion] = useState("中性");
  const [activeTask, setActiveTask] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState("upload");
  const [aiGeneratingJob, setAiGeneratingJob] = useState(null);
  const [scriptOptimizeRequest, setScriptOptimizeRequest] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const [drafts, setDrafts] = useState(() => loadWorkspaceDrafts());
  const [selectedMineLibraryId, setSelectedMineLibraryId] = useState(null);
  const [voiceMode, setVoiceMode] = useState(VOICE_DUBBING_MODES.system);
  const [cloneAudio, setCloneAudio] = useState(null);
  const [speechDurationMs, setSpeechDurationMs] = useState(0);
  const [selectedScene, setSelectedScene] = useState(null);
  const [isUploadingScene, setIsUploadingScene] = useState(false);
  const [audioPreviewPhase, setAudioPreviewPhase] = useState("draft");
  const [audioPreviewRequestId, setAudioPreviewRequestId] = useState(0);
  const [isAudioPreviewing, setIsAudioPreviewing] = useState(false);
  const toastTimerRef = useRef(null);

  const model = options.defaults?.model || options.models[0]?.value || "";
  const isMineAvatar = avatarSource === "mine" && Boolean(selectedAvatar?.id);
  const isCloneMode = isMineAvatar && voiceMode === VOICE_DUBBING_MODES.clone;
  const canGenerate = Boolean(
    selectedAvatar?.id &&
      text.trim() &&
      model &&
      (isCloneMode
        ? cloneAudio?.fileId || cloneAudio?.cachedVoice?.id
        : voiceId && isDigitalHumanVoiceEnabled(voiceId)),
  );
  const estimatedGenerateCredits = useMemo(
    () => {
      if (speechDurationMs > 0) {
        const speechSeconds = Math.round((speechDurationMs / 1000) * 10) / 10;
        return Math.ceil(speechSeconds * 120);
      }
      return estimateSpeechSeconds(text) * 120;
    },
    [speechDurationMs, text],
  );

  useEffect(() => {
    const nextVoiceId = pickEnabledVoiceId(voices, voiceId);
    if (nextVoiceId && nextVoiceId !== voiceId) {
      setVoiceId(nextVoiceId);
    }
  }, [voiceId, voices]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  useEffect(() => {
    persistWorkspaceDrafts(drafts);
  }, [drafts]);

  useEffect(() => {
    setAudioPreviewPhase("draft");
    setIsAudioPreviewing(false);
  }, [text, voiceId, voiceSpeed, voiceEmotion, voiceMode, cloneAudio]);

  function showToast(message) {
    setToastMessage(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage("");
      toastTimerRef.current = null;
    }, 2200);
  }

  function handleAvatarSourceChange(nextSource) {
    if (nextSource !== "official" && nextSource !== "mine") return;
    const isSourceChanged = nextSource !== avatarSource;
    setAvatarSource(nextSource);
    setRightView("library");
    setActiveTask(null);
    setVoiceMode(VOICE_DUBBING_MODES.system);
    setCloneAudio(null);
    if (nextSource === "official") {
      setSelectedMineLibraryId(null);
    }
    if (isSourceChanged && selectedAvatar?.id) {
      setSelectedAvatar(null);
    }
  }

  function handleSelectAvatar(avatar) {
    setSelectedAvatar(avatar);
    setActiveTask(null);
    if (avatarSource !== "mine") {
      setSelectedMineLibraryId(null);
    }
  }

  function handleSelectMineItem(item) {
    if (!item) return;
    setAvatarSource("mine");
    setSelectedMineLibraryId(item.libraryId);

    if (item.sourceType === "photo-task") {
      setSelectedAvatar(photoTaskToSelectedAvatar(item));
      setVoiceId(pickEnabledVoiceId(voices, item.voiceId || item.task?.voiceId));
      setVoiceSpeed(Number(item.voiceSpeed || item.task?.speed) || 1);
      setVoiceEmotion(getVoiceEmotionLabel(item.task?.emotion));
      setText(item.text || item.task?.text || "");
      setActiveTask(null);
      return;
    }

    if (item.sourceType === "task") {
      const avatar = resolveAvatarFromDraft(
        { avatarId: item.avatarId, avatar: { id: item.avatarId, name: item.name } },
        avatars,
      );
      if (avatar) {
        setSelectedAvatar(avatar);
      }
      setVoiceId(pickEnabledVoiceId(voices, item.voiceId || item.task?.voiceId));
      setVoiceSpeed(Number(item.voiceSpeed || item.task?.speed) || 1);
      setVoiceEmotion(getVoiceEmotionLabel(item.task?.emotion));
      setText(item.text || item.task?.text || "");
      setActiveTask(null);
      return;
    }

    const matchedVoice = matchVoiceForAvatar(item, voices);
    if (matchedVoice?.id) {
      setVoiceId(matchedVoice.id);
    }
    setSelectedAvatar(item);
    setActiveTask(null);
  }

  function handleConfirmAvatar() {
    if (avatarSource !== "mine") {
      setRightView("preview");
    }
  }

  function handleResetWorkspace() {
    setSelectedAvatar(null);
    setAvatarSource("official");
    setRightView("library");
    setAspectRatio("all");
    setFillMode("cover");
    setVideoSpec(VIDEO_SPEC_OPTIONS[0].value);
    setText(DEFAULT_SCRIPT);
    setVoiceId(pickEnabledVoiceId(voices));
    setVoiceSpeed(1);
    setVoiceEmotion("中性");
    setVoiceMode(VOICE_DUBBING_MODES.system);
    setCloneAudio(null);
    setSelectedScene(null);
    setActiveTask(null);
    setSelectedMineLibraryId(null);
    setScriptOptimizeRequest(null);
    setIsCreateOpen(false);
    setAiGeneratingJob(null);
    setError("");
    Message.success("已恢复默认配置");
  }

  async function handleGenerate() {
    if (!selectedAvatar?.id) {
      showToast("请先选择数字人形象");
      return;
    }
    if (!text.trim()) {
      showToast("请输入配音内容");
      return;
    }

    let resolvedVoiceId = voiceId;
    if (isCloneMode) {
      if (!cloneAudio?.fileId && !cloneAudio?.cachedVoice?.id) {
        showToast("请先上传参考音频");
        return;
      }
    } else if (!isDigitalHumanVoiceEnabled(voiceId)) {
      showToast(VOICE_UNAVAILABLE_HINT);
      return;
    }

    setError("");
    setIsSubmitting(true);
    setRightView("preview");
    setActiveTask(null);
    try {
      if (isCloneMode) {
        if (cloneAudio.cachedVoice?.id) {
          resolvedVoiceId = cloneAudio.cachedVoice.id;
        } else {
          const cloneResult = await voiceApi.createClone({
            cloneAudioFileId: cloneAudio.fileId,
            audioHash: cloneAudio.audioHash,
            durationMs: cloneAudio.durationMs,
            sourceFileName: cloneAudio.name,
            sourceMimeType: cloneAudio.mimeType,
            sourceSize: cloneAudio.size,
            previewText: text.trim().slice(0, 200),
            name: selectedAvatar.name ? `${selectedAvatar.name}专属音色` : "我的专属音色",
          });
          resolvedVoiceId = cloneResult?.voice?.id;
          if (!resolvedVoiceId) {
            throw new Error("音色克隆失败，请重试");
          }
        }
      }

      const createPayload = {
        avatarId: selectedAvatar.id,
        avatarName: selectedAvatar.name,
        driveMode: "text",
        text: text.trim(),
        performance: "",
        voiceId: resolvedVoiceId,
        model,
        speed: voiceSpeed,
        volume: 1,
        pitch: 0,
        emotion: getVoiceEmotionValue(voiceEmotion),
      };
      if (selectedScene?.sceneFileId) {
        createPayload.sceneFileId = selectedScene.sceneFileId;
      }
      const task = await digitalHumanApi.createTask(createPayload);
      if (task?.status === "failed") {
        throw new Error(task.error || "数字人视频创建失败");
      }
      await refreshCredits();
      setActiveTask(task);
      setRightView("preview");
      showToast("已提交生成任务");
    } catch (submitError) {
      showToast(submitError.message || "数字人视频创建失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCreateAvatar(payload) {
    if (payload?.mode === "ai") {
      setIsCreateOpen(false);
      const request = { ...payload };
      setAiGeneratingJob({
        ...request,
        request,
        status: "creating",
      });
      setAvatarSource("mine");
      setRightView("library");
      try {
        const task = await digitalHumanApi.createAiAvatar(request);
        await refreshCredits();
        setAiGeneratingJob({
          ...request,
          ...task,
          request,
        });
      } catch (createError) {
        setAiGeneratingJob((current) => current ? {
          ...current,
          status: "failed",
          error: createError.message || "AI avatar generation failed",
        } : null);
        await refreshCredits();
      }
      return;
    }

    setIsSubmitting(true);
    try {
      if (!payload?.file) {
        showToast("请选择图片");
        return;
      }
      const avatar = await digitalHumanApi.createAvatar(payload);
      setSelectedAvatar(avatar);
      setAvatarSource("mine");
      setSelectedMineLibraryId(`avatar-${avatar.id}`);
      if (payload.voiceId) setVoiceId(payload.voiceId);
      setVoiceSpeed(Number(payload.voiceSpeed) || 1);
      setVoiceEmotion(payload.voiceEmotion || "中性");
      setRightView("library");
      setIsCreateOpen(false);
      showToast("形象已保存并使用");
    } catch {
      showToast("个人形象创建失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePickScene(file) {
    if (!file) return;
    setIsUploadingScene(true);
    try {
      const scene = await digitalHumanApi.uploadScene(file);
      setSelectedScene(scene);
      showToast("场景图已上传");
    } catch (uploadError) {
      showToast(uploadError.message || "场景图上传失败");
    } finally {
      setIsUploadingScene(false);
    }
  }

  function handleRequestAudioPreview() {
    if (!selectedAvatar?.id) {
      showToast("请先选择数字人形象");
      return;
    }
    if (!text.trim()) {
      showToast("请输入配音内容");
      return;
    }
    if (!isDigitalHumanVoiceEnabled(voiceId)) {
      showToast(VOICE_UNAVAILABLE_HINT);
      return;
    }
    setAudioPreviewPhase("draft");
    setAudioPreviewRequestId((current) => current + 1);
  }

  function handleAudioPreviewStateChange(state) {
    setIsAudioPreviewing(Boolean(state?.isPreviewing));
    if (state?.status === "ready") {
      setAudioPreviewPhase("previewed");
    }
  }

  function handleConfirmAudioPreview() {
    setAudioPreviewPhase("confirmed");
  }

  async function handleRegenerateAiAvatar(request) {
    if (!request) return;
    setAiGeneratingJob({
      ...request,
      request,
      status: "creating",
    });
    try {
      const task = await digitalHumanApi.createAiAvatar(request);
      await refreshCredits();
      setAiGeneratingJob({
        ...request,
        ...task,
        request,
      });
    } catch (createError) {
      setAiGeneratingJob((current) => current ? {
        ...current,
        status: "failed",
        error: createError.message || "AI avatar generation failed",
      } : null);
      await refreshCredits();
    }
  }

  async function handleSaveAiAvatar(task) {
    if (!task?.id) return;
    try {
      const result = await digitalHumanApi.saveAiAvatarTask(task.id, {
        name: "AI Custom Avatar",
      });
      if (result?.avatar) {
        setSelectedAvatar(result.avatar);
        setAvatarSource("mine");
        setSelectedMineLibraryId(`avatar-${result.avatar.id}`);
      }
      setAiGeneratingJob(null);
      showToast("涓汉褰㈣薄鍒涘缓鎴愬姛");
    } catch (saveError) {
      setAiGeneratingJob((current) => current ? {
        ...current,
        error: saveError.message || "Save avatar failed",
      } : null);
    }
  }

  async function performDeleteTask(id) {
    await digitalHumanApi.deleteTask(id);
    setActiveTask((current) => (String(current?.id) === String(id) ? null : current));
    showToast("已删除生成记录");
  }

  const { requestDelete: deleteTask } = useDeleteConfirmation({
    onConfirm: performDeleteTask,
    title: "删除历史记录？",
    message: "该数字人生成记录会被移除，删除后无法恢复。",
  });

  async function regenerateTask(id) {
    const task = await digitalHumanApi.regenerateTask(id);
    await refreshCredits();
    setActiveTask(task);
    setRightView("preview");
  }

  const { requestRegenerate } = useRegenerateConfirmation({
    onConfirm: regenerateTask,
  });

  useEffect(() => {
    if (!activeTask?.id) return;
    const latest = tasks.find((task) => String(task.id) === String(activeTask.id));
    if (latest) setActiveTask(latest);
  }, [activeTask?.id, tasks]);

  const resolvedTask = activeTask?.id ? activeTask : null;
  const showMineLibrary =
    avatarSource === "mine" && !isSubmitting && !resolvedTask;
  const showLibrary = rightView === "library" || showMineLibrary;

  function handleScriptOptimizeRequest(request) {
    setScriptOptimizeRequest(request);
  }

  function handleScriptOptimizeApply(optimizedText) {
    if (!scriptOptimizeRequest) return;
    const nextText = replaceScriptSegment(
      text,
      scriptOptimizeRequest.start,
      scriptOptimizeRequest.end,
      optimizedText,
    );
    setText(nextText);
    setScriptOptimizeRequest(null);
  }

  function openCreateModal(mode = "upload") {
    if (mode === "history") {
      Message.info("开发中");
      return;
    }
    setCreateMode(mode);
    setIsCreateOpen(true);
  }

  function handleSaveDraft() {
    if (!selectedAvatar?.id) {
      Message.info("请先选择形象");
      return;
    }

    const voiceName =
      voices.find((voice) => String(voice.id) === String(voiceId))?.name || "";
    const draft = createWorkspaceDraft({
      avatarSource,
      avatarId: selectedAvatar.id,
      avatar: snapshotAvatar(selectedAvatar),
      voiceId,
      voiceName,
      voiceSpeed,
      voiceEmotion,
      text: text.trim(),
      videoSpec,
    });

    setDrafts((current) => [draft, ...current].slice(0, DHV2_DRAFTS_MAX));
    Message.success("已保存到草稿");
  }

  function handleApplyDraft(draft) {
    if (avatarSource !== "official") {
      Message.info("请切换到官方形象后使用草稿");
      return;
    }

    const avatar = resolveAvatarFromDraft(draft, avatars);
    if (!avatar) {
      Message.error("草稿中的形象已不可用");
      return;
    }

    setSelectedAvatar(avatar);
    setVoiceId(pickEnabledVoiceId(voices, draft.voiceId));
    setVoiceSpeed(Number(draft.voiceSpeed) || 1);
    setVoiceEmotion(draft.voiceEmotion || "中性");
    setText(draft.text || "");
    setVideoSpec(draft.videoSpec || VIDEO_SPEC_OPTIONS[0].value);
    setActiveTask(null);
    setRightView("preview");
    Message.success("已恢复草稿配置");
  }

  function handleDeleteDraft(draftId) {
    setDrafts((current) => current.filter((item) => item.id !== draftId));
    Message.success("已删除草稿");
  }

  if (loading) {
    return (
      <section className="dhv2-root">
        <div className="dhv2-loading">加载数字人模块...</div>
      </section>
    );
  }

  return (
    <section className="dhv2-root">
      {error ? <div className="dhv2-error">{error}</div> : null}

      <div className="dhv2-workspace">
        <aside className="dhv2-sidebar">
          <div className="dhv2-sidebar__scroll">
            <AvatarSelectionCard
              selectedAvatar={selectedAvatar}
              avatarSource={avatarSource}
              onAvatarSourceChange={handleAvatarSourceChange}
              onCreateAvatar={openCreateModal}
            />
            <ScriptCard
              text={text}
              onTextChange={setText}
              onOptimizeRequest={handleScriptOptimizeRequest}
              voiceId={voiceId}
              voiceSpeed={voiceSpeed}
              voiceEmotion={voiceEmotion}
              voiceMode={voiceMode}
              showCloneUpload={isMineAvatar}
              cloneAudio={cloneAudio}
              onCloneAudioChange={setCloneAudio}
              onSpeechDurationMsChange={setSpeechDurationMs}
              selectedAvatar={selectedAvatar}
              voices={voices}
              onVoiceIdChange={setVoiceId}
              onVoiceSpeedChange={setVoiceSpeed}
              onVoiceEmotionChange={setVoiceEmotion}
              previewRequestId={audioPreviewRequestId}
              previewPhase={audioPreviewPhase}
              onPreviewStateChange={handleAudioPreviewStateChange}
              onRegeneratePreview={handleRequestAudioPreview}
            />
            <SceneUploadCard
              scene={selectedScene}
              isUploading={isUploadingScene}
              onPickScene={handlePickScene}
              onClearScene={() => setSelectedScene(null)}
            />
            <VideoSpecField
              videoSpec={videoSpec}
              onVideoSpecChange={setVideoSpec}
            />
          </div>
          <GenerateFooter
            canGenerate={canGenerate}
            isSubmitting={isSubmitting}
            isCloneMode={isCloneMode}
            estimatedCredits={estimatedGenerateCredits}
            audioPreviewPhase={audioPreviewPhase}
            isAudioPreviewing={isAudioPreviewing}
            onPreviewAudio={handleRequestAudioPreview}
            onConfirmAudio={handleConfirmAudioPreview}
            onGenerate={handleGenerate}
          />
        </aside>

        {showLibrary ? (
          <AvatarLibraryPanel
            avatars={avatars}
            selectedAvatar={selectedAvatar}
            selectedMineLibraryId={selectedMineLibraryId}
            avatarSource={avatarSource}
            onAvatarSourceChange={handleAvatarSourceChange}
            voices={voices}
            voiceId={voiceId}
            onVoiceIdChange={setVoiceId}
            voiceSpeed={voiceSpeed}
            onVoiceSpeedChange={setVoiceSpeed}
            voiceEmotion={voiceEmotion}
            onVoiceEmotionChange={setVoiceEmotion}
            aspectRatio={aspectRatio}
            onAspectRatioChange={setAspectRatio}
            fillMode={fillMode}
            onFillModeChange={setFillMode}
            onSelectAvatar={handleSelectAvatar}
            onSelectMineItem={handleSelectMineItem}
            onConfirmAvatar={handleConfirmAvatar}
            onCreateAvatar={openCreateModal}
            onClose={selectedAvatar ? () => setRightView("preview") : null}
          />
        ) : (
          <PreviewPanel
            selectedAvatar={selectedAvatar}
            activeTask={resolvedTask}
            isSubmitting={isSubmitting}
            onDeleteTask={deleteTask}
            onRegenerateTask={requestRegenerate}
            onReset={handleResetWorkspace}
            onSaveDraft={handleSaveDraft}
            drafts={drafts}
            avatarSource={avatarSource}
            onApplyDraft={handleApplyDraft}
            onDeleteDraft={handleDeleteDraft}
            onOpenAssets={onOpenAssets}
            scriptText={text}
            videoSpec={videoSpec}
          />
        )}
      </div>

      {isCreateOpen ? (
        <CreateAvatarModal
          onClose={() => setIsCreateOpen(false)}
          onCreate={handleCreateAvatar}
          isSubmitting={isSubmitting}
          mode={createMode}
          voices={voices}
          initialVoiceId={voiceId}
          initialVoiceSpeed={voiceSpeed}
          initialVoiceEmotion={voiceEmotion}
        />
      ) : null}

      {aiGeneratingJob ? (
        <AvatarGeneratingModal
          job={aiGeneratingJob}
          onClose={() => setAiGeneratingJob(null)}
          onRegenerate={handleRegenerateAiAvatar}
          onSave={handleSaveAiAvatar}
        />
      ) : null}

      {scriptOptimizeRequest ? (
        <ScriptOptimizeModal
          request={scriptOptimizeRequest}
          onClose={() => setScriptOptimizeRequest(null)}
          onApply={handleScriptOptimizeApply}
        />
      ) : null}

      {toastMessage ? <div className="dhv2-toast">{toastMessage}</div> : null}
    </section>
  );
}
