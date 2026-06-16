import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, Download, Image, Layers, Loader2, Plus, RefreshCcw, Star, Trash2, X, Zap } from "lucide-react";
import { emitCreditsUpdated } from "../../api/creditsEvents";
import { hasRunningTasks, taskStatusSignature } from "../../api/taskPolling";
import { removeBgApi } from "./removeBgApi";

const emptyRemoveBgOptions = { models: [], defaults: {}, limits: {} };

function formatBytes(bytes) {
  const size = Number(bytes || 0);
  if (!size) return "";
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)}KB`;
  return `${(size / 1024 / 1024).toFixed(1)}MB`;
}

function RemoveBgCenterState({ task, isSubmitting, error, onReset, onRepeat }) {
  if (task?.status === "completed" && task.resultUrl) {
    return (
      <section className="watermark-center-state remove-bg-center-state marketing-result-card is-completed">
        <header className="marketing-result-head">
          <span><CheckCircle2 size={18} />处理完成</span>
          <p>透明背景素材已生成，可下载或继续处理</p>
        </header>
        <div className="marketing-result-compare">
          <figure>
            <figcaption>原图</figcaption>
            <img src={task.sourceUrl || task.resultUrl} alt={task.sourceFileName || "原图"} />
          </figure>
          <figure className="is-transparent">
            <figcaption>处理后</figcaption>
            <img src={task.resultUrl} alt={task.sourceFileName || "抠图结果"} />
          </figure>
        </div>
        <footer className="marketing-result-footer">
          <p>已完成本次处理，可下载结果、再次处理当前素材，或上传新素材继续</p>
          <div className="marketing-result-actions">
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
    return (
      <section className="watermark-center-state remove-bg-center-state is-failed">
        <span className="watermark-center-icon remove-bg-center-icon">
          <Layers size={24} />
        </span>
        <strong>这次没有抠图成功</strong>
        <p>{error || task?.error || "抠图服务返回了错误，积分会按任务状态自动处理。"}</p>
      </section>
    );
  }

  return (
    <section className="watermark-center-state remove-bg-center-state is-processing" aria-live="polite">
      <span className="watermark-center-spinner">
        <Loader2 size={30} />
      </span>
      <strong>{isSubmitting ? "正在创建抠图任务" : "正在智能抠图"}</strong>
      <p>图片正在处理中，完成后会自动回填到这里。</p>
      <div className="watermark-center-progress remove-bg-center-progress">
        <i style={{ width: `${task?.progress || 28}%` }} />
      </div>
      <small>{task?.progress ? `${task.progress}%` : "任务准备中"} · 请保持页面打开</small>
    </section>
  );
}

function RemoveBgTaskCard({ task, onDelete, onFavorite, onRepeat }) {
  const isProcessing = task.status === "processing";
  const isFailed = task.status === "failed";

  return (
    <article className={`watermark-task-card remove-bg-task-card status-${task.status}`}>
      <div className="watermark-task-preview remove-bg-task-preview">
        {task.resultUrl && !isFailed ? (
          <img src={task.resultUrl} alt={task.sourceFileName || "抠图结果"} />
        ) : (
          <div className={`watermark-task-placeholder ${isFailed ? "is-failed" : ""}`}>
            {isProcessing ? <Loader2 size={26} /> : <Image size={26} />}
            <strong>{isFailed ? "抠图失败" : "抠图中"}</strong>
          </div>
        )}
      </div>
      <div className="watermark-task-meta remove-bg-task-meta">
        <div className="time-row">
          <span>{task.time}</span>
          <strong>{task.price}</strong>
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

function RemoveBgUploadSlot({ sourceAsset, previewUrl, isUploading, onSelect, onClear }) {
  const inputRef = useRef(null);
  function clearFile(event) {
    event.preventDefault();
    event.stopPropagation();
    onClear?.();
  }

  return (
    <button className={`watermark-upload-slot remove-bg-upload-slot ${previewUrl ? "has-preview" : ""}`} type="button" onClick={() => inputRef.current?.click()}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0] || null;
          event.target.value = "";
          onSelect(file);
        }}
      />
      {previewUrl ? (
        <img src={previewUrl} alt="上传图片预览" />
      ) : (
        <>
          <span className="marketing-upload-icon" aria-hidden="true">
            <img src="/assets/marketing/upload.svg" alt="" />
          </span>
          <strong>上传图片文件</strong>
          <span>支持 JPG/PNG/WebP，最大 10MB</span>
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
          <Image size={14} />
          更换图片
        </span>
      )}
    </button>
  );
}

function RemoveBgComposer({ options, onSubmit, isSubmitting }) {
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
  const selectedModel = options.models[0];
  const price = isReady ? `${selectedModel?.basePoints || 0} 积分` : "计算中";
  const canSubmit = Boolean(isReady && sourceAsset && !uploading && !isSubmitting);

  async function selectSource(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("请上传图片文件");
      return;
    }
    if (file.size > (options.limits?.maxImageBytes || 10 * 1024 * 1024)) {
      setNotice("图片大小不能超过 10MB");
      return;
    }

    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    setPreviewUrl(window.URL.createObjectURL(file));
    setSourceAsset(null);
    setUploading(true);
    setNotice("");
    try {
      setSourceAsset(await removeBgApi.uploadSource(file));
      setNotice("图片上传完成");
    } catch (error) {
      setPreviewUrl("");
      setNotice(error.message || "图片上传失败");
    } finally {
      setUploading(false);
    }
  }

  function clearSource() {
    setSourceAsset(null);
    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setNotice("");
  }

  function submit() {
    if (!sourceAsset) {
      setNotice("请先上传图片文件");
      return;
    }
    setNotice("");
    onSubmit({
      sourceAssetId: sourceAsset.id,
      model: selectedModel?.value
    });
  }

  return (
    <div className="watermark-composer remove-bg-composer" aria-label="抠图上传面板">
      <div className="remove-bg-composer-title">
        <Layers size={15} />
        图片抠图
      </div>
      <RemoveBgUploadSlot
        sourceAsset={sourceAsset}
        previewUrl={previewUrl}
        isUploading={uploading}
        onSelect={selectSource}
        onClear={clearSource}
      />
      <div className="watermark-composer-footer remove-bg-composer-footer">
        <span>{notice || "AI 将自动识别主体并输出透明背景图片"}</span>
        <strong>{price}</strong>
        <button className="send-button" type="button" onClick={submit} disabled={!canSubmit} aria-label="开始抠图">
          {isSubmitting ? <Loader2 size={18} /> : <Zap size={18} />}
        </button>
      </div>
    </div>
  );
}

export function RemoveBgView() {
  const [tasks, setTasks] = useState([]);
  const [options, setOptions] = useState(emptyRemoveBgOptions);
  const [credits, setCredits] = useState(null);
  const [viewTab, setViewTab] = useState("home");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedTaskId, setSubmittedTaskId] = useState(null);
  const taskStatusSignatureRef = useRef("");

  function applyCredits(creditsValue) {
    if (!creditsValue) return;
    setCredits(creditsValue);
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
      removeBgApi.setHasRunningTasks(hasRunningTasks(value));
      setTasks(value);
      if (didStatusChange) {
        removeBgApi.getCredits().then((nextCredits) => mounted && applyCredits(nextCredits)).catch(() => {});
      }
    }
    async function load() {
      try {
        const [modelData, taskData, creditData] = await Promise.all([
          removeBgApi.getModels(),
          removeBgApi.getTasks(),
          removeBgApi.getCredits().catch(() => null)
        ]);
        if (!mounted) return;
        setOptions(modelData);
        applyTaskList(taskData);
        applyCredits(creditData);
      } catch (error) {
        if (mounted) setSubmitError(error.message || "加载抠图功能失败");
      }
    }
    load();
    const unsubscribe = removeBgApi.subscribe(() => {
      removeBgApi.getTasks().then(applyTaskList).catch(() => {});
      removeBgApi.getCredits().then((value) => mounted && applyCredits(value)).catch(() => {});
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
      const task = await removeBgApi.createTask(payload);
      setSubmittedTaskId(task.id);
      setTasks((current) => [task, ...current.filter((item) => item.id !== task.id)]);
      removeBgApi.getCredits().then(applyCredits).catch(() => {});
    } catch (error) {
      setSubmitError(error.message || "创建抠图任务失败");
      removeBgApi.getCredits().then(applyCredits).catch(() => {});
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteTask(id) {
    await removeBgApi.deleteTask(id);
    setTasks((current) => current.filter((task) => task.id !== id));
    setSubmittedTaskId((current) => String(current) === String(id) ? null : current);
  }

  async function toggleFavorite(id) {
    const updated = await removeBgApi.toggleFavorite(id);
    setTasks((current) => current.map((task) => String(task.id) === String(id) ? updated : task));
  }

  function repeatTask(task) {
    createTask({
      sourceAssetId: task.sourceAssetId,
      model: task.model
    });
  }

  return (
    <section className="watermark-view-root remove-bg-view-root">
      <div className="image-filter-tabs watermark-filter-tabs remove-bg-filter-tabs">
        <button className={viewTab === "home" ? "selected" : ""} type="button" onClick={() => setViewTab("home")}>主页</button>
        <button className={viewTab === "recent" ? "selected" : ""} type="button" onClick={() => {
          setViewTab("recent");
          setSubmittedTaskId(null);
        }}>历史记录</button>
        <button className={viewTab === "favorite" ? "selected" : ""} type="button" onClick={() => {
          setViewTab("favorite");
          setSubmittedTaskId(null);
        }}>
          <Star size={17} fill="#f8d545" color="#161616" />
          收藏
        </button>
        {credits && <span className="credits-chip">积分 {credits.balance}</span>}
      </div>
      <div className={`watermark-canvas remove-bg-canvas ${showCenterState ? "has-active-task" : ""} ${viewTab !== "home" ? "is-list" : ""}`}>
        {showEmptyHero && (
          <div className="watermark-hero-empty remove-bg-hero-empty">
            <span className="watermark-hero-icon remove-bg-hero-icon">
              <Layers size={36} />
            </span>
            <h1>智能抠图</h1>
            <p>上传图片，AI 一键抠出主体并生成透明背景素材</p>
          </div>
        )}
        {showCenterState && (
          <RemoveBgCenterState
            task={submittedTask}
            isSubmitting={isSubmitting && !submittedTask}
            error={submitError}
            onReset={() => {
              setSubmittedTaskId(null);
            }}
            onRepeat={repeatTask}
          />
        )}
        {showRecentEmpty && (
          <div className="watermark-recent-empty remove-bg-recent-empty">
            <Layers size={24} />
            <strong>{viewTab === "favorite" ? "暂无收藏结果" : "暂无历史记录"}</strong>
            <p>{viewTab === "favorite" ? "收藏后的抠图结果会显示在这里。" : "抠图完成的透明图片会保存在这里。"}</p>
          </div>
        )}
        <div className={`watermark-results-feed remove-bg-results-feed ${visibleTasks.length ? "has-results" : ""}`}>
          {visibleTasks.map((task) => (
            <RemoveBgTaskCard
              key={task.id}
              task={task}
              onDelete={deleteTask}
              onFavorite={toggleFavorite}
              onRepeat={repeatTask}
            />
          ))}
        </div>
      </div>
      {viewTab === "home" && !showCenterState && (
        <RemoveBgComposer
          options={options}
          onSubmit={createTask}
          isSubmitting={isSubmitting}
        />
      )}
    </section>
  );
}
