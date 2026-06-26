import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button, Empty, Message, Spin, Tag } from "@arco-design/web-react";
import { Download, Loader2, Play, RefreshCcw, Trash2, X } from "lucide-react";
import { digitalHumanApi } from "../../api/digitalHumanApi";
import { imageDigitalHumanApi } from "../../api/imageDigitalHumanApi";
import {
  useDeleteConfirmation,
  useRegenerateConfirmation,
} from "../../components/DeleteConfirmDialog";
import "./digitalHumanHistory.scss";

function normalizeAvatarTask(task) {
  return {
    ...task,
    taskType: "avatar",
    title: task.avatarName || "数字人形象",
    previewUrl: task.thumbnailUrl || "",
    subtitle: task.voiceName || "官方形象",
  };
}

function normalizePhotoTask(task) {
  return {
    ...task,
    taskType: "photo",
    title: "照片数字人",
    previewUrl: task.thumbnailUrl || task.portraitUrl || "",
    subtitle: task.voiceName || "自定义人像",
  };
}

function getStatusTag(status) {
  if (status === "completed") return { color: "green", label: "完成" };
  if (status === "failed") return { color: "red", label: "失败" };
  return { color: "arcoblue", label: "生成中" };
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

export function DigitalHumanHistoryView({ isActive = true }) {
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
        : merged.filter((task) => task.taskType === filter);
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
            type={filter === "avatar" ? "primary" : "secondary"}
            size="small"
            onClick={() => setFilter("avatar")}
          >
            数字人形象
          </Button>
          <Button
            type={filter === "photo" ? "primary" : "secondary"}
            size="small"
            onClick={() => setFilter("photo")}
          >
            照片数字人
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
            return (
              <article key={`${task.taskType}-${task.id}`} className="dh-history-card">
                <button
                  type="button"
                  className={`dh-history-card__media${canPreview ? " is-playable" : ""}`}
                  disabled={!canPreview}
                  aria-label={canPreview ? `播放 ${task.title}` : `${task.title} 预览`}
                  onClick={() => {
                    if (canPreview) setPreviewTask(task);
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
                    <Tag color={task.taskType === "photo" ? "purple" : "arcoblue"}>
                      {task.taskType === "photo" ? "照片数字人" : "数字人形象"}
                    </Tag>
                    <Tag color={status.color}>{status.label}</Tag>
                  </div>
                  <strong>{task.title}</strong>
                  <p>{task.subtitle}</p>
                  <p className="dh-history-card__script">
                    {(task.text || "").trim() || "暂无口播文案"}
                  </p>
                  <div className="dh-history-card__meta">
                    <span>{task.time || task.createdAt}</span>
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
        <Empty className="dh-history__empty" description="暂无历史记录" />
      )}

      {deleteConfirmDialog}
      {regenerateConfirmDialog}
      {previewTask ? (
        <HistoryPreviewModal task={previewTask} onClose={() => setPreviewTask(null)} />
      ) : null}
    </section>
  );
}
