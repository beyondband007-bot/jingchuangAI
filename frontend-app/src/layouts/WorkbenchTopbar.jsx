import { useEffect, useRef, useState } from "react";
import {
  Bell,
  ChevronDown,
  Gift,
  LogIn,
  LogOut,
  ReceiptText,
  Sparkles,
  UserPlus,
  UserRound,
  WalletCards,
  Zap,
} from "lucide-react";
import {
  assetGalleryTabStorageKey,
  assetsViewModeStorageKey,
} from "../features/assets/assetStorage";
import {
  isLoggedInUser,
  pendingInviteBonusStorageKey,
} from "../features/invite/inviteUtils";
import { navItems } from "./navigation";

export function WorkbenchTopbar({
  activeNav,
  authUser,
  defaultUserAvatarSrc,
  onNavChange,
  onLogout,
  onOpenAuth,
  onOpenInvite,
  onOpenLibrary,
  articleMode = "home",
  onArticleModeChange,
  digitalHumanMode = "avatar",
  onDigitalHumanModeChange,
}) {
  const current = navItems.find((item) => item.id === activeNav);
  const title = current?.label || "Facemini";
  const isLoggedIn = isLoggedInUser(authUser);
  const credits = isLoggedIn ? authUser.credits : null;
  const profileDisplayName =
    authUser?.displayName || authUser?.username || "Facemini 用户";
  const rawProfileAccount = authUser?.phone || authUser?.email || "";
  const profileAccountLabel =
    rawProfileAccount && rawProfileAccount !== profileDisplayName
      ? rawProfileAccount
      : "Facemini 创作账号";
  const profileMenuId = "facemini-profile-menu";
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [displayCredits, setDisplayCredits] = useState(credits);
  const [creditDelta, setCreditDelta] = useState(null);
  const [isVideoWorkflowHistoryOpen, setIsVideoWorkflowHistoryOpen] =
    useState(false);
  const profileMenuRef = useRef(null);
  const showDigitalHumanTabs = activeNav === "digital-human";
  const showArticleTabs = activeNav === "article";
  const showVideoWorkflowHistory =
    activeNav === "motion" || activeNav === "face-swap";
  const hideStandaloneTitleTabs = [
    "watermark",
    "remove-bg",
    "enhance",
    "replicate",
    "voice",
    "music",
    "voice-convert",
    "transcribe",
    "video-voice",
  ].includes(activeNav);

  useEffect(() => {
    setShowProfileMenu(false);
    setIsVideoWorkflowHistoryOpen(false);
  }, [activeNav]);

  useEffect(() => {
    function handleHistoryState(event) {
      if (event.detail?.moduleId !== activeNav) return;
      setIsVideoWorkflowHistoryOpen(Boolean(event.detail?.open));
    }

    window.addEventListener(
      "facemini:video-workflow-history-state",
      handleHistoryState,
    );
    return () => {
      window.removeEventListener(
        "facemini:video-workflow-history-state",
        handleHistoryState,
      );
    };
  }, [activeNav]);

  function flashCreditDelta(amount) {
    if (!Number.isFinite(amount) || amount <= 0) return;
    setCreditDelta(amount);
    window.setTimeout(() => setCreditDelta(null), 1800);
  }

  useEffect(() => {
    if (typeof credits !== "number") {
      setDisplayCredits(credits);
      return;
    }
    setDisplayCredits((currentValue) => {
      if (typeof currentValue === "number" && credits > currentValue) {
        flashCreditDelta(credits - currentValue);
      }
      return credits;
    });
  }, [credits]);

  useEffect(() => {
    try {
      const pendingBonus = Number(
        window.sessionStorage.getItem(pendingInviteBonusStorageKey) || 0,
      );
      if (pendingBonus > 0) {
        flashCreditDelta(pendingBonus);
        window.sessionStorage.removeItem(pendingInviteBonusStorageKey);
      }
    } catch {
      // Session storage can be unavailable in restricted browser contexts.
    }
  }, []);

  useEffect(() => {
    if (!showProfileMenu) return undefined;
    function handlePointerDown(event) {
      if (!profileMenuRef.current?.contains(event.target)) {
        setShowProfileMenu(false);
      }
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") setShowProfileMenu(false);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [showProfileMenu]);

  function openAssets(tab = "全部", subTab = "") {
    try {
      window.sessionStorage.setItem(assetsViewModeStorageKey, "gallery");
      window.sessionStorage.setItem(assetGalleryTabStorageKey, tab);
      if (subTab)
        window.sessionStorage.setItem("facemini:assets-subtab", subTab);
    } catch {
      // Session storage can be unavailable in restricted browser contexts.
    }
    window.dispatchEvent(
      new CustomEvent("facemini-assets-tab-change", {
        detail: { tab, subTab, viewMode: "gallery" },
      }),
    );
    onNavChange?.("assets");
    setShowProfileMenu(false);
  }

  function openProfileCenter() {
    try {
      window.sessionStorage.setItem(assetsViewModeStorageKey, "profile");
    } catch {
      // Session storage can be unavailable in restricted browser contexts.
    }
    onNavChange?.("profile");
    window.dispatchEvent(
      new CustomEvent("facemini-assets-tab-change", {
        detail: { viewMode: "profile" },
      }),
    );
    setShowProfileMenu(false);
  }

  function openBillingCenter({ openTransactions = false } = {}) {
    try {
      if (openTransactions) {
        window.sessionStorage.setItem("facemini:open-transactions-modal", "1");
      }
    } catch {
      // Session storage can be unavailable in restricted browser contexts.
    }
    onNavChange?.("billing");
    window.dispatchEvent(
      new CustomEvent("facemini-assets-tab-change", {
        detail: {
          openTransactionsModal: openTransactions,
        },
      }),
    );
    setShowProfileMenu(false);
  }

  return (
    <>
      <header
        className={`fm-workbench-topbar ${
          showDigitalHumanTabs || showArticleTabs || showVideoWorkflowHistory
            ? "has-digital-tabs"
            : ""
        }${showVideoWorkflowHistory ? " has-video-workflow-tabs" : ""}${hideStandaloneTitleTabs ? " has-feature-view-tabs" : ""}`}
      >
        <div className="fm-topbar-title-row">
          {!showDigitalHumanTabs && !showArticleTabs && !showVideoWorkflowHistory && (
            <h1>
              {activeNav === "music" ? (
                <button
                  type="button"
                  className="fm-topbar-title-home"
                  onClick={() =>
                    window.dispatchEvent(new Event("facemini:music-home"))
                  }
                  aria-label="返回 AI 音乐首页"
                >
                  {title}
                </button>
              ) : (
                title
              )}
            </h1>
          )}
          {showDigitalHumanTabs && (
            <div className="fm-digital-tabs" aria-label="数字人类型">
              <button
                type="button"
                className={digitalHumanMode !== "history" ? "is-active" : ""}
                onClick={() => onDigitalHumanModeChange?.("avatar")}
              >
                数字人形象
              </button>
              <button
                type="button"
                className={digitalHumanMode === "history" ? "is-active" : ""}
                onClick={() => onDigitalHumanModeChange?.("history")}
              >
                历史记录
              </button>
            </div>
          )}
          {showArticleTabs && (
            <div
              className="fm-digital-tabs fm-video-workflow-tabs fm-article-nav-tabs"
              aria-label="爆款图文类型"
            >
              <button
                type="button"
                className={articleMode === "home" ? "is-active" : ""}
                onClick={() => onArticleModeChange?.("home")}
              >
                爆款图文
              </button>
              <button
                type="button"
                className={articleMode === "history" ? "is-active" : ""}
                onClick={() => onArticleModeChange?.("history")}
              >
                历史图文
              </button>
            </div>
          )}
          {showVideoWorkflowHistory && (
            <div
              className="fm-digital-tabs fm-article-top-tabs"
              aria-label={`${title}页面`}
            >
              <button
                type="button"
                className={!isVideoWorkflowHistoryOpen ? "is-active" : ""}
                onClick={() => {
                  setIsVideoWorkflowHistoryOpen(false);
                  window.dispatchEvent(
                    new CustomEvent("facemini:video-workflow-history", {
                      detail: { moduleId: activeNav, open: false },
                    }),
                  );
                }}
              >
                {title}
              </button>
              <button
                type="button"
                className={isVideoWorkflowHistoryOpen ? "is-active" : ""}
                onClick={() => {
                  setIsVideoWorkflowHistoryOpen(true);
                  window.dispatchEvent(
                    new CustomEvent("facemini:video-workflow-history", {
                      detail: { moduleId: activeNav, open: true },
                    }),
                  );
                }}
              >
                历史记录
              </button>
            </div>
          )}
        </div>
        <div className="fm-top-actions">
          <button
            className="fm-top-library"
            type="button"
            onClick={() => onOpenLibrary?.()}
          >
            <Sparkles size={17} />
            灵感库
          </button>
          <button
            className="fm-top-invite"
            type="button"
            onClick={onOpenInvite}
          >
            <Gift size={17} />
            邀请有礼
          </button>
          {isLoggedIn && (
            <button
              className={`fm-credit-pill ${creditDelta ? "is-boosting" : ""}`}
              type="button"
              aria-label="打开充值与明细"
              onClick={() => openBillingCenter()}
            >
              <Zap size={17} />
              {displayCredits ?? 0}
              {creditDelta && (
                <span className="fm-credit-delta">+{creditDelta}</span>
              )}
            </button>
          )}
          {isLoggedIn && (
            <button className="fm-top-bell" type="button" aria-label="通知">
              <Bell size={21} />
            </button>
          )}
          {isLoggedIn ? (
            <div className="fm-profile-menu-wrap" ref={profileMenuRef}>
              <button
                className={`fm-top-avatar-button ${showProfileMenu ? "is-open" : ""}`}
                type="button"
                aria-label="打开个人菜单"
                aria-expanded={showProfileMenu}
                aria-controls={profileMenuId}
                onClick={() => setShowProfileMenu((value) => !value)}
              >
                <img
                  className="fm-top-avatar"
                  src={authUser?.avatarUrl || defaultUserAvatarSrc}
                  alt={`${authUser?.displayName || authUser?.username || "用户"}头像`}
                />
                <ChevronDown className="fm-top-avatar-caret" size={13} />
              </button>
              {showProfileMenu && (
                <div
                  className="fm-profile-dropdown"
                  id={profileMenuId}
                  role="menu"
                >
                  <div className="fm-profile-dropdown__summary">
                    <img
                      src={authUser?.avatarUrl || defaultUserAvatarSrc}
                      alt=""
                      aria-hidden="true"
                    />
                    <span>
                      <strong>{profileDisplayName}</strong>
                      <small>{profileAccountLabel}</small>
                    </span>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => openProfileCenter()}
                  >
                    <UserRound size={16} />
                    个人中心
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => openAssets("全部")}
                  >
                    <WalletCards size={16} />
                    我的资产
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => openBillingCenter()}
                  >
                    <ReceiptText size={16} />
                    充值与明细
                  </button>
                  <span aria-hidden="true" />
                  <button
                    className="fm-profile-dropdown__logout"
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout?.();
                    }}
                  >
                    <LogOut size={16} />
                    退出登录
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="fm-auth-entry-group" aria-label="账号入口">
              <button
                className="fm-login-entry"
                type="button"
                onClick={() => onOpenAuth?.("login")}
              >
                <LogIn size={16} />
                登录
              </button>
              <button
                className="fm-register-entry"
                type="button"
                onClick={() => onOpenAuth?.("register")}
              >
                <UserPlus size={16} />
                注册
              </button>
            </div>
          )}
        </div>
      </header>
    </>
  );
}
