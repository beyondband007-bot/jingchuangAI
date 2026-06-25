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
import { VIDEO_SPEC_OPTIONS, replaceScriptSegment } from "./utils";
import "./digitalHumanV2.css";

const DEFAULT_SCRIPT =
  "大家好，欢迎来到我们的 AI 创作平台。今天我会用一张照片，为你生成自然口型的数字人视频。";

export function DigitalHumanV2View({ isActive = true }) {
  const {
    options,
    avatars,
    voices,
    tasks,
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
  const [activeTask, setActiveTask] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createMode, setCreateMode] = useState("upload");
  const [aiGeneratingJob, setAiGeneratingJob] = useState(null);
  const [scriptOptimizeRequest, setScriptOptimizeRequest] = useState(null);
  const [toastMessage, setToastMessage] = useState("");
  const toastTimerRef = useRef(null);

  const model = options.defaults?.model || options.models[0]?.value || "";
  const selectedModel =
    options.models.find((item) => item.value === model) || options.models[0];
  const costPoints = Number(selectedModel?.basePoints || 30);
  const canGenerate = Boolean(selectedAvatar?.id && text.trim() && model && voiceId);

  useEffect(() => {
    if (!voiceId && voices[0]?.id) {
      setVoiceId(voices[0].id);
    }
  }, [voiceId, voices]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

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
  }

  function handleSelectAvatar(avatar) {
    setSelectedAvatar(avatar);
    setActiveTask(null);
  }

  function handleConfirmAvatar() {
    setRightView("preview");
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

    setError("");
    setIsSubmitting(true);
    try {
      const task = await digitalHumanApi.createTask({
        avatarId: selectedAvatar.id,
        avatarName: selectedAvatar.name,
        driveMode: "text",
        text: text.trim(),
        performance: "",
        voiceId,
        model,
        speed: 1,
        volume: 1,
        pitch: 0,
        emotion: "",
      });
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
      Message.info("从历史作品选择功能即将开放");
      return;
    }
    setCreateMode(mode);
    setIsCreateOpen(true);
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
            onOpenCreate={openCreateModal}
          />
          <ScriptCard
            text={text}
            onTextChange={setText}
            onOptimizeRequest={handleScriptOptimizeRequest}
          />
          <GenerateFooter
            videoSpec={videoSpec}
            onVideoSpecChange={setVideoSpec}
            costPoints={costPoints}
            canGenerate={canGenerate}
            isSubmitting={isSubmitting}
            onGenerate={handleGenerate}
          />
          {credits ? <p className="dhv2-credits">账户积分 {credits.balance}</p> : null}
        </aside>

        {rightView === "library" ? (
          <AvatarLibraryPanel
            avatarSource={avatarSource}
            onAvatarSourceChange={handleAvatarSourceChange}
            avatars={avatars}
            selectedAvatar={selectedAvatar}
            voices={voices}
            voiceId={voiceId}
            onVoiceIdChange={setVoiceId}
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
            onDeleteTask={deleteTask}
            onRegenerateTask={requestRegenerate}
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
