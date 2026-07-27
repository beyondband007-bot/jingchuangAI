import { useEffect, useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Copy,
  UserRound,
  X,
  Zap,
} from "lucide-react";
import { invitationApi } from "../../api/invitationApi";
import {
  buildClientInviteLink,
  getPendingInviteCode,
} from "./inviteUtils";
import "./inviteGiftDialog.css";

export function InviteGiftDialog({
  authUser,
  onClose,
  onOpenAuth,
  onCopyText,
}) {
  const [copied, setCopied] = useState(false);
  const [inviteProfile, setInviteProfile] = useState(null);
  const [inviteError, setInviteError] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const isGuest = !authUser || authUser.isGuest;

  useEffect(() => {
    invitationApi.track(
      "invite.popup_exposure",
      authUser?.inviteCode || getPendingInviteCode(),
      {
        loggedIn: !isGuest,
      },
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
  const toggleInviteDetails = () => setDetailsOpen((value) => !value);

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
    const ok = await onCopyText?.(inviteLink);
    setCopied(ok);
    if (!ok) {
      setInviteError("复制失败，请重试");
      return;
    }
    invitationApi.track(
      "invite.copy_success",
      inviteProfile?.inviteCode || authUser?.inviteCode,
      {
        source: "topbar_dialog",
      },
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
      <div className="fm-invite-dialog">
        <button
          className="fm-invite-close"
          type="button"
          onClick={onClose}
          aria-label="关闭邀请有礼"
        >
          <X size={28} />
        </button>
        <div className="fm-invite-hero"></div>
        <section className="fm-invite-reward-card">
          <h2>邀请好友完成新用户注册</h2>
          <p>
            邀请人&被邀请人双方各自动到账 <Zap size={22} fill="currentColor" />
            200 积分
          </p>
          <div className="fm-invite-points-row">
            <div>
              <UserRound size={34} />
              <span>你获得</span>
              <strong>
                <Zap size={16} fill="currentColor" />
                200
              </strong>
            </div>
            <b>200</b>
            <div>
              <span>好友获得</span>
              <strong>
                <Zap size={16} fill="currentColor" />
                200
              </strong>
              <UserRound size={34} />
            </div>
          </div>
          <small>
            积分可抵扣 <span>AI 生图、视频生成、数字人、爆款图文</span>{" "}
            等全部创作额度
          </small>
          <button
            className="fm-invite-copy"
            type="button"
            onClick={copyInviteLink}
            aria-label={
              isGuest ? "登录后生成专属邀请链接" : "点击复制专属邀请链接"
            }
            data-tooltip={
              isGuest
                ? "登录后生成专属邀请链接"
                : canCopyInviteLink
                  ? inviteLink
                  : "专属邀请链接加载中"
            }
          >
            <Copy size={20} />
            {isGuest
              ? "登录后生成专属邀请链接"
              : copied
                ? "邀请链接已复制"
                : "点击复制专属邀请链接"}
          </button>
          <em className="fm-invite-success">
            <CheckCircle2 size={16} />
            {inviteError ||
              (copied
                ? "邀请链接已复制，快去分享好友吧！"
                : "复制后分享给好友，完成注册即可到账")}
          </em>
        </section>
        <div className={`fm-invite-info-grid ${detailsOpen ? "is-open" : ""}`}>
          <section className={detailsOpen ? "is-open" : ""}>
            <h3
              role="button"
              tabIndex={0}
              onClick={toggleInviteDetails}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggleInviteDetails();
                }
              }}
              aria-expanded={detailsOpen}
            >
              <span className="fm-invite-section-title">
                <CircleAlert size={20} />
                活动规则
              </span>
              <ChevronDown size={18} className="fm-invite-chevron" />
            </h3>
            <div className="fm-invite-section-body">
              <ol>
                <li>
                  仅限已注册 Facemini
                  老用户参与活动，每位新注册用户仅能绑定一位邀请人。
                </li>
                <li>
                  好友通过你的专属链接访问并完成完整注册登录后，积分自动发放到双方账户。
                </li>
                <li>
                  积分无使用有效期，可自由抵扣平台内容页创作功能消耗额度。
                </li>
                <li>
                  严禁批量注册、刷量、作弊套取积分，平台有权回收违规积分。
                </li>
              </ol>
            </div>
          </section>
          <section className={detailsOpen ? "is-open" : ""}>
            <h3
              role="button"
              tabIndex={0}
              onClick={toggleInviteDetails}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  toggleInviteDetails();
                }
              }}
              aria-expanded={detailsOpen}
            >
              <span className="fm-invite-section-title">
                <CircleAlert size={20} />
                FAQ 常见问题
              </span>
              <ChevronDown size={18} className="fm-invite-chevron" />
            </h3>
            <div className="fm-invite-section-body">
              <p>
                <strong>Q：积分多久到账？</strong>
                <br />
                A：好友完成注册并登录账号后，积分实时自动发放。
              </p>
              <p>
                <strong>Q：积分能用来做什么？</strong>
                <br />
                A：可抵扣图片生成、视频生成、数字人制作、爆款图文创作等功能额度。
              </p>
              <p>
                <strong>Q：同一个好友可以多次领取奖励吗？</strong>
                <br />
                A：新用户仅首次注册可触发一次双向奖励。
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
