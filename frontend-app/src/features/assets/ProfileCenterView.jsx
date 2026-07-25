import { ChevronRight, Gift, UserRound, X } from "lucide-react";

export function ProfileCenterView({
  isGuest,
  authUser,
  defaultUserAvatarSrc,
  profileDisplayName,
  profileCredits,
  profileInviteCode,
  profileInviteLink,
  inviteLinkCopied,
  inviteRewardPoints,
  totalCreations,
  monthlyConsumedCredits,
  totalFavorites,
  showAccountSettings,
  accountSettingsTitle,
  accountSettingsContent,
  onOpenAuth,
  onOpenInvite,
  onCopyInviteLink,
  onGoToFavorites,
  onGoToBilling,
  onGoToGallery,
  onOpenAccountSettings,
  onCloseAccountSettings,
}) {
  return (
    <section className="assets-view-root fm-profile-center-view">
      {isGuest ? (
        <div className="assets-login-panel fm-profile-login-panel">
          <UserRound size={32} />
          <strong>登录后查看个人中心</strong>
          <p>登录后可管理资料、邀请好友与查看账户概览</p>
          <button type="button" onClick={() => onOpenAuth("login")}>
            登录
          </button>
        </div>
      ) : (
        <div className="fm-profile-center-inner">
          <div className="fm-profile-user-card">
            <div className="fm-profile-user-main">
              <img
                className="fm-profile-avatar"
                src={authUser?.avatarUrl || defaultUserAvatarSrc}
                alt={`${profileDisplayName}头像`}
              />
              <div className="fm-profile-user-meta">
                <strong>{profileDisplayName}</strong>
                <span>剩余 {profileCredits} 积分</span>
              </div>
            </div>
          </div>

          <div className="fm-profile-invite-card">
            <button
              className="fm-profile-invite-head"
              type="button"
              onClick={() => onOpenInvite?.()}
            >
              <span className="fm-profile-invite-icon" aria-hidden="true">
                <Gift size={18} />
              </span>
              <span className="fm-profile-invite-copy">
                <strong>邀请有礼</strong>
                <small>邀请好友注册，双方各得 {inviteRewardPoints} 积分</small>
              </span>
              <ChevronRight size={18} className="fm-profile-invite-arrow" />
            </button>
            <div className="fm-profile-invite-foot">
              <div>
                <span>我的邀请码</span>
                <strong>{profileInviteCode || "—"}</strong>
              </div>
              <button
                className="fm-profile-copy-button"
                type="button"
                onClick={onCopyInviteLink}
                disabled={!profileInviteLink}
              >
                {inviteLinkCopied ? "已复制" : "复制邀请链接"}
              </button>
            </div>
          </div>

          <div className="fm-profile-bottom-grid">
            <div className="fm-profile-panel">
              <h3>账户概览</h3>
              <dl className="fm-profile-stats">
                <div>
                  <dt>累计创作</dt>
                  <dd>{totalCreations.toLocaleString("zh-CN")}</dd>
                </div>
                <div>
                  <dt>本月消耗积分</dt>
                  <dd>{monthlyConsumedCredits.toLocaleString("zh-CN")}</dd>
                </div>
                <div>
                  <dt>我的收藏</dt>
                  <dd>
                    <button
                      className="fm-profile-stat-link"
                      type="button"
                      onClick={onGoToFavorites}
                    >
                      {totalFavorites.toLocaleString("zh-CN")}
                    </button>
                  </dd>
                </div>
              </dl>
            </div>

            <div className="fm-profile-panel">
              <h3>快捷入口</h3>
              <div className="fm-profile-quick-links">
                <button type="button" onClick={() => onOpenInvite?.()}>
                  邀请有礼
                </button>
                <button type="button" onClick={() => onGoToBilling()}>
                  充值与明细
                </button>
                <button type="button" onClick={onOpenAccountSettings}>
                  账号设置
                </button>
                <button type="button" onClick={onGoToGallery}>
                  我的资产
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showAccountSettings && (
        <div
          className="fm-account-settings-layer"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              onCloseAccountSettings();
            }
          }}
        >
          <div
            className="fm-account-settings-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="fm-account-settings-title"
          >
            <div className="fm-account-settings-head">
              <h2 id="fm-account-settings-title">{accountSettingsTitle}</h2>
              <button
                type="button"
                aria-label="关闭账号设置"
                onClick={onCloseAccountSettings}
              >
                <X size={18} />
              </button>
            </div>
            <div className="fm-account-settings-body">
              {accountSettingsContent}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
