import React, { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Bot, CheckCircle2, ChevronDown, Copy, FileText, Loader2, X } from "lucide-react";

const ChatMarkdown = lazy(() =>
  import("./ChatMarkdown").then((module) => ({ default: module.ChatMarkdown })),
);

async function writeClipboardText(text) {
  const value = String(text || "").trim();
  if (!value) return false;

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = value;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    return copied;
  }
}

export const emptyChatOptions = { models: [], reasoningEfforts: [], defaultModel: "" };
const chatContextRoles = new Set(["system", "user", "assistant"]);
const collapsedChatModelValues = ["deepseek-v4-pro", "qwen3.7-plus"];
const expandedChatModelValues = [
  "qwen3.6-plus",
  "gpt-5-4",
  "gpt-5-5",
  "gemini-3-pro",
  "claude-opus-4-6",
  "claude-sonnet-4-6",
];

export function getOrderedChatModels(models = [], isExpanded = false) {
  const modelMap = new Map(models.map((item) => [item.value, item]));
  const pickedValues = new Set();
  const pick = (value) => {
    const item = modelMap.get(value);
    if (!item || pickedValues.has(value)) return [];
    pickedValues.add(value);
    return [item];
  };

  const collapsedModels = collapsedChatModelValues.flatMap(pick);
  if (!isExpanded) {
    return collapsedModels.length ? collapsedModels : models.slice(0, 2);
  }

  const expandedModels = expandedChatModelValues.flatMap(pick);
  const extraModels = models.filter((item) => !pickedValues.has(item.value));
  return [...collapsedModels, ...expandedModels, ...extraModels];
}

export function toChatContext(messages) {
  return messages
    .filter(
      (message) =>
        message.status !== "failed" &&
        chatContextRoles.has(message.role) &&
        (message.content?.trim() || message.attachments?.length),
    )
    .map((message) => ({
      role: message.role,
      content: message.content?.trim() || "",
      attachments: message.attachments || [],
    }));
}

function formatChatAttachmentSize(bytes = 0) {
  if (!bytes || Number.isNaN(Number(bytes))) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function ChatAttachmentList({ attachments = [], onRemove, isStatic = false }) {
  if (!attachments.length) return null;
  const classPrefix = isStatic ? "chat-attachment" : "fm-prompt-reference";

  return (
    <div className={`${classPrefix}-list`}>
      {attachments.map((attachment, index) => (
        <div
          className={`${classPrefix}-card ${isStatic ? "is-static" : ""}`}
          key={attachment.id || attachment.url || index}
        >
          <span className={`${classPrefix}-preview`}>
            {attachment.kind === "image" && attachment.url ? (
              <img src={attachment.url} alt="" />
            ) : (
              <FileText size={14} />
            )}
          </span>
          <span className={`${classPrefix}-meta`}>
            <strong data-tooltip={attachment.originalName || "attachment"}>
              {attachment.originalName || "attachment"}
            </strong>
            <small>{formatChatAttachmentSize(attachment.size)}</small>
          </span>
          {!isStatic && (
            <button
              type="button"
              onClick={() => onRemove?.(index)}
              aria-label="移除附件"
            >
              <X size={11} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export function appendChatStreamChunk(current = "", chunk = "") {
  if (!chunk) return current;
  if (!current) return chunk;
  if (chunk === current) return current;
  if (chunk.startsWith(current)) return chunk;

  const maxOverlap = Math.min(current.length, chunk.length);
  for (let size = maxOverlap; size > 0; size -= 1) {
    if (current.endsWith(chunk.slice(0, size))) {
      return `${current}${chunk.slice(size)}`;
    }
  }

  return `${current}${chunk}`;
}

function ChatMarkdownFallback({ content }) {
  return (
    <div className="chat-markdown">
      {content}
    </div>
  );
}

function markdownToPlainText(markdown = "") {
  return String(markdown || "")
    .replace(/```[\s\S]*?```/g, (block) =>
      block.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, ""),
    )
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[*_~]{1,3}/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function ChatCopyActions({ content }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copiedMode, setCopiedMode] = useState("");
  const wrapRef = useRef(null);
  const plainText = useMemo(() => markdownToPlainText(content), [content]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    function handlePointerDown(event) {
      if (!wrapRef.current?.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setIsMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  async function copyContent(mode = "plain") {
    const copied = await writeClipboardText(
      mode === "markdown" ? content : plainText,
    );
    if (!copied) return;
    setCopiedMode(mode);
    setIsMenuOpen(false);
    window.setTimeout(() => {
      setCopiedMode((current) => (current === mode ? "" : current));
    }, 1600);
  }

  return (
    <div
      className={`chat-copy-actions ${isMenuOpen ? "is-menu-open" : ""}`}
      ref={wrapRef}
    >
      <button
        className={`chat-copy-icon ${copiedMode ? "is-copied" : ""}`}
        type="button"
        onClick={() => copyContent("plain")}
        aria-label={copiedMode ? "已复制回复内容" : "复制回复内容"}
        data-tooltip={copiedMode ? "已复制" : "复制"}
      >
        {copiedMode ? <CheckCircle2 size={15} /> : <Copy size={15} />}
      </button>
      <button
        className={`chat-copy-chevron ${isMenuOpen ? "is-open" : ""}`}
        type="button"
        onClick={() => setIsMenuOpen((value) => !value)}
        aria-label="展开复制选项"
        aria-expanded={isMenuOpen}
      >
        <ChevronDown size={14} />
      </button>
      {isMenuOpen && (
        <div className="chat-copy-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => copyContent("markdown")}
          >
            复制为Markdown
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => copyContent("plain")}
          >
            复制
          </button>
        </div>
      )}
    </div>
  );
}

export function ChatConversationCanvas({ messages, isSubmitting, error }) {
  const scrollContainerRef = useRef(null);
  const scrollSignature = messages
    .map(
      (message) =>
        `${message.id}:${message.status}:${message.content?.length || 0}:${
          message.attachments?.length || 0
        }`,
    )
    .join("|");
  const hasStreamingMessage = messages.some(
    (message) => message.status === "streaming",
  );

  useEffect(() => {
    if (!messages.length && !isSubmitting && !error) return undefined;

    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return undefined;

    const scrollToBottom = () => {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: "auto",
      });
    };

    scrollToBottom();
    const frameId = window.requestAnimationFrame(scrollToBottom);
    const timeoutId = window.setTimeout(scrollToBottom, 60);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [error, isSubmitting, messages.length, scrollSignature]);

  if (!messages.length && !isSubmitting && !error) {
    return (
      <div className="chat-main-canvas">
        <div className="chat-empty-state llm-empty-state">
          <h1>Hi，我是 Facemini，你的 AI 创作助手</h1>
        </div>
      </div>
    );
  }

  return (
    <div
      className="chat-main-canvas"
      ref={scrollContainerRef}
      aria-live="polite"
    >
      <div className="chat-conversation-thread">
        {messages.map((message) => (
          <div className={`chat-message-row ${message.role}`} key={message.id}>
            {message.role === "assistant" && (
              <span
                className={`chat-message-avatar ${message.status === "failed" ? "is-error" : ""}`}
              >
                <Bot size={17} />
              </span>
            )}
            <div
              className={`chat-message-bubble ${message.status === "failed" ? "is-error" : ""} ${message.status === "streaming" ? "is-streaming" : ""}`}
            >
              {message.status === "failed" ? (
                <>
                  <strong>这次没有回复成功</strong>
                  <p>{message.error || "对话服务暂时不可用，请稍后重试。"}</p>
                </>
              ) : (
                <>
                  {message.role === "assistant" && message.content ? (
                    <Suspense
                      fallback={<ChatMarkdownFallback content={message.content} />}
                    >
                      <ChatMarkdown content={message.content} />
                    </Suspense>
                  ) : (
                    message.content ||
                    (message.status === "streaming" ? "正在思考..." : "")
                  )}
                  <ChatAttachmentList
                    attachments={message.attachments || []}
                    isStatic
                  />
                  {message.points > 0 && (
                    <small className="chat-message-cost">
                      {message.price || `${message.points} 积分`}
                    </small>
                  )}
                  {message.role === "assistant" &&
                    message.status === "stopped" && (
                      <small className="chat-message-status">
                        已停止生成
                      </small>
                    )}
                  {message.role === "assistant" &&
                    (message.status === "completed" ||
                      message.status === "stopped") &&
                    message.content?.trim() && (
                      <ChatCopyActions content={message.content} />
                    )}
                </>
              )}
            </div>
          </div>
        ))}
        {isSubmitting && !hasStreamingMessage && (
          <div className="chat-message-row assistant">
            <span className="chat-message-avatar">
              <Bot size={17} />
            </span>
            <div className="chat-message-bubble is-loading">
              <Loader2 size={17} />
              <span>正在思考...</span>
            </div>
          </div>
        )}
        {error && (
          <div className="chat-inline-error" role="alert">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
