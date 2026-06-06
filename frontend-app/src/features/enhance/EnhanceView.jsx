import React, { useEffect, useRef, useState } from "react";
import {
  CheckCircle2,
  Download,
  Film,
  Image,
  Loader2,
  Plus,
  RefreshCcw,
  Send,
  Star,
  Trash2,
  Wand2,
  X
} from "lucide-react";
import { enhanceApi } from "./enhanceApi";

const emptyEnhanceOptions = { models: [], defaults: {}, limits: {} };

function formatBytes(bytes) {
  const size = Number(bytes || 0);
  if (!size) return "";
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

function EnhanceCenterState({ task, isSubmitting, error, onOpenRecent }) {
  const isVideo = task?.mediaType === "video";

  if (task?.status === "completed" && task.resultUrl) {
    return (
      <section className="watermark-center-state enhance-center-state is-completed">
        <div className={`watermark-result-stage enhance-result-stage ${isVideo ? "is-video" : ""}`}>
          {isVideo ? (
            <video src={task.resultUrl} controls playsInline preload="metadata" poster={task.thumbnailUrl || task.sourceUrl} />
          ) : (
            <img src={task.resultUrl} alt={task.sourceFileName || "画质增强结果"} />
          )}
        </div>
        <div className="watermark-result-copy enhance-result-copy">
          <span className="watermark-center-icon enhance-center-icon">
            <CheckCircle2 size={24} />
          </span>
          <h2>画质增强完成</h2>
          <p>{isVideo ? "视频清晰度已提升，原始节奏和声音已保留。" : "图片细节已增强，主体内容和构图保持不变。"}</p>
          <div className="watermark-result-actions enhance-result-actions">
            <a href={task.resultUrl} download>
              <Download size={15} />
              下载
            </a>
            <button type="button" onClick={onOpenRecent}>查看最近生成</button>
          </div>
        </div>
      </section>
    );
  }

  if (error || task?.status === "failed") {
    return (
      <section className="watermark-center-state enhance-center-state is-failed">
        <span className="watermark-center-icon enhance-center-icon">
          <Wand2 size={24} />
        </span>
        <strong>这次没有增强成功</strong>
        <p>{error || task?.error || "画质增强服务返回错误，积分会按任务状态自动处理。"}</p>
      </section>
    );
  }

  return (
    <section className="watermark-center-state enhance-center-state is-processing" aria-live="polite">
      <span className="watermark-center-spinner">
        <Loader2 size={30} />
      </span>
      <strong>{isSubmitting ? "正在创建画质增强任务" : "正在智能提升画质"}</strong>
      <p>素材正在处理中，完成后会自动回填到这里。</p>
      <div className="watermark-center-progress enhance-center-progress">
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
            <img src={task.resultUrl} alt={task.sourceFileName || "画质增强结果"} />
          )
        ) : (
          <div className={`watermark-task-placeholder ${isFailed ? "is-failed" : ""}`}>
            {isProcessing ? <Loader2 size={26} /> : isVideo ? <Film size={26} /> : <Image size={26} />}
            <strong>{isFailed ? "增强失败" : "增强中"}</strong>
          </div>
        )}
      </div>
      <div className="watermark-task-meta enhance-task-meta">
        <div className="tag-row">
          <span className="model-tag">{isVideo ? "视频画质增强" : "图片画质增强"}</span>
          <span className="ratio-tag">{task.upscaleFactor || "2"}x</span>
        </div>
        <div className="time-row">
          <span>{task.time}</span>
          <strong>{task.price}</strong>
        </div>
        <p>{task.error || task.sourceFileName || "智能画质增强结果"}</p>
        <div className="watermark-source-row">
          <span>
            {isVideo ? <Film size={14} /> : <Image size={14} />}
            {task.sourceFileName || "源素材"}
          </span>
        </div>
        <div className="card-actions watermark-card-actions">
          <button className={`icon-circle ${task.favorite ? "is-favorite" : ""}`} type="button" onClick={() => onFavorite(task.id)} aria-label="收藏">
            <Star size={17} fill={task.favorite ? "#f8d545" : "none"} />
          </button>
          {task.resultUrl ? (
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
          <button type="button" onClick={() => onRepeat(task)}>
            <RefreshCcw size={15} />
            再次生成
          </button>
          <button type="button" onClick={() => onDelete(task.id)}>
            <Trash2 size={15} />
            删除
          </button>
        </div>
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
    <button className={`watermark-upload-slot enhance-upload-slot ${previewUrl ? "has-preview" : ""}`} type="button" onClick={() => inputRef.current?.click()}>
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
          <Plus size={18} />
          <strong>{isVideo ? "+ 上传视频文件" : "+ 上传图片文件"}</strong>
          <span>{isVideo ? "建议 15 秒内，最大 200MB" : "支持 JPG/PNG/WebP，最大 10MB"}</span>
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
  const price = isReady ? `${selectedModel?.basePoints || 0} 积分` : "计算中";
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
    <div className="watermark-composer enhance-composer" aria-label="画质增强上传面板">
      <div className="watermark-mode-tabs enhance-mode-tabs">
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
      <div className="watermark-composer-footer enhance-composer-footer">
        <span>{notice || (mode === "video" ? `AI 将以 ${upscaleFactor}x 提升视频清晰度并保留原始声音` : `AI 将以 ${upscaleFactor}x 提升图片细节和清晰度`)}</span>
        <strong>{price}</strong>
        <button className="send-button" type="button" onClick={submit} disabled={!canSubmit} aria-label="开始增强">
          {isSubmitting ? <Loader2 size={18} /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}

export function EnhanceView() {
  const [tasks, setTasks] = useState([]);
  const [options, setOptions] = useState(emptyEnhanceOptions);
  const [credits, setCredits] = useState(null);
  const [viewTab, setViewTab] = useState("home");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedTaskId, setSubmittedTaskId] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [modelData, taskData, creditData] = await Promise.all([
          enhanceApi.getModels(),
          enhanceApi.getTasks(),
          enhanceApi.getCredits().catch(() => null)
        ]);
        if (!mounted) return;
        setOptions(modelData);
        setTasks(taskData);
        setCredits(creditData);
      } catch (error) {
        if (mounted) setSubmitError(error.message || "加载增强功能失败");
      }
    }
    load();
    const unsubscribe = enhanceApi.subscribe(() => {
      enhanceApi.getTasks().then((value) => mounted && setTasks(value)).catch(() => {});
      enhanceApi.getCredits().then((value) => mounted && setCredits(value)).catch(() => {});
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const submittedTask = tasks.find((task) => String(task.id) === String(submittedTaskId)) || null;
  const showCenterState = isSubmitting || submitError || submittedTask;
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
      enhanceApi.getCredits().then(setCredits).catch(() => {});
    } catch (error) {
      setSubmitError(error.message || "创建增强任务失败");
      enhanceApi.getCredits().then(setCredits).catch(() => {});
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteTask(id) {
    await enhanceApi.deleteTask(id);
    setTasks((current) => current.filter((task) => task.id !== id));
    setSubmittedTaskId((current) => String(current) === String(id) ? null : current);
  }

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

  return (
    <section className="watermark-view-root enhance-view-root">
      <div className="image-filter-tabs watermark-filter-tabs enhance-filter-tabs">
        <button className={viewTab === "home" ? "selected" : ""} type="button" onClick={() => setViewTab("home")}>主页</button>
        <button className={viewTab === "recent" ? "selected" : ""} type="button" onClick={() => {
          setViewTab("recent");
          setSubmittedTaskId(null);
        }}>最近生成</button>
        <button className={viewTab === "favorite" ? "selected" : ""} type="button" onClick={() => {
          setViewTab("favorite");
          setSubmittedTaskId(null);
        }}>
          <Star size={17} fill="#f8d545" color="#161616" />
          收藏
        </button>
        {credits && <span className="credits-chip">积分 {credits.balance}</span>}
      </div>
      <div className={`watermark-canvas enhance-canvas ${showCenterState ? "has-active-task" : ""} ${viewTab !== "home" ? "is-list" : ""}`}>
        {showEmptyHero && (
          <div className="watermark-hero-empty enhance-hero-empty">
            <span className="watermark-hero-icon enhance-hero-icon">
              <Wand2 size={36} />
            </span>
            <h1>智能画质增强</h1>
            <p>上传图片或者视频，AI 一键提升清晰度、细节和整体质感</p>
          </div>
        )}
        {showCenterState && (
          <EnhanceCenterState
            task={submittedTask}
            isSubmitting={isSubmitting && !submittedTask}
            error={submitError}
            onOpenRecent={() => {
              setViewTab("recent");
              setSubmittedTaskId(null);
            }}
          />
        )}
        {showRecentEmpty && (
          <div className="watermark-recent-empty enhance-recent-empty">
            <Wand2 size={24} />
            <strong>{viewTab === "favorite" ? "暂无收藏结果" : "暂无生成记录"}</strong>
            <p>{viewTab === "favorite" ? "收藏后的增强结果会显示在这里。" : "增强完成的图片或视频会保存在这里。"}</p>
          </div>
        )}
        <div className={`watermark-results-feed enhance-results-feed ${visibleTasks.length ? "has-results" : ""}`}>
          {visibleTasks.map((task) => (
            <EnhanceTaskCard
              key={task.id}
              task={task}
              onDelete={deleteTask}
              onFavorite={toggleFavorite}
              onRepeat={repeatTask}
            />
          ))}
        </div>
      </div>
      {viewTab === "home" && (
        <EnhanceComposer
          options={options}
          onSubmit={createTask}
          isSubmitting={isSubmitting}
        />
      )}
    </section>
  );
}
