import React, { useEffect, useMemo, useRef, useState } from "react";
import { CustomSelect } from "../../components/CustomSelect";
import {
  useDeleteConfirmation,
  useRegenerateConfirmation,
} from "../../components/DeleteConfirmDialog";
import { emitCreditsUpdated } from "../../api/creditsEvents";
import { ActionBar } from "./components/ActionBar";
import { HistoryPanel } from "./components/HistoryPanel";
import { InputSection } from "./components/InputSection";
import { ProcessTimeline } from "./components/ProcessTimeline";
import { ResultViewer } from "./components/ResultViewer";
import { WorkflowHeader } from "./components/WorkflowHeader";
import { deriveWorkflowStatus, readVideoFileDuration } from "./utils";
import "./videoWorkflow.css";

function applyCreditsUpdate(setCredits, credits) {
  if (!credits) return;
  setCredits(credits);
  emitCreditsUpdated(credits);
}

function createInitialTaskState(activeTaskKey) {
  function readActiveTaskId() {
    try {
      return window.localStorage.getItem(activeTaskKey);
    } catch {
      return null;
    }
  }

  return {
    status: "idle",
    progress: 0,
    error: "",
    activeTaskId: readActiveTaskId(),
    resultUrl: "",
    sourceVideoUrl: "",
    input: {
      imageAsset: null,
      videoAsset: null,
      imagePreview: "",
      videoPreview: "",
      model: "",
      resolution: "720p",
      characterOrientation: "image",
      uploadingField: "",
    },
  };
}

export function VideoGenerationWorkflow({
  isActive = true,
  api,
  activeTaskKey,
  moduleId = "video-workflow",
  header,
  privacyText,
  historyEmptyHint,
  subjectSlot,
  driverSlot,
  compareLabels = ["原视频", "生成结果"],
  buildCreatePayload,
  renderExtraConfig,
  emptyOptions,
}) {
  const [options, setOptions] = useState(emptyOptions);
  const [credits, setCredits] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [taskState, setTaskState] = useState(() => createInitialTaskState(activeTaskKey));
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const activeRef = useRef(isActive);
  const noticeTimerRef = useRef(null);

  function readActiveTaskId() {
    try {
      return window.localStorage.getItem(activeTaskKey);
    } catch {
      return null;
    }
  }

  function writeActiveTaskId(taskId) {
    try {
      if (taskId) window.localStorage.setItem(activeTaskKey, String(taskId));
      else window.localStorage.removeItem(activeTaskKey);
    } catch {
      // ignore
    }
  }

  const activeTask = useMemo(
    () => tasks.find((t) => String(t.id) === String(taskState.activeTaskId)) || null,
    [tasks, taskState.activeTaskId],
  );

  const workflowStatus = useMemo(() => {
    return deriveWorkflowStatus({
      uploadingField: taskState.input.uploadingField,
      taskStatus: activeTask?.status || (isSubmitting ? "processing" : "idle"),
      progress: activeTask?.progress ?? taskState.progress,
    });
  }, [taskState, activeTask, isSubmitting]);

  const progress = activeTask?.progress ?? (workflowStatus === "uploading" ? 12 : taskState.progress);
  const resultUrl = workflowStatus === "done" ? activeTask?.resultUrl || taskState.resultUrl : "";
  const sourceVideoUrl =
    taskState.input.videoPreview || activeTask?.motionVideoUrl || taskState.sourceVideoUrl;
  const errorMessage = taskState.error || activeTask?.error || "";

  const selectedModel =
    options.models.find((m) => m.value === taskState.input.model) || options.models[0] || null;

  const resolutionOptions = useMemo(() => {
    const values = new Set();
    options.models.forEach((item) => {
      if (item.resolution) values.add(String(item.resolution));
    });
    if (options.defaults?.resolution) values.add(String(options.defaults.resolution));
    if (options.modes?.length) {
      options.modes.forEach((mode) => values.add(String(mode.value)));
    }
    if (!values.size) values.add("720p");
    return Array.from(values).map((value) => ({ value, label: value }));
  }, [options]);

  const canGenerate =
    Boolean(taskState.input.imageAsset?.id) &&
    Boolean(taskState.input.videoAsset?.id) &&
    !taskState.input.uploadingField &&
    !isSubmitting &&
    workflowStatus !== "processing" &&
    workflowStatus !== "rendering";

  function showNotice(message, duration = 2600) {
    setNotice(message);
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice("");
      noticeTimerRef.current = null;
    }, duration);
  }

  function patchInput(patch) {
    setTaskState((current) => ({
      ...current,
      input: { ...current.input, ...patch },
    }));
  }

  function patchTaskState(patch) {
    setTaskState((current) => ({ ...current, ...patch }));
  }

  function applyTaskSnapshot(task) {
    if (!task) return;

    if (task.status === "failed") {
      writeActiveTaskId(null);
      patchTaskState({
        status: "idle",
        progress: 0,
        error: "",
        activeTaskId: null,
        resultUrl: "",
      });
      showNotice(task.error || "任务生成失败", 6000);
      return;
    }

    if (task.status === "completed") {
      patchTaskState({
        activeTaskId: task.id,
        status: "done",
        progress: 100,
        resultUrl: task.resultUrl || "",
        sourceVideoUrl: task.motionVideoUrl || "",
        error: "",
      });
      return;
    }

    patchTaskState({
      activeTaskId: task.id,
      status: task.progress >= 84 ? "rendering" : "processing",
      progress: task.progress || 24,
      resultUrl: "",
      sourceVideoUrl: task.motionVideoUrl || "",
      error: "",
    });
  }

  useEffect(() => {
    activeRef.current = isActive;
    if (isActive) return;
    setTaskState((current) => {
      if (current.input.imagePreview) window.URL.revokeObjectURL(current.input.imagePreview);
      if (current.input.videoPreview) window.URL.revokeObjectURL(current.input.videoPreview);
      return createInitialTaskState(activeTaskKey);
    });
    setNotice("");
    setShowHistory(false);
  }, [isActive, activeTaskKey]);

  useEffect(() => {
    function handleOpenHistory(event) {
      if (event.detail?.moduleId !== moduleId) return;
      setShowHistory(Boolean(event.detail?.open));
    }

    window.addEventListener("facemini:video-workflow-history", handleOpenHistory);
    return () => {
      window.removeEventListener("facemini:video-workflow-history", handleOpenHistory);
    };
  }, [moduleId]);

  function closeHistory() {
    setShowHistory(false);
    window.dispatchEvent(
      new CustomEvent("facemini:video-workflow-history-state", {
        detail: { moduleId, open: false },
      }),
    );
  }

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [modelData, taskData, creditData] = await Promise.all([
          api.getModels(),
          api.getTasks({ filter: "all" }),
          api.getCredits().catch(() => null),
        ]);
        if (!mounted) return;
        setOptions(modelData);
        setTasks(taskData);
        applyCreditsUpdate(setCredits, creditData);
        api.setHasRunningTasks?.(taskData.some((t) => t.status === "processing"));

        const defaultModel = modelData.defaults?.model || modelData.models[0]?.value || "";
        const defaultResolution =
          modelData.defaults?.resolution || modelData.models[0]?.resolution || "720p";
        const defaultOrientation = modelData.defaults?.characterOrientation || "image";
        patchInput({
          model: defaultModel,
          resolution: defaultResolution,
          characterOrientation: defaultOrientation,
        });

        const cachedId = readActiveTaskId();
        const cachedTask = taskData.find((t) => String(t.id) === String(cachedId));
        if (cachedTask && cachedTask.status !== "failed") {
          applyTaskSnapshot(cachedTask);
        } else if (cachedTask?.status === "failed") {
          writeActiveTaskId(null);
        }
      } catch (error) {
        if (mounted) showNotice(error.message || "加载失败");
      }
    }
    load();

    const unsubscribe = api.subscribe(() => {
      api
        .getTasks({ filter: "all" })
        .then((taskData) => {
          if (!mounted) return;
          setTasks(taskData);
          api.setHasRunningTasks?.(taskData.some((t) => t.status === "processing"));

          setTaskState((current) => {
            const task = taskData.find((t) => String(t.id) === String(current.activeTaskId));
            if (!task) return current;
            if (task.status === "failed") {
              writeActiveTaskId(null);
              showNotice(task.error || "任务生成失败", 6000);
              return {
                ...current,
                status: "idle",
                progress: 0,
                error: "",
                activeTaskId: null,
                resultUrl: "",
              };
            }
            if (task.status === "completed") {
              return {
                ...current,
                status: "done",
                progress: 100,
                resultUrl: task.resultUrl || "",
                sourceVideoUrl: task.motionVideoUrl || current.sourceVideoUrl,
                error: "",
              };
            }
            return {
              ...current,
              status: task.progress >= 84 ? "rendering" : "processing",
              progress: task.progress || current.progress,
              resultUrl: task.resultUrl || "",
              sourceVideoUrl: task.motionVideoUrl || current.sourceVideoUrl,
              error: "",
            };
          });
        })
        .catch(() => {});
      api
        .getCredits()
        .then((value) => mounted && applyCreditsUpdate(setCredits, value))
        .catch(() => {});
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [api]);

  useEffect(() => {
    writeActiveTaskId(taskState.activeTaskId);
  }, [taskState.activeTaskId, activeTaskKey]);

  useEffect(() => {
    return () => {
      const { imagePreview, videoPreview } = taskState.input;
      if (imagePreview) window.URL.revokeObjectURL(imagePreview);
      if (videoPreview) window.URL.revokeObjectURL(videoPreview);
    };
  }, []);

  async function selectImage(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      showNotice("请上传图片文件");
      return;
    }
    if (file.size > (options.limits?.maxImageBytes || 10 * 1024 * 1024)) {
      showNotice("图片大小不能超过 10MB");
      return;
    }

    if (taskState.input.imagePreview) window.URL.revokeObjectURL(taskState.input.imagePreview);
    const preview = window.URL.createObjectURL(file);
    patchInput({ imagePreview: preview, imageAsset: null, uploadingField: "image" });
    patchTaskState({ error: "", status: "uploading" });

    try {
      const uploaded = await api.uploadImage(file);
      if (!activeRef.current) return;
      if (!uploaded?.id) throw new Error("图片上传失败，未返回资源 ID");
      patchInput({
        imageAsset: { ...uploaded, fileName: file.name || uploaded.fileName },
        uploadingField: "",
      });
      patchTaskState({ status: "idle" });
    } catch (error) {
      if (!activeRef.current) return;
      window.URL.revokeObjectURL(preview);
      patchInput({ imagePreview: "", uploadingField: "" });
      patchTaskState({ status: "idle" });
      showNotice(error.message || "图片上传失败");
    }
  }

  async function selectVideo(file) {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      showNotice("请上传视频文件");
      return;
    }
    if (file.size > (options.limits?.maxVideoBytes || 200 * 1024 * 1024)) {
      showNotice("视频大小不能超过限制");
      return;
    }

    patchInput({ videoAsset: null, uploadingField: "video" });
    patchTaskState({ error: "", status: "uploading" });

    try {
      const detectedDuration = await readVideoFileDuration(file);
      if (!detectedDuration) throw new Error("无法读取视频时长，请更换视频后重试");
      if (Number(detectedDuration) > 15) throw new Error("视频时长不能超过 15 秒");

      const preview = window.URL.createObjectURL(file);
      const uploaded = await api.uploadVideo(file);
      if (!activeRef.current) {
        window.URL.revokeObjectURL(preview);
        return;
      }
      if (!uploaded?.id) {
        window.URL.revokeObjectURL(preview);
        throw new Error("视频上传失败，未返回资源 ID");
      }

      setTaskState((current) => {
        if (current.input.videoPreview) window.URL.revokeObjectURL(current.input.videoPreview);
        return {
          ...current,
          status: "idle",
          sourceVideoUrl: preview,
          input: {
            ...current.input,
            videoPreview: preview,
            videoAsset: { ...uploaded, fileName: file.name || uploaded.fileName },
            uploadingField: "",
          },
        };
      });
    } catch (error) {
      if (!activeRef.current) return;
      setTaskState((current) => {
        if (current.input.videoPreview) window.URL.revokeObjectURL(current.input.videoPreview);
        return {
          ...current,
          status: "idle",
          input: {
            ...current.input,
            videoPreview: "",
            videoAsset: null,
            uploadingField: "",
          },
        };
      });
      showNotice(error.message || "视频上传失败");
    }
  }

  function clearImage() {
    if (taskState.input.imagePreview) window.URL.revokeObjectURL(taskState.input.imagePreview);
    patchInput({ imageAsset: null, imagePreview: "" });
    patchTaskState({ error: "" });
  }

  function clearVideo() {
    if (taskState.input.videoPreview) window.URL.revokeObjectURL(taskState.input.videoPreview);
    patchInput({ videoAsset: null, videoPreview: "" });
    patchTaskState({ sourceVideoUrl: "", error: "" });
  }

  async function createTask(payload) {
    setIsSubmitting(true);
    patchTaskState({
      error: "",
      status: "processing",
      progress: 8,
      activeTaskId: null,
      resultUrl: "",
    });

    try {
      const task = await api.createTask(payload);
      api
        .getCredits()
        .then((value) => applyCreditsUpdate(setCredits, value))
        .catch(() => {});
      setTasks((current) => [task, ...current.filter((item) => item.id !== task.id)]);
      applyTaskSnapshot(task);
    } catch (error) {
      writeActiveTaskId(null);
      patchTaskState({
        status: "idle",
        progress: 0,
        error: "",
        activeTaskId: null,
      });
      showNotice(error.message || "创建任务失败", 6000);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleGenerate() {
    const input = taskState.input;
    if (!input.imageAsset?.id) {
      showNotice(subjectSlot?.requiredMessage || "请先上传主体素材");
      return;
    }
    if (!input.videoAsset?.id) {
      showNotice(driverSlot?.requiredMessage || "请先上传驱动素材");
      return;
    }
    const payload = buildCreatePayload
      ? buildCreatePayload(input)
      : {
          imageAssetId: input.imageAsset.id,
          videoAssetId: input.videoAsset.id,
          model: input.model,
          resolution: input.resolution,
        };
    createTask(payload);
  }

  function handleRetry() {
    if (!taskState.input.imageAsset?.id || !taskState.input.videoAsset?.id) {
      showNotice("素材已清除，请重新上传");
      return;
    }
    handleGenerate();
  }

  function handleNewTask() {
    patchTaskState({
      status: "idle",
      progress: 0,
      error: "",
      activeTaskId: null,
      resultUrl: "",
    });
    writeActiveTaskId(null);
  }

  function repeatTask(task) {
    closeHistory();
    createTask({
      imageAssetId: task.imageAssetId,
      videoAssetId: task.videoAssetId,
      model: task.model,
      resolution: task.resolution,
      ...(task.characterOrientation ? { characterOrientation: task.characterOrientation } : {}),
    });
  }

  async function performDeleteTask(id) {
    await api.deleteTask(id);
    setTasks((current) => current.filter((task) => task.id !== id));
    if (String(taskState.activeTaskId) === String(id)) {
      handleNewTask();
    }
  }

  const { requestDelete: deleteTask, deleteConfirmDialog } = useDeleteConfirmation({
    onConfirm: performDeleteTask,
    title: "删除历史记录？",
    message: "该处理记录会被移除，删除后无法恢复。",
  });

  const { requestRegenerate: requestRepeat, regenerateConfirmDialog } =
    useRegenerateConfirmation({ onConfirm: repeatTask });

  async function toggleFavorite(id) {
    const updated = await api.toggleFavorite(id);
    setTasks((current) =>
      current.map((task) => (String(task.id) === String(id) ? updated : task)),
    );
  }

  const showResultStep = workflowStatus === "done" && Boolean(resultUrl);

  const activeWorkflowStep = useMemo(() => {
    if (showResultStep) return 3;
    if (
      workflowStatus === "processing" ||
      workflowStatus === "rendering" ||
      isSubmitting
    ) {
      return 2;
    }
    return 1;
  }, [showResultStep, workflowStatus, isSubmitting]);

  const inputStepState = "active";

  const defaultConfig = (
    <>
      {options.models.length > 1 && (
        <div className="vgw-config-chip">
          <span>模型</span>
          <CustomSelect
            ariaLabel="模型"
            value={taskState.input.model}
            onChange={(value) => patchInput({ model: value })}
            options={options.models}
          />
        </div>
      )}
      <div className="vgw-config-chip">
        <span>分辨率</span>
        <CustomSelect
          className="content-fit-select"
          ariaLabel="分辨率"
          value={taskState.input.resolution}
          onChange={(value) => patchInput({ resolution: value })}
          options={resolutionOptions}
        />
      </div>
      {options.characterOrientations?.length > 0 && (
        <div className="vgw-config-chip">
          <span>朝向</span>
          <CustomSelect
            ariaLabel="角色朝向"
            value={taskState.input.characterOrientation}
            onChange={(value) => patchInput({ characterOrientation: value })}
            options={options.characterOrientations}
          />
        </div>
      )}
      <div className="vgw-config-chip vgw-config-chip--meta">
        <span>预计消耗</span>
        <strong>{selectedModel?.basePoints || 0} 积分</strong>
      </div>
      <div className="vgw-config-chip vgw-config-chip--meta">
        <span>预计时长</span>
        <strong>1–3 分钟</strong>
      </div>
    </>
  );

  return (
    <section className="vgw-root" data-status={workflowStatus} data-module={moduleId}>
      <div className="vgw-ambient" aria-hidden="true" />

      {showHistory ? (
        <HistoryPanel
          tasks={tasks}
          onRepeat={requestRepeat}
          onDelete={deleteTask}
          onFavorite={toggleFavorite}
          emptyHint={historyEmptyHint}
        />
      ) : (
        <>
          <WorkflowHeader
            eyebrow={header.eyebrow}
            title={header.title}
            description={header.description}
            workflowStatus={workflowStatus}
          />

          <main className="vgw-workflow" data-active-step={activeWorkflowStep}>
            {activeWorkflowStep === 1 && (
              <InputSection
                stepState={inputStepState}
                workflowStatus={workflowStatus}
                subjectSlot={{
                  kind: "photo",
                  title: subjectSlot.title,
                  hint: subjectSlot.hint,
                  previewUrl: taskState.input.imagePreview,
                  asset: taskState.input.imageAsset,
                  isUploading: taskState.input.uploadingField === "image",
                  accept: "image/*",
                  fileFallback: subjectSlot.fileFallback,
                  onSelect: selectImage,
                  onClear: clearImage,
                }}
                driverSlot={{
                  kind: "video",
                  title: driverSlot.title,
                  hint: driverSlot.hint,
                  previewUrl: taskState.input.videoPreview,
                  asset: taskState.input.videoAsset,
                  isUploading: taskState.input.uploadingField === "video",
                  accept: "video/*",
                  fileFallback: driverSlot.fileFallback,
                  onSelect: selectVideo,
                  onClear: clearVideo,
                }}
                config={
                  renderExtraConfig
                    ? renderExtraConfig({ input: taskState.input, patchInput, options, selectedModel, resolutionOptions })
                    : defaultConfig
                }
              />
            )}

            {activeWorkflowStep === 2 && (
              <ProcessTimeline progress={progress} status={workflowStatus} error={errorMessage} />
            )}

            {activeWorkflowStep === 3 && (
              <ResultViewer
                beforeUrl={sourceVideoUrl}
                afterUrl={resultUrl}
                posterUrl={activeTask?.thumbnailUrl || activeTask?.imageUrl || ""}
                compareLabels={compareLabels}
                showCompare={Boolean(sourceVideoUrl)}
              />
            )}
          </main>

          <ActionBar
            workflowStatus={workflowStatus}
            canGenerate={canGenerate}
            isSubmitting={isSubmitting}
            progress={progress}
            hasResult={Boolean(resultUrl)}
            privacyText={privacyText}
            onGenerate={handleGenerate}
            onRetry={handleRetry}
            onNewTask={handleNewTask}
            resultUrl={resultUrl}
          />

          {notice && <div className="vgw-toast">{notice}</div>}
        </>
      )}

      {deleteConfirmDialog}
      {regenerateConfirmDialog}
    </section>
  );
}
