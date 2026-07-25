import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2, Sparkles, X } from "lucide-react";
import { authApi } from "../../api/authApi";
import { loadTencentCaptchaScript } from "./tencentCaptcha";
import "./authDrawer.css";

export function AuthDrawer({
  mode,
  onClose,
  onModeChange,
  onSuccess,
  getInviteCode = () => "",
}) {
  const [loginMethod, setLoginMethod] = useState("password");
  const [phone, setPhone] = useState("");
  const [smsCode, setSmsCode] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [smsCooldown, setSmsCooldown] = useState(0);
  const [renderMode, setRenderMode] = useState(mode);
  const [isClosing, setIsClosing] = useState(false);
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const isRegister = renderMode === "register";
  const isForgot = renderMode === "forgot";
  const isLogin = renderMode === "login";
  const isPasswordLogin = isLogin && loginMethod === "password";
  const isPhoneCodeLogin = isLogin && loginMethod === "phone-code";
  const isSubmitDisabled = isSubmitting || (isLogin && !agreementAccepted);

  useEffect(() => {
    if (!mode) return;
    setRenderMode(mode);
    setIsClosing(false);
    setLoginMethod("password");
    setPhone("");
    setSmsCode("");
    setIdentifier("");
    setPassword("");
    setConfirmPassword("");
    setResetPassword("");
    setResetConfirmPassword("");
    setVisiblePasswords({});
    setError("");
    setSuccessMessage("");
    setIsSubmitting(false);
    setIsSendingCode(false);
    setSmsCooldown(0);
    setAgreementAccepted(false);
  }, [mode]);

  useEffect(() => {
    if (mode || !renderMode) return undefined;
    setIsClosing(true);
    const timer = window.setTimeout(() => {
      setIsClosing(false);
      setRenderMode(null);
    }, 520);
    return () => window.clearTimeout(timer);
  }, [mode, renderMode]);

  useEffect(() => {
    if (smsCooldown <= 0) return undefined;
    const timer = window.setTimeout(() => {
      setSmsCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [smsCooldown]);

  if (!renderMode) return null;

  function requestClose() {
    if (isClosing) return;
    onClose();
  }

  function getSmsScene() {
    if (isRegister) return "register";
    if (isForgot) return "password_reset";
    return "login";
  }

  async function runTencentCaptcha() {
    const captchaConfig = await authApi.captchaConfig();
    if (
      captchaConfig.provider !== "tencent" ||
      !captchaConfig.enabled ||
      !captchaConfig.appId
    ) {
      throw new Error("验证码服务未配置完整");
    }
    await loadTencentCaptchaScript();
    if (!window.TencentCaptcha) {
      throw new Error("验证码组件加载失败，请稍后重试");
    }

    return new Promise((resolve, reject) => {
      try {
        const captcha = new window.TencentCaptcha(
          String(captchaConfig.appId),
          (result) => {
            if (
              Number(result?.ret) === 0 &&
              result?.ticket &&
              result?.randstr
            ) {
              resolve({
                provider: "tencent",
                ticket: result.ticket,
                randstr: result.randstr,
              });
              return;
            }
            resolve(null);
          },
          { enableDarkMode: "force" },
        );
        captcha.show();
      } catch (captchaError) {
        reject(captchaError);
      }
    });
  }

  async function requestSmsCode() {
    setError("");
    setSuccessMessage("");
    if (!phone.trim()) {
      setError("请输入手机号");
      return;
    }

    setIsSendingCode(true);
    try {
      const captcha = await runTencentCaptcha();
      if (!captcha) {
        return;
      }
      const result = await authApi.sendSmsCode({
        phone: phone.trim(),
        scene: getSmsScene(),
        captcha,
      });
      setSmsCooldown(60);
      setSuccessMessage(
        result.debugCode
          ? `短信验证码已发送，调试码：${result.debugCode}`
          : "短信验证码已发送，请在 5 分钟内完成验证",
      );
    } catch (sendError) {
      setError(sendError.message || "验证码发送失败，请稍后重试");
    } finally {
      setIsSendingCode(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (isLogin && !agreementAccepted) {
      setError("请先阅读并同意用户协议和隐私政策");
      return;
    }

    if (isForgot) {
      if (resetPassword !== resetConfirmPassword) {
        setError("两次输入的新密码不一致");
        return;
      }
      if (!phone.trim() || !smsCode.trim()) {
        setError("请输入手机号和验证码");
        return;
      }
      setIsSubmitting(true);
      try {
        await authApi.resetPassword({
          phone: phone.trim(),
          code: smsCode.trim(),
          newPassword: resetPassword,
        });
        setRenderMode("login");
        setLoginMethod("password");
        setIdentifier(phone.trim());
        setPhone("");
        setSmsCode("");
        setPassword("");
        setConfirmPassword("");
        setResetPassword("");
        setResetConfirmPassword("");
        setSuccessMessage("密码已重置，请使用新密码登录");
      } catch (submitError) {
        setError(submitError.message || "密码重置失败，请稍后重试");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (isRegister) {
      if (password !== confirmPassword) {
        setError("两次输入的密码不一致");
        return;
      }
      if (!phone.trim() || !smsCode.trim()) {
        setError("请输入手机号和验证码");
        return;
      }

      setIsSubmitting(true);
      try {
        const result = await authApi.register({
          phone: phone.trim(),
          code: smsCode.trim(),
          password,
          inviteCode: getInviteCode(),
        });
        onSuccess(result.user);
      } catch (submitError) {
        setError(submitError.message || "注册失败，请稍后重试");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const result = isPhoneCodeLogin
        ? await authApi.loginWithPhoneCode({
            phone: phone.trim(),
            code: smsCode.trim(),
            inviteCode: getInviteCode(),
          })
        : await authApi.login({
            identifier: identifier.trim(),
            password,
          });
      onSuccess(result.user);
    } catch (submitError) {
      setError(submitError.message || "登录失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  }

  function getTitle() {
    if (renderMode === "register") return "创建账号";
    if (renderMode === "forgot") return "找回密码";
    return "欢迎回来";
  }

  function getDescription() {
    if (renderMode === "register")
      return "使用手机号完成验证，注册后立即获得 200 积分。";
    if (renderMode === "forgot")
      return "通过手机号验证码验证身份，然后设置新密码。";
    if (isPasswordLogin) return "可使用手机号、邮箱或用户名登录。";
    return "使用手机号验证码快速登录，未注册手机号将自动创建账号。";
  }

  const codeButtonText = isSendingCode
    ? "校验中"
    : smsCooldown > 0
      ? `${smsCooldown}s`
      : "获取验证码";

  const renderPhoneCodeFields = (codeLabel = "验证码") => (
    <>
      <label>
        <span>手机号</span>
        <input
          autoFocus={!isPasswordLogin}
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="请输入手机号"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
        />
      </label>
      <label className="auth-code-field">
        <span>{codeLabel}</span>
        <div className="auth-code-row">
          <input
            value={smsCode}
            onChange={(event) => setSmsCode(event.target.value)}
            placeholder="6 位验证码"
            inputMode="numeric"
            maxLength={6}
            autoComplete="one-time-code"
          />
          <button
            className="auth-code-send"
            type="button"
            onClick={requestSmsCode}
            disabled={isSendingCode || smsCooldown > 0}
          >
            {codeButtonText}
          </button>
        </div>
      </label>
    </>
  );

  function renderPasswordField({
    id,
    label,
    value,
    onChange,
    placeholder,
    autoComplete,
  }) {
    const isVisible = Boolean(visiblePasswords[id]);
    const Icon = isVisible ? EyeOff : Eye;

    return (
      <label>
        <span>{label}</span>
        <div className="auth-password-control">
          <input
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            type={isVisible ? "text" : "password"}
            autoComplete={autoComplete}
          />
          <button
            className="auth-password-toggle"
            type="button"
            aria-label={isVisible ? "隐藏密码" : "显示密码"}
            aria-pressed={isVisible}
            onClick={() =>
              setVisiblePasswords((current) => ({
                ...current,
                [id]: !current[id],
              }))
            }
          >
            <Icon size={18} />
          </button>
        </div>
      </label>
    );
  }

  return (
    <div
      className={`auth-drawer-layer ${isClosing ? "is-closing" : ""}`}
      role="presentation"
    >
      <button
        className="auth-drawer-backdrop"
        type="button"
        aria-label="关闭登录面板"
        onClick={requestClose}
      />
      <aside
        className="auth-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-drawer-title"
      >
        <button
          className="auth-drawer-close"
          type="button"
          aria-label="关闭"
          onClick={requestClose}
        >
          <X size={18} />
        </button>
        <div className="auth-drawer-kicker">Facemini AI ACCOUNT</div>
        <h2 id="auth-drawer-title">{getTitle()}</h2>
        <p>{getDescription()}</p>
        <form className="auth-form" onSubmit={submit}>
          {isLogin && (
            <div
              className="auth-method-tabs"
              role="tablist"
              aria-label="登录方式"
            >
              <button
                type="button"
                className={`auth-method-tab ${loginMethod === "password" ? "is-active" : ""}`}
                onClick={() => setLoginMethod("password")}
              >
                密码登录
              </button>
              <button
                type="button"
                className={`auth-method-tab ${loginMethod === "phone-code" ? "is-active" : ""}`}
                onClick={() => setLoginMethod("phone-code")}
              >
                验证码登录
              </button>
            </div>
          )}

          {isPhoneCodeLogin && renderPhoneCodeFields("短信验证码")}

          {isPasswordLogin && (
            <>
              <label>
                <span>账号</span>
                <input
                  autoFocus
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="手机号 / 邮箱 / 用户名"
                  autoComplete="username"
                />
              </label>
              {renderPasswordField({
                id: "login",
                label: "密码",
                value: password,
                onChange: (event) => setPassword(event.target.value),
                placeholder: "请输入密码",
                autoComplete: "current-password",
              })}
            </>
          )}

          {isRegister && (
            <>
              {renderPhoneCodeFields("短信验证码")}
              {renderPasswordField({
                id: "register",
                label: "密码",
                value: password,
                onChange: (event) => setPassword(event.target.value),
                placeholder: "至少 6 个字符",
                autoComplete: "new-password",
              })}
              {renderPasswordField({
                id: "register-confirm",
                label: "确认密码",
                value: confirmPassword,
                onChange: (event) => setConfirmPassword(event.target.value),
                placeholder: "请再次输入密码",
                autoComplete: "new-password",
              })}
            </>
          )}

          {isForgot && (
            <>
              {renderPhoneCodeFields("短信验证码")}
              {renderPasswordField({
                id: "reset",
                label: "新密码",
                value: resetPassword,
                onChange: (event) => setResetPassword(event.target.value),
                placeholder: "至少 6 个字符",
                autoComplete: "new-password",
              })}
              {renderPasswordField({
                id: "reset-confirm",
                label: "确认新密码",
                value: resetConfirmPassword,
                onChange: (event) =>
                  setResetConfirmPassword(event.target.value),
                placeholder: "请再次输入新密码",
                autoComplete: "new-password",
              })}
            </>
          )}

          {successMessage && (
            <div className="auth-success">{successMessage}</div>
          )}
          {error && <div className="auth-error">{error}</div>}
          {isLogin && (
            <div className="auth-agreement">
              <label className="auth-agreement-check">
                <input
                  type="checkbox"
                  checked={agreementAccepted}
                  onChange={(event) =>
                    setAgreementAccepted(event.target.checked)
                  }
                />
                <span>
                  已阅读并同意
                  <a href="#/legal/user-agreement" onClick={requestClose}>
                    用户协议
                  </a>
                  和
                  <a href="#/legal/privacy-policy" onClick={requestClose}>
                    隐私政策
                  </a>
                </span>
              </label>
            </div>
          )}
          <button className="auth-submit" type="submit" disabled={isSubmitDisabled}>
            {isSubmitting ? <Loader2 size={17} /> : <Sparkles size={17} />}
            <span>
              {renderMode === "register"
                ? "注册并领取积分"
                : renderMode === "forgot"
                  ? "重置密码"
                  : "登录"}
            </span>
          </button>
        </form>
        {renderMode === "register" ? (
          <div className="auth-mode-switch-row">
            <span className="auth-mode-switch-label">已有账号？</span>
            <button
              className="auth-mode-switch auth-mode-switch-link auth-mode-switch-login-link"
              type="button"
              onClick={() => onModeChange("login")}
            >
              去登录
            </button>
          </div>
        ) : renderMode === "forgot" ? (
          <div className="auth-mode-switch-row">
            <span className="auth-mode-switch-label">想起密码了？</span>
            <button
              className="auth-mode-switch auth-mode-switch-link"
              type="button"
              onClick={() => onModeChange("login")}
            >
              返回登录
            </button>
          </div>
        ) : (
          <div className="auth-mode-switch-row auth-mode-switch-row--login">
            <div className="auth-mode-switch-group">
              <span className="auth-mode-switch-label">还没有账号？</span>
              <button
                className="auth-mode-switch auth-mode-switch-link"
                type="button"
                onClick={() => onModeChange("register")}
              >
                立即注册
              </button>
            </div>
            <button
              className="auth-forgot-password"
              type="button"
              onClick={() => onModeChange("forgot")}
            >
              找回密码
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}
