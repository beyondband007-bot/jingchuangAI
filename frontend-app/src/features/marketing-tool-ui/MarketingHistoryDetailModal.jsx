import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Download, FileImage, FileVideo, X } from "lucide-react";
import { formatBeijingDateTime } from "../../utils/time";
import { resolveMediaUrl } from "../../api/mediaUrl";

const detailStyles = `.marketing-history-detail{position:fixed;z-index:1000;inset:0;display:grid;place-items:center;padding:28px}.marketing-history-detail__backdrop{position:absolute;inset:0;width:100%;height:100%;border:0;background:rgba(20,22,35,.55);backdrop-filter:blur(8px)}.marketing-history-detail__panel{position:relative;display:grid;grid-template-columns:minmax(420px,1.55fr) minmax(300px,.75fr);width:min(1120px,100%);min-height:min(680px,calc(100vh - 56px));overflow:hidden;background:#fff;border-radius:20px;box-shadow:0 28px 80px rgba(12,16,35,.28)}.marketing-history-detail__media{display:grid;place-items:center;min-height:0;padding:28px;background:#f5f6fb}.marketing-history-detail__compare{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%;gap:16px}.marketing-history-detail__compare figure{display:grid;min-width:0;margin:0;gap:8px}.marketing-history-detail__compare figcaption{color:var(--text-secondary);font-size:13px}.marketing-history-detail__media img,.marketing-history-detail__media video{display:block;width:100%;object-fit:contain;border-radius:12px}.marketing-history-detail__media img.is-transparent{background-color:#fff;background-image:linear-gradient(45deg,#e7e4ed 25%,transparent 25%),linear-gradient(-45deg,#e7e4ed 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e7e4ed 75%),linear-gradient(-45deg,transparent 75%,#e7e4ed 75%);background-size:24px 24px}.marketing-history-detail__empty-media{display:grid;width:160px;height:160px;place-items:center;color:#8e90a1;background:#e8eaf2;border-radius:16px}.marketing-history-detail__content{position:relative;display:flex;min-width:0;flex-direction:column;padding:var(--space-5)}.marketing-history-detail__close{position:absolute;top:18px;right:18px;display:grid;width:36px;height:36px;place-items:center;color:#75778a;background:#f8f8fc;border:0;border-radius:50%;cursor:pointer}.marketing-history-detail__eyebrow{margin:6px 0 12px;color:var(--brand-primary);font-size:13px}.marketing-history-detail__content h2{margin: 0 0 16px 0;display: -webkit-box;max-height: 3.75em;overflow: hidden;color: #292733;font-size: var(--title-section-size);line-height: var(--line-height-tight);overflow-wrap: anywhere;text-overflow: ellipsis;-webkit-box-orient: vertical;-webkit-line-clamp: 2;}.marketing-history-detail__content h3{margin:0 0 10px;color:#9695a5;font-size:13px;font-weight:500}.marketing-history-detail__prompt{min-height:76px;max-height:240px;margin:0 0 20px;overflow:auto;color:#4e4c5e;font-size:14px;line-height:1.75;white-space:pre-wrap}.marketing-history-detail__content dl{margin:auto 0 18px;border-top:1px solid #ecebf1}.marketing-history-detail__content dl div{display:flex;justify-content:space-between;gap:16px;padding:13px 0;border-bottom:1px solid #ecebf1;font-size:13px}.marketing-history-detail__content dt{color:#a09fac}.marketing-history-detail__content dd{margin:0;color:#555364;text-align:right}.marketing-history-detail__actions{display:flex;flex-wrap:wrap;gap:10px}.marketing-history-detail__actions a,.marketing-history-detail__actions button{display:inline-flex;min-height:40px;align-items:center;justify-content:center;gap:7px;padding:0 15px;color:var(--brand-primary);background:#f7f4ff;border:1px solid #e5dcff;border-radius:10px;cursor:pointer;font-size:13px;text-decoration:none}.marketing-history-detail__actions .is-primary{color:#fff;background:var(--brand-primary);border-color:var(--brand-primary)}@media (max-width:768px){.marketing-history-detail{padding:12px}.marketing-history-detail__panel{grid-template-columns:1fr;max-height:calc(100vh - 24px);overflow:auto}.marketing-history-detail__media{padding:18px}.marketing-history-detail__compare{gap:10px}.marketing-history-detail__content{padding:30px 22px 22px}}`;

function isVideoTask(task) {
  return task?.mediaType === "video" || task?.source === "video";
}

function decodeMojibakeText(value) {
  const text = String(value || "");
  if (!/[ÃÂåäæçèé]/.test(text)) return text;
  try {
    const bytes = Uint8Array.from([...text].map((character) => character.charCodeAt(0)));
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return decoded && !decoded.includes(String.fromCharCode(0xfffd)) ? decoded : text;
  } catch {
    return text;
  }
}

function Media({ src, video, alt, transparent = false }) {
  if (!src) {
    return <span className="marketing-history-detail__empty-media">{video ? <FileVideo size={34} /> : <FileImage size={34} />}</span>;
  }
  return video ? <video src={src} controls playsInline preload="metadata" /> : <img className={transparent ? "is-transparent" : ""} src={src} alt={alt} />;
}

export function MarketingHistoryDetailModal({ task, tool, onClose, onRepeat }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!task) return undefined;
    const onKeyDown = (event) => event.key === "Escape" && onClose?.();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [task, onClose]);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  if (!task) return null;

  const video = isVideoTask(task);
  const isReplicate = tool === "replicate";
  // The feature cards already render these URLs directly. Routing them through the
  // generic media proxy changes backend-local result URLs into a failing proxy URL.
  const sourceUrl = task.localPreviewUrl || (isReplicate ? resolveMediaUrl(task.sourceUrl) : task.sourceUrl) || "";
  const resultUrl = task.resultUrl || "";
  const prompt = String(task.prompt || task.description || "").trim();
  const title = decodeMojibakeText(task.sourceFileName || task.fileName || `${tool} 历史记录`);

  async function copyPrompt() {
    try {
      await navigator.clipboard?.writeText(prompt);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }
  const details = isReplicate
    ? [
        ["素材类型", video ? "视频" : "图片"],
        ["创建时间", formatBeijingDateTime(task.createdAt) || "—"],
      ]
    : [
        ["处理状态", task.status === "completed" ? "已完成" : task.status === "failed" ? "失败" : "处理中"],
        [tool === "enhance" ? "提升倍率" : "分辨率", task.upscaleFactor ? `${task.upscaleFactor}×` : task.resolution || "智能适配"],
        ["创建时间", formatBeijingDateTime(task.createdAt || task.created_at || task.time) || task.time || "—"],
      ];

  return createPortal(
    <div className="marketing-history-detail" role="dialog" aria-modal="true" aria-label={`${tool} 历史详情`}>
      <style>{detailStyles}</style>
      <button className="marketing-history-detail__backdrop" type="button" aria-label="关闭详情" onClick={onClose} />
      <section className="marketing-history-detail__panel">
        <div className="marketing-history-detail__media">
          {isReplicate ? (
            <Media src={sourceUrl} video={video} alt={title} />
          ) : (
            <div className="marketing-history-detail__compare">
              <figure><figcaption>原始素材</figcaption><Media src={sourceUrl || resultUrl} video={video} alt={`${title} 原始素材`} /></figure>
              <figure><figcaption>处理结果</figcaption><Media src={resultUrl} video={video} alt={`${title} 处理结果`} transparent={tool === "remove-bg"} /></figure>
            </div>
          )}
        </div>
        <div className="marketing-history-detail__content">
          <button className="marketing-history-detail__close" type="button" aria-label="关闭详情" onClick={onClose}><X size={20} /></button>
          <p className="marketing-history-detail__eyebrow">{tool === "replicate" ? "反推提示词" : tool}</p>
          <h2>{title}</h2>
          {isReplicate && <><h3>生成提示词</h3><p className="marketing-history-detail__prompt">{prompt || "暂无可展示的提示词"}</p></>}
          {!isReplicate && task.error && <><h3>处理说明</h3><p className="marketing-history-detail__prompt">{task.error}</p></>}
          <dl>{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
          <div className="marketing-history-detail__actions">
            {!isReplicate && resultUrl && <a href={resultUrl} download><Download size={16} />下载结果</a>}
            {isReplicate && prompt && <button type="button" onClick={copyPrompt}>{copied ? "已复制" : "复制提示词"}</button>}
            {onRepeat && <button className="is-primary" type="button" onClick={() => onRepeat(task)}>再次处理</button>}
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
