import React, { useMemo, useState } from "react";
import { IconMessage } from "@arco-design/web-react/icon";
import { ChevronDown, Trash2 } from "lucide-react";
import { HistoryEmptyState } from "../../components/HistoryEmptyState";

function getBeijingDayKey(value = new Date()) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const pick = (type) => parts.find((item) => item.type === type)?.value || "";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

function getBeijingOffsetDayKey(offsetDays = 0) {
  return getBeijingDayKey(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
}

function getConversationDateValue(conversation = {}) {
  return (
    conversation.updatedAt ||
    conversation.updated_at ||
    conversation.createdAt ||
    conversation.created_at ||
    conversation.time ||
    ""
  );
}

function formatChatHistoryItemTime(conversation = {}) {
  const value = getConversationDateValue(conversation);
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const dayKey = getBeijingDayKey(value);
  const todayKey = getBeijingOffsetDayKey(0);
  const yesterdayKey = getBeijingOffsetDayKey(-1);
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Shanghai",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const pick = (type) => parts.find((item) => item.type === type)?.value || "";
  if (dayKey === todayKey || dayKey === yesterdayKey) return "";
  return `${pick("month")}/${pick("day")}`;
}

function groupChatConversationsByDay(conversations = []) {
  const todayKey = getBeijingOffsetDayKey(0);
  const yesterdayKey = getBeijingOffsetDayKey(-1);
  const groups = { today: [], yesterday: [], older: [] };

  conversations.forEach((conversation) => {
    const dayKey = getBeijingDayKey(getConversationDateValue(conversation));
    if (dayKey === todayKey) {
      groups.today.push(conversation);
    } else if (dayKey === yesterdayKey) {
      groups.yesterday.push(conversation);
    } else {
      groups.older.push(conversation);
    }
  });

  return groups;
}


export function ChatHistoryRail({ conversations, activeConversationId, onSelect, onDelete, disabled = false }) {
  const [showOlder, setShowOlder] = useState(false);
  const groupedConversations = useMemo(
    () => groupChatConversationsByDay(conversations),
    [conversations],
  );

  function renderConversation(conversation) {
    const isSelected = activeConversationId === conversation.id;
    const itemTime = formatChatHistoryItemTime(conversation);
    return (
      <div
        className={`chat-history-row ${isSelected ? "is-selected" : ""}`}
        key={conversation.id}
      >
        <button
          className={`chat-history-item ${isSelected ? "is-selected" : ""}`}
          type="button"
          disabled={disabled}
          onClick={() => onSelect(conversation.id)}
        >
          <IconMessage className="chat-history-message-icon" />
          <span>{conversation.title || "未命名对话"}</span>
        </button>
        <div className={`chat-history-row-action ${itemTime ? "has-time" : ""}`}>
          {itemTime ? (
            <time dateTime={getConversationDateValue(conversation)}>
              {itemTime}
            </time>
          ) : null}
          <button
            className="chat-history-delete"
            type="button"
            aria-label="删除历史对话"
            disabled={disabled}
            onClick={() => onDelete(conversation)}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    );
  }

  function renderSection(label, items) {
    if (!items.length) return null;
    return (
      <section className="chat-history-section" aria-label={label}>
        <div className="chat-history-section-title">
          <span>{label}</span>
        </div>
        <div className="chat-history-section-list">
          {items.map(renderConversation)}
        </div>
      </section>
    );
  }

  return (
    <aside className="history-rail chat-history-rail" aria-label="AI 对话历史">
      <div className="history-rail-header">
        <span>历史对话</span>
      </div>
      <div className="history-list chat-history-list">
        {conversations.length === 0 ? (
          <HistoryEmptyState
            className="chat-history-empty"
            title="暂无历史对话"
            compact
            borderless
          />
        ) : (
          <>
            {renderSection("今天", groupedConversations.today)}
            {renderSection("昨天", groupedConversations.yesterday)}
            {groupedConversations.older.length > 0 && (
              <section className="chat-history-section" aria-label="更早">
                <button
                  className={`chat-history-section-title chat-history-section-toggle ${showOlder ? "is-open" : ""}`}
                  type="button"
                  aria-expanded={showOlder}
                  onClick={() => setShowOlder((value) => !value)}
                >
                  <span>更早</span>
                  <ChevronDown size={14} />
                </button>
                {showOlder && (
                  <div className="chat-history-section-list">
                    {groupedConversations.older.map(renderConversation)}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
    </aside>
  );
}
