import { Camera, ChevronRight, UploadCloud } from "lucide-react";
import { isBuiltInAvatarUrl } from "./assetMappers";

export function getAccountSettingsTitle(accountSettingsPanel) {
  return (
    {
      avatar: "修改头像",
      nickname: "修改昵称",
      phone: "修改手机号",
      password: "修改密码",
    }[accountSettingsPanel] || "账号设置"
  );
}

function AccountActionRow({
  submitting,
  primaryLabel,
  submittingLabel = "保存中...",
  onPrimary,
  primaryDisabled = false,
  onBack,
}) {
  return (
    <div className="fm-account-action-row">
      <button className="fm-account-secondary" type="button" onClick={onBack}>
        返回
      </button>
      <button
        className="fm-account-primary"
        type="button"
        disabled={submitting || primaryDisabled}
        onClick={onPrimary}
      >
        {submitting ? submittingLabel : primaryLabel}
      </button>
    </div>
  );
}

export function AccountSettingsContent({
  authUser,
  defaultUserAvatarSrc,
  accountSettingsPanel,
  accountSettingsTab,
  accountSettingsSubmitting,
  selectedAvatarUrl,
  avatarUploadSrc,
  avatarOffset,
  avatarZoom,
  avatarDragState,
  avatarImageRef,
  nicknameDraft,
  phoneDraft,
  phoneChangeStep,
  passwordMode,
  passwordDraft,
  accountSmsSending,
  accountSmsCooldowns,
  onAccountSettingsTabChange,
  onSelectedAvatarUrlChange,
  onAvatarUploadChange,
  onAvatarDragStateChange,
  onAvatarOffsetChange,
  onAvatarZoomChange,
  onNicknameDraftChange,
  onPhoneDraftChange,
  onPasswordModeChange,
  onPasswordDraftChange,
  onOpenAccountSettingsPanel,
  onSendAccountSmsCode,
  onSaveBuiltInAvatar,
  onSaveUploadedAvatar,
  onSaveNickname,
  onSavePhone,
  onVerifyOldPhone,
  onSavePassword,
}) {
  const builtInAvatars = Array.from(
    { length: 25 },
    (_, index) => `/assets/avatars/${index + 1}.jpg`,
  );
  const currentPhone = authUser?.phone || "";
  const oldPhoneCooldown = Number(accountSmsCooldowns.oldPhone || 0);
  const newPhoneCooldown = Number(accountSmsCooldowns.newPhone || 0);
  const passwordCooldown = Number(accountSmsCooldowns.password || 0);

  const actionRow = (props) => (
    <AccountActionRow
      {...props}
      submitting={accountSettingsSubmitting}
      onBack={() => onOpenAccountSettingsPanel("list")}
    />
  );

  if (accountSettingsPanel === "avatar") {
    return (
      <>
        <div className="fm-account-settings-tabs" role="tablist">
          <button
            type="button"
            className={accountSettingsTab === "built-in" ? "is-active" : ""}
            onClick={() => {
              onAccountSettingsTabChange("built-in");
              onSelectedAvatarUrlChange((current) =>
                isBuiltInAvatarUrl(current) ? current : defaultUserAvatarSrc,
              );
            }}
          >
            内置头像
          </button>
          <button
            type="button"
            className={accountSettingsTab === "upload" ? "is-active" : ""}
            onClick={() => onAccountSettingsTabChange("upload")}
          >
            上传头像
          </button>
        </div>
        {accountSettingsTab === "built-in" ? (
          <>
            <div className="fm-avatar-choice-grid">
              {builtInAvatars.map((avatarUrl) => (
                <button
                  type="button"
                  key={avatarUrl}
                  className={selectedAvatarUrl === avatarUrl ? "is-selected" : ""}
                  onClick={() => onSelectedAvatarUrlChange(avatarUrl)}
                >
                  <img src={avatarUrl} alt="" />
                </button>
              ))}
            </div>
            {actionRow({
              primaryLabel: "保存头像",
              onPrimary: onSaveBuiltInAvatar,
            })}
          </>
        ) : (
          <>
            <label className="fm-avatar-upload-picker">
              <UploadCloud size={20} />
              <span>{avatarUploadSrc ? "重新选择图片" : "选择头像图片"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) =>
                  onAvatarUploadChange(event.target.files?.[0])
                }
              />
            </label>
            <div className="fm-avatar-crop-wrap">
              {avatarUploadSrc ? (
                <div
                  className="fm-avatar-crop-box"
                  onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    onAvatarDragStateChange({
                      x: event.clientX,
                      y: event.clientY,
                      offset: avatarOffset,
                    });
                  }}
                  onPointerMove={(event) => {
                    if (!avatarDragState) return;
                    onAvatarOffsetChange({
                      x:
                        avatarDragState.offset.x +
                        event.clientX -
                        avatarDragState.x,
                      y:
                        avatarDragState.offset.y +
                        event.clientY -
                        avatarDragState.y,
                    });
                  }}
                  onPointerUp={() => onAvatarDragStateChange(null)}
                  onPointerCancel={() => onAvatarDragStateChange(null)}
                >
                  <img
                    ref={avatarImageRef}
                    src={avatarUploadSrc}
                    alt="头像裁剪预览"
                    style={{
                      transform: `translate(${avatarOffset.x}px, ${avatarOffset.y}px) scale(${avatarZoom})`,
                    }}
                    draggable="false"
                  />
                </div>
              ) : (
                <div className="fm-avatar-crop-empty">
                  <Camera size={30} />
                  <span>选择图片后在这里拖拽裁剪</span>
                </div>
              )}
            </div>
            <label className="fm-avatar-zoom-control">
              <span>缩放</span>
              <input
                type="range"
                min="1"
                max="2.5"
                step="0.05"
                value={avatarZoom}
                onChange={(event) => onAvatarZoomChange(Number(event.target.value))}
                disabled={!avatarUploadSrc}
              />
            </label>
            {actionRow({
              primaryLabel: "保存裁剪头像",
              onPrimary: onSaveUploadedAvatar,
              primaryDisabled: !avatarUploadSrc,
            })}
          </>
        )}
      </>
    );
  }

  if (accountSettingsPanel === "nickname") {
    return (
      <>
        <label className="fm-account-field">
          <span>昵称</span>
          <input
            value={nicknameDraft}
            maxLength={20}
            onChange={(event) => onNicknameDraftChange(event.target.value)}
            placeholder="请输入昵称"
          />
        </label>
        {actionRow({
          primaryLabel: "保存昵称",
          onPrimary: onSaveNickname,
        })}
      </>
    );
  }

  if (accountSettingsPanel === "phone") {
    return (
      <>
        <div className="fm-account-step-indicator" aria-label="修改手机号步骤">
          <span className={phoneChangeStep === "old" ? "is-active" : ""}>
            1 验证当前手机号
          </span>
          <span className={phoneChangeStep === "new" ? "is-active" : ""}>
            2 绑定新手机号
          </span>
        </div>
        <label className="fm-account-field">
          <span>当前手机号</span>
          <input value={currentPhone || "未绑定手机号"} disabled />
        </label>
        {phoneChangeStep === "old" ? (
          <>
            <label className="fm-account-field">
              <span>当前手机号验证码</span>
              <div className="fm-account-code-row">
                <input
                  value={phoneDraft.oldPhoneCode}
                  name="fm-old-phone-code"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  onChange={(event) =>
                    onPhoneDraftChange((current) => ({
                      ...current,
                      oldPhoneCode: event.target.value,
                    }))
                  }
                  placeholder="请输入验证码"
                />
                <button
                  type="button"
                  disabled={
                    !currentPhone ||
                    accountSmsSending === "oldPhone" ||
                    oldPhoneCooldown > 0
                  }
                  onClick={() =>
                    onSendAccountSmsCode({
                      key: "oldPhone",
                      scene: "change_phone_old",
                      phone: currentPhone,
                    })
                  }
                >
                  {oldPhoneCooldown > 0 ? `${oldPhoneCooldown}s` : "获取验证码"}
                </button>
              </div>
            </label>
            {actionRow({
              primaryLabel: "下一步",
              submittingLabel: "验证中...",
              onPrimary: onVerifyOldPhone,
            })}
          </>
        ) : (
          <>
            <label className="fm-account-field">
              <span>新手机号</span>
              <input
                value={phoneDraft.newPhone}
                name="fm-new-phone"
                autoComplete="off"
                onChange={(event) =>
                  onPhoneDraftChange((current) => ({
                    ...current,
                    newPhone: event.target.value,
                  }))
                }
                placeholder="请输入新手机号"
              />
            </label>
            <label className="fm-account-field">
              <span>新手机号验证码</span>
              <div className="fm-account-code-row">
                <input
                  value={phoneDraft.newPhoneCode}
                  name="fm-new-phone-code"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  onChange={(event) =>
                    onPhoneDraftChange((current) => ({
                      ...current,
                      newPhoneCode: event.target.value,
                    }))
                  }
                  placeholder="请输入验证码"
                />
                <button
                  type="button"
                  disabled={
                    accountSmsSending === "newPhone" || newPhoneCooldown > 0
                  }
                  onClick={() =>
                    onSendAccountSmsCode({
                      key: "newPhone",
                      scene: "change_phone_new",
                      phone: phoneDraft.newPhone,
                    })
                  }
                >
                  {newPhoneCooldown > 0 ? `${newPhoneCooldown}s` : "获取验证码"}
                </button>
              </div>
            </label>
            {actionRow({
              primaryLabel: "保存手机号",
              onPrimary: onSavePhone,
            })}
          </>
        )}
      </>
    );
  }

  if (accountSettingsPanel === "password") {
    return (
      <>
        <div className="fm-account-settings-tabs" role="tablist">
          <button
            type="button"
            className={passwordMode === "password" ? "is-active" : ""}
            onClick={() => onPasswordModeChange("password")}
          >
            原密码
          </button>
          <button
            type="button"
            className={passwordMode === "sms" ? "is-active" : ""}
            onClick={() => onPasswordModeChange("sms")}
          >
            短信验证码
          </button>
        </div>
        {passwordMode === "password" ? (
          <label className="fm-account-field">
            <span>原密码</span>
            <input
              key="account-old-password"
              type="password"
              name="fm-no-autofill-current-password"
              autoComplete="off"
              value={passwordDraft.oldPassword}
              onChange={(event) =>
                onPasswordDraftChange((current) => ({
                  ...current,
                  oldPassword: event.target.value,
                }))
              }
              placeholder="请输入原密码"
            />
          </label>
        ) : (
          <label className="fm-account-field">
            <span>当前手机号验证码</span>
            <div className="fm-account-code-row">
              <input
                key="account-password-sms-code"
                name="fm-password-sms-code"
                autoComplete="one-time-code"
                inputMode="numeric"
                value={passwordDraft.smsCode}
                onChange={(event) =>
                  onPasswordDraftChange((current) => ({
                    ...current,
                    smsCode: event.target.value,
                  }))
                }
                placeholder="请输入验证码"
              />
              <button
                type="button"
                disabled={
                  !currentPhone ||
                  accountSmsSending === "password" ||
                  passwordCooldown > 0
                }
                onClick={() =>
                  onSendAccountSmsCode({
                    key: "password",
                    scene: "change_password",
                    phone: currentPhone,
                  })
                }
              >
                {passwordCooldown > 0 ? `${passwordCooldown}s` : "获取验证码"}
              </button>
            </div>
          </label>
        )}
        <label className="fm-account-field">
          <span>新密码</span>
          <input
            key={`account-new-password-${passwordMode}`}
            type="password"
            name="fm-no-autofill-new-password"
            autoComplete="off"
            value={passwordDraft.newPassword}
            onChange={(event) =>
              onPasswordDraftChange((current) => ({
                ...current,
                newPassword: event.target.value,
              }))
            }
            placeholder="6-128 个字符"
          />
        </label>
        <label className="fm-account-field">
          <span>确认新密码</span>
          <input
            key={`account-confirm-password-${passwordMode}`}
            type="password"
            name="fm-no-autofill-confirm-password"
            autoComplete="off"
            value={passwordDraft.confirmPassword}
            onChange={(event) =>
              onPasswordDraftChange((current) => ({
                ...current,
                confirmPassword: event.target.value,
              }))
            }
            placeholder="请再次输入新密码"
          />
        </label>
        {actionRow({
          primaryLabel: "保存密码",
          onPrimary: onSavePassword,
        })}
      </>
    );
  }

  return (
    <div className="fm-account-settings-list">
      {[
        ["avatar", "修改头像"],
        ["nickname", "修改昵称"],
        ["phone", "修改手机号"],
        ["password", "修改密码"],
      ].map(([panel, label]) => (
        <button
          type="button"
          key={panel}
          onClick={() => onOpenAccountSettingsPanel(panel)}
        >
          <span>{label}</span>
          <ChevronRight size={20} />
        </button>
      ))}
    </div>
  );
}
