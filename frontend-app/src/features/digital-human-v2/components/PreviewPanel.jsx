import React from "react";
import { Message } from "@arco-design/web-react";
import {
  Bot,
  Copy,
  Download,
  LayoutGrid,
  Loader2,
  RefreshCcw,
  Trash2,
  Undo2,
  Wand2,
} from "lucide-react";
import {
  getVideoResolutionLabel,
  isVideoCover,
} from "../utils";

function GeneratingState({ task }) {
  return (
    <div className="dhv2-preview__generating">
      <Loader2 size={40} className="dhv2-spinner" />
      <strong>正在生成口播视频</strong>
      <p>{task?.avatarName || "数字人"} · {task?.progress || 0}%</p>
    </div>
  );
}

export function PreviewPanel({
  selectedAvatar,
  activeTask,
  onDeleteTask,
  onRegenerateTask,
  scriptText,
  videoSpec,
}) {
  const cover = selectedAvatar?.cover;
  const coverIsVideo = isVideoCover(cover);
  const isProcessing =
    activeTask && !["completed", "failed"].includes(activeTask.status);
  const isFailed = activeTask?.status === "failed";
  const resultUrl = activeTask?.resultUrl;
  const displayScript = (activeTask?.text || scriptText || "").trim();
  const resolutionLabel = getVideoResolutionLabel(videoSpec);

  async function handleCopyScript() {
    if (!displayScript) {
      Message.info("请在左侧编辑口播文案");
      return;
    }
    try {
      await navigator.clipboard.writeText(displayScript);
      Message.success("文案已复制");
    } catch {
      Message.error("复制失败，请手动复制");
    }
  }

  return (
    <main className="dhv2-preview" aria-label="预览区">
      <header className="dhv2-preview__top">
        <div className="dhv2-preview__toolbar">
          <div className="dhv2-preview__title-group">
            <h2>数字人 | {resolutionLabel}</h2>
            {activeTask ? (
              <span className="dhv2-preview__status">
                {isProcessing
                  ? `生成中 ${activeTask.progress || 0}%`
                  : isFailed
                    ? "失败"
                    : "完成"}
              </span>
            ) : null}
          </div>
          <div className="dhv2-preview__top-actions">
            <button
              type="button"
              className="is-primary"
              aria-label="编辑文案"
              onClick={() => Message.info("请在左侧编辑口播文案")}
            >
              <Wand2 size={15} />
            </button>
            <button
              type="button"
              aria-label="恢复文案"
              onClick={() => Message.success("已恢复为左侧配音内容")}
            >
              <Undo2 size={15} />
            </button>
            <button type="button" aria-label="复制文案" onClick={handleCopyScript}>
              <Copy size={15} />
            </button>
            <button
              type="button"
              aria-label="布局能力"
              onClick={() => Message.info("功能即将开放")}
            >
              <LayoutGrid size={15} />
            </button>
            <button
              type="button"
              className="dhv2-preview__asset-btn"
              onClick={() => Message.info("我的资产能力即将开放")}
            >
              我的资产
            </button>
          </div>
        </div>

        <section className="dhv2-preview__info">
          <p className="dhv2-preview__script-line">
            <span className="dhv2-preview__label">口播文案</span>
            <span className="dhv2-preview__script-text">
              {displayScript || "暂无，左侧填写后会同步显示"}
            </span>
          </p>
        </section>
      </header>

      <div className="dhv2-preview__media">
        {resultUrl ? (
          <video src={resultUrl} controls playsInline />
        ) : isProcessing ? (
          <GeneratingState task={activeTask} />
        ) : isFailed ? (
          <div className="dhv2-preview__empty">
            <Bot size={40} />
            <strong>生成失败</strong>
            <p>{activeTask?.error || "请稍后重试"}</p>
          </div>
        ) : selectedAvatar && cover ? (
          coverIsVideo ? (
            <video
              src={cover}
              poster={selectedAvatar.poster || undefined}
              controls
              playsInline
            />
          ) : (
            <img src={cover} alt={selectedAvatar.name} />
          )
        ) : (
          <div className="dhv2-preview__empty">
            <Bot size={40} />
            <strong>尚未生成数字人视频</strong>
            <p>选择形象并填写脚本后，可在此预览生成结果</p>
          </div>
        )}
      </div>

      {activeTask && activeTask.status === "completed" && resultUrl ? (
        <footer className="dhv2-preview__actions">
          <button type="button" onClick={() => onRegenerateTask?.(activeTask.id)} aria-label="重新生成">
            <RefreshCcw size={18} />
          </button>
          <a href={resultUrl} download target="_blank" rel="noreferrer" aria-label="下载">
            <Download size={18} />
          </a>
          <button type="button" onClick={() => onDeleteTask?.(activeTask.id)} aria-label="删除">
            <Trash2 size={18} />
          </button>
        </footer>
      ) : (
        <footer className="dhv2-preview__draft">
          暂无草稿，编辑形象或配置后将自动保存
        </footer>
      )}
    </main>
  );
}
