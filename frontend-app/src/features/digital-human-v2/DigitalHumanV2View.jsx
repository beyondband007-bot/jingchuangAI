import React, { useEffect, useMemo, useState } from "react";
import { Message } from "@arco-design/web-react";
import { digitalHumanApi } from "../../api/digitalHumanApi";
import {
  useDeleteConfirmation,
  useRegenerateConfirmation,
} from "../../components/DeleteConfirmDialog";
import { useToast } from "../../components/ToastProvider";
import { takePendingGenerationSeed } from "../generation/generationState";
import { useDigitalHumanData } from "./hooks/useDigitalHumanData";
import { VOICE_DUBBING_MODES } from "./components/VoiceDubbingModeCard";
import { DigitalHumanWorkspace } from "./components/DigitalHumanWorkspace";
import { CreateAvatarModal } from "./components/CreateAvatarModal";
import { AvatarGeneratingModal } from "./components/AvatarGeneratingModal";
import { ScriptOptimizeModal } from "./components/ScriptOptimizeModal";
import {
  VIDEO_SPEC_OPTIONS,
  VOICE_UNAVAILABLE_HINT,
  createWorkspaceDraft,
  DHV2_DRAFTS_MAX,
  estimateSpeechSeconds,
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
import "./digitalHumanV2Styles.css";

const DEFAULT_SCRIPT = "";
const MAX_SPEECH_DURATION_MS = 15 * 1000;

export function DigitalHumanV2View({ isActive = true, onOpenAssets }) {
  const { showToast } = useToast();
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
  const [drafts, setDrafts] = useState(() => loadWorkspaceDrafts());
  const [selectedMineLibraryId, setSelectedMineLibraryId] = useState(null);
  const [voiceMode, setVoiceMode] = useState(VOICE_DUBBING_MODES.system);
  const [cloneAudio, setCloneAudio] = useState(null);
  const [speechDurationMs, setSpeechDurationMs] = useState(0);
  const [audioPreviewPhase, setAudioPreviewPhase] = useState("draft");
  const [audioPreviewRequestId, setAudioPreviewRequestId] = useState(0);
  const [isAudioPreviewing, setIsAudioPreviewing] = useState(false);
  const [confirmedPreviewAudio, setConfirmedPreviewAudio] = useState(null);
  const [selectedScene, setSelectedScene] = useState(null);
  const [isUploadingScene, setIsUploadingScene] = useState(false);

  const model = options.defaults?.model || options.models[0]?.value || "";
  const isMineAvatar = avatarSource === "mine" && Boolean(selectedAvatar?.id);
  const isCloneMode = isMineAvatar && voiceMode === VOICE_DUBBING_MODES.clone;
  const estimatedSpeechDurationMs = estimateSpeechSeconds(text) * 1000;
  const isSpeechTooLong = isCloneMode
    ? estimatedSpeechDurationMs > MAX_SPEECH_DURATION_MS
    : speechDurationMs > MAX_SPEECH_DURATION_MS;
  const canGenerate = Boolean(
    selectedAvatar?.id &&
      text.trim() &&
      model &&
      !isSpeechTooLong &&
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
    if (!isActive || loading) return;
    const pendingSeed = takePendingGenerationSeed("digital-human");
    if (!pendingSeed) return;

    const avatar = avatars.public.find(
      (item) => String(item.id) === String(pendingSeed.avatarId),
    );
    if (avatar) {
      setAvatarSource("official");
      setSelectedAvatar(avatar);
      setRightView("library");
    }
    if (pendingSeed.prompt) setText(pendingSeed.prompt);
    if (pendingSeed.notice) showToast(pendingSeed.notice);
  }, [avatars.public, isActive, loading, setSelectedAvatar, showToast]);

  useEffect(() => {
    persistWorkspaceDrafts(drafts);
  }, [drafts]);

  useEffect(() => {
    setAudioPreviewPhase("draft");
    setIsAudioPreviewing(false);
    setConfirmedPreviewAudio(null);
  }, [text, voiceId, voiceSpeed, voiceEmotion, voiceMode, cloneAudio]);

  function resetFormConfig({ resetVoice = false } = {}) {
    setVideoSpec(VIDEO_SPEC_OPTIONS[0].value);
    setText(DEFAULT_SCRIPT);
    if (resetVoice) {
      setVoiceId(pickEnabledVoiceId(voices));
      setVoiceSpeed(1);
      setVoiceEmotion("中性");
    }
    setVoiceMode(VOICE_DUBBING_MODES.system);
    setCloneAudio(null);
    setSpeechDurationMs(0);
    setAudioPreviewPhase("draft");
    setIsAudioPreviewing(false);
    setActiveTask(null);
    setScriptOptimizeRequest(null);
  }

  function handleAvatarSourceChange(nextSource) {
    if (nextSource !== "official" && nextSource !== "mine") return;
    const isSourceChanged = nextSource !== avatarSource;
    setAvatarSource(nextSource);
    setRightView("library");
    if (nextSource === "official") {
      setSelectedMineLibraryId(null);
    }
    if (isSourceChanged) {
      resetFormConfig({ resetVoice: true });
    }
    if (isSourceChanged && selectedAvatar?.id) {
      setSelectedAvatar(null);
    }
  }

  function handleSelectAvatar(avatar) {
    const isAvatarChanged = String(avatar?.id || "") !== String(selectedAvatar?.id || "");
    setSelectedAvatar(avatar);
    if (isAvatarChanged) {
      resetFormConfig();
    }
    if (avatarSource !== "mine") {
      setSelectedMineLibraryId(null);
    }
  }

  function handleSelectMineItem(item) {
    if (!item) return;
    const isAvatarChanged =
      String(item.id || item.avatarId || "") !== String(selectedAvatar?.id || "");
    setAvatarSource("mine");
    setSelectedMineLibraryId(item.libraryId);

    if (item.sourceType === "photo-task") {
      setSelectedAvatar(photoTaskToSelectedAvatar(item));
      setVoiceId(pickEnabledVoiceId(voices, item.voiceId || item.task?.voiceId));
      if (isAvatarChanged) {
        resetFormConfig();
        setVoiceSpeed(1);
        setVoiceEmotion("中性");
      }
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
      if (isAvatarChanged) {
        resetFormConfig();
        setVoiceSpeed(1);
        setVoiceEmotion("中性");
      }
      return;
    }

    const matchedVoice = matchVoiceForAvatar(item, voices);
    if (matchedVoice?.id) {
      setVoiceId(matchedVoice.id);
    }
    if (isAvatarChanged) {
      resetFormConfig();
      setVoiceSpeed(1);
      setVoiceEmotion("中性");
    }
    setSelectedAvatar(item);
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
    resetFormConfig({ resetVoice: true });
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
          const cloneResult = await digitalHumanApi.createVoiceClone({
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
        driveMode: !isCloneMode && confirmedPreviewAudio?.audioFileId ? "audio" : "text",
        text: text.trim(),
        performance: "",
        voiceId: resolvedVoiceId,
        model,
        speed: voiceSpeed,
        volume: 1,
        pitch: 0,
        emotion: getVoiceEmotionValue(voiceEmotion),
        videoSpec,
      };
      if (!isCloneMode && confirmedPreviewAudio?.audioFileId) {
        createPayload.audioFileId = confirmedPreviewAudio.audioFileId;
        createPayload.audioName = confirmedPreviewAudio.originalName || "试听音频";
      }
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
      if (state.audioFileId) {
        setConfirmedPreviewAudio({
          audioFileId: state.audioFileId,
          audioUrl: state.audioUrl,
          originalName: state.originalName,
          durationMs: state.durationMs || 0,
          previewKey: state.previewKey || "",
        });
      }
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
      showToast("个人形象创建成功");
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

  function handleCloseAvatarLibrary() {
    if (avatarSource === "mine") {
      setSelectedAvatar(null);
      setSelectedMineLibraryId(null);
      setActiveTask(null);
      setRightView("library");
      return;
    }
    setRightView("preview");
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

      <DigitalHumanWorkspace
        selectedAvatar={selectedAvatar}
        avatarSource={avatarSource}
        onAvatarSourceChange={handleAvatarSourceChange}
        onCreateAvatar={openCreateModal}
        text={text}
        onTextChange={setText}
        onOptimizeRequest={handleScriptOptimizeRequest}
        voiceId={voiceId}
        onVoiceIdChange={setVoiceId}
        voiceSpeed={voiceSpeed}
        onVoiceSpeedChange={setVoiceSpeed}
        voiceEmotion={voiceEmotion}
        onVoiceEmotionChange={setVoiceEmotion}
        voiceMode={voiceMode}
        onVoiceModeChange={setVoiceMode}
        isMineAvatar={isMineAvatar}
        cloneAudio={cloneAudio}
        onCloneAudioChange={setCloneAudio}
        onSpeechDurationMsChange={setSpeechDurationMs}
        voices={voices}
        previewRequestId={audioPreviewRequestId}
        previewPhase={audioPreviewPhase}
        onPreviewStateChange={handleAudioPreviewStateChange}
        onRegeneratePreview={handleRequestAudioPreview}
        selectedScene={selectedScene}
        isUploadingScene={isUploadingScene}
        onPickScene={handlePickScene}
        onClearScene={() => setSelectedScene(null)}
        videoSpec={videoSpec}
        onVideoSpecChange={setVideoSpec}
        canGenerate={canGenerate}
        isSubmitting={isSubmitting}
        isCloneMode={isCloneMode}
        estimatedCredits={estimatedGenerateCredits}
        isAudioPreviewing={isAudioPreviewing}
        isSpeechTooLong={isSpeechTooLong}
        onPreviewAudio={handleRequestAudioPreview}
        onConfirmAudio={handleConfirmAudioPreview}
        onGenerate={handleGenerate}
        showLibrary={showLibrary}
        avatars={avatars}
        selectedMineLibraryId={selectedMineLibraryId}
        aspectRatio={aspectRatio}
        onAspectRatioChange={setAspectRatio}
        fillMode={fillMode}
        onFillModeChange={setFillMode}
        onSelectAvatar={handleSelectAvatar}
        onSelectMineItem={handleSelectMineItem}
        onConfirmAvatar={handleConfirmAvatar}
        onCloseLibrary={handleCloseAvatarLibrary}
        activeTask={resolvedTask}
        onDeleteTask={deleteTask}
        onRegenerateTask={requestRegenerate}
        onReset={handleResetWorkspace}
        onSaveDraft={handleSaveDraft}
        drafts={drafts}
        onApplyDraft={handleApplyDraft}
        onDeleteDraft={handleDeleteDraft}
        onOpenAssets={onOpenAssets}
      />

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

    </section>
  );
}
