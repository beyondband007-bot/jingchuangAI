import React, { useEffect, useMemo, useState } from "react";
import { Message } from "@arco-design/web-react";
import { digitalHumanApi } from "../../api/digitalHumanApi";
import {
  useDeleteConfirmation,
  useRegenerateConfirmation,
} from "../../components/DeleteConfirmDialog";
import { useToast } from "../../components/ToastProvider";
import { getFileSizeLimitError, UPLOAD_SIZE_LIMITS } from "../../utils/uploadLimits";
import { takePendingGenerationSeed } from "../generation/generationState";
import { useDigitalHumanData } from "./hooks/useDigitalHumanData";
import { VOICE_DUBBING_MODES } from "./components/VoiceDubbingModeCard";
import { DigitalHumanWorkspace } from "./components/DigitalHumanWorkspace";
import { CreateAvatarModal } from "./components/CreateAvatarModal";
import { ScriptOptimizeModal } from "./components/ScriptOptimizeModal";
import { VideoGenStage } from "../video/VideoGenStage";
import { useVideoGenStateMachine } from "../video/useVideoGenStateMachine";
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
const AI_AVATAR_PENDING_STORAGE_KEY = "dhv2-pending-ai-avatar";

function loadPendingAiAvatarJob() {
  try {
    const value = JSON.parse(localStorage.getItem(AI_AVATAR_PENDING_STORAGE_KEY));
    return value && typeof value === "object" ? value : null;
  } catch {
    return null;
  }
}

function persistPendingAiAvatarJob(job) {
  try {
    if (job) {
      localStorage.setItem(AI_AVATAR_PENDING_STORAGE_KEY, JSON.stringify(job));
    } else {
      localStorage.removeItem(AI_AVATAR_PENDING_STORAGE_KEY);
    }
  } catch {
    // Ignore unavailable or full storage. The in-memory flow still works.
  }
}

export function DigitalHumanV2View({
  isActive = true,
  onOpenAssets,
  resumeTask,
  onResumeTaskHandled,
}) {
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
    refreshAvatars,
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
  const [aiGeneratingJob, setAiGeneratingJob] = useState(loadPendingAiAvatarJob);
  const [scriptOptimizeRequest, setScriptOptimizeRequest] = useState(null);
  const [drafts, setDrafts] = useState(() => loadWorkspaceDrafts());
  const [selectedMineLibraryId, setSelectedMineLibraryId] = useState(null);
  const [voiceMode, setVoiceMode] = useState(VOICE_DUBBING_MODES.system);
  const [cloneAudio, setCloneAudio] = useState(null);
  const [speechDurationMs, setSpeechDurationMs] = useState(0);
  const [audioPreviewPhase, setAudioPreviewPhase] = useState("draft");
  const [audioPreviewRequestId, setAudioPreviewRequestId] = useState(0);
  const [audioPlaybackRequestId, setAudioPlaybackRequestId] = useState(0);
  const [isAudioPreviewing, setIsAudioPreviewing] = useState(false);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [confirmedPreviewAudio, setConfirmedPreviewAudio] = useState(null);
  const [selectedScene, setSelectedScene] = useState(null);
  const [isUploadingScene, setIsUploadingScene] = useState(false);
  const digitalHumanGen = useVideoGenStateMachine({
    taskApi: digitalHumanApi,
    onFailed: (message) => {
      setIsSubmitting(false);
      setActiveTask((current) =>
        current
          ? { ...current, status: "failed", error: message || "数字人视频生成失败" }
          : current,
      );
      setRightView("preview");
      showToast(message || "数字人视频生成失败");
    },
    onReturnToList: (task) => {
      if (task) setActiveTask(task);
      setIsSubmitting(false);
      setRightView("preview");
    },
  });

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
  const isGenerationStageActive = Boolean(
    isActive && digitalHumanGen.isGenStageActive && digitalHumanGen.derivedState,
  );
  const digitalHumanGenerationState = useMemo(() => {
    const derivedState = digitalHumanGen.derivedState;
    if (!derivedState) return null;
    return {
      ...derivedState,
      header: {
        ...derivedState.header,
        title: derivedState.meta.isDone
          ? "数字人视频生成完成"
          : "数字人视频生成中",
      },
      progress: {
        ...derivedState.progress,
        etaText: derivedState.meta.isDone ? "" : "预计需要5-8分钟",
      },
      tip: {
        title: "生成说明",
        text: "AI 正在同步数字人身份、口型、音频与场景光影，生成完成后将自动展示。",
      },
    };
  }, [digitalHumanGen.derivedState]);

  useEffect(() => {
    const shell = document.querySelector(".feature-page-shell");
    const featureMain = document.querySelector(
      ".app-shell__content.feature-main",
    );

    shell?.classList.toggle(
      "is-video-generation-stage",
      isGenerationStageActive,
    );
    featureMain?.classList.toggle(
      "is-video-generation-stage",
      isGenerationStageActive,
    );

    return () => {
      shell?.classList.remove("is-video-generation-stage");
      featureMain?.classList.remove("is-video-generation-stage");
    };
  }, [isGenerationStageActive]);

  useEffect(() => {
    const nextVoiceId = pickEnabledVoiceId(voices, voiceId);
    if (nextVoiceId && nextVoiceId !== voiceId) {
      setVoiceId(nextVoiceId);
    }
  }, [voiceId, voices]);

  useEffect(() => {
    if (!resumeTask?.id || !resumeTask?.resumeToken) return;

    setIsSubmitting(false);
    setActiveTask(resumeTask);
    setRightView("preview");
    digitalHumanGen.resumeGeneration({
      taskId: resumeTask.id,
      prompt: resumeTask.text || "",
      duration: resumeTask.duration || estimateSpeechSeconds(resumeTask.text || ""),
      progress: resumeTask.progress || 0,
    });
    onResumeTaskHandled?.(resumeTask.resumeToken);
  }, [resumeTask?.resumeToken]);

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
    persistPendingAiAvatarJob(aiGeneratingJob);
  }, [aiGeneratingJob]);

  useEffect(() => {
    const taskId = aiGeneratingJob?.id;
    if (!isActive || !taskId) {
      return undefined;
    }

    let cancelled = false;
    let polling = false;
    const request = aiGeneratingJob.request || {};

    async function syncAiAvatarTask() {
      if (polling) return;
      polling = true;
      try {
        const task = await digitalHumanApi.getAiAvatarTask(taskId);
        if (cancelled) return;

        if (task?.status === "failed") {
          setAiGeneratingJob((current) => current ? { ...current, ...task, request } : null);
          return;
        }

        if (task?.status === "preview_ready" || task?.status === "saved") {
          setAiGeneratingJob((current) => current ? {
            ...current,
            ...task,
            request,
            status: "saving",
            progress: 100,
          } : null);
          try {
            if (task.status !== "saved") {
              await digitalHumanApi.saveAiAvatarTask(taskId, {
                name: String(request.prompt || "AI 定制形象").slice(0, 30),
              });
            }
            persistPendingAiAvatarJob(null);
            if (cancelled) {
              setAiGeneratingJob(null);
              return;
            }
            await refreshAvatars().catch(() => null);
            setAiGeneratingJob(null);
            showToast("AI 定制形象已自动保存到我的形象");
            return;
          } catch (saveError) {
            if (!cancelled) {
              setAiGeneratingJob((current) => current ? {
                ...current,
                ...task,
                request,
                status: "save_failed",
                error: saveError.message || "自动保存失败，请稍后重试",
              } : null);
            }
          }
          return;
        }

        setAiGeneratingJob((current) => current ? { ...current, ...task, request } : null);
      } catch (pollError) {
        if (pollError?.status === 404 && !cancelled) {
          persistPendingAiAvatarJob(null);
          setAiGeneratingJob(null);
        }
        // A temporary polling error should not turn a running provider task into a failed task.
      } finally {
        polling = false;
      }
    }

    syncAiAvatarTask();
    const timer = window.setInterval(syncAiAvatarTask, 3500);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [aiGeneratingJob?.id, isActive]);

  useEffect(() => {
    setAudioPreviewPhase("draft");
    setIsAudioPreviewing(false);
    setIsAudioPlaying(false);
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
      setVoiceSpeed(Number(item.defaultVoiceSpeed) || 1);
      setVoiceEmotion(item.defaultVoiceEmotion || "中性");
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
    setError("");
    showToast("已恢复默认配置");
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
    digitalHumanGen.startGeneration({
      prompt: text.trim(),
      duration:
        speechDurationMs > 0
          ? Math.ceil(speechDurationMs / 1000)
          : estimateSpeechSeconds(text),
    });
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
        performance:
          selectedAvatar.performance ||
          selectedAvatar.description ||
          selectedAvatar.name ||
          "",
        avatarDescription: selectedAvatar.description || "",
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
      digitalHumanGen.attachTaskId(String(task.id));
      setRightView("preview");
      showToast("已提交生成任务");
    } catch (submitError) {
      digitalHumanGen.failGeneration(
        submitError.message || "数字人视频创建失败",
      );
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
      const refreshedAvatars = await refreshAvatars();
      const savedAvatar = refreshedAvatars.mine.find(
        (item) => String(item.id) === String(avatar.id),
      );
      setSelectedAvatar(savedAvatar || avatar);
      setAvatarSource("mine");
      setSelectedMineLibraryId(`avatar-${avatar.id}`);
      if (payload.voiceId) setVoiceId(payload.voiceId);
      setVoiceSpeed(Number(payload.voiceSpeed) || 1);
      setVoiceEmotion(payload.voiceEmotion || "中性");
      setRightView("library");
      setIsCreateOpen(false);
      showToast("形象已保存并使用");
    } catch (createError) {
      showToast(createError.message || "个人形象创建失败", { type: "error" });
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
    if (state && Object.prototype.hasOwnProperty.call(state, "isPreviewing")) {
      setIsAudioPreviewing(Boolean(state.isPreviewing));
    }
    if (state && Object.prototype.hasOwnProperty.call(state, "isPlaying")) {
      setIsAudioPlaying(Boolean(state.isPlaying));
    }
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

  function handlePlayAudioPreview() {
    setAudioPlaybackRequestId((current) => current + 1);
  }

  async function handleRegenerateAiAvatar(request) {
    const sourceJob = request || aiGeneratingJob;
    if (!sourceJob) return;
    if (sourceJob.status === "save_failed" && sourceJob.id) {
      setAiGeneratingJob((current) => current ? {
        ...current,
        status: "processing",
        error: "",
      } : null);
      return;
    }
    const nextRequest = sourceJob.request || sourceJob;
    setAiGeneratingJob({
      ...nextRequest,
      request: nextRequest,
      status: "creating",
    });
    try {
      const task = await digitalHumanApi.createAiAvatar(nextRequest);
      await refreshCredits();
      setAiGeneratingJob({
        ...nextRequest,
        ...task,
        request: nextRequest,
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
    const sizeError = getFileSizeLimitError(
      file,
      UPLOAD_SIZE_LIMITS.digitalHumanImage,
      "场景图",
    );
    if (sizeError) {
      showToast(sizeError);
      return;
    }
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
    const sourceTask = tasks.find((task) => String(task.id) === String(id));
    digitalHumanGen.startGeneration({
      prompt: sourceTask?.text || text.trim(),
      duration: sourceTask?.duration || estimateSpeechSeconds(text),
    });
    setIsSubmitting(true);
    try {
      const task = await digitalHumanApi.regenerateTask(id);
      if (task?.status === "failed") {
        throw new Error(task.error || "数字人视频重新生成失败");
      }
      await refreshCredits();
      setActiveTask(task);
      digitalHumanGen.attachTaskId(String(task.id));
      setRightView("preview");
    } catch (regenerateError) {
      digitalHumanGen.failGeneration(
        regenerateError.message || "数字人视频重新生成失败",
      );
    } finally {
      setIsSubmitting(false);
    }
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
    if (mode === "ai" && aiGeneratingJob) {
      setAvatarSource("mine");
      setRightView("library");
      showToast("已有 AI 定制形象正在处理中，请在我的形象中查看进度");
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

  if (isGenerationStageActive && digitalHumanGenerationState) {
    return <VideoGenStage derivedState={digitalHumanGenerationState} />;
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
        playbackRequestId={audioPlaybackRequestId}
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
        isAudioPlaying={isAudioPlaying}
        isSpeechTooLong={isSpeechTooLong}
        onPreviewAudio={handleRequestAudioPreview}
        onConfirmAudio={handleConfirmAudioPreview}
        onPlayAudio={handlePlayAudioPreview}
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
        aiGeneratingJob={aiGeneratingJob}
        onRetryAiAvatar={handleRegenerateAiAvatar}
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
