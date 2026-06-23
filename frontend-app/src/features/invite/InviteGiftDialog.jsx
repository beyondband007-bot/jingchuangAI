import React, { useEffect, useState } from "react";
import { invitationApi } from "../../api/invitationApi";

const INVITE_HERO_BG = "/assets/facemini/prototypes/invite-hero-banner.png";
const INVITE_REWARD_POINTS = 200;
const pendingInviteCodeStorageKey = "facemini:pending-invite-code";

const fontBold =
  '"HarmonyOS_Sans_SC_Bold", "HarmonyOS Sans SC", system-ui, sans-serif';
const fontRegular = '"HarmonyOS_Sans_SC", "HarmonyOS Sans SC", system-ui, sans-serif';
const fontMedium =
  '"HarmonyOS_Sans_SC_Medium", "HarmonyOS Sans SC", system-ui, sans-serif';
const fontBlack =
  '"HarmonyOS_Sans_SC_Black", "HarmonyOS Sans SC", system-ui, sans-serif';

function normalizeInviteCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 32);
}

function getPendingInviteCode() {
  try {
    return normalizeInviteCode(
      window.localStorage.getItem(pendingInviteCodeStorageKey),
    );
  } catch {
    return "";
  }
}

function buildClientInviteLink(inviteCode) {
  const code = String(inviteCode || "").trim();
  if (!code) return "";
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "http://127.0.0.1:8088";
  return `${origin}/#/home?invite=${encodeURIComponent(code)}`;
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

function InviteZapIcon({ size = 16, height }) {
  const h = height ?? size;
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="-2.562 -3.5 16.104 22"
      width={size}
      height={h}
      aria-hidden="true"
      style={{ overflow: "visible", flexShrink: 0 }}
    >
      <path
        d="M2.573 9.377H-1.715c-0.554 0-0.948-0.557-0.744-1.085L1.8-2.987C1.932-3.324 2.179-3.5 2.559-3.5h7.206c0.569 0 0.948 0.572 0.744 1.115l-2.48 6.13h4.682c0.686 0 1.05 0.821 0.598 1.335L1.815 18.221c-0.554 0.645-1.59 0.088-1.371-0.733l2.129-8.111Z"
        fill="#6129FF"
      />
    </svg>
  );
}

function SparkleIcon({ width = 26, height = 25, style }) {
  return (
    <svg
      viewBox="-3.117 -2.927 25.974 24.395"
      preserveAspectRatio="none"
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      style={{ overflowX: "visible", overflowY: "visible", ...style }}
      aria-hidden="true"
    >
      <path
        fillRule="nonzero"
        d="M 19.869 10.12 C 19.869 10.12 19.739 10.16 19.739 10.16 C 18.998 10.357 18.283 10.581 17.568 10.844 C 16.229 11.344 14.812 12.041 14.006 12.857 C 13.2 13.673 12.511 15.107 12.017 16.463 C 11.757 17.186 11.523 17.923 11.341 18.66 C 11.341 18.66 11.302 18.791 11.302 18.791 C 11.302 18.791 11.302 18.818 11.302 18.818 C 11.172 19.384 10.613 19.739 10.054 19.607 C 9.664 19.515 9.365 19.213 9.274 18.831 C 9.274 18.831 9.274 18.791 9.274 18.791 C 9.274 18.791 9.235 18.66 9.235 18.66 C 9.04 17.91 8.819 17.186 8.559 16.463 C 8.065 15.107 7.376 13.673 6.57 12.857 C 5.764 12.041 4.347 11.344 3.008 10.844 C 2.293 10.581 1.565 10.344 0.837 10.16 C 0.837 10.16 0.707 10.12 0.707 10.12 C 0.707 10.12 0.668 10.12 0.668 10.12 C 0.109 9.989 -0.242 9.423 -0.112 8.857 C -0.021 8.463 0.278 8.16 0.668 8.068 C 0.668 8.068 0.707 8.068 0.707 8.068 C 0.707 8.068 0.837 8.028 0.837 8.028 C 1.578 7.831 2.293 7.607 3.008 7.331 C 4.347 6.831 5.764 6.134 6.57 5.318 C 7.376 4.502 8.065 3.068 8.559 1.713 C 8.819 0.989 9.053 0.252 9.248 -0.485 C 9.248 -0.485 9.287 -0.616 9.287 -0.616 C 9.287 -0.616 9.287 -0.643 9.287 -0.643 C 9.391 -1.13 9.82 -1.459 10.301 -1.459 C 10.301 -1.459 10.288 -1.445 10.288 -1.445 C 10.769 -1.445 11.185 -1.116 11.302 -0.643 C 11.302 -0.643 11.302 -0.603 11.302 -0.603 C 11.302 -0.603 11.341 -0.472 11.341 -0.472 C 11.536 0.278 11.757 1.002 12.017 1.726 C 12.511 3.081 13.2 4.515 14.006 5.331 C 14.812 6.147 16.229 6.844 17.568 7.344 C 18.283 7.607 19.011 7.844 19.739 8.041 C 19.739 8.041 19.869 8.081 19.869 8.081 C 19.869 8.081 19.908 8.081 19.908 8.081 C 20.467 8.226 20.805 8.791 20.675 9.344 C 20.584 9.726 20.285 10.028 19.908 10.12 C 19.908 10.12 19.869 10.12 19.869 10.12 Z"
        fill="#5A2CFC80"
      />
    </svg>
  );
}

const RULE_ITEMS = [
  "仅限已注册 Facemini 老用户参与活动，每位新注册用户仅能绑定一位邀请人。",
  "好友通过你的专属链接访问并完成完整注册登录后，积分自动发放到双方账户。",
  "积分无使用有效期，可自由抵扣平台内容页创作功能消耗额度。",
  "严禁批量注册、刷量、作弊套取积分，平台有权回收违规积分。",
];

const FAQ_ITEMS = [
  {
    q: "Q：积分多久到账？",
    a: "A：好友完成注册并登录账号后，积分实时自动发放。",
  },
  {
    q: "Q：积分能用来做什么？",
    a: "A：可抵扣图片生成、视频生成、数字人制作、爆款图文创作等功能额度。",
  },
  {
    q: "Q：同一个好友可以多次领取奖励吗？",
    a: "A：新用户仅首次注册可触发一次双向奖励。",
  },
];

export function InviteGiftDialog({ authUser, onClose, onOpenAuth }) {
  const [copied, setCopied] = useState(false);
  const [inviteProfile, setInviteProfile] = useState(null);
  const [inviteError, setInviteError] = useState("");
  const isGuest = !authUser || authUser.isGuest;

  useEffect(() => {
    invitationApi.track(
      "invite.popup_exposure",
      authUser?.inviteCode || getPendingInviteCode(),
      { loggedIn: !isGuest },
    );
  }, [authUser?.inviteCode, isGuest]);

  useEffect(() => {
    if (isGuest) return undefined;
    let mounted = true;
    invitationApi
      .me()
      .then((profile) => {
        if (mounted) {
          setInviteProfile(profile);
          setInviteError("");
        }
      })
      .catch((error) => {
        if (mounted) setInviteError(error.message || "专属邀请链接加载失败");
      });
    return () => {
      mounted = false;
    };
  }, [isGuest]);

  useEffect(() => {
    setCopied(false);
  }, [authUser?.id, authUser?.inviteCode, inviteProfile?.inviteLink]);

  useEffect(() => {
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, []);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const inviteLink =
    inviteProfile?.inviteLink ||
    buildClientInviteLink(inviteProfile?.inviteCode || authUser?.inviteCode);
  const canCopyInviteLink = !isGuest && Boolean(inviteLink);
  const copyButtonLabel = isGuest
    ? "登录后生成专属邀请链接"
    : copied
      ? "邀请链接已复制"
      : "点击复制专属邀请链接";
  const statusMessage =
    inviteError ||
    (copied
      ? "邀请链接已复制，快去分享好友吧！"
      : "复制后分享给好友，完成注册即可到账");

  async function copyInviteLink() {
    if (isGuest) {
      onOpenAuth?.("register");
      return;
    }
    if (!inviteLink) {
      setInviteError("专属邀请链接加载中，请稍后再试");
      return;
    }
    setInviteError("");
    const ok = await writeClipboardText(inviteLink);
    setCopied(ok);
    if (!ok) {
      setInviteError("复制失败，请重试");
      return;
    }
    invitationApi.track(
      "invite.copy_success",
      inviteProfile?.inviteCode || authUser?.inviteCode,
      { source: "topbar_dialog" },
    );
  }

  return (
    <div
      className="fm-invite-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        className="invite-gift-panel"
        style={{
          alignItems: "center",
          backgroundColor: "#FFFFFF",
          borderRadius: "16px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          fontSize: "12px",
          fontSynthesis: "none",
          gap: "10px",
          height: "835px",
          lineHeight: "16px",
          maxHeight: "calc(100vh - 48px)",
          MozOsxFontSmoothing: "grayscale",
          overflow: "clip",
          WebkitFontSmoothing: "antialiased",
          width: "min(730px, 94vw)",
        }}
      >
        <div
          style={{
            boxSizing: "border-box",
            flexShrink: 0,
            height: "220px",
            position: "relative",
            width: "100%",
          }}
        >
          <div
            style={{
              backgroundImage: `url(${INVITE_HERO_BG})`,
              backgroundPosition: "50%",
              backgroundSize: "cover",
              boxSizing: "border-box",
              height: "220px",
              left: 0,
              position: "absolute",
              top: 0,
              width: "100%",
            }}
          />
          <button
            type="button"
            onClick={onClose}
            aria-label="关闭邀请有礼"
            style={{
              alignItems: "center",
              backgroundColor: "#FFFFFFB8",
              border: 0,
              borderRadius: "50%",
              boxSizing: "border-box",
              cursor: "pointer",
              display: "grid",
              height: "40px",
              justifyItems: "center",
              paddingBlock: "1px",
              paddingInline: "6px",
              position: "absolute",
              right: 16,
              top: 16,
              width: "40px",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="28"
              height="28"
              viewBox="0 0 24 24"
              aria-hidden="true"
              style={{ height: "28px", width: "28px", overflow: "clip" }}
            >
              <path
                d="M18 6 6 18"
                fill="none"
                stroke="#4F4D5A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="m6 6 12 12"
                fill="none"
                stroke="#4F4D5A"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>

        <div
          style={{
            alignItems: "start",
            alignSelf: "stretch",
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            gap: 25,
            paddingInline: "20px",
          }}
        >
          <div
            style={{
              alignSelf: "stretch",
              backgroundColor: "#FFFFFF",
              borderRadius: "14px",
              boxShadow: "#241E4A33 4px 4px 8px",
              boxSizing: "border-box",
              paddingBlock: "18px",
              paddingInline: "28px",
            }}
          >
            <div
              style={{
                alignItems: "center",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                width: "100%",
              }}
            >
              <div
                style={{
                  boxSizing: "border-box",
                  color: "#1F1D2A",
                  display: "flex",
                  flexWrap: "wrap",
                  fontFamily: fontBold,
                  fontSize: "18px",
                  fontWeight: 700,
                  justifyContent: "center",
                  lineHeight: "22px",
                  textAlign: "center",
                }}
              >
                邀请好友完成新用户注册
              </div>
              <div
                style={{
                  alignItems: "center",
                  boxSizing: "border-box",
                  display: "inline-flex",
                  gap: "3px",
                  justifyContent: "center",
                  marginTop: "3px",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    boxSizing: "border-box",
                    color: "#1F1D2A",
                    display: "inline-block",
                    fontFamily: fontBold,
                    fontSize: "18px",
                    fontWeight: 700,
                    lineHeight: "22px",
                    textAlign: "center",
                  }}
                >
                  邀请人&被邀请人双方各自动到账
                </div>
                <InviteZapIcon size={16.0875} height={22} />
                <div
                  style={{
                    boxSizing: "border-box",
                    color: "#1F1D2A",
                    display: "inline-block",
                    fontFamily: fontBold,
                    fontSize: "18px",
                    fontWeight: 700,
                    lineHeight: "22px",
                    textAlign: "center",
                  }}
                >
                  {INVITE_REWARD_POINTS} 积分
                </div>
              </div>
            </div>

            <div
              style={{
                alignItems: "center",
                boxSizing: "border-box",
                display: "grid",
                gap: "22px",
                gridTemplateColumns: "1fr auto 1fr",
                marginBottom: "8px",
                marginTop: "16px",
              }}
            >
              <div
                style={{
                  alignItems: "center",
                  borderColor: "#D7D2E5",
                  borderRadius: "10px",
                  borderStyle: "solid",
                  borderWidth: "1px",
                  boxSizing: "border-box",
                  display: "flex",
                  gap: "10px",
                  justifyContent: "center",
                  minHeight: "50px",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="34"
                  height="34"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  style={{ height: "34px", width: "34px", overflow: "clip", flexShrink: 0 }}
                >
                  <circle cx="12" cy="8" r="5" fill="none" stroke="#312D45" strokeWidth="2" />
                  <path d="M20 21a8 8 0 0 0-16 0" fill="none" stroke="#312D45" strokeWidth="2" />
                </svg>
                <div
                  style={{
                    boxSizing: "border-box",
                    color: "#312D45",
                    fontFamily: fontBold,
                    fontSize: "16px",
                    fontWeight: 700,
                    lineHeight: "20px",
                    textAlign: "center",
                  }}
                >
                  你获得
                </div>
                <div style={{ alignItems: "center", boxSizing: "border-box", display: "flex", gap: "4px" }}>
                  <InviteZapIcon size={14} height={19.156} />
                  <div
                    style={{
                      boxSizing: "border-box",
                      color: "#5F35FF",
                      fontFamily: fontBlack,
                      fontSize: "20px",
                      fontWeight: 900,
                      lineHeight: "24px",
                      textAlign: "center",
                    }}
                  >
                    {INVITE_REWARD_POINTS}
                  </div>
                </div>
              </div>

              <div
                style={{
                  boxSizing: "border-box",
                  height: "89px",
                  position: "relative",
                  width: "161px",
                }}
              >
                <SparkleIcon style={{ left: -0.5, top: 40, position: "absolute" }} />
                <SparkleIcon style={{ left: 139.5, top: 15, position: "absolute", width: 22, height: 21 }} />
                <SparkleIcon style={{ left: 23.5, top: 7, position: "absolute", width: 16, height: 15 }} />
                <SparkleIcon style={{ left: 141.5, top: 58, position: "absolute", width: 12, height: 11 }} />
                <div
                  style={{
                    backgroundClip: "text",
                    backgroundImage:
                      "linear-gradient(180deg, #8B6FFF 10.97%, #4A35C8 83.23%)",
                    boxSizing: "border-box",
                    color: "transparent",
                    display: "flex",
                    flexWrap: "wrap",
                    fontFamily: '"ZonaPro-Bold", "Zona Pro", system-ui, sans-serif',
                    fontSize: "60px",
                    fontWeight: 700,
                    height: "50px",
                    justifyContent: "center",
                    left: 23.5,
                    letterSpacing: "-0.05em",
                    lineHeight: "100%",
                    position: "absolute",
                    textAlign: "center",
                    top: 19,
                    width: "124px",
                  }}
                >
                  {INVITE_REWARD_POINTS}
                </div>
              </div>

              <div
                style={{
                  alignItems: "center",
                  borderColor: "#D7D2E5",
                  borderRadius: "10px",
                  borderStyle: "solid",
                  borderWidth: "1px",
                  boxSizing: "border-box",
                  display: "flex",
                  gap: "10px",
                  justifyContent: "center",
                  minHeight: "50px",
                }}
              >
                <div
                  style={{
                    boxSizing: "border-box",
                    color: "#312D45",
                    fontFamily: fontBold,
                    fontSize: "16px",
                    fontWeight: 700,
                    lineHeight: "20px",
                    textAlign: "center",
                  }}
                >
                  好友获得
                </div>
                <div style={{ alignItems: "center", boxSizing: "border-box", display: "flex", gap: "4px" }}>
                  <InviteZapIcon size={14} height={19.156} />
                  <div
                    style={{
                      boxSizing: "border-box",
                      color: "#5F35FF",
                      fontFamily: fontBlack,
                      fontSize: "20px",
                      fontWeight: 900,
                      lineHeight: "24px",
                      textAlign: "center",
                    }}
                  >
                    {INVITE_REWARD_POINTS}
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="34"
                  height="34"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  style={{ height: "34px", width: "34px", overflow: "clip", flexShrink: 0 }}
                >
                  <circle cx="12" cy="8" r="5" fill="none" stroke="#312D45" strokeWidth="2" />
                  <path d="M20 21a8 8 0 0 0-16 0" fill="none" stroke="#312D45" strokeWidth="2" />
                </svg>
              </div>
            </div>

            <div style={{ alignItems: "center", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
              <div
                style={{
                  boxSizing: "border-box",
                  color: "#6B35FF",
                  fontFamily: fontBold,
                  fontSize: "14px",
                  fontWeight: 700,
                  letterSpacing: "-0.05em",
                  lineHeight: "18px",
                  textAlign: "center",
                }}
              >
                积分可抵扣 AI 生图、视频生成、数字人、爆款图文 等全部创作额度
              </div>
            </div>

            <button
              type="button"
              onClick={copyInviteLink}
              aria-label={isGuest ? "登录后生成专属邀请链接" : "点击复制专属邀请链接"}
              title={
                isGuest
                  ? "登录后生成专属邀请链接"
                  : canCopyInviteLink
                    ? inviteLink
                    : "专属邀请链接加载中"
              }
              style={{
                alignItems: "center",
                backgroundColor: "#FFFFFF",
                borderColor: "#8C6CFF",
                borderRadius: "999px",
                borderStyle: "solid",
                borderWidth: "1px",
                boxSizing: "border-box",
                cursor: "pointer",
                display: "inline-flex",
                gap: "10px",
                height: "42px",
                justifyContent: "center",
                marginLeft: "auto",
                marginRight: "auto",
                marginTop: "10px",
                paddingBlock: "1px",
                paddingInline: "6px",
                width: "100%",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                aria-hidden="true"
                style={{ height: "20px", width: "20px", overflow: "clip", flexShrink: 0 }}
              >
                <rect width="14" height="14" x="8" y="8" rx="2" ry="2" fill="none" stroke="#6B35FF" strokeWidth="2" />
                <path
                  d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"
                  fill="none"
                  stroke="#6B35FF"
                  strokeWidth="2"
                />
              </svg>
              <span
                style={{
                  boxSizing: "border-box",
                  color: "#6B35FF",
                  fontFamily: fontRegular,
                  fontSize: "15px",
                  lineHeight: "18px",
                  textAlign: "center",
                }}
              >
                {copyButtonLabel}
              </span>
            </button>

            <div
              style={{
                alignItems: "center",
                boxSizing: "border-box",
                display: "inline-flex",
                gap: "5px",
                justifyContent: "center",
                marginTop: "10px",
                width: "100%",
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                aria-hidden="true"
                style={{ height: "16px", width: "16px", overflow: "clip", flexShrink: 0 }}
              >
                <circle cx="12" cy="12" r="10" fill="none" stroke="#20C35A" strokeWidth="2" />
                <path d="m9 12 2 2 4-4" fill="none" stroke="#20C35A" strokeWidth="2" />
              </svg>
              <div
                style={{
                  boxSizing: "border-box",
                  color: inviteError ? "#E5484D" : "#20C35A",
                  fontFamily: fontMedium,
                  fontSize: "14px",
                  fontWeight: 500,
                  lineHeight: "18px",
                  textAlign: "center",
                }}
              >
                {statusMessage}
              </div>
            </div>
          </div>

          <div style={{ alignItems: "start", boxSizing: "border-box", display: "flex", gap: 14 }}>
            <div
              style={{
                alignItems: "end",
                backgroundColor: "#FFFFFF",
                borderRadius: "14px",
                boxShadow: "#241E4A33 4px 4px 8px",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
                paddingBlock: "16px",
                paddingInline: "18px",
                width: "338px",
              }}
            >
              <div
                style={{
                  alignItems: "center",
                  alignSelf: "stretch",
                  boxSizing: "border-box",
                  display: "flex",
                  gap: "8px",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ alignItems: "center", boxSizing: "border-box", display: "flex", gap: "8px" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="#23212D" strokeWidth="2" />
                    <line x1="12" x2="12" y1="8" y2="12" stroke="#23212D" strokeWidth="2" />
                    <line x1="12" x2="12.01" y1="16" y2="16" stroke="#23212D" strokeWidth="2" />
                  </svg>
                  <div
                    style={{
                      boxSizing: "border-box",
                      color: "#23212D",
                      fontFamily: fontBold,
                      fontSize: "16px",
                      fontWeight: 700,
                      lineHeight: "20px",
                    }}
                  >
                    活动规则
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  style={{ flexShrink: 0, rotate: "180deg" }}
                >
                  <path d="m6 9 6 6 6-6" fill="none" stroke="#23212D" strokeWidth="2" />
                </svg>
              </div>
              <div
                style={{
                  alignItems: "end",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  marginTop: "12px",
                  width: "fit-content",
                }}
              >
                <div style={{ alignItems: "start", alignSelf: "stretch", boxSizing: "border-box", display: "flex", gap: "10px" }}>
                  <div
                    style={{
                      alignItems: "start",
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "column",
                      flexShrink: 0,
                      gap: "25px",
                      width: "11px",
                    }}
                  >
                    {RULE_ITEMS.map((_, index) => (
                      <div
                        key={index}
                        style={{
                          alignSelf: "stretch",
                          boxSizing: "border-box",
                          color: "#555365",
                          fontFamily: fontRegular,
                          fontSize: "14px",
                          letterSpacing: "-0.05em",
                          lineHeight: "175%",
                        }}
                      >
                        {index + 1}.
                      </div>
                    ))}
                  </div>
                  <div style={{ alignItems: "start", boxSizing: "border-box", display: "flex", flex: 1, flexDirection: "column" }}>
                    {RULE_ITEMS.map((text) => (
                      <div
                        key={text}
                        style={{
                          alignSelf: "stretch",
                          boxSizing: "border-box",
                          color: "#555365",
                          fontFamily: fontRegular,
                          fontSize: "14px",
                          letterSpacing: "-0.05em",
                          lineHeight: "175%",
                        }}
                      >
                        {text}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                alignItems: "start",
                backgroundColor: "#FFFFFF",
                borderRadius: "14px",
                boxShadow: "#241E4A33 4px 4px 8px",
                boxSizing: "border-box",
                display: "flex",
                flexDirection: "column",
                flexShrink: 0,
                gap: 12,
                paddingBlock: "16px",
                paddingInline: "18px",
                width: "338px",
              }}
            >
              <div
                style={{
                  alignItems: "center",
                  alignSelf: "stretch",
                  boxSizing: "border-box",
                  display: "flex",
                  gap: "8px",
                  justifyContent: "space-between",
                }}
              >
                <div style={{ alignItems: "center", boxSizing: "border-box", display: "flex", gap: "8px" }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="#23212D" strokeWidth="2" />
                    <line x1="12" x2="12" y1="8" y2="12" stroke="#23212D" strokeWidth="2" />
                    <line x1="12" x2="12.01" y1="16" y2="16" stroke="#23212D" strokeWidth="2" />
                  </svg>
                  <div
                    style={{
                      boxSizing: "border-box",
                      color: "#23212D",
                      fontFamily: fontBold,
                      fontSize: "16px",
                      fontWeight: 700,
                      lineHeight: "20px",
                    }}
                  >
                    FAQ 常见问题
                  </div>
                </div>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  style={{ flexShrink: 0, rotate: "180deg" }}
                >
                  <path d="m6 9 6 6 6-6" fill="none" stroke="#23212D" strokeWidth="2" />
                </svg>
              </div>
              <div
                style={{
                  alignItems: "start",
                  alignSelf: "stretch",
                  boxSizing: "border-box",
                  display: "flex",
                  flexDirection: "column",
                  gap: "14px",
                  overflow: "clip",
                }}
              >
                {FAQ_ITEMS.map((item) => (
                  <div
                    key={item.q}
                    style={{
                      alignItems: "start",
                      alignSelf: "stretch",
                      boxSizing: "border-box",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                    }}
                  >
                    <div
                      style={{
                        boxSizing: "border-box",
                        color: "#555365",
                        fontFamily: fontBold,
                        fontSize: "14px",
                        fontWeight: 700,
                        letterSpacing: "-0.05em",
                        lineHeight: "175%",
                      }}
                    >
                      {item.q}
                    </div>
                    <div
                      style={{
                        alignSelf: "stretch",
                        boxSizing: "border-box",
                        color: "#555365",
                        fontFamily: fontRegular,
                        fontSize: "14px",
                        letterSpacing: "-0.05em",
                        lineHeight: "120%",
                      }}
                    >
                      {item.a}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
