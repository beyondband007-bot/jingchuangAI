import React, { useRef, useState } from "react";
import { Sparkles } from "lucide-react";
import { SCRIPT_MAX_LENGTH, estimateSpeechSeconds, formatVoiceDuration } from "../utils";

const DEFAULT_PLACEHOLDER = "请输入你希望角色说的内容";

export function ScriptCard({
  text,
  onTextChange,
  onOptimizeRequest,
}) {
  const textareaRef = useRef(null);
  const [selection, setSelection] = useState({ start: 0, end: 0, text: "" });
  const durationSeconds = estimateSpeechSeconds(text);
  const canOptimize = Boolean(selection.text.trim());

  function syncSelection() {
    const element = textareaRef.current;
    if (!element) return;
    const start = element.selectionStart ?? 0;
    const end = element.selectionEnd ?? 0;
    setSelection({
      start,
      end,
      text: text.slice(start, end),
    });
  }

  function handleOptimizeClick() {
    if (!canOptimize) return;
    onOptimizeRequest?.({
      segment: selection.text.trim(),
      start: selection.start,
      end: selection.end,
    });
  }

  return (
    <section className="dhv2-card dhv2-script-card" aria-label="配音内容">
      <header className="dhv2-card__head">
        <h2>配音内容</h2>
      </header>

      <div className="dhv2-script-field">
        <textarea
          ref={textareaRef}
          value={text}
          maxLength={SCRIPT_MAX_LENGTH}
          placeholder={DEFAULT_PLACEHOLDER}
          onChange={(event) => onTextChange?.(event.target.value)}
          onSelect={syncSelection}
          onMouseUp={syncSelection}
          onKeyUp={syncSelection}
        />
        <button
          type="button"
          className="dhv2-script-optimize"
          disabled={!canOptimize}
          title={canOptimize ? "根据选中台词生成优化模板" : "请先选中需要优化的台词"}
          onClick={handleOptimizeClick}
        >
          <Sparkles size={12} />
          AI 优化台词
        </button>
      </div>

      <footer className="dhv2-script-meta">
        <span>说话时长：{formatVoiceDuration(durationSeconds)}</span>
        <span>
          {text.length} / {SCRIPT_MAX_LENGTH}
        </span>
      </footer>
    </section>
  );
}
