import { useEffect } from "react";
import { Download, Sparkles, X } from "lucide-react";
import { getFrontendModelDisplayName } from "../../utils/modelDisplayNames.js";

export function QuickTemplatePreviewDialog({ template, onClose, onApply }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!template) return null;
  return (
    <div className="article-quick-template-preview-overlay" role="presentation">
      <button className="article-quick-template-preview-backdrop" type="button" aria-label="关闭模板预览" onClick={onClose} />
      <section className="article-quick-template-preview-dialog" role="dialog" aria-modal="true" aria-labelledby="article-quick-template-preview-title">
        <header className="article-quick-template-preview-head">
          <strong id="article-quick-template-preview-title">快捷图文模板</strong>
          <button type="button" onClick={onClose} aria-label="关闭模板预览"><X size={18} /></button>
        </header>
        <div className="article-quick-template-preview-body">
          <div className="article-quick-template-preview-media"><img src={template.image} alt={template.title} /></div>
          <div className="article-quick-template-preview-copy">
            <h3>{template.title}</h3>
            <p>{template.topic}</p>
            <div className="article-quick-template-preview-meta"><span>{template.copyTemplate}</span><span>{template.tone}</span></div>
          </div>
        </div>
        <footer className="article-quick-template-preview-foot">
          <button type="button" className="article-quick-template-preview-apply" onClick={onApply}>引用此模板</button>
        </footer>
      </section>
    </div>
  );
}

export function QuickTemplateConfirmDialog({ template, onCancel, onConfirm }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel]);

  return (
    <div className="logout-confirm-layer" role="presentation">
      <button className="logout-confirm-backdrop" type="button" aria-label="关闭提示" onClick={onCancel} />
      <section className="logout-confirm-dialog article-quick-template-confirm" role="dialog" aria-modal="true" aria-labelledby="article-quick-template-confirm-title">
        <div className="logout-confirm-icon article-quick-template-confirm-icon"><Sparkles size={20} /></div>
        <div className="logout-confirm-copy">
          <h2 id="article-quick-template-confirm-title">套用快捷模板？</h2>
          <p>是否返回上一步并且套用模板{template?.title ? `「${template.title}」` : ""}？</p>
        </div>
        <div className="logout-confirm-actions"><button type="button" onClick={onCancel}>否</button><button type="button" onClick={onConfirm}>是</button></div>
      </section>
    </div>
  );
}

export function LegacyArticlePreview({ task, onClose }) {
  if (!task?.image) return null;
  return (
    <aside className="article-preview-overlay" aria-label="爆款图文预览">
      <div className="article-preview-dialog">
        <div className="article-preview-head">
          <div>
            <span>生成结果</span>
            <strong>{getFrontendModelDisplayName(task.model || "AI 图文")}</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭预览"><X size={18} /></button>
        </div>
        <div className="article-preview-stage"><img src={task.image} alt="爆款图文生成结果" /></div>
        <a className="article-primary-link" href={task.image} download><Download size={16} />下载图片</a>
      </div>
    </aside>
  );
}
