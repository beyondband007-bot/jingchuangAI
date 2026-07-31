import React, { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  Film,
  Image,
  Loader2,
  Plus,
  Wand2,
  X,
  Zap
} from "lucide-react";
import { emitCreditsUpdated } from "../../api/creditsEvents";
import { hasRunningTasks, taskStatusSignature } from "../../api/taskPolling";
import {
  CreditAlertDialog,
  isRechargeRequiredMessage,
} from "../../components/CreditAlertDialog";
import {
  useDeleteConfirmation,
  useRegenerateConfirmation,
} from "../../components/DeleteConfirmDialog";
import { FeatureViewTabs } from "../../components/FeatureViewTabs";
import { formatBeijingDateTime } from "../../utils/time";
import { enhanceApi } from "./enhanceApi";
import { MarketingTaskCardActions } from "../marketing-tool-ui/MarketingTaskCardActions";
import BillingPoints from "../../components/BillingPoints.jsx";
import { MarketingToolPanel } from "../../components/MarketingToolPanel";
import { PageTitle } from "../../components/PageTitle";
import { HistoryEmptyState } from "../../components/HistoryEmptyState";

const emptyEnhanceOptions = { models: [], defaults: {}, limits: {} };

function formatBytes(bytes) {
  const size = Number(bytes || 0);
  if (!size) return "";
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

function EnhanceCenterState({
  task,
  isSubmitting,
  error,
  onReset,
  onRepeat,
  onDismiss,
  onRecharge,
}) {
  const isVideo = task?.mediaType === "video";

  if (task?.status === "completed" && task.resultUrl) {
    return (
      <section className="marketing-result">
        <header className="marketing-result__head">
          <span><CheckCircle2 size={18} />处理完成</span>
          <p>对比清晰度变化，可下载或继续处理</p>
        </header>
        <div className="marketing-result__compare">
          <figure>
            <figcaption>原图</figcaption>
            {isVideo ? (
              <video src={task.sourceUrl} controls playsInline preload="metadata" poster={task.thumbnailUrl || task.sourceUrl} />
            ) : (
              <img src={task.sourceUrl || task.resultUrl} alt={task.sourceFileName || "原图"} />
            )}
          </figure>
          <figure>
            <figcaption>处理后</figcaption>
            {isVideo ? (
              <video src={task.resultUrl} controls playsInline preload="metadata" poster={task.thumbnailUrl || task.sourceUrl} />
            ) : (
              <img src={task.resultUrl} alt={task.sourceFileName || "画质提升结果"} />
            )}
          </figure>
        </div>
        <footer className="marketing-result__footer">
          <p>已完成本次处理，可下载结果、再次处理当前素材，或上传新素材继续</p>
          <div className="marketing-result__actions">
            <button type="button" onClick={onReset}>处理新素材</button>
            <a href={task.resultUrl} download>
              <Download size={15} />
              下载结果
            </a>
            <button type="button" className="is-primary" onClick={() => onRepeat?.(task)}>
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
      error || task?.error || "画质增强服务返回错误，积分会按任务状态自动处理。";
    if (isRechargeRequiredMessage(message)) {
      return (
        <CreditAlertDialog
          title="这次没有提升成功"
          message={message}
          icon={<Wand2 size={28} />}
          onClose={onDismiss}
          onRecharge={onRecharge}
        />
      );
    }

    return (
      <section className="marketing-runtime-state marketing-runtime-state--failed">
        <span className="marketing-runtime-icon">
          <Wand2 size={24} />
        </span>
        <strong>这次没有增强成功</strong>
        <p>{message}</p>
      </section>
    );
  }

  return (
    <section className="marketing-runtime-state marketing-runtime-state--processing" aria-live="polite">
      <span className="marketing-runtime-spinner">
        <Loader2 size={30} />
      </span>
      <strong>{isSubmitting ? "正在创建画质增强任务" : "正在智能提升画质"}</strong>
      <p>素材正在处理中，完成后会自动回填到这里。</p>
      <div className="marketing-runtime-progress">
        <i style={{ width: `${task?.progress || 28}%` }} />
      </div>
      <small>{task?.progress ? `${task.progress}%` : "任务准备中"} · 请保持页面打开</small>
    </section>
  );
}

function EnhanceTaskCard({ task, onDelete, onFavorite, onRepeat }) {
  const isProcessing = task.status === "processing";
  const isFailed = task.status === "failed";
  const isVideo = task.mediaType === "video";

  return (
    <article className={`watermark-task-card enhance-task-card status-${task.status}`}>
      <div className={`watermark-task-preview enhance-task-preview ${isVideo ? "is-video" : ""}`}>
        {task.resultUrl && !isFailed ? (
          isVideo ? (
            <video src={task.resultUrl} controls playsInline preload="metadata" poster={task.thumbnailUrl || task.sourceUrl} />
          ) : (
            <img src={task.resultUrl} alt={task.sourceFileName || "画质提升结果"} />
          )
        ) : (
          <div className={`watermark-task-placeholder ${isFailed ? "is-failed" : ""}`}>
            {isProcessing ? <Loader2 size={26} /> : isVideo ? <Film size={26} /> : <Image size={26} />}
            <strong>{isFailed ? "增强失败" : "增强中"}</strong>
          </div>
        )}
      </div>
      <div className="watermark-task-meta enhance-task-meta">
        <div className="time-row">
          <span>{formatBeijingDateTime(task.createdAt || task.created_at || task.time) || task.time}</span>
          <strong>{task.price}</strong>
        </div>
        <MarketingTaskCardActions
          task={task}
          onDelete={onDelete}
          onFavorite={onFavorite}
          onRepeat={onRepeat}
        />
      </div>
    </article>
  );
}

function EnhanceUploadSlot({ mode, sourceAsset, previewUrl, isUploading, onSelect, onClear }) {
  const inputRef = useRef(null);
  const isVideo = mode === "video";
  function clearFile(event) {
    event.preventDefault();
    event.stopPropagation();
    onClear?.();
  }

  return (
    <button className={`marketing-composer__upload marketing-tool-upload watermark-upload-slot enhance-upload-slot ${previewUrl ? "has-preview" : ""}`} type="button" onClick={() => inputRef.current?.click()}>
      <input
        ref={inputRef}
        type="file"
        accept={isVideo ? "video/*" : "image/*"}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0] || null;
          event.target.value = "";
          onSelect(file);
        }}
      />
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
          <span>{isVideo ? "建议 15 秒内，最大 200MB" : "支持 JPG/PNG/WebP，最大 10MB"}</span>
        </>
      )}
      {previewUrl && !isUploading && (
        <span
          className="ui-upload-clear-button"
          role="button"
          tabIndex={0}
          aria-label="取消上传"
          onClick={clearFile}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") clearFile(event);
          }}
        >
          <X size={13} />
        </span>
      )}
      {sourceAsset && <small>{sourceAsset.fileName} · {formatBytes(sourceAsset.sizeBytes)}</small>}
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
    </button>
  );
}

function EnhanceComposer({ options, onSubmit, isSubmitting }) {
  const [mode, setMode] = useState("image");
  const [sourceAsset, setSourceAsset] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const isReady = options.models.length > 0;
  const selectedModel = options.models.find((item) => item.kind === mode) || options.models[0];
  const upscaleFactor = options.defaults?.upscaleFactor || selectedModel?.upscaleFactor || "2";
  const canSubmit = Boolean(isReady && sourceAsset && !uploading && !isSubmitting);

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
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if ((mode === "image" && !isImage) || (mode === "video" && !isVideo)) {
      setNotice(mode === "image" ? "请上传图片文件" : "请上传视频文件");
      return;
    }
    if (isImage && file.size > (options.limits?.maxImageBytes || 10 * 1024 * 1024)) {
      setNotice("图片大小不能超过 10MB");
      return;
    }
    if (isVideo && file.size > (options.limits?.maxVideoBytes || 200 * 1024 * 1024)) {
      setNotice("视频大小不能超过 200MB");
      return;
    }

    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    setPreviewUrl(window.URL.createObjectURL(file));
    setSourceAsset(null);
    setUploading(true);
    setNotice("");
    try {
      setSourceAsset(await enhanceApi.uploadSource(file));
      setNotice("素材上传完成");
    } catch (error) {
      setPreviewUrl("");
      setNotice(error.message || "素材上传失败");
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    if (!sourceAsset) {
      setNotice(mode === "image" ? "请先上传图片文件" : "请先上传视频文件");
      return;
    }
    setNotice("");
    onSubmit({
      sourceAssetId: sourceAsset.id,
      model: selectedModel?.value,
      upscaleFactor
    });
  }

  return (
    <div className="marketing-composer marketing-composer--inline marketing-tool-card watermark-composer enhance-composer" aria-label="画质增强上传面板">
      <div className="marketing-composer__tabs marketing-tool-tabs watermark-mode-tabs enhance-mode-tabs">
        <button className={mode === "image" ? "is-active" : ""} type="button" disabled={!isReady} onClick={() => changeMode("image")}>
          <Image size={15} />
          图片增强
        </button>
        <button className={mode === "video" ? "is-active" : ""} type="button" disabled={!isReady} onClick={() => changeMode("video")}>
          <Film size={15} />
          视频增强
        </button>
      </div>
      <EnhanceUploadSlot
        mode={mode}
        sourceAsset={sourceAsset}
        previewUrl={previewUrl}
        isUploading={uploading}
        onSelect={selectSource}
        onClear={clearSource}
      />
      <div className="marketing-composer__footer marketing-tool-footer watermark-composer-footer enhance-composer-footer">
        <span>{notice || (mode === "video" ? `AI 将以 ${upscaleFactor}x 提升视频清晰度并保留原始声音` : `AI 将以 ${upscaleFactor}x 提升图片细节和清晰度`)}</span>
        <strong>
          {sourceAsset ? (
            <>
              预计消耗 <BillingPoints feature="enhance" payload={{ kind: mode }} fallbackPoints={mode === "video" ? 0 : 30} /> 积分
            </>
          ) : (
            "请上传文件"
          )}
        </strong>
        <button className="ui-send-button" type="button" onClick={submit} disabled={!canSubmit} aria-label="开始提升">
          {isSubmitting ? <Loader2 size={18} /> : <Zap size={18} />}
        </button>
      </div>
    </div>
  );
}

export function EnhanceView({ onOpenFeature }) {
  const [tasks, setTasks] = useState([]);
  const [options, setOptions] = useState(emptyEnhanceOptions);
  const [viewTab, setViewTab] = useState("home");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedTaskId, setSubmittedTaskId] = useState(null);
  const taskStatusSignatureRef = useRef("");

  function applyCredits(creditsValue) {
    if (!creditsValue) return;
    emitCreditsUpdated(creditsValue);
  }

  useEffect(() => {
    let mounted = true;
    function applyTaskList(value) {
      if (!mounted) return;
      const nextSignature = taskStatusSignature(value);
      const didStatusChange =
        taskStatusSignatureRef.current &&
        taskStatusSignatureRef.current !== nextSignature;
      taskStatusSignatureRef.current = nextSignature;
      enhanceApi.setHasRunningTasks(hasRunningTasks(value));
      setTasks(value);
      if (didStatusChange) {
        enhanceApi.getCredits().then((nextCredits) => mounted && applyCredits(nextCredits)).catch(() => {});
      }
    }
    async function load() {
      try {
        const [modelData, taskData, creditData] = await Promise.all([
          enhanceApi.getModels(),
          enhanceApi.getTasks(),
          enhanceApi.getCredits().catch(() => null)
        ]);
        if (!mounted) return;
        setOptions(modelData);
        applyTaskList(taskData);
        applyCredits(creditData);
      } catch (error) {
        if (mounted) setSubmitError(error.message || "加载增强功能失败");
      }
    }
    load();
    const unsubscribe = enhanceApi.subscribe(() => {
      enhanceApi.getTasks().then(applyTaskList).catch(() => {});
      enhanceApi.getCredits().then((value) => mounted && applyCredits(value)).catch(() => {});
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const submittedTask = tasks.find((task) => String(task.id) === String(submittedTaskId)) || null;
  const showCenterState = isSubmitting || submitError || submittedTask;
  const showCompletedResult = submittedTask?.status === "completed";
  const visibleTasks = viewTab === "favorite"
    ? tasks.filter((task) => task.favorite && String(task.id) !== String(submittedTaskId))
    : viewTab === "recent"
      ? tasks.filter((task) => String(task.id) !== String(submittedTaskId))
      : [];
  const showEmptyHero = viewTab === "home" && !showCenterState;
  const showRecentEmpty = (viewTab === "recent" || viewTab === "favorite") && !showCenterState && visibleTasks.length === 0;

  async function createTask(payload) {
    setSubmitError("");
    setIsSubmitting(true);
    setSubmittedTaskId(null);
    setViewTab("home");
    try {
      const task = await enhanceApi.createTask(payload);
      setSubmittedTaskId(task.id);
      setTasks((current) => [task, ...current.filter((item) => item.id !== task.id)]);
      enhanceApi.getCredits().then(applyCredits).catch(() => {});
    } catch (error) {
      setSubmitError(error.message || "创建增强任务失败");
      enhanceApi.getCredits().then(applyCredits).catch(() => {});
    } finally {
      setIsSubmitting(false);
    }
  }

  async function performDeleteTask(id) {
    await enhanceApi.deleteTask(id);
    setTasks((current) => current.filter((task) => task.id !== id));
    setSubmittedTaskId((current) => String(current) === String(id) ? null : current);
  }

  const { requestDelete: deleteTask, deleteConfirmDialog } =
    useDeleteConfirmation({
      onConfirm: performDeleteTask,
      title: "删除历史记录？",
      message: "该增强记录会被移除，删除后无法恢复。",
    });

  async function toggleFavorite(id) {
    const updated = await enhanceApi.toggleFavorite(id);
    setTasks((current) => current.map((task) => String(task.id) === String(id) ? updated : task));
  }

  function repeatTask(task) {
    createTask({
      sourceAssetId: task.sourceAssetId,
      model: task.model,
      upscaleFactor: task.upscaleFactor
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
    <section className="marketing-tool-root marketing-tool--enhance enhance-view-root">
      <FeatureViewTabs
        currentLabel="画质提升"
        activeView={viewTab === "recent" ? "recent" : "home"}
        onHome={() => setViewTab("home")}
        onHistory={() => {
          setViewTab("recent");
          setSubmittedTaskId(null);
        }}
      />
      <div className={`marketing-canvas enhance-canvas ${showCenterState ? "has-active-task" : ""} ${viewTab !== "home" ? "is-list" : ""} ${showRecentEmpty ? "is-empty" : ""}`}>
        {showEmptyHero && (
          <MarketingToolPanel className="watermark-home-panel enhance-home-panel">
            <div className="marketing-panel-hero watermark-hero-empty enhance-hero-empty">
              <span className="marketing-panel-hero__icon watermark-hero-icon enhance-hero-icon">
                <Wand2 size={36} />
              </span>
              <PageTitle className="marketing-panel-hero__title">画质提升</PageTitle>
              <p className="marketing-panel-hero__subtitle">上传图片或者视频，AI 一键提升清晰度、细节和整体质感</p>
            </div>
            <EnhanceComposer
              options={options}
              onSubmit={createTask}
              isSubmitting={isSubmitting}
            />
          </MarketingToolPanel>
        )}
        {showCenterState && showCompletedResult ? (
          <MarketingToolPanel className="watermark-state-panel enhance-state-panel">
            <div className="marketing-panel-hero watermark-hero-empty enhance-hero-empty">
              <span className="marketing-panel-hero__icon watermark-hero-icon enhance-hero-icon">
                <Wand2 size={36} />
              </span>
              <PageTitle className="marketing-panel-hero__title">画质提升</PageTitle>
              <p className="marketing-panel-hero__subtitle">上传图片或者视频，AI 一键提升清晰度、细节和整体质感</p>
            </div>
            <EnhanceCenterState
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
          <EnhanceCenterState
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
          <HistoryEmptyState
            title={viewTab === "favorite" ? "暂无收藏结果" : "暂无历史记录"}
          />
        )}
        <div className={`watermark-results-feed enhance-results-feed ${visibleTasks.length ? "has-results" : ""}`}>
          {visibleTasks.map((task) => (
            <EnhanceTaskCard
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
