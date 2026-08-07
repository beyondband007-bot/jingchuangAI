import React, { useEffect, useState } from "react";
import { Loader2, X } from "lucide-react";
import { Message } from "@arco-design/web-react";
import { chatApi } from "../../../api/chatApi";
import {
  SCRIPT_OPTIMIZE_TEMPLATES,
  buildScriptOptimizePrompt,
} from "../utils";

export function ScriptOptimizeModal({ request, onClose, onApply }) {
  const [selectedTemplateId, setSelectedTemplateId] = useState(
    SCRIPT_OPTIMIZE_TEMPLATES[0].id,
  );
  const [chatModel, setChatModel] = useState("");
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    chatApi
      .getModels()
      .then((data) => {
        if (cancelled) return;
        const nextModel = data?.defaultModel || data?.models?.[0]?.value || "";
        setChatModel(nextModel);
      })
      .catch(() => {
        if (!cancelled) setNotice("模型加载失败，请稍后重试");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!request) return null;

  const selectedTemplate =
    SCRIPT_OPTIMIZE_TEMPLATES.find((item) => item.id === selectedTemplateId) ||
    SCRIPT_OPTIMIZE_TEMPLATES[0];

  async function handleStart() {
    if (!chatModel) {
      setNotice("暂无可用的优化模型，请稍后重试");
      return;
    }

    setNotice("");
    setIsOptimizing(true);
    try {
      const result = await chatApi.sendMessage({
        model: chatModel,
        reasoningEffort: "none",
        messages: [
          {
            role: "user",
            content: buildScriptOptimizePrompt(request.segment, selectedTemplate),
          },
        ],
      });
      const optimizedText = String(result?.message?.content || "").trim();
      if (!optimizedText) {
        throw new Error("未生成优化结果");
      }
      onApply?.(optimizedText);
      Message.success("台词优化完成");
      onClose?.();
    } catch (error) {
      const message = error?.message || "台词优化失败，请稍后重试";
      setNotice(message);
      Message.error(message);
    } finally {
      setIsOptimizing(false);
    }
  }

  return (
    <div
      className="dhv2-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="AI 优化台词丨4 积分"
      onMouseDown={onClose}
    >
      <div
        className="dhv2-modal is-script-optimize"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="dhv2-modal__header">
          <div>
            <span>AI 优化</span>
            <strong>AI 优化台词丨4 积分</strong>
            <p className="dhv2-script-optimize-modal__hint">
              已选中部分文字，优化后将替换选中片段
            </p>
          </div>
          <button
            type="button"
            className="dhv2-modal__close"
            onClick={onClose}
            aria-label="关闭"
            disabled={isOptimizing}
          >
            <X size={18} />
          </button>
        </header>

        <div className="dhv2-modal__body dhv2-script-optimize-modal__body">
          <div className="dhv2-script-optimize-modal__segment">
            <span>待优化片段</span>
            <p>{request.segment}</p>
          </div>

          <div className="dhv2-script-optimize-modal__templates" role="listbox" aria-label="优化模板">
            {SCRIPT_OPTIMIZE_TEMPLATES.map((template, index) => {
              const isActive = template.id === selectedTemplateId;
              return (
                <button
                  key={template.id}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={`dhv2-script-optimize-template${isActive ? " is-active" : ""}`}
                  disabled={isOptimizing}
                  onClick={() => setSelectedTemplateId(template.id)}
                >
                  <span className="dhv2-script-optimize-template__index">{index + 1}</span>
                  <span className="dhv2-script-optimize-template__content">
                    <strong>{template.title}</strong>
                    <em>{template.description}</em>
                  </span>
                </button>
              );
            })}
          </div>

          {notice ? <p className="dhv2-script-optimize-modal__notice">{notice}</p> : null}
        </div>

        <footer className="dhv2-modal__footer">
          <button
            type="button"
            className="dhv2-button-secondary"
            onClick={onClose}
            disabled={isOptimizing}
          >
            取消
          </button>
          <button
            type="button"
            className="dhv2-button-primary"
            onClick={handleStart}
            disabled={isOptimizing || !chatModel}
          >
            {isOptimizing ? (
              <>
                <Loader2 size={16} className="dhv2-spinner" />
                优化中...
              </>
            ) : (
              "开始优化"
            )}
          </button>
        </footer>
      </div>
    </div>
  );
}
