import { useCallback, useEffect, useRef } from "react";
import {
  CircleAlert,
  Copy,
  Download,
  Image,
  Plus,
  RefreshCcw,
  Sparkles,
} from "lucide-react";
import { HistoryEmptyState } from "../../components/HistoryEmptyState";
import { formatBeijingHistoryTime } from "../../utils/time";

function getImageTaskResults(task) {
  if (Array.isArray(task?.images) && task.images.length) {
    return task.images.filter(Boolean);
  }
  const primary = task?.imageUrl || task?.image;
  return primary ? [primary] : [];
}

function ImageWorkbenchRequestBubble({ prompt }) {
  return (
    <div className="image-workbench-prompt">
      <p>{prompt}</p>
    </div>
  );
}

function ImageWorkbenchGeneratingStatus({ ImageGeneratingSpinnerComponent }) {
  return (
    <div
      className="image-workbench-generation-status"
      role="status"
      aria-live="polite"
    >
      <ImageGeneratingSpinnerComponent size={18} />
      <span>智能创意中...</span>
    </div>
  );
}

export function ImageGenerationWorkbench({
  tasks,
  historyThreads,
  selectedTask,
  contextTasks,
  activeTask,
  activePrompt,
  submitError,
  isSubmitting,
  options,
  composerSeed,
  resetSignal,
  ComposerBarComponent,
  ComposerBarPlaceholderComponent,
  BackToTopButtonComponent,
  ImageGeneratingSpinnerComponent,
  onSeedApplied,
  onSubmit,
  onSelect,
  onNewContext,
  onPreview,
  onDownload,
  onReference,
  onRegenerate,
}) {
  const contextRef = useRef(null);
  const wasSubmittingRef = useRef(false);
  const contextTask = activeTask || selectedTask;
  const threadTasks = contextTasks?.length
    ? contextTasks
    : contextTask
      ? [contextTask]
      : [];
  const threadSignature = threadTasks
    .map((task) => `${task.id}:${task.status}:${task.image || ""}`)
    .join("|");
  const empty = threadTasks.length === 0 && !activePrompt && !submitError;
  const scrollContextToLatest = useCallback((behavior = "smooth") => {
    const context = contextRef.current;
    if (!context) return;
    window.requestAnimationFrame(() => {
      context.scrollTo({
        top: context.scrollHeight,
        behavior,
      });
    });
  }, []);

  useEffect(() => {
    const shouldFollowGeneration =
      isSubmitting || submitError || wasSubmittingRef.current;
    if (shouldFollowGeneration) {
      scrollContextToLatest(isSubmitting ? "smooth" : "auto");
    }
    wasSubmittingRef.current = isSubmitting;
  }, [
    isSubmitting,
    scrollContextToLatest,
    submitError,
    threadSignature,
  ]);

  function getImageHistoryTime(task, thread) {
    const rawValue =
      task?.createdAt ||
      task?.created_at ||
      task?.updatedAt ||
      task?.updated_at ||
      thread?.createdAt ||
      thread?.created_at;
    return rawValue ? formatBeijingHistoryTime(rawValue) : task?.time || "";
  }

  return (
    <div className="image-workbench-layout">
      <main className="image-workbench-main" aria-label="图片生成上下文工作台">
        <div className="image-workbench-context" ref={contextRef}>
          {empty && (
            <div className="image-workbench-empty">
              <span className="image-workbench-empty-icon">
                <Sparkles size={24} />
              </span>
              <h2>开启新的图片创作</h2>
            </div>
          )}

          {threadTasks.map((task) => {
            const taskProcessing =
              task.status === "pending" || task.status === "processing";
            const taskFailed = task.status === "failed";
            const taskCompleted = task.status === "completed" && task.image;
            return (
              <article className="image-workbench-thread-item" key={task.id}>
                {task.prompt && (
                  <ImageWorkbenchRequestBubble prompt={task.prompt} />
                )}

                {taskProcessing && (
                  <ImageWorkbenchGeneratingStatus
                    ImageGeneratingSpinnerComponent={
                      ImageGeneratingSpinnerComponent
                    }
                  />
                )}

                {taskFailed && (
                  <div
                    className="image-workbench-status is-failed"
                    role="status"
                  >
                    <CircleAlert size={20} />
                    <strong>生成失败</strong>
                    <p>{task.error || "图片生成遇到问题，请稍后重试。"}</p>
                    <button type="button" onClick={() => onRegenerate(task.id)}>
                      <RefreshCcw size={15} />
                      再次生成
                    </button>
                  </div>
                )}

                {taskCompleted && (
                  <div className="image-workbench-result">
                    <div
                      className={`image-workbench-result-grid ${getImageTaskResults(task).length > 1 ? "is-multi" : ""}`}
                    >
                      {getImageTaskResults(task).map((imageSrc, index) => (
                        <button
                          className="image-workbench-result-image"
                          key={`${task.id}-${index}`}
                          type="button"
                          onClick={() => onPreview(task)}
                          aria-label="查看生成图片"
                        >
                          <img src={imageSrc} alt={task.prompt} />
                          <span className="image-workbench-result-badge">
                            AI生成
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="image-workbench-actions">
                      <a
                        href={task.imageUrl || task.image}
                        download
                        onClick={() => onDownload?.(task)}
                      >
                        <Download size={15} />
                        下载
                      </a>
                      <button type="button" onClick={() => onReference(task)}>
                        <Copy size={15} />
                        引用
                      </button>
                      <button
                        type="button"
                        onClick={() => onRegenerate(task.id)}
                      >
                        <RefreshCcw size={15} />
                        再次生成
                      </button>
                    </div>
                    <p className="image-workbench-result-note">
                      以上内容由 AI 生成，本次消耗 {task.price || "积分"}
                    </p>
                  </div>
                )}
              </article>
            );
          })}

          {isSubmitting &&
            activePrompt &&
            !threadTasks.some((task) => task.prompt === activePrompt) && (
              <article className="image-workbench-thread-item is-pending">
                <ImageWorkbenchRequestBubble prompt={activePrompt} />
                <ImageWorkbenchGeneratingStatus
                  ImageGeneratingSpinnerComponent={ImageGeneratingSpinnerComponent}
                />
              </article>
            )}

          {submitError && !contextTask && (
            <div className="image-workbench-status is-failed" role="status">
              <CircleAlert size={26} />
              <strong>这次没有生成成功</strong>
              <p>{submitError || "图片生成遇到问题，请稍后重试。"}</p>
            </div>
          )}
        </div>

        {options.models.length > 0 ? (
          <ComposerBarComponent
            key={composerSeed?.id || "image-workbench-composer"}
            options={options}
            onSubmit={onSubmit}
            placement="workbench"
            collapsed={false}
            seed={composerSeed}
            resetSignal={resetSignal}
            onSeedApplied={onSeedApplied}
          />
        ) : (
          <ComposerBarPlaceholderComponent />
        )}
      </main>

      <aside className="image-workbench-history" aria-label="图片生成历史记录">
        <div className="image-workbench-history-head">
          <div>
            <span>生成</span>
            <strong>历史记录</strong>
          </div>
          <button type="button" onClick={onNewContext}>
            <Plus size={16} />
            新创作
          </button>
        </div>
        <div className="image-workbench-history-list">
          {historyThreads.length ? (
            historyThreads.map((thread) => {
              const task = thread.latestTask;
              const displayTime = getImageHistoryTime(task, thread);
              const isSelected = thread.ids.includes(contextTask?.id);
              const isTaskProcessing =
                task.status === "pending" || task.status === "processing";
              const isTaskFailed = task.status === "failed";
              return (
                <button
                  className={`image-workbench-history-item ${isSelected ? "is-selected" : ""}`}
                  key={thread.id}
                  type="button"
                  onClick={() => onSelect(thread.id)}
                >
                  <span className="image-workbench-history-thumb">
                    {task.image && !isTaskFailed ? (
                      <img src={task.image} alt="" />
                    ) : isTaskProcessing ? (
                      <ImageGeneratingSpinnerComponent size={24} />
                    ) : (
                      <Image size={18} />
                    )}
                  </span>
                  <span className="image-workbench-history-copy">
                    <strong>{task.prompt || "未命名图片任务"}</strong>
                    <small>
                      {isTaskProcessing
                        ? "生成中"
                        : isTaskFailed
                          ? "生成失败"
                          : thread.count > 1
                            ? `${thread.count} 条上下文 · ${displayTime || "已完成"}`
                            : displayTime || task.ratio || "已完成"}
                    </small>
                  </span>
                </button>
              );
            })
          ) : (
            <HistoryEmptyState
              className="image-workbench-history-empty"
              title="暂无生成记录"
            />
          )}
        </div>
      </aside>
      <BackToTopButtonComponent
        scrollTargetRef={contextRef}
        className="image-workbench-back-to-top"
      />
    </div>
  );
}
