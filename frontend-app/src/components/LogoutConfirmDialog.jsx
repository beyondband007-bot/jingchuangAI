import { LogOut } from "lucide-react";
import { BaseModal } from "./BaseModal";
import "./logoutConfirm.css";

export function LogoutConfirmDialog({ isSubmitting, onCancel, onConfirm }) {
  return (
    <BaseModal
      variant="confirm"
      className="logout-confirm-layer"
      surfaceClassName="logout-confirm-dialog"
      ariaLabel="确认退出登录"
      closeLabel="取消退出登录"
      closeOnBackdrop={!isSubmitting}
      closeOnEscape={!isSubmitting}
      onClose={onCancel}
    >
        <div className="logout-confirm-icon">
          <LogOut size={20} />
        </div>
        <div className="logout-confirm-copy">
          <h2 id="logout-confirm-title">确认退出登录？</h2>
          <p>退出后需要重新登录，账号资产和历史记录会在下次登录后恢复。</p>
        </div>
        <div className="logout-confirm-actions">
          <button type="button" onClick={onCancel} disabled={isSubmitting}>
            取消
          </button>
          <button type="button" onClick={onConfirm} disabled={isSubmitting}>
            {isSubmitting ? "退出中" : "确认退出"}
          </button>
        </div>
    </BaseModal>
  );
}
