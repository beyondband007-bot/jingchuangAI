import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Message, Spin, Tag } from "@arco-design/web-react";
import { Download, Loader2, Play, RefreshCcw, Trash2, X } from "lucide-react";
import { digitalHumanApi } from "../../api/digitalHumanApi";
import { imageDigitalHumanApi } from "../../api/imageDigitalHumanApi";
import {
  useDeleteConfirmation,
  useRegenerateConfirmation,
} from "../../components/DeleteConfirmDialog";
import { HistoryEmptyState } from "../../components/HistoryEmptyState";
import { formatBeijingDateTime } from "../../utils/time";
import "./digitalHumanHistory.css";

function getAvatarSource(task) {
  if (task?.taskType === "photo") return "mine";
  const avatarId = String(task?.avatarId || "");
  return avatarId.startsWith("public-") ? "official" : "mine";
}

function getAvatarSourceLabel(source) {
  return source === "official" ? "官方形象" : "我的形象";
}

function normalizeAvatarTask(task) {
  const avatarSource = getAvatarSource(task);
  return {
    ...task,
    taskType: "avatar",
    avatarSource,
    title: task.avatarName || "数字人形象",
    previewUrl: task.thumbnailUrl || "",
    subtitle: task.voiceName && !/\.(mp3|m4a|wav|webm)$/i.test(task.voiceName)
      ? task.voiceName
      : "系统配音",
  };
}

function normalizePhotoTask(task) {
  return {
    ...task,
    taskType: "photo",
    avatarSource: "mine",
    title: task.avatarName || "我的形象",
    previewUrl: task.thumbnailUrl || task.portraitUrl || "",
    subtitle: task.voiceName && !/\.(mp3|m4a|wav|webm)$/i.test(task.voiceName)
      ? task.voiceName
      : "系统配音",
  };
}

function getStatusTag(status) {
  if (status === "completed") return { color: "green", label: "完成" };
  if (status === "failed") return { color: "red", label: "失败" };
  return { color: "arcoblue", label: "生成中" };
}

function getDubbingContent(task) {
  const candidates = [task?.dubbingText, task?.script, task?.text];
  const content = candidates.find((value) => {
    const normalized = String(value || "").trim();
    return normalized && !/\.(mp3|m4a|wav|aac|ogg|webm)$/i.test(normalized);
  });
  return String(content || "暂无配音内容").trim();
}

function HistoryPreviewModal({ task, onClose }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!task) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, task]);

  useEffect(() => {
    if (!task || !videoRef.current) return;
    const video = videoRef.current;
    const playPromise = video.play();
    if (playPromise?.catch) {
      playPromise.catch(() => {});
    }
  }, [task]);

  if (!task?.resultUrl) return null;

  return (
    <div
      className="dh-history-preview"
      role="dialog"
      aria-modal="true"
      aria-label={`预览 ${task.title}`}
      onClick={onClose}
    >
      <div className="dh-history-preview__panel" onClick={(event) => event.stopPropagation()}>
        <header className="dh-history-preview__head">
          <div>
            <strong>{task.title}</strong>
            <p>{task.subtitle}</p>
          </div>
          <button type="button" aria-label="关闭预览" onClick={onClose}>
            <X size={18} />
          </button>
        </header>
        <video
          ref={videoRef}
          className="dh-history-preview__video"
          src={task.resultUrl}
          poster={task.previewUrl || undefined}
          controls
          playsInline
          preload="metadata"
        />
        <footer className="dh-history-preview__actions">
          <a href={task.resultUrl} download target="_blank" rel="noreferrer">
            <Download size={16} />
            下载视频
          </a>
        </footer>
      </div>
    </div>
  );
}

export function DigitalHumanHistoryView({ isActive = true, onResumeTask }) {
  const [loading, setLoading] = useState(true);
  const [avatarTasks, setAvatarTasks] = useState([]);
  const [photoTasks, setPhotoTasks] = useState([]);
  const [filter, setFilter] = useState("all");
  const [previewTask, setPreviewTask] = useState(null);

  const tasks = useMemo(() => {
    const merged = [
      ...avatarTasks.map(normalizeAvatarTask),
      ...photoTasks.map(normalizePhotoTask),
    ];
    const filtered =
      filter === "all"
        ? merged
        : merged.filter((task) => task.avatarSource === filter);
    return filtered.sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  }, [avatarTasks, filter, photoTasks]);

  useEffect(() => {
    if (!isActive) return undefined;

    let mounted = true;

    async function load() {
      setLoading(true);
      try {
        const [avatarData, photoData] = await Promise.all([
          digitalHumanApi.getTasks(),
          imageDigitalHumanApi.getTasks(),
        ]);
        if (!mounted) return;
        setAvatarTasks(Array.isArray(avatarData) ? avatarData : []);
        setPhotoTasks(Array.isArray(photoData) ? photoData : []);
      } catch (error) {
        if (mounted) Message.error(error.message || "加载历史记录失败");
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    const unsubscribeAvatar = digitalHumanApi.subscribe(() => {
      digitalHumanApi.getTasks().then((value) => mounted && setAvatarTasks(value)).catch(() => {});
    });
    const unsubscribePhoto = imageDigitalHumanApi.subscribe(() => {
      imageDigitalHumanApi.getTasks().then((value) => mounted && setPhotoTasks(value)).catch(() => {});
    });

    return () => {
      mounted = false;
      unsubscribeAvatar();
      unsubscribePhoto();
    };
  }, [isActive]);

  async function deleteTask(task) {
    if (task.taskType === "photo") {
      await imageDigitalHumanApi.deleteTask(task.id);
      setPhotoTasks((current) => current.filter((item) => String(item.id) !== String(task.id)));
      return;
    }
    await digitalHumanApi.deleteTask(task.id);
    setAvatarTasks((current) => current.filter((item) => String(item.id) !== String(task.id)));
  }

  const { requestDelete, deleteConfirmDialog } = useDeleteConfirmation({
    onConfirm: deleteTask,
    title: "删除历史记录？",
    message: "该生成记录会被移除，删除后无法恢复。",
  });

  async function regenerateTask(task) {
    if (task.taskType === "photo") {
      const nextTask = await imageDigitalHumanApi.regenerateTask(task.id);
      setPhotoTasks((current) => [
        nextTask,
        ...current.filter((item) => String(item.id) !== String(task.id)),
      ]);
      return;
    }
    const nextTask = await digitalHumanApi.regenerateTask(task.id);
    setAvatarTasks((current) => [
      nextTask,
      ...current.filter((item) => String(item.id) !== String(task.id)),
    ]);
  }

  const { requestRegenerate, regenerateConfirmDialog } = useRegenerateConfirmation({
    onConfirm: regenerateTask,
  });

  return (
    <section className="dh-history" aria-label="数字人历史记录">
      <header className="dh-history__toolbar">
        <div className="dh-history__filters">
          <Button
            type={filter === "all" ? "primary" : "secondary"}
            size="small"
            onClick={() => setFilter("all")}
          >
            全部
          </Button>
          <Button
            type={filter === "official" ? "primary" : "secondary"}
            size="small"
            onClick={() => setFilter("official")}
          >
            官方形象
          </Button>
          <Button
            type={filter === "mine" ? "primary" : "secondary"}
            size="small"
            onClick={() => setFilter("mine")}
          >
            我的形象
          </Button>
        </div>
        <span className="dh-history__count">共 {tasks.length} 条记录</span>
      </header>

      {loading ? (
        <div className="dh-history__loading">
          <Spin />
        </div>
      ) : tasks.length ? (
        <div className="dh-history__list">
          {tasks.map((task) => {
            const status = getStatusTag(task.status);
            const isProcessing = !["completed", "failed"].includes(task.status);
            const canPreview = task.status === "completed" && Boolean(task.resultUrl);
            const canResume = isProcessing && task.taskType === "avatar";
            return (
              <article
                key={`${task.taskType}-${task.id}`}
                className={`dh-history-card${canResume ? " is-resumable" : ""}`}
              >
                {canResume ? (
                  <button
                    type="button"
                    className="dh-history-card__resume-hitbox"
                    aria-label={`返回 ${task.title} 的视频生成页面`}
                    onClick={() => onResumeTask?.(task)}
                  />
                ) : null}
                <button
                  type="button"
                  className={`dh-history-card__media${canPreview ? " is-playable" : ""}${canResume ? " is-resumable" : ""}`}
                  disabled={!canPreview && !canResume}
                  aria-label={
                    canPreview
                      ? `播放 ${task.title}`
                      : canResume
                        ? `通过缩略图返回 ${task.title} 的视频生成页面`
                        : `${task.title} 预览`
                  }
                  onClick={() => {
                    if (canPreview) setPreviewTask(task);
                    if (canResume) onResumeTask?.(task);
                  }}
                >
                  {canPreview ? (
                    <>
                      <video
                        src={task.resultUrl}
                        poster={task.previewUrl || undefined}
                        muted
                        playsInline
                        preload="metadata"
                        tabIndex={-1}
                      />
                      <span className="dh-history-card__play" aria-hidden="true">
                        <Play size={22} fill="currentColor" />
                      </span>
                    </>
                  ) : task.previewUrl ? (
                    <img src={task.previewUrl} alt={task.title} />
                  ) : (
                    <div className="dh-history-card__placeholder">
                      {isProcessing ? <Loader2 size={24} className="dh-history-card__spinner" /> : null}
                    </div>
                  )}
                </button>

                <div className="dh-history-card__body">
                  <div className="dh-history-card__tags">
                    <Tag color={task.avatarSource === "mine" ? "purple" : "arcoblue"}>
                      {getAvatarSourceLabel(task.avatarSource)}
                    </Tag>
                    <Tag color={status.color}>{status.label}</Tag>
                  </div>
                  <strong>{task.title}</strong>
                  <p>{task.subtitle}</p>
                  <p className="dh-history-card__script">
                    {getDubbingContent(task)}
                  </p>
                  <div className="dh-history-card__meta">
                    <span>{formatBeijingDateTime(task.createdAt || task.time)}</span>
                    {task.costPoints ? <span>消耗 {task.costPoints} 积分</span> : null}
                  </div>
                </div>

                <div className="dh-history-card__actions">
                  {task.status === "completed" && task.resultUrl ? (
                    <a href={task.resultUrl} download target="_blank" rel="noreferrer" aria-label="下载">
                      <Download size={16} />
                    </a>
                  ) : null}
                  <button
                    type="button"
                    aria-label="重新生成"
                    onClick={() => requestRegenerate(task)}
                  >
                    <RefreshCcw size={16} />
                  </button>
                  <button type="button" aria-label="删除" onClick={() => requestDelete(task)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <HistoryEmptyState className="dh-history__empty" title="暂无历史记录" />
      )}

      {deleteConfirmDialog}
      {regenerateConfirmDialog}
      {previewTask ? (
        <HistoryPreviewModal task={previewTask} onClose={() => setPreviewTask(null)} />
      ) : null}
    </section>
  );
}
