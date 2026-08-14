import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Download, RefreshCcw, X } from "lucide-react";
import { formatBeijingDateTime } from "../../../utils/time";

export function HistoryDetailModal({ task, onClose, onRepeat }) {
  const sourceVideoRef = useRef(null);
  const resultVideoRef = useRef(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  function pauseOtherVideo(activeVideo) {
    [sourceVideoRef.current, resultVideoRef.current].forEach((video) => {
      if (video && video !== activeVideo && !video.paused) video.pause();
    });
  }

  useEffect(() => {
    if (!task) return undefined;
    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event) => event.key === "Escape" && onCloseRef.current();
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      sourceVideoRef.current?.pause();
      resultVideoRef.current?.pause();
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [task]);

  if (!task) return null;

  return createPortal(
    <div className="vgw-history-modal" role="dialog" aria-modal="true" aria-label="动作迁移结果详情">
      <button className="vgw-history-modal__backdrop" type="button" aria-label="关闭详情" onClick={onClose} />
      <section className="vgw-history-modal__panel">
        <button className="vgw-history-modal__close" type="button" aria-label="关闭详情" onClick={onClose}><X size={20} /></button>
        <div className="vgw-history-modal__media">
          <figure>
            <figcaption>原视频</figcaption>
            <video ref={sourceVideoRef} src={task.motionVideoUrl} controls playsInline preload="metadata" onPlay={(event) => pauseOtherVideo(event.currentTarget)} />
          </figure>
          <figure>
            <figcaption>迁移后</figcaption>
            <video ref={resultVideoRef} src={task.resultUrl} controls playsInline preload="metadata" poster={task.thumbnailUrl || ""} onPlay={(event) => pauseOtherVideo(event.currentTarget)} />
          </figure>
        </div>
        <aside className="vgw-history-modal__info">
          <p>动作迁移</p>
          <h2>生成结果</h2>
          <dl>
            <div><dt>处理状态</dt><dd>已完成</dd></div>
            <div><dt>消耗积分</dt><dd>{task.price}</dd></div>
            <div><dt>创建时间</dt><dd>{formatBeijingDateTime(task.createdAt || task.time) || task.time}</dd></div>
          </dl>
          <div className="vgw-history-modal__actions">
            <a href={task.resultUrl} download><Download size={16} />下载视频</a>
            <button type="button" onClick={() => onRepeat(task)}><RefreshCcw size={16} />再次生成</button>
          </div>
        </aside>
      </section>
    </div>,
    document.body,
  );
}
