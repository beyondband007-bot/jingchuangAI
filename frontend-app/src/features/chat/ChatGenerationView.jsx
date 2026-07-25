import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Message } from "@arco-design/web-react";
import { ChevronDown, Loader2, Plus, Square, Zap } from "lucide-react";
import BillingPoints from "../../components/BillingPoints.jsx";
import { CustomSelect } from "../../components/CustomSelect";
import { useDeleteConfirmation } from "../../components/DeleteConfirmDialog";
import { useToast } from "../../components/ToastProvider";
import { chatApi } from "../../api/chatApi";
import { ChatHistoryRail } from "./ChatHistoryRail";
import {
  appendChatStreamChunk,
  ChatAttachmentList,
  ChatConversationCanvas,
  emptyChatOptions,
  getOrderedChatModels,
  toChatContext,
} from "./ChatConversationCanvas";
import { ModelOptionContent } from "./components/modelOptionMeta.jsx";
import "./chatStyles.css";

function isLoggedInUser(authUser) {
  return Boolean(authUser && !authUser.isGuest);
}

function ChatComposerBar({
  options,
  onSubmit,
  onStop,
  isSubmitting,
  canInterruptSubmit,
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
  const [isModelListExpanded, setIsModelListExpanded] = useState(false);
  const attachmentInputRef = useRef(null);
  const modelMenuRef = useRef(null);

  const isReady = options.models.length > 0;
  const selectedModel =
    options.models.find((item) => item.value === model) || options.models[0];
  const isTextInputLocked = !isReady || isUploadingAttachment;
  const isControlsLocked = !isReady || isSubmitting || isUploadingAttachment;
  const canSubmit =
    isReady &&
    (prompt.trim().length > 0 || attachments.length > 0) &&
    model &&
    !isSubmitting &&
    !isUploadingAttachment;
  const canInterruptAndSubmit =
    isReady &&
    (prompt.trim().length > 0 || attachments.length > 0) &&
    model &&
    isSubmitting &&
    canInterruptSubmit &&
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

  const visibleModelOptions = getOrderedChatModels(
    options.models,
    isModelListExpanded,
  );
  const hasMoreModelOptions =
    getOrderedChatModels(options.models, true).length >
    getOrderedChatModels(options.models, false).length;

  useEffect(() => {
    if (openMenu !== "model") {
      setIsModelListExpanded(false);
    }
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

  function submitPrompt({ interrupt = false } = {}) {
    const isAllowed = interrupt ? canInterruptAndSubmit : canSubmit;
    if (!isAllowed) {
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
    }, { interrupt });
    setPrompt("");
    setAttachments([]);
    setNotice("");
  }

  return (
    <div className="fm-prompt-dialog llm-composer chat-composer is-expanded" aria-label="大模型输入框">
      <input
        ref={attachmentInputRef}
        type="file"
        hidden
        accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleAttachmentSelect}
      />
      <div className="fm-prompt-main-row">
        <textarea
          className="fm-prompt-input llm-input"
          value={prompt}
          disabled={isTextInputLocked}
          onChange={(event) => {
            setPrompt(event.target.value);
            if (notice) setNotice("");
          }}
          onKeyDown={(event) => {
            if (isTextInputLocked) return;
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              if (isSubmitting) {
                if (canInterruptAndSubmit) submitPrompt({ interrupt: true });
              } else {
                submitPrompt();
              }
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
      </div>
      <div className="fm-prompt-reference-region">
        <ChatAttachmentList
          attachments={attachments}
          onRemove={removeAttachment}
        />
      </div>
      <div className="fm-prompt-controls-row llm-composer-footer">
        <div className="llm-toolbar">
          <div className="fm-prompt-controls-group llm-left">
            <button
              className="fm-prompt-control fm-prompt-control--round llm-square"
              type="button"
              disabled={isControlsLocked || attachments.length >= 5}
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
            <div
              ref={modelMenuRef}
              className={`llm-select-wrap ${openMenu === "model" ? "is-open" : ""}`}
            >
              <button
                className="fm-prompt-control llm-select"
                type="button"
                disabled={isControlsLocked}
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
                {visibleModelOptions.map((item) => (
                  <button
                    type="button"
                    key={item.value}
                    className={`llm-model-option ${item.value === model ? "is-selected" : ""}`}
                    onClick={() => {
                      if (item.value !== model) {
                        onModelSwitchNotice?.();
                      }
                      onModelChange(item.value);
                      setOpenMenu(null);
                    }}
                  >
                    <ModelOptionContent
                      item={item}
                      selected={item.value === model}
                    />
                  </button>
                ))}
                {hasMoreModelOptions && (
                  <button
                    type="button"
                    className="llm-model-more"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      setIsModelListExpanded((current) => !current);
                    }}
                  >
                    <span>{isModelListExpanded ? "收起" : "查看更多"}</span>
                    <ChevronDown
                      size={15}
                      className={isModelListExpanded ? "is-expanded" : ""}
                    />
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="fm-prompt-controls-group fm-prompt-controls-group--end llm-right">
            {visibleReasoningEfforts.length > 0 && (
              <CustomSelect
                ariaLabel="推理强度"
                className="llm-reasoning-select"
                triggerClassName="fm-prompt-control"
                value={reasoningEffort}
                disabled={isControlsLocked}
                onChange={onReasoningEffortChange}
                options={visibleReasoningEfforts}
              />
            )}
            <button
              className={`fm-prompt-submit llm-round primary ${isSubmitting ? "is-stop" : ""}`}
              type="button"
              disabled={!isSubmitting && !canSubmit}
              onClick={isSubmitting ? onStop : submitPrompt}
              title={isSubmitting ? "停止生成" : "发送"}
              aria-label="发送"
            >
              {isSubmitting ? (
                <Square size={15} fill="currentColor" />
              ) : (
                <>
                  <Zap size={18} />
                  <BillingPoints
                    feature="chat"
                    payload={{ outputChars: 1000, conversationRound }}
                    fallbackPoints={1}
                  />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      {notice && <div className="composer-notice warning">{notice}</div>}
    </div>
  );
}

export function ChatGenerationView({ authUser, onOpenAuth }) {
  const { showToast, dismissToast } = useToast();
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
  const streamAbortControllerRef = useRef(null);
  const historyAbortControllerRef = useRef(null);
  const isGuest = !isLoggedInUser(authUser);
  const { requestDelete: requestDeleteConversation, deleteConfirmDialog } =
    useDeleteConfirmation({
      title: "删除历史对话",
      message: "删除后将无法恢复，确认删除这条历史对话吗？",
      confirmText: "删除",
      onConfirm: async (conversation) => {
        await chatApi.deleteConversation(conversation.id);
        Message.success("删除成功");
        setConversations((current) =>
          current.filter((item) => item.id !== conversation.id),
        );
        if (conversationId === conversation.id) {
          historyAbortControllerRef.current?.abort();
          setMessages([]);
          setConversationId(null);
          setSubmitError("");
          dismissToast();
        }
      },
    });

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

  const showModelSwitchNotice = useCallback(() => {
    if (!messages.length && !isSubmitting && !submitError) return;
    showToast("对话中更换模型可能会导致输出不稳定", { type: "warning" });
  }, [isSubmitting, messages.length, showToast, submitError]);

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
  }, { interrupt = false } = {}) {
    if (isGuest) {
      setSubmitError("请先登录");
      onOpenAuth?.("login");
      return;
    }

    if (interrupt) {
      streamAbortControllerRef.current?.abort();
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

    const abortController = new AbortController();
    streamAbortControllerRef.current = abortController;
    let activeConversationId = conversationId;

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
          signal: abortController.signal,
          onStarted: ({ conversationId: startedConversationId }) => {
            activeConversationId = startedConversationId;
            setConversationId(startedConversationId);
          },
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
      if (error.name === "AbortError" || abortController.signal.aborted) {
        setMessages((current) =>
          current.flatMap((message) => {
            if (message.id !== streamingMessage.id) return [message];
            if (!message.content?.trim()) return [];
            return [{ ...message, status: "stopped" }];
          }),
        );
        if (
          activeConversationId &&
          streamAbortControllerRef.current === abortController
        ) {
          try {
            let historyMessages = [];
            let isSettled = false;
            for (let attempt = 0; attempt < 5; attempt += 1) {
              historyMessages = await chatApi.getMessages(activeConversationId);
              isSettled = !historyMessages.some(
                (message) => message.status === "streaming",
              );
              if (isSettled) {
                break;
              }
              await new Promise((resolve) => window.setTimeout(resolve, 200));
            }
            if (
              isSettled &&
              streamAbortControllerRef.current === abortController
            ) {
              setMessages(historyMessages);
            }
          } catch {
            // Keep the local stopped message when server reconciliation fails.
          }
        }
        try {
          if (!activeConversationId) {
            await new Promise((resolve) => window.setTimeout(resolve, 300));
          }
          const [nextConversations, nextCredits] = await Promise.all([
            chatApi.getConversations(),
            chatApi.getCredits(),
          ]);
          if (streamAbortControllerRef.current === abortController) {
            setConversations(nextConversations);
            setCredits(nextCredits);
          }
        } catch {
          // The local stopped state remains usable if metadata refresh fails.
        }
        return;
      }
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
      if (streamAbortControllerRef.current === abortController) {
        streamAbortControllerRef.current = null;
        setIsSubmitting(false);
      }
    }
  }

  function stopGenerating() {
    streamAbortControllerRef.current?.abort();
  }

  function startNewConversation() {
    historyAbortControllerRef.current?.abort();
    setMessages([]);
    setConversationId(null);
    setSubmitError("");
    dismissToast();
  }

  async function selectConversation(id) {
    if (isSubmitting) return;
    historyAbortControllerRef.current?.abort();
    const abortController = new AbortController();
    historyAbortControllerRef.current = abortController;
    setSubmitError("");
    setConversationId(id);
    try {
      const historyMessages = await chatApi.getMessages(id, {
        signal: abortController.signal,
      });
      if (historyAbortControllerRef.current === abortController) {
        setMessages(historyMessages);
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        setSubmitError(error.message || "加载历史对话失败");
      }
    } finally {
      if (historyAbortControllerRef.current === abortController) {
        historyAbortControllerRef.current = null;
      }
    }
  }

  const isIntroState = !messages.length && !isSubmitting && !submitError;
  const composer = (
    <ChatComposerBar
      options={options}
      onSubmit={sendChatMessage}
      onStop={stopGenerating}
      isSubmitting={isSubmitting}
      canInterruptSubmit={Boolean(conversationId)}
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
      <div className="chat-content-layout">
        <div className="chat-dialog-column">
          {isIntroState ? (
            <div className="llm-intro-layout">
              <ChatConversationCanvas
                messages={messages}
                isSubmitting={isSubmitting}
                error={submitError}
              />
              {composer}
            </div>
          ) : (
            <>
              <ChatConversationCanvas
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
            onDelete={(conversation) =>
              requestDeleteConversation(conversation, {
                targetName: conversation.title || "未命名对话",
              })
            }
            disabled={isSubmitting}
          />
        </aside>
      </div>
      {deleteConfirmDialog}
    </section>
  );
}
