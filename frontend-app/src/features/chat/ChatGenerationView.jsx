import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IconMessage } from "@arco-design/web-react/icon";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CheckCircle2, ChevronDown, CircleAlert, Copy, FileText, Loader2, Plus, X, Zap, Bot } from "lucide-react";
import BillingPoints from "../../components/BillingPoints.jsx";
import { CustomSelect } from "../../components/CustomSelect";
import { chatApi } from "../../api/chatApi";
import { formatBeijingDateTime } from "../../utils/time";
import "./chat.scss";

function isLoggedInUser(authUser) {
  return Boolean(authUser && !authUser.isGuest);
}

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

const emptyChatOptions = { models: [], reasoningEfforts: [], defaultModel: "" };
const chatContextRoles = new Set(["system", "user", "assistant"]);

function toChatContext(messages) {
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

function ChatAttachmentList({ attachments = [], onRemove, isStatic = false }) {
  if (!attachments.length) return null;

  return (
    <div className="chat-attachment-list">
      {attachments.map((attachment, index) => (
        <div
          className={`chat-attachment-card ${isStatic ? "is-static" : ""}`}
          key={attachment.id || attachment.url || index}
        >
          <span className="chat-attachment-preview">
            {attachment.kind === "image" && attachment.url ? (
              <img src={attachment.url} alt="" />
            ) : (
              <FileText size={14} />
            )}
          </span>
          <span className="chat-attachment-meta">
            <strong title={attachment.originalName || "attachment"}>
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

function appendChatStreamChunk(current = "", chunk = "") {
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

function ChatMarkdown({ content }) {
  return (
    <div className="chat-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noreferrer" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
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
        title={copiedMode ? "已复制" : "复制"}
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

function ChatCanvas({ messages, isSubmitting, error }) {
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
                    <ChatMarkdown content={message.content} />
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
                    message.status === "completed" &&
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

function ChatComposerBar({
  options,
  onSubmit,
  isSubmitting,
  model,
  onModelChange,
  onModelSwitchNotice,
  reasoningEffort,
  onReasoningEffortChange,
  conversationRound = 1,
}) {
  const [prompt, setPrompt] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [notice, setNotice] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const attachmentInputRef = useRef(null);
  const modelMenuRef = useRef(null);

  const isReady = options.models.length > 0;
  const selectedModel =
    options.models.find((item) => item.value === model) || options.models[0];
  const isInputLocked = !isReady || isSubmitting || isUploadingAttachment;
  const canSubmit =
    isReady &&
    (prompt.trim().length > 0 || attachments.length > 0) &&
    model &&
    !isSubmitting &&
    !isUploadingAttachment;
  const modelLabel = isReady
    ? selectedModel?.label || "DeepSeek V4 Pro"
    : "模型加载中";
  const visibleReasoningEfforts = options.reasoningEfforts
    .filter((item) => item.value === "none" || item.value === "low")
    .map((item) =>
      item.value === "low" ? { ...item, label: "深度思考" } : item,
    );

  useEffect(() => {
    if (!openMenu) return undefined;

    function closeOnOutside(event) {
      if (!modelMenuRef.current?.contains(event.target)) {
        setOpenMenu(null);
      }
    }

    function closeOnPageInteraction(event) {
      if (!modelMenuRef.current?.contains(event.target)) {
        setOpenMenu(null);
      }
    }

    document.addEventListener("pointerdown", closeOnOutside, true);
    document.addEventListener("wheel", closeOnPageInteraction, true);
    document.addEventListener("touchmove", closeOnPageInteraction, true);
    window.addEventListener("resize", closeOnPageInteraction);
    window.addEventListener("scroll", closeOnPageInteraction, true);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutside, true);
      document.removeEventListener("wheel", closeOnPageInteraction, true);
      document.removeEventListener("touchmove", closeOnPageInteraction, true);
      window.removeEventListener("resize", closeOnPageInteraction);
      window.removeEventListener("scroll", closeOnPageInteraction, true);
    };
  }, [openMenu]);

  async function handleAttachmentSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (attachments.length >= 5) {
      setNotice("单次最多上传 5 个附件。");
      event.target.value = "";
      return;
    }

    setIsUploadingAttachment(true);
    setNotice("");
    try {
      const uploaded = await chatApi.uploadAttachment(file);
      setAttachments((current) => [
        ...current,
        {
          id: uploaded.id || uploaded.url,
          url: uploaded.url,
          originalName: uploaded.originalName || file.name,
          mimeType: uploaded.mimeType || file.type,
          size: uploaded.size || file.size,
          kind:
            uploaded.kind ||
            (file.type.startsWith("image/") ? "image" : "file"),
        },
      ]);
    } catch (error) {
      setNotice(error.message || "附件上传失败，请重试。");
    } finally {
      setIsUploadingAttachment(false);
      event.target.value = "";
    }
  }

  function removeAttachment(index) {
    setAttachments((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
    setNotice("");
  }

  function submitPrompt() {
    if (!canSubmit) {
      setNotice(
        isUploadingAttachment
          ? "附件上传完成后再发送。"
          : "请输入内容或上传附件后再发送。",
      );
      return;
    }

    onSubmit({
      content: prompt.trim(),
      model,
      reasoningEffort,
      attachments,
    });
    setPrompt("");
    setAttachments([]);
    setNotice("");
  }

  return (
    <div className="llm-composer chat-composer" aria-label="大模型输入框">
      <input
        ref={attachmentInputRef}
        type="file"
        hidden
        accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleAttachmentSelect}
      />
      <textarea
        className="llm-input"
        value={prompt}
        disabled={isInputLocked}
        onChange={(event) => {
          setPrompt(event.target.value);
          if (notice) setNotice("");
        }}
        onKeyDown={(event) => {
          if (isInputLocked) return;
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submitPrompt();
          }
        }}
        placeholder={
          !isReady
            ? "正在加载对话模型..."
            : isSubmitting
              ? "AI 正在思考中..."
              : "输入你的创作需求，AI 帮你写文案、做脚本、生成内容灵感......"
        }
      />
      <div className="llm-composer-footer">
        <div className="llm-toolbar">
          <div className="llm-left">
            <button
              className="llm-square"
              type="button"
              disabled={isInputLocked || attachments.length >= 5}
              onClick={() => attachmentInputRef.current?.click()}
              aria-label="上传附件"
              title="上传附件"
            >
              {isUploadingAttachment ? (
                <Loader2 size={16} />
              ) : (
                <Plus size={16} />
              )}
            </button>
            <ChatAttachmentList
              attachments={attachments}
              onRemove={removeAttachment}
            />
            <div
              ref={modelMenuRef}
              className={`llm-select-wrap ${openMenu === "model" ? "is-open" : ""}`}
            >
              <button
                className="llm-select"
                type="button"
                disabled={isInputLocked}
                onClick={() =>
                  setOpenMenu((current) =>
                    current === "model" ? null : "model",
                  )
                }
              >
                <span>{modelLabel}</span>
                <ChevronDown size={16} />
              </button>
              <div className="llm-menu">
                {options.models.map((item) => (
                  <button
                    type="button"
                    key={item.value}
                    className={item.value === model ? "is-selected" : ""}
                    onClick={() => {
                      if (item.value !== model) {
                        onModelSwitchNotice?.();
                      }
                      onModelChange(item.value);
                      setOpenMenu(null);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="llm-right">
            {visibleReasoningEfforts.length > 0 && (
              <CustomSelect
                ariaLabel="推理强度"
                className="llm-reasoning-select"
                value={reasoningEffort}
                disabled={isInputLocked}
                onChange={onReasoningEffortChange}
                options={visibleReasoningEfforts}
              />
            )}
            <button
              className="llm-round primary"
              type="button"
              disabled={!canSubmit}
              onClick={submitPrompt}
              aria-label="发送"
            >
              {isSubmitting ? <Loader2 size={18} /> : <Zap size={18} />}
              <BillingPoints
                feature="chat"
                payload={{ outputChars: 1000, conversationRound }}
                fallbackPoints={1}
              />
            </button>
          </div>
        </div>
      </div>
      {notice && <div className="composer-notice warning">{notice}</div>}
    </div>
  );
}

function ChatHistoryRail({ conversations, activeConversationId, onSelect }) {
  return (
    <aside className="history-rail chat-history-rail" aria-label="AI 对话历史">
      <div className="history-rail-header">
        <span>历史对话</span>
        <strong>{conversations.length}</strong>
      </div>
      <div className="history-list chat-history-list">
        {conversations.length === 0 ? (
          <p className="chat-history-empty">暂无历史对话</p>
        ) : (
          conversations.map((conversation) => (
            <button
              className={`chat-history-item ${activeConversationId === conversation.id ? "is-selected" : ""}`}
              key={conversation.id}
              type="button"
              onClick={() => onSelect(conversation.id)}
            >
              <IconMessage className="chat-history-message-icon" />
              <span>{conversation.title || "未命名对话"}</span>
              <small>
                {formatBeijingDateTime(conversation.createdAt || conversation.created_at || conversation.time) ||
                  conversation.time ||
                  ""}
              </small>
            </button>
          ))
        )}
      </div>
    </aside>
  );
}

export function ChatGenerationView({ authUser, onOpenAuth }) {
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [options, setOptions] = useState(emptyChatOptions);
  const [credits, setCredits] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedReasoningEffort, setSelectedReasoningEffort] =
    useState("none");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [modelSwitchNotice, setModelSwitchNotice] = useState("");
  const isGuest = !isLoggedInUser(authUser);

  // 模块由外层保活挂载，此处始终拉取对话配置与历史列表。
  useEffect(() => {
    let mounted = true;
    chatApi
      .getModels()
      .then((value) => mounted && setOptions(value))
      .catch((error) => mounted && setSubmitError(error.message));
    chatApi
      .getCredits()
      .then((value) => mounted && setCredits(value))
      .catch(() => {});
    chatApi
      .getConversations()
      .then((value) => mounted && setConversations(value))
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!modelSwitchNotice) return undefined;

    const timer = window.setTimeout(() => {
      setModelSwitchNotice("");
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [modelSwitchNotice]);

  const showModelSwitchNotice = useCallback(() => {
    if (!messages.length && !isSubmitting && !submitError) return;
    setModelSwitchNotice("对话中更换模型可能会导致输出不稳定");
  }, [isSubmitting, messages.length, submitError]);

  useEffect(() => {
    const defaultModel = options.defaultModel || options.models[0]?.value || "";
    const hasSelectedModel = options.models.some(
      (item) => item.value === selectedModel,
    );
    if (defaultModel && (!selectedModel || !hasSelectedModel)) {
      setSelectedModel(defaultModel);
    }
    const hasSelectedReasoningEffort = options.reasoningEfforts.some(
      (item) => item.value === selectedReasoningEffort,
    );
    if (
      options.reasoningEfforts[0]?.value &&
      (!selectedReasoningEffort || !hasSelectedReasoningEffort)
    ) {
      setSelectedReasoningEffort(options.reasoningEfforts[0].value);
    }
  }, [options, selectedModel, selectedReasoningEffort]);

  async function sendChatMessage({
    content,
    model,
    reasoningEffort,
    attachments = [],
  }) {
    if (isGuest) {
      setSubmitError("请先登录");
      onOpenAuth?.("login");
      return;
    }

    const localId = Date.now();
    const userMessage = {
      id: `local-${localId}`,
      role: "user",
      content,
      attachments,
      status: "completed",
    };
    const streamingMessage = {
      id: `stream-${localId}`,
      role: "assistant",
      content: "",
      status: "streaming",
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setSubmitError("");
    setIsSubmitting(true);

    try {
      setMessages([...nextMessages, streamingMessage]);
      const result = await chatApi.streamMessage(
        {
          conversationId,
          model,
          reasoningEffort,
          messages: toChatContext(nextMessages),
        },
        {
          onDelta: (delta) => {
            setMessages((current) =>
              current.map((message) =>
                message.id === streamingMessage.id
                  ? {
                      ...message,
                      content: appendChatStreamChunk(message.content, delta),
                    }
                  : message,
              ),
            );
          },
        },
      );
      setConversationId(result.conversationId);
      setMessages((current) =>
        current.map((message) =>
          message.id === streamingMessage.id ? result.message : message,
        ),
      );
      if (result.credits) setCredits(result.credits);
      chatApi
        .getConversations()
        .then(setConversations)
        .catch(() => {});
    } catch (error) {
      setMessages((current) =>
        current.map((message) =>
          message.id === streamingMessage.id
            ? {
                ...message,
                status: "failed",
                error: error.message || "发送失败",
              }
            : message,
        ),
      );
      setSubmitError(error.message || "发送失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  function startNewConversation() {
    setMessages([]);
    setConversationId(null);
    setSubmitError("");
    setModelSwitchNotice("");
  }

  async function selectConversation(id) {
    setSubmitError("");
    setConversationId(id);
    try {
      const historyMessages = await chatApi.getMessages(id);
      setMessages(historyMessages);
    } catch (error) {
      setSubmitError(error.message || "加载历史对话失败");
    }
  }

  const isIntroState = !messages.length && !isSubmitting && !submitError;
  const composer = (
    <ChatComposerBar
      options={options}
      onSubmit={sendChatMessage}
      isSubmitting={isSubmitting}
      model={selectedModel}
      onModelChange={setSelectedModel}
      onModelSwitchNotice={showModelSwitchNotice}
      reasoningEffort={selectedReasoningEffort}
      onReasoningEffortChange={setSelectedReasoningEffort}
      conversationRound={Math.max(1, Math.ceil(messages.length / 2) + 1)}
    />
  );

  return (
    <section className={`chat-view-root ${isIntroState ? "is-intro" : ""}`}>
      <div className="chat-topbar">
        <h1>大模型</h1>
        {isLoggedInUser(authUser) && credits && (
          <span className="credits-chip">积分 {credits.balance}</span>
        )}
      </div>
      {modelSwitchNotice && (
        <div className="chat-floating-notice" role="status" aria-live="polite">
          <span className="chat-floating-notice-icon">
            <CircleAlert size={16} />
          </span>
          <span>{modelSwitchNotice}</span>
        </div>
      )}
      <div className="chat-content-layout">
        <div className="chat-dialog-column">
          {isIntroState ? (
            <div className="llm-intro-layout">
              <ChatCanvas
                messages={messages}
                isSubmitting={isSubmitting}
                error={submitError}
              />
              {composer}
            </div>
          ) : (
            <>
              <ChatCanvas
                messages={messages}
                isSubmitting={isSubmitting}
                error={submitError}
              />
              {composer}
            </>
          )}
        </div>
        <aside className="chat-actions-panel" aria-label="对话操作">
          <div className="chat-rail-brand">
            <span className="chat-rail-mark">F</span>
            <strong>Facemini</strong>
            <small>Beta</small>
          </div>
          <button
            className="chat-new-conversation-button"
            type="button"
            onClick={startNewConversation}
            disabled={isSubmitting}
          >
            <Plus size={16} />
            新建对话
          </button>
          <ChatHistoryRail
            conversations={conversations}
            activeConversationId={conversationId}
            onSelect={selectConversation}
          />
        </aside>
      </div>
    </section>
  );
}
