import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { BaseModal } from "../../components/BaseModal";
import { getLyricSubtitle } from "./musicPlayerUtils";
import "./musicRenameDialog.css";

export function MusicRenameDialog({ item, onClose, onConfirm }) {
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setName(item ? getLyricSubtitle(item) : "");
    setError("");
    setIsSubmitting(false);
  }, [item]);

  if (!item) return null;

  const trimmedName = name.trim();
  const currentName = getLyricSubtitle(item).trim();
  const canSubmit = Boolean(trimmedName)
    && trimmedName.length <= 20
    && trimmedName !== currentName
    && !isSubmitting;

  async function handleSubmit(event) {
    event.preventDefault();
    if (!canSubmit) return;

    setIsSubmitting(true);
    setError("");
    try {
      await onConfirm?.(trimmedName);
    } catch (submitError) {
      setError(submitError.message || "歌曲名称修改失败，请稍后重试。");
      setIsSubmitting(false);
    }
  }

  return (
    <BaseModal
      open
      variant="compact"
      className="music-rename-layer"
      surfaceClassName="music-rename-dialog"
      title="修改歌曲名称"
      showCloseButton
      closeLabel="关闭修改歌曲名称弹窗"
      closeOnBackdrop={!isSubmitting}
      closeOnEscape={!isSubmitting}
      onClose={isSubmitting ? undefined : onClose}
    >
      <form onSubmit={handleSubmit}>
        <div className="ui-modal__body music-rename-body">
          <label htmlFor="music-rename-input">歌曲名称</label>
          <input
            id="music-rename-input"
            className="ui-input"
            value={name}
            maxLength={20}
            placeholder="请输入歌曲名称"
            aria-describedby="music-rename-hint"
            aria-invalid={Boolean(error)}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
          />
          <div id="music-rename-hint" className="music-rename-hint">
            <span className={error ? "is-error" : ""}>
              {error || (trimmedName ? "修改后会同步更新歌曲卡片与播放器中的名称。" : "歌曲名称不能为空。")}
            </span>
            <span>{name.length}/20</span>
          </div>
        </div>
        <div className="ui-modal__actions music-rename-actions">
          <button
            className="ui-button"
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
          >
            取消
          </button>
          <button
            className="ui-button ui-button--primary"
            type="submit"
            disabled={!canSubmit}
          >
            {isSubmitting ? <Loader2 size={16} className="is-spinning" /> : null}
            {isSubmitting ? "保存中" : "保存"}
          </button>
        </div>
      </form>
    </BaseModal>
  );
}
