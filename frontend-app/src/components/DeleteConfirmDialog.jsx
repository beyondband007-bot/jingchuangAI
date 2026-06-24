import React, { useCallback, useEffect, useState } from "react";
import { Loader2, RefreshCcw, Trash2, X } from "lucide-react";

export function DeleteConfirmDialog({
  open,
  title = "确认删除？",
  message = "删除后将无法恢复，请确认是否继续。",
  targetName = "",
  confirmText = "确认删除",
  cancelText = "取消",
  submittingText = "删除中",
  icon: Icon = Trash2,
  confirmTone = "danger",
  isSubmitting = false,
  onCancel,
  onConfirm,
}) {
  useEffect(() => {
    if (!open) return undefined;
    function closeOnEscape(event) {
      if (event.key === "Escape" && !isSubmitting) onCancel?.();
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open, isSubmitting, onCancel]);

  if (!open) return null;

  return (
    <div className="delete-confirm-layer" role="presentation">
      <button
        className="delete-confirm-backdrop"
        type="button"
        aria-label={cancelText}
        disabled={isSubmitting}
        onClick={onCancel}
      />
      <section
        className="delete-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="delete-confirm-title"
      >
        <button
          className="delete-confirm-close"
          type="button"
          aria-label={cancelText}
          disabled={isSubmitting}
        onClick={onCancel}
      >
        <X size={18} />
      </button>
      <span className="delete-confirm-icon" aria-hidden="true">
          <Icon size={26} />
      </span>
        <div className="delete-confirm-copy">
          <h2 id="delete-confirm-title">{title}</h2>
          <p>{message}</p>
          {targetName && <strong>{targetName}</strong>}
        </div>
        <div className="delete-confirm-actions">
          <button type="button" disabled={isSubmitting} onClick={onCancel}>
            {cancelText}
          </button>
          <button
            className={`is-${confirmTone}`}
            type="button"
            disabled={isSubmitting}
            onClick={onConfirm}
          >
            {isSubmitting ? <Loader2 size={16} className="is-spinning" /> : null}
            {isSubmitting ? submittingText : confirmText}
          </button>
        </div>
      </section>
    </div>
  );
}

export function useDeleteConfirmation({
  onConfirm,
  title,
  message,
  confirmText,
} = {}) {
  const [pendingDelete, setPendingDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const requestDelete = useCallback((payload, options = {}) => {
    setPendingDelete({ payload, ...options });
  }, []);

  const cancelDelete = useCallback(() => {
    if (!isDeleting) setPendingDelete(null);
  }, [isDeleting]);

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete || !onConfirm) return;
    setIsDeleting(true);
    try {
      await onConfirm(pendingDelete.payload);
      setPendingDelete(null);
    } finally {
      setIsDeleting(false);
    }
  }, [onConfirm, pendingDelete]);

  return {
    requestDelete,
    deleteConfirmDialog: (
      <DeleteConfirmDialog
        open={Boolean(pendingDelete)}
        title={pendingDelete?.title || title}
        message={pendingDelete?.message || message}
        targetName={pendingDelete?.targetName || ""}
        confirmText={pendingDelete?.confirmText || confirmText}
        isSubmitting={isDeleting}
        onCancel={cancelDelete}
        onConfirm={confirmDelete}
      />
    ),
  };
}

export function useRegenerateConfirmation({
  onConfirm,
  title = "确认再次生成？",
  message = "重新生成会开启新任务并扣除相应积分。您确定要继续吗？",
  confirmText = "确认",
} = {}) {
  const [pendingRegenerate, setPendingRegenerate] = useState(null);
  const [isRegenerating, setIsRegenerating] = useState(false);

  const requestRegenerate = useCallback((payload, options = {}) => {
    setPendingRegenerate({ payload, ...options });
  }, []);

  const cancelRegenerate = useCallback(() => {
    if (!isRegenerating) setPendingRegenerate(null);
  }, [isRegenerating]);

  const confirmRegenerate = useCallback(async () => {
    if (!pendingRegenerate || !onConfirm) return;
    setIsRegenerating(true);
    try {
      await onConfirm(pendingRegenerate.payload);
      setPendingRegenerate(null);
    } finally {
      setIsRegenerating(false);
    }
  }, [onConfirm, pendingRegenerate]);

  return {
    requestRegenerate,
    regenerateConfirmDialog: (
      <DeleteConfirmDialog
        open={Boolean(pendingRegenerate)}
        title={pendingRegenerate?.title || title}
        message={pendingRegenerate?.message || message}
        targetName={pendingRegenerate?.targetName || ""}
        confirmText={pendingRegenerate?.confirmText || confirmText}
        submittingText="提交中"
        icon={RefreshCcw}
        confirmTone="primary"
        isSubmitting={isRegenerating}
        onCancel={cancelRegenerate}
        onConfirm={confirmRegenerate}
      />
    ),
  };
}
