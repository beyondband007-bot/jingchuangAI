import React, { useEffect, useRef, useState } from "react";
import { Upload } from "@arco-design/web-react";
import {
  CheckCircle2,
  Download,
  Eraser,
  Film,
  Image,
  Layers,
  Loader2,
  RefreshCcw,
  Star,
  Trash2,
  Video,
  X,
  Zap,
} from "lucide-react";
import BillingPoints from "../../components/BillingPoints.jsx";
import { FeatureViewTabs } from "../../components/FeatureViewTabs.jsx";
import { MarketingToolPanel } from "../../components/MarketingToolPanel";
import {
  useDeleteConfirmation,
  useRegenerateConfirmation,
} from "../../components/DeleteConfirmDialog";
import { emitCreditsUpdated } from "../../api/creditsEvents";
import { hasRunningTasks, taskStatusSignature } from "../../api/taskPolling";
import { watermarkApi } from "../../api/watermarkApi";
import { formatBeijingDateTime } from "../../utils/time";
import "./watermark.css";

function cleanDisplayName(value, fallback = "素材文件") {
  const text = String(value || "").trim();
  if (!text) return fallback;
  const suspiciousCount = (text.match(/[\uFFFD\u951F]/g) || []).length;
  if (suspiciousCount >= 2 || /[\u00E3\u00C2]/.test(text)) return fallback;
  return text;
}

function applyCreditsUpdate(setCredits, credits) {
  if (!credits) return;
  setCredits(credits);
  emitCreditsUpdated(credits);
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}

const emptyWatermarkOptions = {
  models: [
    {
      value: "kie-watermark-image",
      label: "图片去水印",
      kind: "image",
      providerModel: "gpt-image-2-image-to-image",
      basePoints: 25,
      resolution: "2K",
    },
    {
      value: "kie-watermark-video",
      label: "视频去水印",
      kind: "video",
      providerModel: "wan/2-7-r2v",
      basePoints: 100,
      resolution: "720p",
    },
  ],
  defaults: {
    imageModel: "kie-watermark-image",
    videoModel: "kie-watermark-video",
    imageResolution: "2K",
    videoResolution: "720p",
  },
  limits: {
    maxImageBytes: 10 * 1024 * 1024,
    maxVideoBytes: 200 * 1024 * 1024,
    recommendedVideoSeconds: 15,
  },
};

function WatermarkCenterState({
  task,
  isSubmitting,
  error,
  onReset,
  onRepeat,
  onDismiss,
  onRecharge,
}) {
  if (task?.status === "completed") {
    const isVideo = task.mediaType === "video";
    return (
      <section className="marketing-complete-state watermark-center-state marketing-result-card is-completed">
        <header className="marketing-result-head">
          <span>
            <CheckCircle2 size={18} />
            处理完成
          </span>
          <p>对比效果如下，可下载或继续处理</p>
        </header>
        <div className="marketing-result-compare">
          <figure>
            <figcaption>原图</figcaption>
            {isVideo ? (
              <video
                src={task.sourceUrl}
                controls
                playsInline
                poster={task.thumbnailUrl || task.sourceUrl}
              />
            ) : (
              <img
                src={task.sourceUrl || task.resultUrl}
                alt={task.sourceFileName || "原图"}
              />
            )}
          </figure>
          <figure>
            <figcaption>处理后</figcaption>
            {isVideo ? (
              <video
                src={task.resultUrl}
                controls
                playsInline
                poster={task.thumbnailUrl || task.sourceUrl}
              />
            ) : (
              <img
                src={task.resultUrl}
                alt={task.sourceFileName || "去水印结果"}
              />
            )}
          </figure>
        </div>
        <footer className="marketing-result-footer">
          <p>已完成本次处理，可下载结果、再次处理当前素材，或上传新素材继续</p>
          <div className="marketing-result-actions">
            <button type="button" onClick={onReset}>
              处理新素材
            </button>
            <a href={task.resultUrl} download>
              <Download size={15} />
              下载结果
            </a>
            <button
              type="button"
              className="is-primary"
              onClick={() => onRepeat?.(task)}
            >
              <Zap size={15} />
              再次处理
            </button>
          </div>
        </footer>
      </section>
    );
  }

  if (error || task?.status === "failed") {
    const message =
      error ||
      task?.error ||
      "处理服务返回了错误，积分会按任务状态自动处理。";
    return (
      <div
        className="remove-bg-alert-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-bg-alert-title"
      >
        <button
          className="remove-bg-alert-backdrop"
          type="button"
          aria-label="关闭提醒"
          onClick={onDismiss}
        />
        <section className="remove-bg-alert-dialog">
          <button
            className="remove-bg-alert-close"
            type="button"
            aria-label="关闭提醒"
            onClick={onDismiss}
          >
            <X size={18} />
          </button>
          <span className="remove-bg-alert-icon" aria-hidden="true">
            <Layers size={28} />
          </span>
          <div className="remove-bg-alert-copy">
            <strong id="remove-bg-alert-title">这次没有去水印成功</strong>
            <p>{message}</p>
          </div>
          <div className="remove-bg-alert-actions">
            <button type="button" onClick={onDismiss}>
              关闭
            </button>
            <button type="button" className="is-primary" onClick={onRecharge}>
              去充值
            </button>
          </div>
        </section>
      </div>
    );
  }

  return (
    <section
      className="marketing-process-state watermark-center-state is-processing"
      aria-live="polite"
    >
      <span className="watermark-center-spinner">
        <Loader2 size={30} />
      </span>
      <strong>
        {isSubmitting ? "正在创建去水印任务" : "正在智能去除水印"}
      </strong>
      <p>素材正在处理中，完成后会自动回填到这里。</p>
      <div className="marketing-process-progress watermark-center-progress">
        <i style={{ width: `${task?.progress || 28}%` }} />
      </div>
      <small>
        {task?.progress ? `${task.progress}%` : "任务准备中"} · 请保持页面打开
      </small>
    </section>
  );
}

function WatermarkTaskCard({ task, onDelete, onFavorite, onRepeat }) {
  const isProcessing = task.status === "processing";
  const isFailed = task.status === "failed";
  const isCompleted = task.status === "completed" && Boolean(task.resultUrl);
  const canUseCompletedActions = isCompleted;
  const canRetryOrDelete = isCompleted || isFailed;
  const isVideo = task.mediaType === "video";

  return (
    <article className={`watermark-task-card status-${task.status}`}>
      <div className={`watermark-task-preview ${isVideo ? "is-video" : ""}`}>
        {task.resultUrl && !isFailed ? (
          isVideo ? (
            <video
              src={task.resultUrl}
              controls
              playsInline
              preload="metadata"
              poster={task.thumbnailUrl || task.sourceUrl}
            />
          ) : (
            <img
              src={task.resultUrl}
              alt={task.sourceFileName || "去水印结果"}
            />
          )
        ) : (
          <div
            className={`watermark-task-placeholder ${isFailed ? "is-failed" : ""}`}
          >
            {isProcessing ? (
              <Loader2 size={26} />
            ) : isVideo ? (
              <Video size={26} />
            ) : (
              <Image size={26} />
            )}
            <strong>{isFailed ? "生成失败" : "生成中"}</strong>
          </div>
        )}
      </div>
      <div className="watermark-task-meta">
        <div className="time-row">
          <span>{formatBeijingDateTime(task.createdAt || task.created_at || task.time) || task.time}</span>
          <strong>{task.price}</strong>
        </div>
        <div className="card-actions watermark-card-actions">
          <button
            className={`icon-circle ${task.favorite ? "is-favorite" : ""}`}
            type="button"
            onClick={() => onFavorite(task.id)}
            disabled={!canUseCompletedActions}
            aria-label="收藏"
          >
            <Star size={17} fill={task.favorite ? "#f8d545" : "none"} />
          </button>
          {canUseCompletedActions ? (
            <a className="card-action-link" href={task.resultUrl} download>
              <Download size={15} />
              下载
            </a>
          ) : (
            <button type="button" disabled>
              <Download size={15} />
              下载
            </button>
          )}
          <button type="button" onClick={() => onRepeat(task)} disabled={!canRetryOrDelete}>
            <RefreshCcw size={15} />
            再次生成
          </button>
          <button type="button" onClick={() => onDelete(task.id)} disabled={!canRetryOrDelete}>
            <Trash2 size={15} />
            删除
          </button>
        </div>
      </div>
    </article>
  );
}

function WatermarkUploadSlot({
  mode,
  sourceAsset,
  previewUrl,
  isUploading,
  disabled = false,
  onSelect,
  onClear,
  onRequireAuth,
}) {
  const isVideo = mode === "video";

  function clearFile(event) {
    event.preventDefault();
    event.stopPropagation();
    onClear?.();
  }

  function renderUploadSlot(uploadDisabled = false) {
    return (
      <div
        className={`marketing-tool-upload watermark-upload-slot ${previewUrl ? "has-preview" : ""}`}
        role="button"
        tabIndex={uploadDisabled ? 0 : -1}
        aria-disabled={uploadDisabled || isUploading}
        onClick={uploadDisabled ? onRequireAuth : undefined}
        onKeyDown={(event) => {
          if (!uploadDisabled) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onRequireAuth?.();
          }
        }}
      >
        {previewUrl ? (
          isVideo ? (
            <video src={previewUrl} muted playsInline preload="metadata" />
          ) : (
            <img src={previewUrl} alt="上传素材预览" />
          )
        ) : (
          <>
            <span className="marketing-upload-icon" aria-hidden="true">
              <img src="/assets/marketing/upload.svg" alt="" />
            </span>
            <strong>{isVideo ? "上传视频文件" : "上传图片文件"}</strong>
            <span>
              {isVideo ? "建议 15 秒内，最大 200MB" : "支持 JPG/PNG，最大 10MB"}
            </span>
          </>
        )}
        {previewUrl && !isUploading && (
          <span
            className="upload-clear-button"
            role="button"
            tabIndex={0}
            title="取消上传"
            aria-label="取消上传"
            onClick={clearFile}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") clearFile(event);
            }}
          >
            <X size={13} />
          </span>
        )}
        {sourceAsset && (
          <small>
            {cleanDisplayName(sourceAsset.fileName, isVideo ? "视频素材" : "图片素材")} · {formatBytes(sourceAsset.sizeBytes)}
          </small>
        )}
        {isUploading && (
          <span className="watermark-uploading">
            <Loader2 size={16} />
            上传中
          </span>
        )}
        {!isUploading && previewUrl && (
          <span className="watermark-upload-kind">
            {isVideo ? <Film size={14} /> : <Image size={14} />}
            更换素材
          </span>
        )}
      </div>
    );
  }

  if (disabled) {
    return renderUploadSlot(true);
  }

  return (
    <Upload
      accept={isVideo ? "video/*" : "image/*"}
      className="watermark-upload-control"
      customRequest={({ file, onSuccess, onError }) => {
        Promise.resolve(onSelect?.(file))
          .then(() => onSuccess?.({}))
          .catch((error) => onError?.(error));
        return { abort() {} };
      }}
      disabled={isUploading}
      drag
      multiple={false}
      showUploadList={false}
    >
      {renderUploadSlot(false)}
    </Upload>
  );
}

function WatermarkComposer({
  options,
  onSubmit,
  isSubmitting,
  authUser,
  onOpenAuth,
  isActive = true,
}) {
  const [mode, setMode] = useState("image");
  const [sourceAsset, setSourceAsset] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const activeRef = useRef(isActive);
  const isGuest = Boolean(authUser?.isGuest);

  useEffect(() => {
    activeRef.current = isActive;
    if (isActive) return;
    setSourceAsset(null);
    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setNotice("");
    setUploading(false);
  }, [isActive, previewUrl]);

  useEffect(() => {
    return () => {
      if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const selectedModel =
    options.models.find((item) => item.kind === mode) || options.models[0];
  const resolution =
    mode === "video"
      ? options.defaults?.videoResolution || "720p"
      : options.defaults?.imageResolution || "2K";
  const price = selectedModel?.basePoints || 0;
  const canSubmit = Boolean(
    !isGuest && sourceAsset && !uploading && !isSubmitting,
  );

  function changeMode(nextMode) {
    setMode(nextMode);
    setSourceAsset(null);
    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setNotice("");
  }

  function clearSource() {
    setSourceAsset(null);
    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setNotice("");
  }

  async function selectSource(file) {
    if (isGuest) {
      setNotice("请先登录");
      onOpenAuth?.("login");
      return;
    }
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if ((mode === "image" && !isImage) || (mode === "video" && !isVideo)) {
      setNotice(mode === "image" ? "请上传图片文件" : "请上传视频文件");
      return;
    }
    if (
      isImage &&
      file.size > (options.limits?.maxImageBytes || 10 * 1024 * 1024)
    ) {
      setNotice("图片大小不能超过 10MB");
      return;
    }
    if (
      isVideo &&
      file.size > (options.limits?.maxVideoBytes || 200 * 1024 * 1024)
    ) {
      setNotice("视频大小不能超过 100MB");
      return;
    }

    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    setPreviewUrl(window.URL.createObjectURL(file));
    setSourceAsset(null);
    setUploading(true);
    setNotice("");
    try {
      const uploaded = await watermarkApi.uploadSource(file);
      if (!activeRef.current) return;
      setSourceAsset(uploaded);
      setNotice("素材上传完成");
    } catch (error) {
      if (!activeRef.current) return;
      setPreviewUrl("");
      setNotice(error.message || "素材上传失败");
    } finally {
      if (activeRef.current) setUploading(false);
    }
  }

  function submit() {
    if (isGuest) {
      setNotice("请先登录");
      onOpenAuth?.("login");
      return;
    }
    if (!sourceAsset) {
      setNotice(mode === "image" ? "请先上传图片文件" : "请先上传视频文件");
      return;
    }
    setNotice("");
    onSubmit({
      sourceAssetId: sourceAsset.id,
      model: selectedModel?.value,
      resolution,
    });
  }

  return (
    <div className="marketing-tool-card watermark-composer" aria-label="去水印上传面板">
      <div className="marketing-tool-tabs watermark-mode-tabs">
        <button
          className={mode === "image" ? "is-active" : ""}
          type="button"
          onClick={() => changeMode("image")}
        >
          <Image size={15} />
          图片去水印
        </button>
        <button
          className={mode === "video" ? "is-active" : ""}
          type="button"
          onClick={() => changeMode("video")}
        >
          <Film size={15} />
          视频去水印
        </button>
      </div>
      <WatermarkUploadSlot
        mode={mode}
        sourceAsset={sourceAsset}
        previewUrl={previewUrl}
        isUploading={uploading}
        disabled={isGuest}
        onSelect={selectSource}
        onClear={clearSource}
        onRequireAuth={() => {
          setNotice("请先登录");
          onOpenAuth?.("login");
        }}
      />
      <div className="marketing-tool-footer watermark-composer-footer">
        <span>
          {notice ||
            (mode === "video"
              ? "视频会保留原音频并尝试自然修复水印区域"
              : "图片会自动修复水印区域并保持主体内容")}
        </span>
        <strong><BillingPoints points={price} /></strong>
        <button
          className="send-button"
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          aria-label="开始去水印"
        >
          {isSubmitting ? <Loader2 size={18} /> : <Zap size={18} />}
        </button>
      </div>
    </div>
  );
}

export function WatermarkRemovalView({
  authUser,
  onOpenAuth,
  onOpenFeature,
  isActive = true,
}) {
  const [tasks, setTasks] = useState([]);
  const [options, setOptions] = useState(emptyWatermarkOptions);
  const [, setCredits] = useState(null);
  const [viewTab, setViewTab] = useState("home");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedTaskId, setSubmittedTaskId] = useState(null);
  const taskStatusSignatureRef = useRef("");

  useEffect(() => {
    let mounted = true;
    function applyTaskList(value) {
      if (!mounted) return;
      const nextSignature = taskStatusSignature(value);
      const didStatusChange =
        taskStatusSignatureRef.current &&
        taskStatusSignatureRef.current !== nextSignature;
      taskStatusSignatureRef.current = nextSignature;
      watermarkApi.setHasRunningTasks(hasRunningTasks(value));
      setTasks(value);
      if (didStatusChange) {
        watermarkApi
          .getCredits()
          .then(
            (creditsValue) =>
              mounted && applyCreditsUpdate(setCredits, creditsValue),
          )
          .catch(() => {});
      }
    }
    function load() {
      watermarkApi
        .getModels()
        .then((modelData) => mounted && setOptions(modelData))
        .catch(() => {});
      watermarkApi
        .getTasks()
        .then(applyTaskList)
        .catch((error) => {
          if (mounted) setSubmitError(error.message || "加载去水印失败");
        });
      watermarkApi
        .getCredits()
        .then((creditData) => mounted && applyCreditsUpdate(setCredits, creditData))
        .catch(() => {});
    }
    load();
    const unsubscribe = watermarkApi.subscribe(() => {
      watermarkApi
        .getTasks()
        .then(applyTaskList)
        .catch(() => {});
      watermarkApi
        .getCredits()
        .then((value) => mounted && applyCreditsUpdate(setCredits, value))
        .catch(() => {});
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const submittedTask =
    tasks.find((task) => String(task.id) === String(submittedTaskId)) || null;
  const showCenterState = isSubmitting || submitError || submittedTask;
  const showCompletedResult = submittedTask?.status === "completed";
  const visibleTasks =
    viewTab === "favorite"
      ? tasks.filter(
          (task) =>
            task.favorite && String(task.id) !== String(submittedTaskId),
        )
      : viewTab === "recent"
        ? tasks.filter((task) => String(task.id) !== String(submittedTaskId))
        : [];
  const showEmptyHero = viewTab === "home" && !showCenterState;
  const showRecentEmpty =
    (viewTab === "recent" || viewTab === "favorite") &&
    !showCenterState &&
    visibleTasks.length === 0;

  async function createTask(payload) {
    setSubmitError("");
    setIsSubmitting(true);
    setSubmittedTaskId(null);
    setViewTab("home");
    try {
      const task = await watermarkApi.createTask(payload);
      watermarkApi
        .getCredits()
        .then((value) => applyCreditsUpdate(setCredits, value))
        .catch(() => {});
      setSubmittedTaskId(task.id);
      setTasks((current) => [
        task,
        ...current.filter((item) => item.id !== task.id),
      ]);
    } catch (error) {
      setSubmitError(error.message || "创建去水印任务失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function performDeleteTask(id) {
    await watermarkApi.deleteTask(id);
    setTasks((current) => current.filter((task) => task.id !== id));
    setSubmittedTaskId((current) =>
      String(current) === String(id) ? null : current,
    );
  }

  const { requestDelete: deleteTask, deleteConfirmDialog } =
    useDeleteConfirmation({
      onConfirm: performDeleteTask,
      title: "删除历史记录？",
      message: "该去水印记录会被移除，删除后无法恢复。",
    });

  async function toggleFavorite(id) {
    const updated = await watermarkApi.toggleFavorite(id);
    setTasks((current) =>
      current.map((task) => (String(task.id) === String(id) ? updated : task)),
    );
  }

  function repeatTask(task) {
    createTask({
      sourceAssetId: task.sourceAssetId,
      model: task.model,
      resolution: task.resolution,
      prompt: task.prompt,
    });
  }

  const { requestRegenerate: requestRepeat, regenerateConfirmDialog } =
    useRegenerateConfirmation({
      onConfirm: repeatTask,
    });

  function dismissCenterState() {
    setSubmitError("");
    setSubmittedTaskId(null);
  }

  function goToRecharge() {
    dismissCenterState();
    onOpenFeature?.("billing");
  }

  return (
    <section className="watermark-view-root">
      <FeatureViewTabs
        currentLabel="去水印"
        activeView={viewTab === "recent" ? "recent" : "home"}
        onHome={() => setViewTab("home")}
        onHistory={() => {
          setViewTab("recent");
          setSubmittedTaskId(null);
        }}
      />
      <div
        className={`watermark-canvas ${showCenterState ? "has-active-task" : ""} ${viewTab !== "home" ? "is-list" : ""}`}
      >
        {showEmptyHero && (
          <MarketingToolPanel className="watermark-home-panel">
            <div className="watermark-hero-empty">
              <span className="watermark-hero-icon">
                <Eraser size={36} />
              </span>
              <h1>智能去水印</h1>
              <p>上传图片或视频，AI 智能一键去除水印</p>
            </div>
            <WatermarkComposer
              options={options}
              onSubmit={createTask}
              isSubmitting={isSubmitting}
              authUser={authUser}
              onOpenAuth={onOpenAuth}
              isActive={isActive}
            />
          </MarketingToolPanel>
        )}
        {showCenterState && showCompletedResult ? (
          <MarketingToolPanel className="watermark-state-panel">
            <div className="watermark-hero-empty">
              <span className="watermark-hero-icon">
                <Eraser size={36} />
              </span>
              <h1>智能去水印</h1>
              <p>上传图片或视频，AI 智能一键去除水印</p>
            </div>
            <WatermarkCenterState
              task={submittedTask}
              isSubmitting={isSubmitting && !submittedTask}
              error={submitError}
              onReset={() => {
                setSubmittedTaskId(null);
              }}
              onRepeat={requestRepeat}
              onDismiss={dismissCenterState}
              onRecharge={goToRecharge}
            />
          </MarketingToolPanel>
        ) : showCenterState ? (
          <WatermarkCenterState
            task={submittedTask}
            isSubmitting={isSubmitting && !submittedTask}
            error={submitError}
            onReset={() => {
              setSubmittedTaskId(null);
            }}
            onRepeat={requestRepeat}
            onDismiss={dismissCenterState}
            onRecharge={goToRecharge}
          />
        ) : null}
        {showRecentEmpty && (
          <div className="watermark-recent-empty">
            <Eraser size={24} />
            <strong>
              {viewTab === "favorite" ? "暂无收藏结果" : "暂无生成记录"}
            </strong>
            <p>
              {viewTab === "favorite"
                ? "收藏后的去水印结果会显示在这里"
                : "生成完成的图片或视频会保存在这里"}
            </p>
          </div>
        )}
        <div
          className={`watermark-results-feed ${visibleTasks.length ? "has-results" : ""}`}
        >
          {visibleTasks.map((task) => (
            <WatermarkTaskCard
              key={task.id}
              task={task}
              onDelete={deleteTask}
              onFavorite={toggleFavorite}
              onRepeat={requestRepeat}
            />
          ))}
        </div>
      </div>
      {deleteConfirmDialog}
      {regenerateConfirmDialog}
    </section>
  );
}
