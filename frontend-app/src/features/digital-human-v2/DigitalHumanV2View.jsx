import React, { useEffect, useRef, useState } from "react";
import { Message } from "@arco-design/web-react";
import { digitalHumanApi } from "../../api/digitalHumanApi";
import {
  useDeleteConfirmation,
  useRegenerateConfirmation,
} from "../../components/DeleteConfirmDialog";
import { useDigitalHumanData } from "./hooks/useDigitalHumanData";
import { AvatarSelectionCard } from "./components/AvatarSelectionCard";
import { ScriptCard } from "./components/ScriptCard";
import { GenerateFooter } from "./components/GenerateFooter";
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

const DEFAULT_SCRIPT =
  "大家好，欢迎来到我们的 AI 创作平台。今天我会用一张照片，为你生成自然口型的数字人视频。";

export function DigitalHumanV2View({ isActive = true, onOpenAssets }) {
  const {
    options,
    avatars,
    voices,
    tasks,
    photoTasks,
    credits,
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
  const toastTimerRef = useRef(null);

  const model = options.defaults?.model || options.models[0]?.value || "";
  const canGenerate = Boolean(
    selectedAvatar?.id &&
      text.trim() &&
      model &&
      voiceId &&
      isDigitalHumanVoiceEnabled(voiceId),
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

  function showToast(message) {
    setToastMessage(message);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => {
      setToastMessage("");
      toastTimerRef.current = null;
    }, 2200);
  }

  function handleAvatarSourceChange(nextSource) {
    setAvatarSource(nextSource);
    setRightView("library");
    setActiveTask(null);
    setSelectedMineLibraryId(null);
    if (nextSource === "mine") {
      const mineList = avatars.mine || [];
      const isOfficialSelection =
        selectedAvatar?.id &&
        !mineList.some((item) => String(item.id) === String(selectedAvatar.id));
      if (isOfficialSelection) {
        setSelectedAvatar(null);
      }
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
    setSelectedMineLibraryId(item.libraryId);

    if (item.sourceType === "photo-task") {
      setSelectedAvatar(photoTaskToSelectedAvatar(item));
      setVoiceId(pickEnabledVoiceId(voices, item.voiceId || item.task?.voiceId));
      setVoiceSpeed(Number(item.voiceSpeed || item.task?.speed) || 1);
      setVoiceEmotion(getVoiceEmotionLabel(item.task?.emotion));
      setText(item.text || item.task?.text || DEFAULT_SCRIPT);
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
      setText(item.text || item.task?.text || DEFAULT_SCRIPT);
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
    if (!isDigitalHumanVoiceEnabled(voiceId)) {
      showToast(VOICE_UNAVAILABLE_HINT);
      return;
    }

    setError("");
    setIsSubmitting(true);
    setRightView("preview");
    setActiveTask(null);
    try {
      const task = await digitalHumanApi.createTask({
        avatarId: selectedAvatar.id,
        avatarName: selectedAvatar.name,
        driveMode: "text",
        text: text.trim(),
        performance: "",
        voiceId,
        model,
        speed: voiceSpeed,
        volume: 1,
        pitch: 0,
        emotion: getVoiceEmotionValue(voiceEmotion),
      });
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
      setAiGeneratingJob({
        prompt: payload.prompt,
        gender: payload.gender,
        age: payload.age,
        style: payload.style,
        ratio: payload.ratio,
      });
      setAvatarSource("mine");
      setRightView("library");
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
      setRightView("library");
      setIsCreateOpen(false);
      showToast("个人形象创建成功");
    } catch {
      showToast("个人形象创建失败");
    } finally {
      setIsSubmitting(false);
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
      setAvatarSource("mine");
      setRightView("library");
      Message.info("请从右侧照片数字人记录中选择");
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
    setText(draft.text || DEFAULT_SCRIPT);
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
          <AvatarSelectionCard
            avatarSource={avatarSource}
            onAvatarSourceChange={handleAvatarSourceChange}
            selectedAvatar={selectedAvatar}
            voices={voices}
            voiceId={voiceId}
            onVoiceIdChange={setVoiceId}
            voiceSpeed={voiceSpeed}
            onVoiceSpeedChange={setVoiceSpeed}
            voiceEmotion={voiceEmotion}
            onVoiceEmotionChange={setVoiceEmotion}
            onOpenCreate={openCreateModal}
          />
          <ScriptCard
            text={text}
            onTextChange={setText}
            onOptimizeRequest={handleScriptOptimizeRequest}
            voiceId={voiceId}
            voiceSpeed={voiceSpeed}
            voiceEmotion={voiceEmotion}
          />
          <GenerateFooter
            videoSpec={videoSpec}
            onVideoSpecChange={setVideoSpec}
            canGenerate={canGenerate}
            isSubmitting={isSubmitting}
            onGenerate={handleGenerate}
          />
          {credits ? <p className="dhv2-credits">账户积分 {credits.balance}</p> : null}
        </aside>

        {showLibrary ? (
          <AvatarLibraryPanel
            avatarSource={avatarSource}
            onAvatarSourceChange={handleAvatarSourceChange}
            avatars={avatars}
            tasks={tasks}
            photoTasks={photoTasks}
            selectedMineLibraryId={selectedMineLibraryId}
            onSelectMineItem={handleSelectMineItem}
            selectedAvatar={selectedAvatar}
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
            onConfirmAvatar={handleConfirmAvatar}
            onClose={() => setRightView("preview")}
            onCreateAvatar={openCreateModal}
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
        />
      ) : null}

      {aiGeneratingJob ? (
        <AvatarGeneratingModal
          job={aiGeneratingJob}
          onClose={() => setAiGeneratingJob(null)}
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
