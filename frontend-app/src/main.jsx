﻿﻿﻿﻿import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Bot,
  Box,
  ChevronDown,
  CheckCircle2,
  Camera,
  Copy,
  Dice5,
  Download,
  Eraser,
  FileText,
  Film,
  History,
  Home,
  Image,
  Layers,
  LogIn,
  Loader2,
  LogOut,
  Maximize2,
  Mic,
  Music,
  Play,
  Plus,
  RefreshCcw,
  Ruler,
  Search,
  Send,
  PlaySquare,
  Scissors,
  Sparkles,
  Star,
  Target,
  Timer,
  Trash2,
  UserRound,
  Video,
  Wallet,
  Wand2,
  X
} from "lucide-react";
import { authApi } from "./api/authApi";
import { paymentApi } from "./api/paymentApi";
import { imageApi } from "./api/imageApi";
import { videoApi } from "./api/videoApi";
import { chatApi } from "./api/chatApi";
import { digitalHumanApi } from "./api/digitalHumanApi";
import { motionTransferApi } from "./api/motionTransferApi";
import { faceSwapApi } from "./api/faceSwapApi";
import { watermarkApi } from "./api/watermarkApi";
import { VoiceSynthesisView } from "./features/voice/VoiceSynthesisView";
import { VoiceConvertView } from "./features/voice-convert/VoiceConvertView";
import { TranscribeView } from "./features/transcribe/TranscribeView";
import { MusicGenerationView } from "./features/music/MusicGenerationView";
import { ReplicateView } from "./features/replicate/ReplicateView";
import { ChatPromptDialog } from "./features/chat/components/ChatPromptDialog";
import { PromptSelectField } from "./features/chat/components/PromptSelectField";
import { ImagePromptDialog } from "./features/chat/components/ImagePromptDialog";
import { VideoPromptDialog } from "./features/chat/components/VideoPromptDialog";
import { CustomSelect } from "./components/CustomSelect";
import { ArticleGenerationView } from "./features/article/ArticleGenerationView";
import { EnhanceView } from "./features/enhance/EnhanceView";
import { RemoveBgView } from "./features/remove-bg/RemoveBgView";
import { VideoDubbingView } from "./features/video-dubbing/VideoDubbingView";
import { FaceSwapWorkbench } from "./features/face-swap/FaceSwapWorkbench";
import { WaterfallGrid } from "./features/waterfall/WaterfallGrid";
import { DigitalHumanShowcaseCard } from "./features/digital-human/DigitalHumanShowcaseCard";
import { ImageDigitalHumanView } from "./features/image-digital-human/ImageDigitalHumanView";
import "./styles.css";

const caseImageFiles = ["1.jpg","2.jpg","3.jpg","4.jpg","5.jpg","6.jpg","7.jpg","8.jpg","9.jpg","10.jpg","11.jpg","12.jpg","13.jpg","14.jpg","15.jpg","16.jpg","17.jpg","18.jpg","20.jpg","21.jpg","22.jpg","23.jpg","24.jpg","25.jpg","26.jpg","27.jpg","28.jpg","29.jpg","30.jpg","31.jpg","32.jpg","33.jpg","34.jpg","35.jpg","36.jpg","37.jpg","39.jpg","40.jpg","41.jpg","42.jpg","43.jpg","44.jpg","45.jpg","46.jpg","47.jpg","48.jpg","49.jpg","50.jpg","51.jpg","52.jpg","53.jpg","54.jpg","55.jpg","56.jpg","70.jpg","71.jpg","72.jpg","73.jpg","74.jpg","75.jpg","89.jpg","90.jpg","91.jpg","92.jpg","93.jpg","94.jpg","108.jpg","109.jpg","110.jpg","gallery-1.jpg","gallery-10.jpg","gallery-2.jpg","gallery-3.jpg","gallery-4.jpg","gallery-5.jpg","gallery-6.jpg","gallery-7.jpg","gallery-8.jpg","gallery-9.jpg","hot-1-digital-human.jpg","hot-2-music.jpg","hot-3-motion.jpg","hot-4-faceswap.jpg","hot-5-tts.jpg","hot-6-article.jpg","hot-7-watermark.jpg","thumb-ai-chat.jpg","thumb-digital-human.jpg","thumb-img-gen.jpg"];
const wideInspirationFiles = new Set(["7.jpg","8.jpg","9.jpg","10.jpg","12.jpg","13.jpg","14.jpg","15.jpg","16.jpg","17.jpg","18.jpg","20.jpg","21.jpg","22.jpg","26.jpg","27.jpg","28.jpg","30.jpg","31.jpg","32.jpg","33.jpg","35.jpg","43.jpg","44.jpg","45.jpg","46.jpg","47.jpg","49.jpg","50.jpg","51.jpg","52.jpg","53.jpg","55.jpg","70.jpg","71.jpg","72.jpg","73.jpg","89.jpg","90.jpg","91.jpg","94.jpg","108.jpg","thumb-ai-chat.jpg","thumb-img-gen.jpg"]);
const squareInspirationFiles = new Set(["gallery-1.jpg","gallery-4.jpg","gallery-5.jpg","gallery-8.jpg"]);

function getInspirationAspect(file) {
  if (wideInspirationFiles.has(file)) return "wide";
  if (squareInspirationFiles.has(file)) return "square";
  return "portrait";
}

function takeFirstAvailable(buckets, preferredTypes) {
  for (const type of preferredTypes) {
    if (buckets[type].length) return buckets[type].shift();
  }
  return null;
}

function arrangeInspirationCards(cards, columnCount = 6) {
  const buckets = cards.reduce((next, card) => {
    next[card.aspect || "portrait"].push(card);
    return next;
  }, { portrait: [], square: [], wide: [] });
  const nonWideCards = [];
  while (buckets.portrait.length || buckets.square.length) {
    nonWideCards.push(takeFirstAvailable(buckets, nonWideCards.length % 5 === 1 ? ["square", "portrait"] : ["portrait", "square"]));
  }
  const total = cards.length;
  const baseLength = Math.floor(total / columnCount);
  const extraColumns = total % columnCount;
  const columnLengths = Array.from({ length: columnCount }, (_, index) => baseLength + (index < extraColumns ? 1 : 0));
  const wideTargets = columnLengths.map((length) => Math.floor(length / 2));
  let remainingWide = buckets.wide.length - wideTargets.reduce((sum, count) => sum + count, 0);
  columnLengths.forEach((length, index) => {
    if (remainingWide > 0 && wideTargets[index] < Math.ceil(length / 2)) {
      wideTargets[index] += 1;
      remainingWide -= 1;
    }
  });

  const columns = columnLengths.map((length, columnIndex) => {
    const wideCount = wideTargets[columnIndex];
    const nonWideCount = length - wideCount;
    const wideCards = buckets.wide.splice(0, wideCount);
    const nonWide = nonWideCards.splice(0, nonWideCount);
    const column = [];
    let preferWide = wideCount > nonWideCount;

    while (column.length < length && (wideCards.length || nonWide.length)) {
      if (preferWide && wideCards.length) {
        column.push(wideCards.shift());
      } else if (!preferWide && nonWide.length) {
        column.push(nonWide.shift());
      } else if (wideCards.length) {
        column.push(wideCards.shift());
      } else if (nonWide.length) {
        column.push(nonWide.shift());
      }
      preferWide = !preferWide;
    }

    return column;
  });

  const arranged = [];
  const maxRows = Math.max(...columns.map((column) => column.length));
  for (let rowIndex = 0; rowIndex < maxRows; rowIndex += 1) {
    columns.forEach((column) => {
      if (column[rowIndex]) arranged.push(column[rowIndex]);
    });
  }

  return arranged;
}

const exampleImages = caseImageFiles.map((file, index) => ({
  file,
  src: `/重构/案例/${encodeURIComponent(file)}`,
  label: `案例 ${String(index + 1).padStart(2, "0")}`,
  model: "图片生成",
  ratio: "案例图",
  quality: "精选",
  price: "参考",
  aspect: getInspirationAspect(file)
}));

const navItems = [
  { id: "home", label: "首页", icon: Home },
  { id: "assets", label: "我的资产", icon: Wallet },
  { id: "image", label: "图片生成", icon: Image },
  { id: "video", label: "视频生成", icon: Video },
  { id: "chat", label: "大模型", icon: Bot },
  { id: "digital-human", label: "数字人", icon: UserRound },
  { id: "image-digital-human", label: "图片数字人", icon: Camera },
  { id: "motion", label: "动作迁移", icon: Sparkles },
  { id: "face-swap", label: "视频换脸", icon: Scissors },
  { id: "voice", label: "语音合成", icon: Mic },
  { id: "article", label: "爆款图文", icon: FileText },
  { id: "watermark", label: "去水印", icon: Eraser },
  { id: "voice-convert", label: "音色转换", icon: Mic },
  { id: "transcribe", label: "语音转文字", icon: Mic },
  { id: "video-voice", label: "视频配音", icon: PlaySquare },
  { id: "music", label: "AI音乐", icon: Music },
  { id: "replicate", label: "反推提示词", icon: Copy },
  { id: "enhance", label: "画质提升", icon: Wand2 },
  { id: "remove-bg", label: "智能抠图", icon: Layers }
];

const navSections = [
  { type: "item", id: "home" },
  { type: "item", id: "chat" },
  { type: "group", id: "vision", label: "视觉生成", icon: Box, children: ["image", "video", "face-swap", "motion"] },
  { type: "group", id: "avatar", label: "数字人", icon: UserRound, children: ["digital-human", "image-digital-human"] },
  { type: "group", id: "audio", label: "音频处理", icon: Music, children: ["voice", "music", "voice-convert"] },
  { type: "group", id: "marketing", label: "营销工具", icon: Send, children: ["article", "video-voice", "watermark", "remove-bg", "enhance", "replicate", "transcribe"] },
  { type: "item", id: "assets" }
];

const homeFeatureRoutes = [
  "image",
  "video",
  "chat",
  "digital-human",
  "image-digital-human",
  "motion",
  "face-swap",
  "voice",
  "article",
  "watermark",
  "enhance",
  "remove-bg",
  "voice-convert",
  "transcribe",
  "music",
  "replicate",
  "video-voice"
];

const appEntryStorageKey = "jingchuang:enter-app";
const originalFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) => originalFetch(input, { credentials: "include", ...init });
const featureNavIds = navItems.map((item) => item.id).filter((id) => id !== "home");
const featureNavIdSet = new Set(featureNavIds);
const appNavIdSet = new Set(navItems.map((item) => item.id));

function getRouteView() {
  const hashView = window.location.hash.replace(/^#\/?/, "");
  if (appNavIdSet.has(hashView)) return hashView;
  if (window.location.pathname === "/chat" || window.location.hash === "#/chat") return "chat";
  if (window.location.pathname === "/home" || window.location.hash === "#/home") return "home";
  if (window.location.pathname === "/image-digital-human" || window.location.hash === "#/image-digital-human") return "image-digital-human";
  if (window.location.pathname === "/digital-human" || window.location.hash === "#/digital-human") return "digital-human";
  if (window.location.pathname === "/motion-transfer" || window.location.hash === "#/motion") return "motion";
  if (window.location.pathname === "/face-swap" || window.location.hash === "#/face-swap") return "face-swap";
  if (window.location.pathname === "/watermark" || window.location.hash === "#/watermark") return "watermark";
  if (window.location.pathname === "/voice-conversion" || window.location.hash === "#/voice-convert") return "voice-convert";
  if (window.location.pathname === "/transcribe" || window.location.hash === "#/transcribe") return "transcribe";
  if (window.location.pathname === "/article" || window.location.hash === "#/article") return "article";
  if (window.location.pathname === "/music" || window.location.hash === "#/music") return "music";
  if (window.location.pathname === "/replicate" || window.location.hash === "#/replicate") return "replicate";
  if (window.location.pathname === "/enhance" || window.location.hash === "#/enhance") return "enhance";
  if (window.location.pathname === "/remove-bg" || window.location.hash === "#/remove-bg") return "remove-bg";
  if (window.location.pathname === "/voice" || window.location.hash === "#/voice") return "voice";
  if (window.location.pathname === "/video" || window.location.hash === "#/video") return "video";
  if (window.location.pathname === "/image" || window.location.hash === "#/image") return "image";
  return "splash";
}

function getInitialView() {
  const shouldEnterApp = window.sessionStorage.getItem(appEntryStorageKey) === "1";
  if (shouldEnterApp) {
    window.sessionStorage.removeItem(appEntryStorageKey);
    return getRouteView();
  }
  if (window.location.pathname !== "/" || window.location.hash) {
    window.history.replaceState(null, "", "/");
  }
  return "splash";
}

const emptySecurityQuestions = [
  { questionKey: "", answer: "" },
  { questionKey: "", answer: "" },
  { questionKey: "", answer: "" }
];

function AuthDrawer({ mode, onClose, onModeChange, onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [securityQuestionOptions, setSecurityQuestionOptions] = useState([]);
  const [securityQuestions, setSecurityQuestions] = useState(emptySecurityQuestions);
  const [resetAnswer, setResetAnswer] = useState("");
  const [resetQuestionKey, setResetQuestionKey] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetChallenge, setResetChallenge] = useState(null);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [renderMode, setRenderMode] = useState(mode);
  const [isClosing, setIsClosing] = useState(false);
  const isRegister = renderMode === "register";
  const isForgot = renderMode === "forgot";

  useEffect(() => {
    if (!mode) return;
    setRenderMode(mode);
    setIsClosing(false);
    setUsername("");
    setPassword("");
    setConfirmPassword("");
    setSecurityQuestions(emptySecurityQuestions);
    setResetAnswer("");
    setResetQuestionKey("");
    setResetPassword("");
    setResetConfirmPassword("");
    setResetChallenge(null);
    setError("");
    setSuccessMessage("");
    setIsSubmitting(false);
  }, [mode]);

  useEffect(() => {
    if (!renderMode || (renderMode !== "register" && renderMode !== "forgot")) return undefined;
    let mounted = true;
    authApi.securityQuestions()
      .then((result) => {
        if (!mounted) return;
        const questions = Array.isArray(result.questions) ? result.questions : [];
        setSecurityQuestionOptions(questions);
        setSecurityQuestions((current) => current.map((item, index) => ({
          ...item,
          questionKey: item.questionKey || questions[index]?.key || ""
        })));
      })
      .catch((loadError) => {
        if (mounted) setError(loadError.message || "安全问题加载失败，请稍后重试");
      });
    return () => {
      mounted = false;
    };
  }, [renderMode]);

  useEffect(() => {
    if (mode || !renderMode) return undefined;
    setIsClosing(true);
    const timer = window.setTimeout(() => {
      setIsClosing(false);
      setRenderMode(null);
    }, 520);
    return () => window.clearTimeout(timer);
  }, [mode, renderMode]);

  if (!renderMode) return null;

  function requestClose() {
    if (isClosing) return;
    onClose();
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setSuccessMessage("");

    if (isForgot) {
      if (!resetChallenge) {
        setIsSubmitting(true);
        try {
          const challenge = await authApi.createPasswordResetChallenge({ username: username.trim() });
          setResetChallenge(challenge);
          setResetQuestionKey(challenge.questions?.[0]?.questionKey || "");
        } catch (submitError) {
          setError(submitError.message || "获取安全问题失败，请稍后重试");
        } finally {
          setIsSubmitting(false);
        }
        return;
      }

      if (resetPassword !== resetConfirmPassword) {
        setError("两次输入的新密码不一致");
        return;
      }
      if (!resetQuestionKey) {
        setError("请选择安全问题");
        return;
      }

      setIsSubmitting(true);
      try {
        await authApi.resetPassword({
          username: username.trim(),
          challengeId: resetChallenge.challengeId,
          questionKey: resetQuestionKey,
          answer: resetAnswer,
          newPassword: resetPassword
        });
        setRenderMode("login");
        setPassword("");
        setConfirmPassword("");
        setResetAnswer("");
        setResetQuestionKey("");
        setResetPassword("");
        setResetConfirmPassword("");
        setResetChallenge(null);
        setSuccessMessage("密码已重置，请使用新密码登录");
      } catch (submitError) {
        setError(submitError.message || "密码重置失败，请稍后重试");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (isRegister && password !== confirmPassword) {
      setError("两次输入的密码不一致");
      return;
    }
    setIsSubmitting(true);
    try {
      const payload = { username: username.trim(), password };
      if (isRegister) {
        payload.securityQuestions = securityQuestions;
      }
      const result = isRegister ? await authApi.register(payload) : await authApi.login(payload);
      onSuccess(result.user);
    } catch (submitError) {
      setError(submitError.message || "操作失败，请稍后重试");
    } finally {
      setIsSubmitting(false);
    }
  }

  function updateSecurityQuestion(index, field, value) {
    setSecurityQuestions((current) => current.map((item, itemIndex) => (
      itemIndex === index ? { ...item, [field]: value } : item
    )));
  }

  function getTitle() {
    if (renderMode === "register") return "创建账号";
    if (renderMode === "forgot") return "找回密码";
    return "欢迎回来";
  }

  function getDescription() {
    if (renderMode === "register") return "注册后立即获得 1000 积分，请设置 3 个安全问题用于找回密码。";
    if (renderMode === "forgot") return resetChallenge ? "选择注册时设置的安全问题，然后设置新密码。" : "输入用户名后，选择你注册时设置过的安全问题。";
    return "登录后即可查看你的积分与生成记录。";
  }

  const selectedQuestionKeys = securityQuestions.map((item) => item.questionKey).filter(Boolean);

  return (
    <div className={`auth-drawer-layer ${isClosing ? "is-closing" : ""}`} role="presentation">
      <button className="auth-drawer-backdrop" type="button" aria-label="关闭登录面板" onClick={requestClose} />
      <aside className="auth-drawer" role="dialog" aria-modal="true" aria-labelledby="auth-drawer-title">
        <button className="auth-drawer-close" type="button" aria-label="关闭" onClick={requestClose}>
          <X size={18} />
        </button>
        <div className="auth-drawer-kicker">JINGCHUANG AI ACCOUNT</div>
        <h2 id="auth-drawer-title">{getTitle()}</h2>
        <p>{getDescription()}</p>
        <form className="auth-form" onSubmit={submit}>
          <label>
            <span>用户名</span>
            <input
              autoFocus
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="请输入用户名"
              autoComplete="username"
              disabled={isForgot && Boolean(resetChallenge)}
            />
          </label>
          {!isForgot && (
            <label>
              <span>密码</span>
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="至少 6 个字符"
                type="password"
                autoComplete={renderMode === "register" ? "new-password" : "current-password"}
              />
            </label>
          )}
          {renderMode === "login" && (
            <button
              className="auth-forgot-password"
              type="button"
              onClick={() => onModeChange("forgot")}
            >
              忘记密码
            </button>
          )}
          {renderMode === "register" && (
            <>
              <label>
                <span>确认密码</span>
                <input
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="请再次输入密码"
                  type="password"
                  autoComplete="new-password"
                />
              </label>
              <div className="auth-security-grid">
                {securityQuestions.map((item, index) => (
                  <div className="auth-security-item" key={index}>
                    <label>
                      <span>安全问题 {index + 1}</span>
                      <select
                        value={item.questionKey}
                        onChange={(event) => updateSecurityQuestion(index, "questionKey", event.target.value)}
                      >
                        <option value="">请选择安全问题</option>
                        {securityQuestionOptions.map((question) => (
                          <option
                            key={question.key}
                            value={question.key}
                            disabled={selectedQuestionKeys.includes(question.key) && item.questionKey !== question.key}
                          >
                            {question.text}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      <span>答案</span>
                      <input
                        value={item.answer}
                        onChange={(event) => updateSecurityQuestion(index, "answer", event.target.value)}
                        placeholder="2-80 个字符"
                        autoComplete="off"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </>
          )}
          {isForgot && resetChallenge && (
            <>
              <label>
                <span>安全问题</span>
                <select
                  value={resetQuestionKey}
                  onChange={(event) => setResetQuestionKey(event.target.value)}
                >
                  <option value="">请选择安全问题</option>
                  {(resetChallenge.questions || []).map((question) => (
                    <option key={question.questionKey} value={question.questionKey}>
                      {question.questionText}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>答案</span>
                <input
                  value={resetAnswer}
                  onChange={(event) => setResetAnswer(event.target.value)}
                  placeholder="请输入答案"
                  autoComplete="off"
                />
              </label>
              <label>
                <span>新密码</span>
                <input
                  value={resetPassword}
                  onChange={(event) => setResetPassword(event.target.value)}
                  placeholder="至少 6 个字符"
                  type="password"
                  autoComplete="new-password"
                />
              </label>
              <label>
                <span>确认新密码</span>
                <input
                  value={resetConfirmPassword}
                  onChange={(event) => setResetConfirmPassword(event.target.value)}
                  placeholder="请再次输入新密码"
                  type="password"
                  autoComplete="new-password"
                />
              </label>
            </>
          )}
          {successMessage && <div className="auth-success">{successMessage}</div>}
          {error && <div className="auth-error">{error}</div>}
          <button className="auth-submit" type="submit" disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={17} /> : <Sparkles size={17} />}
            <span>{renderMode === "register" ? "注册并领取积分" : renderMode === "forgot" ? (resetChallenge ? "重置密码" : "获取安全问题") : "登录"}</span>
          </button>
        </form>
        {renderMode === "register" ? (
          <div className="auth-mode-switch-row">
            <span className="auth-mode-switch-label">已有账号？</span>
            <button className="auth-mode-switch auth-mode-switch-link auth-mode-switch-login-link" type="button" onClick={() => onModeChange("login")}>
              去登录
            </button>
          </div>
        ) : renderMode === "forgot" ? (
          <div className="auth-mode-switch-row">
            <span className="auth-mode-switch-label">想起密码了？</span>
            <button className="auth-mode-switch auth-mode-switch-link" type="button" onClick={() => onModeChange("login")}>
              返回登录
            </button>
          </div>
        ) : (
          <div className="auth-mode-switch-row">
            <span className="auth-mode-switch-label">还没有账号？</span>
            <button className="auth-mode-switch auth-mode-switch-link" type="button" onClick={() => onModeChange("register")}>
              立即注册
            </button>
          </div>
        )}
      </aside>
    </div>
  );
}

const SplashHome = memo(function SplashHome({ onOpenAuth }) {
  const frameRefs = useRef([]);

  const bindAuthLinks = useCallback(() => {
    frameRefs.current.forEach((frame) => {
      try {
        const doc = frame?.contentDocument;
        if (!doc) return;
        const bindLink = (selector, handler) => {
          const links = Array.from(doc.querySelectorAll(selector));
          links.forEach((link) => {
            if (link.dataset.jcAuthBound === "1") return;
            link.dataset.jcAuthBound = "1";
            link.addEventListener("click", (event) => {
              event.preventDefault();
              event.stopPropagation();
              event.stopImmediatePropagation();
              handler();
            }, true);
          });
        };
        bindLink('a[href="#signin"], a[href*="#signin"]', () => onOpenAuth("login"));
        bindLink('a[href="#signup"], a[href*="#signup"]', () => onOpenAuth("register"));
      } catch {
        // The exported landing pages are same-origin locally; ignore if a browser blocks access.
      }
    });
  }, [onOpenAuth]);

  const handleFrameLoad = useCallback(() => {
    bindAuthLinks();
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      bindAuthLinks();
      if (tries >= 20) {
        window.clearInterval(timer);
      }
    }, 200);
  }, [bindAuthLinks]);

  return (
    <div className="original-home-shell">
      <iframe ref={(node) => { frameRefs.current[0] = node; }} className="original-home-frame" title="Facemini AI" src="/new_page/studio.html" onLoad={handleFrameLoad} />
      <iframe ref={(node) => { frameRefs.current[1] = node; }} className="original-home-frame" title="椴稿垱AI首页" src="/new_page/page.html" onLoad={handleFrameLoad} />
    </div>
  );
});

const AppHome = memo(function AppHome({ onOpenFeature, authUser, onOpenAuth, onLogout }) {
  const frameRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const isGuest = Boolean(authUser?.isGuest);

  const bindHomeFeatureCards = useCallback(() => {
    const frame = frameRef.current;
    try {
      const doc = frame?.contentDocument;
      if (!doc) return;
      const cards = Array.from(doc.querySelectorAll(".feature-card"));
      cards.forEach((card, index) => {
        const route = homeFeatureRoutes[index];
        if (!route || card.dataset.jcRouteBound === route) return;
        card.dataset.jcRouteBound = route;
        card.addEventListener("click", (event) => {
          event.preventDefault();
          event.stopPropagation();
          onOpenFeature(route);
        });
      });
    } catch {
      // The home iframe is same-origin in Vite; ignore if a browser blocks access.
    }
  }, [onOpenFeature]);

  const handleFrameLoad = useCallback(() => {
    setIsReady(true);
    bindHomeFeatureCards();
    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      bindHomeFeatureCards();
      if (tries >= 20) window.clearInterval(timer);
    }, 100);
  }, [bindHomeFeatureCards]);

  const handleNavChange = useCallback((id) => {
    if (id === "home") {
      window.history.pushState(null, "", "#/home");
      return;
    }
    onOpenFeature(id);
  }, [onOpenFeature]);

  return (
    <div className={`feature-page-shell home-page-shell ${isGuest ? "is-guest" : ""}`}>
      <FeatureSidebar activeNav="home" onNavChange={handleNavChange} authUser={authUser} onOpenAuth={onOpenAuth} onLogout={onLogout} />
      {isGuest && (
        <div className="feature-guest-auth-actions" aria-label="游客璐﹀彿鍏ュ彛">
          <button type="button" onClick={() => onOpenAuth("login")}>登录</button>
          <button type="button" onClick={() => onOpenAuth("register")}>注册</button>
        </div>
      )}
      <main className="feature-main home-feature-main">
        <div className={`original-home-shell app-home-shell ${isReady ? "is-ready" : "is-loading"}`}>
          <iframe ref={frameRef} className="original-home-frame" title="Facemini.com ??" src="/重构/index.html" onLoad={handleFrameLoad} />
        </div>
      </main>
    </div>
  );
});

const FeatureSidebar = memo(function FeatureSidebar({ activeNav, onNavChange, authUser, onOpenAuth, onLogout }) {
  const isLoadingUser = !authUser;
  const isGuest = Boolean(authUser?.isGuest);
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState(() => ({
    vision: true,
    avatar: true,
    audio: true,
    marketing: true
  }));
  const normalizedQuery = query.trim().toLowerCase();

  const getNavItem = useCallback((id) => navItems.find((item) => item.id === id), []);
  const isVisible = useCallback((item) => {
    if (!normalizedQuery) return true;
    return item?.label?.toLowerCase().includes(normalizedQuery) || item?.id?.toLowerCase().includes(normalizedQuery);
  }, [normalizedQuery]);

  const toggleGroup = useCallback((id) => {
    setOpenGroups((current) => ({ ...current, [id]: !current[id] }));
  }, []);

  return (
    <aside className="feature-sidebar">
      <div className="feature-brand">
        <span className="feature-brand-text">Facemini.com</span>
        <span className="feature-brand-beta">（内测）</span>
      </div>
      <label className="feature-nav-search">
        <Search size={16} />
        <input value={query} onChange={(event) => setQuery(event.target.value)} type="search" placeholder="搜索..." />
      </label>
      <nav className="feature-nav" aria-label="功能导航">
        {navSections.map((section) => {
          if (section.type === "item") {
            const item = getNavItem(section.id);
            if (!item || !isVisible(item)) return null;
            const Icon = item.icon;
            const active = activeNav === item.id;
            return (
              <div className="feature-nav-section" key={section.id}>
                <button className={`feature-nav-item ${active ? "is-active" : ""}`} onClick={() => onNavChange(item.id)} type="button">
                  <Icon size={18} strokeWidth={1.9} />
                  <span>{item.label}</span>
                </button>
              </div>
            );
          }

          if (section.type === "external") {
            if (normalizedQuery && !section.label.toLowerCase().includes(normalizedQuery) && !section.id.toLowerCase().includes(normalizedQuery)) return null;
            const Icon = section.icon;
            return (
              <div className="feature-nav-section" key={section.id}>
                <button className="feature-nav-item" onClick={() => window.open(section.href, "_blank", "noopener,noreferrer")} type="button">
                  <Icon size={18} strokeWidth={1.9} />
                  <span>{section.label}</span>
                </button>
              </div>
            );
          }

          const children = section.children.map(getNavItem).filter(Boolean).filter(isVisible);
          const hasActiveChild = section.children.includes(activeNav);
          if (!children.length && normalizedQuery) return null;
          const GroupIcon = section.icon;
          const isOpen = Boolean(openGroups[section.id] || hasActiveChild || normalizedQuery);
          return (
            <div className="feature-nav-section feature-nav-section--group" key={section.id}>
              <button className={`feature-nav-group ${hasActiveChild ? "is-active" : ""} ${isOpen ? "is-open" : ""}`} type="button" onClick={() => toggleGroup(section.id)}>
                <GroupIcon size={18} strokeWidth={1.9} />
                <span>{section.label}</span>
                <ChevronDown className="feature-nav-chevron" size={16} />
              </button>
              <div className={`feature-nav-children ${isOpen ? "is-open" : ""}`}>
                {children.map((item) => {
                  const Icon = item.icon;
                  const active = activeNav === item.id;
                  return (
                    <button className={`feature-nav-child ${active ? "is-active" : ""}`} key={item.id} onClick={() => onNavChange(item.id)} type="button">
                      <span className="feature-nav-child-icon">
                        <Icon size={15} strokeWidth={1.9} />
                      </span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      {isLoadingUser ? (
        <button className="feature-login" type="button" onClick={() => onOpenAuth("login")}>
          <LogIn size={16} />
          <span>登录</span>
        </button>
      ) : (
        <div className={`feature-user-panel ${isGuest ? "is-guest" : ""}`}>
          <div className="feature-user-avatar">
            <UserRound size={17} />
          </div>
          <div className="feature-user-copy">
            <strong>{isGuest ? "游客" : authUser.displayName || authUser.username}</strong>
            {!isGuest && <span>积分 {authUser.credits ?? "-"}</span>}
          </div>
          {!isGuest && (
            <button type="button" onClick={onLogout} aria-label="退出登录">
              <LogOut size={16} />
            </button>
          )}
        </div>
      )}
    </aside>
  );
});

function ComingSoon({ activeNav }) {
  const current = useMemo(() => navItems.find((item) => item.id === activeNav), [activeNav]);
  return (
    <section className="coming-soon-panel">
      <div className="coming-soon-icon">
        <Sparkles size={28} />
      </div>
      <h1>{current?.label || "功能"}暂未开放</h1>
      <p>当前阶段仅接入了图片生成功能，其他能力会在后续迭代中逐步补齐。</p>
    </section>
  );
}

const rechargePresets = [1, 10, 30, 50, 100, 200];
const finalPaymentStatuses = new Set(["PAID", "CLOSED", "CANCELED", "REFUNDED", "AMOUNT_MISMATCH"]);

function paymentStatusText(status) {
  return ({
    CREATED: "已创建",
    QR_READY: "待扫码",
    WAITING_PAYMENT: "待支付",
    SCANNED: "已扫码",
    PAID: "已到账",
    CLOSED: "已关闭",
    CANCELED: "已取消",
    AMOUNT_MISMATCH: "异常"
  })[status] || status || "-";
}

const txTypeMap = {
  grant: { label: "系统赠送", color: "#a855f7" },
  debit: { label: "消费扣费", color: "#dc2626" },
  refund: { label: "积分退回", color: "#2563eb" },
  recharge: { label: "充值到账", color: "#16a34a" }
};

function AssetsPage({ authUser, onOpenAuth }) {
  const isGuest = Boolean(authUser?.isGuest);
  const [credits, setCredits] = useState(null);
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState(1);
  const [activePreset, setActivePreset] = useState(1);
  const [activeTab, setActiveTab] = useState("recharge");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [paymentDialog, setPaymentDialog] = useState(null);

  const points = Math.max(1, Number(amount) || 1) * 100;

  const refreshAssets = useCallback(async () => {
    if (isGuest) return;
    setIsLoading(true);
    setError("");
    try {
      const [creditsState, orderState, txState] = await Promise.all([
        paymentApi.getCredits(),
        paymentApi.listOrders(),
        paymentApi.getCreditTransactions()
      ]);
      setCredits(creditsState);
      setOrders(orderState.orders || []);
      setTransactions(txState.transactions || []);
    } catch (nextError) {
      setError(nextError.message || "资产信息加载失败");
    } finally {
      setIsLoading(false);
    }
  }, [isGuest]);

  useEffect(() => {
    refreshAssets();
  }, [refreshAssets]);

  useEffect(() => {
    if (!paymentDialog || finalPaymentStatuses.has(paymentDialog.order?.status)) return undefined;
    let alive = true;
    const sync = async () => {
      try {
        const order = await paymentApi.syncOrder(paymentDialog.order.outTradeNo, paymentDialog.orderToken);
        if (!alive) return;
        setPaymentDialog((current) => current ? { ...current, order } : current);
        if (order.status === "PAID") {
          await refreshAssets();
          setTimeout(() => {
            if (alive) setPaymentDialog(null);
          }, 1200);
        }
      } catch (nextError) {
        if (alive) setPaymentDialog((current) => current ? { ...current, error: nextError.message } : current);
      }
    };
    const timer = window.setInterval(sync, 3000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [paymentDialog, refreshAssets]);

  function selectPreset(value) {
    setActivePreset(value);
    setAmount(value);
  }

  function updateAmount(value) {
    const nextAmount = Math.max(1, Number.parseInt(value || "1", 10) || 1);
    setAmount(nextAmount);
    setActivePreset(rechargePresets.includes(nextAmount) ? nextAmount : null);
  }

  async function createOrder() {
    if (isGuest) {
      onOpenAuth("login");
      return;
    }
    setIsCreating(true);
    setError("");
    try {
      const created = await paymentApi.createOrder(Number(amount));
      const qrState = await paymentApi.getQrCode(created.order.outTradeNo, created.orderToken);
      setPaymentDialog({
        order: qrState.order,
        orderToken: created.orderToken,
        qrCodeDataUrl: qrState.qrCodeDataUrl,
        error: ""
      });
      await refreshAssets();
    } catch (nextError) {
      setError(nextError.message || "充值订单创建失败");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <section className="assets-view-root">
      <header className="assets-toolbar">
        <div>
          <h1>我的资产</h1>
          <p>管理您的积分余额、充值和交易记录</p>
        </div>
        <button className="assets-icon-button" type="button" onClick={refreshAssets} disabled={isLoading || isGuest} aria-label="刷新资产">
          <RefreshCcw size={18} className={isLoading ? "is-spinning" : ""} />
        </button>
      </header>

      {isGuest ? (
        <div className="assets-login-panel">
          <Wallet size={32} />
          <strong>登录后查看资产</strong>
          <p>登录后可查看积分余额、充值记录和消费明细</p>
          <button type="button" onClick={() => onOpenAuth("login")}>登录</button>
        </div>
      ) : (
        <>
          <div className="assets-balance-hero">
            <div className="assets-balance-info">
              <span>可用积分</span>
              <strong>{credits?.balance ?? authUser?.credits ?? "-"}</strong>
              <small>1 元 = 100 积分</small>
            </div>
            <div className="assets-balance-actions">
              <button type="button" onClick={() => setActiveTab("recharge")}>
                <Wallet size={18} />
                立即充值
              </button>
            </div>
          </div>

          <div className="assets-tabs-wrapper">
            <div className="assets-tabs">
              <button className={`assets-tab ${activeTab === "recharge" ? "is-active" : ""}`} type="button" onClick={() => setActiveTab("recharge")}>
                <Wallet size={16} />
                充值中心
              </button>
              <button className={`assets-tab ${activeTab === "transactions" ? "is-active" : ""}`} type="button" onClick={() => setActiveTab("transactions")}>
                <History size={16} />
                交易记录
              </button>
            </div>
          </div>

          {activeTab === "recharge" && (
            <div className="assets-recharge-panel">
              <div className="assets-section-title">
                <Wallet size={18} />
                <strong>支付宝充值</strong>
              </div>
              <div className="assets-presets">
                {rechargePresets.map((value) => (
                  <button className={activePreset === value ? "is-active" : ""} key={value} type="button" onClick={() => selectPreset(value)}>
                    <span>{value} 元</span>
                    <small>{value * 100} 积分</small>
                  </button>
                ))}
              </div>
              <label className="assets-custom-amount">
                <span>自定义金额</span>
                <input type="number" min="1" step="1" value={amount} onChange={(event) => updateAmount(event.target.value)} />
                <em>{points} 积分</em>
              </label>
              {error && <div className="assets-error">{error}</div>}
              <button className="assets-primary-action" type="button" onClick={createOrder} disabled={isCreating}>
                {isCreating ? <Loader2 size={18} className="is-spinning" /> : <Wallet size={18} />}
                <span>生成支付宝付款码</span>
              </button>

              <div className="assets-orders-section">
                <div className="assets-section-title">
                  <FileText size={18} />
                  <strong>近期充值订单</strong>
                </div>
                <div className="assets-order-list">
                  {orders.length ? orders.map((order) => (
                    <div className={`assets-order-row status-${order.status}`} key={order.outTradeNo}>
                      <div>
                        <strong>{order.totalAmount} 元</strong>
                        <span>{order.outTradeNo}</span>
                      </div>
                      <div>
                        <strong>{order.points} 积分</strong>
                        <span>{paymentStatusText(order.status)}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="assets-empty-state">暂无充值订单</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "transactions" && (
            <div className="assets-transactions-panel">
              <div className="assets-section-title">
                <History size={18} />
                <strong>积分交易记录</strong>
              </div>
              {transactions.length ? (
                <div className="assets-transactions-table">
                  <div className="assets-transactions-header">
                    <span>时间</span>
                    <span>类型</span>
                    <span>变动</span>
                    <span>余额</span>
                    <span>备注</span>
                  </div>
                  {transactions.map((tx) => {
                    const typeInfo = txTypeMap[tx.type] || { label: tx.type, color: "#64748b" };
                    const isIncome = tx.type === "recharge" || tx.type === "refund" || tx.type === "grant";
                    return (
                      <div className="assets-transaction-row" key={tx.id}>
                        <span>{new Date(tx.createdAt).toLocaleString("zh-CN")}</span>
                        <span style={{ color: typeInfo.color }}>{typeInfo.label}</span>
                        <span style={{ color: isIncome ? "#16a34a" : "#dc2626", fontWeight: 700 }}>
                          {isIncome ? "+" : ""}{tx.amount}
                        </span>
                        <span>{tx.balanceAfter}</span>
                        <span title={tx.memo}>{tx.memo || "-"}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="assets-empty-state">暂无交易记录</div>
              )}
            </div>
          )}
        </>
      )}

      {paymentDialog && (
        <div className="assets-payment-backdrop" role="dialog" aria-modal="true" aria-label="支付宝付款码">
          <div className="assets-payment-dialog">
            <button className="assets-dialog-close" type="button" onClick={() => setPaymentDialog(null)} aria-label="关闭">
              <X size={18} />
            </button>
            <div className="assets-section-title">
              {paymentDialog.order?.status === "PAID" ? <CheckCircle2 size={20} /> : <Wallet size={20} />}
              <strong>{paymentDialog.order?.status === "PAID" ? "充值成功" : "支付宝扫码支付"}</strong>
            </div>
            <div className="assets-qr-box">
              {paymentDialog.qrCodeDataUrl ? (
                <img src={paymentDialog.qrCodeDataUrl} alt="支付宝充值二维码" />
              ) : (
                <Loader2 size={28} className="is-spinning" />
              )}
            </div>
            <div className="assets-dialog-meta">
              <span>订单 {paymentDialog.order?.outTradeNo}</span>
              <strong>{paymentDialog.order?.totalAmount} 元 / {paymentDialog.order?.points} 积分</strong>
              <em>{paymentStatusText(paymentDialog.order?.status)}</em>
            </div>
            {paymentDialog.error && <div className="assets-error">{paymentDialog.error}</div>}
          </div>
        </div>
      )}
    </section>
  );
}

function ResultCard({ card, onDelete, onFavorite, onRegenerate, onPreview, isExample = false, isImageGallery = false, isSelected = false }) {
  const isProcessing = card.status === "pending" || card.status === "processing";
  const isFailed = card.status === "failed";
  const canPreview = Boolean(card.image && onPreview && !isProcessing && !isFailed);

  return (
    <article
      className={`result-card status-${card.status} ${isExample ? "is-example" : ""} ${isImageGallery ? "is-image-gallery" : ""} ${isSelected ? "is-selected-result" : ""}`}
      data-image-card-id={card.id}
    >
      {isImageGallery && (
        <div className="result-card-model-tag">
          <span className="model-tag">{card.model}</span>
        </div>
      )}
      <div className={`result-preview ${card.grid ? "preview-grid" : ""}`}>
        {isProcessing && <div className="processing-state">生成涓?..</div>}
        {isFailed && <div className="failed-state">生成失败</div>}
        {!isProcessing && !isFailed && card.image ? (
          card.grid ? (
            <>
              <img src={card.image} alt={card.prompt} />
              <img src="/assets/image/gallery-3.jpg" alt={card.prompt} />
              <img src="/assets/image/gallery-4.jpg" alt={card.prompt} />
              <img src="/assets/image/gallery-5.jpg" alt={card.prompt} />
            </>
          ) : (
            <img src={card.image} alt={card.prompt} />
          )
        ) : null}
        {canPreview && isImageGallery && (
          <button className="result-preview-hitarea" type="button" onClick={() => onPreview(card)} aria-label="放大查看图片">
            <Maximize2 size={18} />
          </button>
        )}
        {card.referenceImageUrl && (
          <span className="result-reference-thumb" title="参考图">
            <img src={card.referenceImageUrl} alt="" />
          </span>
        )}
        {!isProcessing && !isFailed && !card.image && <span className="broken-image-mark" aria-hidden="true" />}
      </div>
      <div className="result-meta">
        <div className="tag-row">
          {!isImageGallery && <span className="model-tag">{card.model}</span>}
          {!isImageGallery && <span className="ratio-tag">{card.ratio}</span>}
          {!isImageGallery && <span className="quality-tag">{card.quality}</span>}
          {card.referenceImageUrl && !isImageGallery && <span className="reference-tag">参考图</span>}
          {card.count > 1 && <span className="count-tag">{card.count}张</span>}
        </div>
        {!isImageGallery && (
          <div className="time-row">
            <span>{card.time || "示例"}</span>
            <strong>{card.price}</strong>
          </div>
        )}
        {isImageGallery ? (
          <div className="gallery-title-row">
            <p>{card.error || card.prompt}</p>
            <strong>{card.price}</strong>
          </div>
        ) : (
        <>
        <p>{card.error || card.prompt}</p>
        <div className="card-actions">
          <button className={`icon-circle ${card.favorite ? "is-favorite" : ""}`} type="button" onClick={() => onFavorite(card.id)} aria-label="收藏" disabled={isExample}>
            <Star size={17} fill={card.favorite ? "#f8d545" : "none"} />
          </button>
          {card.image ? (
            <a className="card-action-link" href={card.image} download>
              <Download size={15} />
              下载
            </a>
          ) : (
            <button type="button" disabled>
              <Download size={15} />
              下载
            </button>
          )}
          <button type="button" onClick={() => onRegenerate(card.id)} disabled={isExample}>
            <RefreshCcw size={15} />
            再次生成
          </button>
          <button type="button" onClick={() => onDelete(card.id)} disabled={isExample}>
            <Trash2 size={15} />
            删除
          </button>
        </div>
        </>
        )}
      </div>
    </article>
  );
}

function formatReferenceImageSize(bytes = 0) {
  if (!bytes || Number.isNaN(Number(bytes))) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function ReferenceImageSlot({ image, isUploading, onRemove }) {
  if (!image && !isUploading) return null;

  if (isUploading) {
    return (
      <div className="image-reference-slot">
        <div className="image-reference-card is-uploading">
          <span className="image-reference-preview">
            <Loader2 size={16} className="is-spinning" />
          </span>
          <span className="image-reference-meta">
            <strong>参考图上传中</strong>
            <small>上传完成后自动用于生成</small>
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="image-reference-slot">
      <div className="image-reference-card">
        <span className="image-reference-preview">
          {image?.url ? <img src={image.url} alt="" /> : <Image size={16} />}
        </span>
        <span className="image-reference-meta">
          <strong title={image?.originalName || "参考图"}>{image?.originalName || "参考图"}</strong>
          <small>{formatReferenceImageSize(image?.size)}</small>
        </span>
        <button type="button" onClick={onRemove} aria-label="移除参考图">
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

function ComposerBar({ options, onSubmit }) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(options.models[0]?.value || "");
  const [ratio, setRatio] = useState(options.ratios[0] || "");
  const [quality, setQuality] = useState(options.qualities[0]?.value || "");
  const [referenceImage, setReferenceImage] = useState(null);
  const [isUploadingReference, setIsUploadingReference] = useState(false);
  const [notice, setNotice] = useState("");
  const referenceInputRef = useRef(null);

  useEffect(() => {
    if (!model && options.models[0]) setModel(options.models[0].value);
    if (!ratio && options.ratios[0]) setRatio(options.ratios[0]);
    if (!quality && options.qualities[0]) setQuality(options.qualities[0].value);
  }, [model, options, quality, ratio]);

  const count = 1;
  const price = imageApi.calculatePrice({ model, quality, count, models: options.models, qualities: options.qualities });
  const canSubmit = prompt.trim().length > 0 && !isUploadingReference;

  function clearPrompt() {
    setPrompt("");
    setReferenceImage(null);
    setNotice("已清空提示词");
  }

  function fillRandomPrompt() {
    setPrompt(imageApi.getRandomPrompt());
    setNotice("已填入随机提示词");
  }

  async function handleReferenceSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingReference(true);
    setNotice("");
    try {
      const uploaded = await imageApi.uploadReference(file);
      setReferenceImage({
        url: uploaded.referenceImageUrl || uploaded.url,
        originalName: uploaded.originalName || file.name,
        size: uploaded.size || file.size,
        mimeType: uploaded.mimeType || file.type
      });
    } catch (error) {
      setNotice(error.message || "参考图上传失败，请重试");
    } finally {
      setIsUploadingReference(false);
      event.target.value = "";
    }
  }

  function handleAddPrompt() {
    referenceInputRef.current?.click();
  }

  function removeReferenceImage() {
    setReferenceImage(null);
    setNotice("");
  }

  function submitPrompt() {
    if (!canSubmit) {
      setNotice(isUploadingReference ? "参考图上传完成后再生成" : "请先输入图片描述");
      return;
    }

    if (referenceImage && model !== "gpt_image_2") {
      setNotice("当前模型暂不支持参考图，请切换 GPT Image 2");
      return;
    }

    onSubmit({
      prompt: prompt.trim(),
      model,
      ratio,
      quality,
      count,
      referenceImageUrl: referenceImage?.url || null
    });
    setNotice("已创建生成任务");
    setPrompt("");
    setReferenceImage(null);
  }

  return (
    <div className="sowa-composer" aria-label="图片生成输入框">
      <input
        ref={referenceInputRef}
        type="file"
        hidden
        accept="image/jpeg,image/png,image/webp"
        onChange={handleReferenceSelect}
      />
      <ImagePromptDialog
        ariaLabel="图片生成输入框"
        placeholder="选择模型后，释放你的创作灵感"
        value={prompt}
        onChange={(value) => {
          setPrompt(value);
          if (notice) setNotice("");
        }}
        onSubmit={submitPrompt}
        canSubmit={canSubmit}
        notice={notice}
        onAdd={handleAddPrompt}
        onRandom={fillRandomPrompt}
        onClear={clearPrompt}
        model={model}
        onModelChange={setModel}
        modelOptions={options.models}
        ratio={ratio}
        onRatioChange={setRatio}
        ratioOptions={options.ratios}
        quality={quality}
        onQualityChange={setQuality}
        qualityOptions={options.qualities}
        price={price}
        referenceSlot={(
          <ReferenceImageSlot
            image={referenceImage}
            isUploading={isUploadingReference}
            onRemove={removeReferenceImage}
          />
        )}
      />
    </div>
  );
}

const emptyOptions = { models: [], ratios: [], qualities: [], counts: [] };
const imageGenerationSessionKey = "jingchuang:image-generation-session";

function readImageGenerationSession() {
  try {
    const cached = window.sessionStorage.getItem(imageGenerationSessionKey);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function writeImageGenerationSession(next) {
  try {
    window.sessionStorage.setItem(imageGenerationSessionKey, JSON.stringify(next));
  } catch {
    // Session storage can be unavailable in strict privacy contexts.
  }
}

function clearImageGenerationSession() {
  try {
    window.sessionStorage.removeItem(imageGenerationSessionKey);
  } catch {
    // Ignore storage errors; the in-memory state still drives the current view.
  }
}

function ExampleCanvas() {
  return (
    <div className="image-canvas example-canvas" aria-label="图片生成案例">
      <div className="example-canvas-copy">
        <span>图片生成</span>
        <h1>选择一个方向，或直接输入你的图片描述</h1>
      </div>
      <div className="example-card-grid">
        {exampleImages.map((item) => (
          <button className="example-card" key={item.src} type="button">
            <span className="example-card-preview">
              <img src={item.src} alt={item.label} />
            </span>
            <span className="example-card-tags">
              <span>{item.model}</span>
              <span>{item.ratio}</span>
              <span>{item.quality}</span>
            </span>
            <span className="example-card-meta">
              <span>{item.label}</span>
              <strong>{item.price}</strong>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function GeneratingCanvas({ prompt }) {
  return (
    <div className="image-canvas chat-canvas" aria-live="polite">
      <div className="chat-thread">
        {prompt && (
          <div className="chat-row user">
            <div className="chat-bubble">{prompt}</div>
          </div>
        )}
        <div className="chat-row assistant">
          <div className="assistant-avatar">
            <Sparkles size={17} />
          </div>
          <div className="chat-bubble waiting">
            <div className="chat-waiting-title">
              <Loader2 size={18} />
              <span>已收到你的请求，正在为你生成图片</span>
            </div>
            <div className="chat-waiting-card">
              <span />
              <span />
              <span />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageGeneratingFeedState({ prompt }) {
  return (
    <div className="image-generating-feed-state" role="status" aria-live="polite">
      <div className="image-generating-orbit" aria-hidden="true">
        <span />
        <Loader2 size={30} />
      </div>
      <div>
        <strong>图片正在生成中</strong>
        <p>{prompt ? `正在处理：“${prompt}”` : "已收到你的请求，正在为你生成图片。"}</p>
      </div>
    </div>
  );
}

function ImageCompletedNotice({ task, onReveal }) {
  if (!task?.image) return null;

  return (
    <button className="image-completed-notice" type="button" onClick={() => onReveal(task)} aria-label="查看生成结果">
      <div className="image-completed-mark" aria-hidden="true">
        <CheckCircle2 size={32} />
      </div>
      <div>
        <strong>生图已完成，点击查看结果</strong>
        <p>{task.prompt}</p>
      </div>
    </button>
  );
}

function CompletedCanvas({ task, onPreview }) {
  return (
    <div className="image-canvas chat-canvas">
      <div className="chat-thread">
        <div className="chat-row user">
          <div className="chat-bubble">{task.prompt}</div>
        </div>
        <div className="chat-row assistant">
          <div className="assistant-avatar">
            <CheckCircle2 size={17} />
          </div>
          <div className="chat-bubble result">
            <span>已为你生成图片</span>
            <button className="chat-result-image" type="button" onClick={() => onPreview(task)} aria-label="查看生成图片">
              <img src={task.image} alt={task.prompt} />
            </button>
            <div className="chat-result-actions">
              <a href={task.image} download>
                <Download size={15} />
                下载
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function FailedCanvas({ task, prompt, error, onRetry }) {
  const message = task?.error || error || "图片生成遇到问题，请稍后重试。";

  return (
    <div className="image-canvas chat-canvas" role="status">
      <div className="chat-thread">
        {(task?.prompt || prompt) && (
          <div className="chat-row user">
            <div className="chat-bubble">{task?.prompt || prompt}</div>
          </div>
        )}
        <div className="chat-row assistant">
          <div className="assistant-avatar error">
            <Sparkles size={17} />
          </div>
          <div className="chat-bubble failed">
            <strong>这次没有生成成功</strong>
            <p>{message}</p>
            {task && (
              <button type="button" onClick={() => onRetry(task.id)}>
                <RefreshCcw size={17} />
                再次生成
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ImageWorkspaceCanvas({ status, selectedTask, activePrompt, submitError, onRetry, onPreview }) {
  if (status === "generating") {
    return <GeneratingCanvas prompt={selectedTask?.prompt || activePrompt} />;
  }

  if (status === "completed" && selectedTask?.image) {
    return <CompletedCanvas task={selectedTask} onPreview={onPreview} />;
  }

  if (status === "failed") {
    return <FailedCanvas task={selectedTask} prompt={activePrompt} error={submitError} onRetry={onRetry} />;
  }

  return <ExampleCanvas />;
}

function PreviewDrawer({ task, onClose }) {
  if (!task?.image) return null;

  return (
    <aside className="preview-drawer" aria-label="生成图片预览画布">
      <div className="preview-drawer-header">
        <div>
          <span>预览</span>
          <strong>{task.prompt}</strong>
        </div>
        <button type="button" onClick={onClose} aria-label="关闭预览">
          关闭
        </button>
      </div>
      <div className="preview-drawer-stage">
        <img src={task.image} alt={task.prompt} />
      </div>
      <div className="preview-drawer-actions">
        <a href={task.image} download>
          <Download size={16} />
          下载
        </a>
      </div>
    </aside>
  );
}

function ImagePreviewLightbox({ task, onClose }) {
  if (!task?.image) return null;

  return (
    <div className="image-preview-lightbox" role="dialog" aria-modal="true" aria-label="图片放大预览">
      <button className="image-preview-backdrop" type="button" onClick={onClose} aria-label="关闭图片预览" />
      <div className="image-preview-panel">
        <div className="image-preview-toolbar">
          <div>
            <span>预览</span>
            <strong>{task.prompt}</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭图片预览">
            <X size={18} />
          </button>
        </div>
        <div className="image-preview-stage">
          <img src={task.image} alt={task.prompt} />
        </div>
        <div className="image-preview-actions">
          <a href={task.image} download>
            <Download size={16} />
            下载
          </a>
        </div>
      </div>
    </div>
  );
}

function HistoryRail({ cards, selectedTaskId, onSelect, onDelete, onFavorite, onRegenerate }) {
  if (!cards.length) return null;

  return (
    <aside className="history-rail" aria-label="图片生成历史">
      <div className="history-rail-header">
        <span>历史结果</span>
        <strong>{cards.length}</strong>
      </div>
      <div className="history-list">
        {cards.map((card) => {
          const isSelected = selectedTaskId === card.id;
          const isProcessing = card.status === "pending" || card.status === "processing";
          const isFailed = card.status === "failed";

          return (
            <article className={`history-item ${isSelected ? "is-selected" : ""} status-${card.status}`} key={card.id}>
              <button className="history-preview" type="button" onClick={() => onSelect(card.id)} aria-label={`查看 ${card.prompt}`}>
                {card.image && !isFailed ? <img src={card.image} alt={card.prompt} /> : null}
                {isProcessing && (
                  <span className="history-processing">
                    <Loader2 size={18} />
                  </span>
                )}
                {isFailed && <span className="history-failed">失败</span>}
                {!card.image && !isProcessing && !isFailed && <span className="broken-image-mark" aria-hidden="true" />}
              </button>
              <div className="history-meta">
                <button className="history-title" type="button" onClick={() => onSelect(card.id)}>
                  {card.prompt}
                </button>
                <div className="history-tags">
                  <span>{card.ratio}</span>
                  <span>{card.quality}</span>
                  <span>{card.time}</span>
                </div>
                <div className="history-actions">
                  <button type="button" onClick={() => onFavorite(card.id)} aria-label="收藏">
                    <Star size={15} fill={card.favorite ? "#f8d545" : "none"} />
                  </button>
                  {card.image && (
                    <a href={card.image} download aria-label="下载图片">
                      <Download size={15} />
                    </a>
                  )}
                  <button type="button" onClick={() => onRegenerate(card.id)} aria-label="再次生成">
                    <RefreshCcw size={15} />
                  </button>
                  <button type="button" onClick={() => onDelete(card.id)} aria-label="删除">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </aside>
  );
}

function ImageGenerationView({ authUser, onOpenAuth }) {
  const cachedSessionRef = useRef(null);
  if (!cachedSessionRef.current) {
    cachedSessionRef.current = readImageGenerationSession();
  }
  const cachedSession = cachedSessionRef.current;
  const [filter, setFilter] = useState("inspiration");
  const [cards, setCards] = useState([]);
  const [options, setOptions] = useState(emptyOptions);
  const [credits, setCredits] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(cachedSession.selectedTaskId || null);
  const [submittedTaskId, setSubmittedTaskId] = useState(cachedSession.submittedTaskId || null);
  const [activePrompt, setActivePrompt] = useState(cachedSession.activePrompt || "");
  const [isSubmitting, setIsSubmitting] = useState(Boolean(cachedSession.isSubmitting));
  const [submitError, setSubmitError] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [previewTask, setPreviewTask] = useState(null);

  // 常驻挂载：切换侧栏其它模块时不卸载，避免生成中状态与列表缓存丢失
  useEffect(() => {
    let mounted = true;
    imageApi.getModels().then((value) => mounted && setOptions(value));
    imageApi.getCredits().then((value) => mounted && setCredits(value));
    imageApi.getTasks({ filter }).then((value) => mounted && setCards(value));

    const unsubscribe = imageApi.subscribe(() => {
      imageApi.getTasks({ filter }).then((value) => mounted && setCards(value));
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [filter]);

  const selectedTask = useMemo(() => cards.find((card) => card.id === selectedTaskId) || null, [cards, selectedTaskId]);
  const submittedTask = useMemo(() => cards.find((card) => card.id === submittedTaskId) || null, [cards, submittedTaskId]);
  const activeGenerationTask = submittedTask || selectedTask;
  const hasActiveGeneration = Boolean(
    isSubmitting ||
    activeGenerationTask?.status === "pending" ||
    activeGenerationTask?.status === "processing"
  );
  const imageExampleCards = useMemo(
    () => exampleImages.map((item, index) => ({
      id: `example-image-${index}`,
      status: "completed",
      model: item.model,
      ratio: item.ratio,
      quality: item.quality,
      count: 1,
      time: "绀轰緥",
      price: item.price,
      prompt: item.label,
      image: item.src,
      aspect: item.aspect,
      favorite: false
    })),
    []
  );
  const arrangedImageExampleCards = useMemo(() => arrangeInspirationCards(imageExampleCards, 6), [imageExampleCards]);
  const galleryItems = useMemo(() => {
    if (filter === "inspiration") {
      return arrangedImageExampleCards.map((card) => ({ card, isExample: true }));
    }

    const shouldShowExamples = filter === "all" && cards.length === 0 && !submittedTaskId && !selectedTaskId && !isSubmitting;
    if (shouldShowExamples) {
      return [
        ...arrangedImageExampleCards.map((card) => ({ card, isExample: true }))
      ];
    }
    return cards.map((card) => ({ card, isExample: false }));
  }, [arrangedImageExampleCards, cards, filter, isSubmitting, selectedTaskId, submittedTaskId]);

  useEffect(() => {
    if (submittedTask && (submittedTask.status === "completed" || submittedTask.status === "failed")) {
      setSelectedTaskId(submittedTask.id);
      setIsSubmitting(false);
    }
  }, [submittedTask]);

  useEffect(() => {
    if (!submittedTaskId || !submittedTask) return;
    setSelectedTaskId(submittedTask.id);
  }, [submittedTask, submittedTaskId]);

  useEffect(() => {
    if (!submittedTaskId && !selectedTaskId && !activePrompt && !isSubmitting) {
      clearImageGenerationSession();
      return;
    }

    writeImageGenerationSession({
      submittedTaskId,
      selectedTaskId,
      activePrompt,
      isSubmitting,
      updatedAt: Date.now()
    });
  }, [activePrompt, isSubmitting, selectedTaskId, submittedTaskId]);

  const canvasStatus = useMemo(() => {
    if (submitError) return "failed";
    if (isSubmitting) return "generating";
    if (selectedTask?.status === "pending" || selectedTask?.status === "processing") return "generating";
    if (selectedTask?.status === "failed") return "failed";
    if (selectedTask?.status === "completed" && selectedTask.image) return "completed";
    return "idle_examples";
  }, [isSubmitting, selectedTask, submitError]);
  const showHistory = Boolean(submittedTaskId || selectedTaskId || isSubmitting);
  const isGuest = Boolean(authUser?.isGuest);

  function requestLoginForGeneration() {
    setSubmitError("请先登录");
    setIsSubmitting(false);
    onOpenAuth?.("login");
  }

  async function createTask(payload) {
    if (isGuest) {
      requestLoginForGeneration();
      return;
    }

    setActivePrompt(payload.prompt);
    setSubmitError("");
    setIsSubmitting(true);
    setSelectedTaskId(null);
    setIsHistoryOpen(false);
    setPreviewTask(null);
    writeImageGenerationSession({
      submittedTaskId: null,
      selectedTaskId: null,
      activePrompt: payload.prompt,
      isSubmitting: true,
      updatedAt: Date.now()
    });

    try {
      const task = await imageApi.createTask(payload);
      setSubmittedTaskId(task.id);
      setSelectedTaskId(task.id);
      writeImageGenerationSession({
        submittedTaskId: task.id,
        selectedTaskId: task.id,
        activePrompt: task.prompt || payload.prompt,
        isSubmitting: task.status === "pending" || task.status === "processing",
        updatedAt: Date.now()
      });
      if (task.status === "failed") {
        setIsSubmitting(false);
      }
    } catch (error) {
      setSubmitError(error.message || "创建生成任务失败");
      setIsSubmitting(false);
    }
  }

  async function deleteTask(id) {
    await imageApi.deleteTask(id);
    if (selectedTaskId === id) {
      setSelectedTaskId(null);
    }
    if (submittedTaskId === id) {
      setSubmittedTaskId(null);
      setActivePrompt("");
      clearImageGenerationSession();
    }
  }

  async function toggleFavorite(id) {
    await imageApi.toggleFavorite(id);
  }

  async function regenerateTask(id) {
    if (isGuest) {
      requestLoginForGeneration();
      return;
    }

    const source = cards.find((card) => card.id === id);
    if (source) {
      setActivePrompt(source.prompt);
    }
    setSubmitError("");
    setIsSubmitting(true);
    setIsHistoryOpen(false);
    setPreviewTask(null);
    writeImageGenerationSession({
      submittedTaskId: null,
      selectedTaskId: id,
      activePrompt: source?.prompt || activePrompt,
      isSubmitting: true,
      updatedAt: Date.now()
    });

    try {
      const created = await imageApi.regenerateTask(id);
      setSubmittedTaskId(created.id);
      setSelectedTaskId(created.id);
      writeImageGenerationSession({
        submittedTaskId: created.id,
        selectedTaskId: created.id,
        activePrompt: created.prompt || source?.prompt || activePrompt,
        isSubmitting: created.status === "pending" || created.status === "processing",
        updatedAt: Date.now()
      });
    } catch (error) {
      setSubmitError(error.message || "创建生成任务失败");
      setIsSubmitting(false);
    }
  }

  function revealGeneratedTask(task) {
    if (!task?.image) return;
    setFilter("all");
    setSelectedTaskId(task.id);
    setPreviewTask(task);
    setSubmittedTaskId(null);
    setActivePrompt("");
    clearImageGenerationSession();
  }

  return (
    <section className="image-gen-view video-gen-view-root">
      <div className="image-filter-tabs">
        <button className={filter === "inspiration" ? "selected" : ""} onClick={() => setFilter("inspiration")} type="button">
          <Sparkles size={17} />
          灵感
        </button>
        <button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")} type="button">全部结果</button>
        <button className={filter === "recent" ? "selected" : ""} onClick={() => setFilter("recent")} type="button">最近生成</button>
        <button className={filter === "favorite" ? "selected" : ""} onClick={() => setFilter("favorite")} type="button">
          <Star size={17} fill="#f8d545" color="#161616" />
          收藏
        </button>
        {credits && <span className="credits-chip">积分 {credits.balance}</span>}
      </div>
      {submitError && <div className="video-submit-error">{submitError}</div>}
      {hasActiveGeneration && <ImageGeneratingFeedState prompt={activeGenerationTask?.prompt || activePrompt} />}
      {!hasActiveGeneration && submittedTask?.status === "completed" && (
        <ImageCompletedNotice task={submittedTask} onReveal={revealGeneratedTask} />
      )}
      {galleryItems.length ? (
        <WaterfallGrid
          className={`image-results-feed ${hasActiveGeneration ? "is-generating" : ""}`}
          gap={6}
          maxColumns={6}
          items={galleryItems}
          renderItem={({ card, isExample }) => (
            <ResultCard
              card={card}
              isExample={isExample}
              isImageGallery
              isSelected={!isExample && selectedTaskId === card.id}
              onPreview={(task) => setPreviewTask(task)}
              onDelete={isExample ? () => {} : deleteTask}
              onFavorite={isExample ? () => {} : toggleFavorite}
              onRegenerate={isExample ? () => {} : regenerateTask}
            />
          )}
        />
      ) : !hasActiveGeneration ? (
        <div className="results-feed video-results-feed image-results-feed-empty">
          <div className="empty-results video-empty-results">暂无图片结果</div>
        </div>
      ) : null}
      {options.models.length > 0 && <ComposerBar options={options} onSubmit={createTask} />}
      <ImagePreviewLightbox task={previewTask} onClose={() => setPreviewTask(null)} />
    </section>
  );
}

const emptyVideoOptions = { models: [], ratios: [], durations: [], counts: [1], modes: [] };
const videoExampleCards = [
  {
    id: "example-video-1",
    status: "completed",
    model: "Veo 3.1 Fast",
    modelKey: "veo_3_1_fast",
    ratio: "16:9",
    duration: 8,
    time: "10:51",
    rmb: "约￥22.4",
    price: "2240 积分",
    prompt: "未来都市中，巨型怪兽与外骨骼机甲战士在高架桥下展开激烈战斗，建筑崩塌、火焰四起，画面具有电影级质感，冷暗色调，高速动态镜头。",
    video: "/assets/video/视频1.mp4?v=h264",
    favorite: false
  },
  {
    id: "example-video-2",
    status: "completed",
    model: "Kling 3.0 Std",
    modelKey: "kling_3_std",
    ratio: "16:9",
    duration: 6,
    time: "10:45",
    rmb: "约￥2.9",
    price: "294 积分",
    prompt: "古风仙侠男子，额间有精致花纹，一只黑蝶停在鼻尖后化作流光溢彩的金属面具覆于面部，随后在雾气弥漫的竹林中高速战斗，黑红配色，动作凌厉飘逸。",
    video: "/assets/video/视频2.mp4",
    favorite: false
  },
  {
    id: "example-video-3",
    status: "completed",
    model: "Veo 3.1 Lite",
    modelKey: "veo_3_1_lite",
    ratio: "16:9",
    duration: 8,
    time: "10:45",
    rmb: "约￥9.6",
    price: "960 积分",
    prompt: "唯美古风浪漫画面，女子眼眸中飞出一只发光的粉色蝴蝶，拖着长长的白色绸带，飞过盛开的樱花与飞檐翘角的古建筑，空中漂浮书法文字，色调柔和梦幻，粉白交织。",
    video: "/assets/video/视频3.mp4",
    favorite: false
  },
  {
    id: "example-video-4",
    status: "completed",
    model: "Kling 3.0 Pro",
    modelKey: "kling_3_pro",
    ratio: "9:16",
    duration: 10,
    time: "02:15",
    rmb: "约￥6.3",
    price: "630 积分",
    prompt: "沙漠废土风格的动漫战斗，绿发女子戴着巨型头骨面具，与手持散发紫色光芒长刀的黑发男子在沙尘中激烈交锋，动作充满张力，紫黑配色，烟尘飞扬。",
    video: "/assets/video/视频4.mp4",
    favorite: false
  },
  {
    id: "example-video-5",
    status: "completed",
    model: "Kling 3.0 Std",
    modelKey: "kling_3_std",
    ratio: "1:1",
    duration: 8,
    time: "12:24",
    rmb: "约￥3.9",
    price: "392 积分",
    prompt: "日系动画风格，身穿白衬衫校服的少年沉入深蓝色海底，阳光透过水面洒下光束，周围气泡升腾，少年伸手触碰发光水母，随后被巨大的漩涡卷入，画面静谧而神秘。",
    video: "/assets/video/视频5.mp4",
    favorite: false
  },
  {
    id: "example-video-6",
    status: "completed",
    model: "Veo 3.1 Fast",
    modelKey: "veo_3_1_fast",
    ratio: "9:16",
    duration: 8,
    time: "11:57",
    rmb: "约￥22.4",
    price: "2240 积分",
    prompt: "东方奇幻仙侠意境，两只通体透明发光的灵鹿在瀑布溪流与雾气缭绕的山林间奔跑跳跃，足下生辉，身上带有流光拖尾，穿梭于古建筑与密林之间，氛围空灵神秘，青绿色调。",
    video: "/assets/video/视频6.mp4",
    favorite: false
  }
];

function getVideoModelOptions(options, modelKey) {
  const selectedModel = options.models.find((item) => item.value === modelKey) || options.models[0];
  return {
    model: selectedModel,
    ratios: selectedModel?.ratios?.length ? selectedModel.ratios : options.ratios,
    durations: selectedModel?.durations?.length ? selectedModel.durations : options.durations
  };
}

function VideoPreview({ task }) {
  const isProcessing = task.status === "pending" || task.status === "processing";
  const isFailed = task.status === "failed";

  if (task.video && !isFailed) {
    return (
      <video src={task.video} controls playsInline preload="metadata" />
    );
  }

  return (
    <div className={`video-placeholder ${isFailed ? "is-failed" : ""}`}>
      {isProcessing ? <Loader2 size={24} /> : <Play size={34} fill="currentColor" />}
      {(isFailed || isProcessing) && <span>{isFailed ? "生成失败" : "生成中"}</span>}
    </div>
  );
}

function VideoResultCard({ card, onDelete, onFavorite, onRegenerate, isExample = false }) {
  return (
    <article className={`result-card video-result-card status-${card.status} ${isExample ? "is-example" : ""}`}>
      <div className="result-preview video-result-preview">
        <VideoPreview task={card} />
        <span className="video-duration-badge">{card.duration}s</span>
      </div>
      <div className="result-meta">
        <div className="tag-row">
          <span className="model-tag">{card.model}</span>
          <span className="ratio-tag">{card.ratio}</span>
          <span className="quality-tag">{card.duration}秒</span>
          <span className="count-tag">首帧</span>
        </div>
        <div className="time-row">
          <span>{card.time}</span>
          <strong>{card.rmb || card.price}</strong>
        </div>
        <p>{card.error || card.prompt}</p>
        <div className="card-actions">
          <button className={`icon-circle ${card.favorite ? "is-favorite" : ""}`} type="button" onClick={() => onFavorite(card.id)} aria-label="收藏" disabled={isExample}>
            <Star size={17} fill={card.favorite ? "#f8d545" : "none"} />
          </button>
          {card.video ? (
            <a className="card-action-link" href={card.video} download>
              <Download size={15} />
              下载
            </a>
          ) : (
            <button type="button" disabled>
              <Download size={15} />
              下载
            </button>
          )}
          <button type="button" onClick={() => onRegenerate(card.id)} disabled={isExample}>
            <RefreshCcw size={15} />
            再次生成
          </button>
          <button type="button" onClick={() => onDelete(card.id)} disabled={isExample}>
            <Trash2 size={15} />
            删除
          </button>
        </div>
      </div>
    </article>
  );
}

function VideoComposerBar({ options, onSubmit }) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(options.models[0]?.value || "");
  const modelOptions = getVideoModelOptions(options, model);
  const [ratio, setRatio] = useState(modelOptions.model?.defaultRatio || modelOptions.ratios[0] || "");
  const [duration, setDuration] = useState(modelOptions.model?.defaultDuration || modelOptions.durations[0] || "");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!model && options.models[0]) {
      setModel(options.models[0].value);
      return;
    }

    const nextOptions = getVideoModelOptions(options, model);
    if (nextOptions.model) {
      if (!nextOptions.ratios.includes(ratio)) setRatio(nextOptions.model.defaultRatio || nextOptions.ratios[0] || "");
      if (!nextOptions.durations.includes(Number(duration))) setDuration(nextOptions.model.defaultDuration || nextOptions.durations[0] || "");
    }
  }, [duration, model, options, ratio]);

  const count = 1;
  const price = videoApi.calculatePrice({ model, duration, count, models: options.models });
  const rmb = videoApi.calculateRmb({ model, duration, count, models: options.models });
  const canSubmit = prompt.trim().length > 0 && model && ratio && duration;

  function clearPrompt() {
    setPrompt("");
    setNotice("已清空提示词");
  }

  function fillRandomPrompt() {
    setPrompt(videoApi.getRandomPrompt());
    setNotice("已填入随机提示词");
  }

  function handleAddPrompt() {
    setNotice("当前视频生成暂不支持添加参考素材");
  }

  function submitPrompt() {
    if (!canSubmit) {
      setNotice("请先输入视频描述");
      return;
    }

    onSubmit({
      prompt: prompt.trim(),
      model,
      ratio,
      duration: Number(duration),
      mode: "first-frame",
      count
    });
    setNotice("已创建视频生成任务");
    setPrompt("");
  }

  return (
    <div className="sowa-composer video-composer" aria-label="视频生成输入框">
      <VideoPromptDialog
        ariaLabel="视频生成输入框"
        placeholder="请描述你想生成的视频..."
        value={prompt}
        onChange={(value) => {
          setPrompt(value);
          if (notice) setNotice("");
        }}
        onSubmit={submitPrompt}
        canSubmit={canSubmit}
        notice={notice}
        onAdd={handleAddPrompt}
        onRandom={fillRandomPrompt}
        onClear={clearPrompt}
        model={model}
        onModelChange={setModel}
        modelOptions={options.models}
        ratio={ratio}
        onRatioChange={setRatio}
        ratioOptions={modelOptions.ratios}
        duration={duration}
        onDurationChange={setDuration}
        durationOptions={modelOptions.durations}
        price={price}
        rmb={rmb}
      />
    </div>
  );
}

function VideoGenerationView({ authUser, onOpenAuth }) {
  const [filter, setFilter] = useState("all");
  const [cards, setCards] = useState([]);
  const [options, setOptions] = useState(emptyVideoOptions);
  const [credits, setCredits] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const isGuest = Boolean(authUser?.isGuest);

  function requestLoginForGeneration() {
    setSubmitError("请先登录");
    setIsSubmitting(false);
    onOpenAuth?.("login");
  }

  // 模块由外层保活挂载，此处始终订阅任务列表
  useEffect(() => {
    let mounted = true;
    videoApi.getModels().then((value) => mounted && setOptions(value));
    videoApi.getCredits().then((value) => mounted && setCredits(value));
    videoApi.getTasks({ filter }).then((value) => mounted && setCards(value));

    const unsubscribe = videoApi.subscribe(() => {
      videoApi.getTasks({ filter }).then((value) => mounted && setCards(value));
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [filter]);

  async function createTask(payload) {
    if (isGuest) {
      requestLoginForGeneration();
      return;
    }
    setSubmitError("");
    setIsSubmitting(true);
    try {
      await videoApi.createTask(payload);
    } catch (error) {
      setSubmitError(error.message || "创建视频生成任务失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteTask(id) {
    await videoApi.deleteTask(id);
  }

  async function toggleFavorite(id) {
    await videoApi.toggleFavorite(id);
  }

  async function regenerateTask(id) {
    if (isGuest) {
      requestLoginForGeneration();
      return;
    }
    setSubmitError("");
    setIsSubmitting(true);
    try {
      await videoApi.regenerateTask(id);
    } catch (error) {
      setSubmitError(error.message || "创建视频生成任务失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="image-gen-view video-gen-view-root">
      <div className="image-filter-tabs">
        <button className={filter === "all" ? "selected" : ""} onClick={() => setFilter("all")} type="button">全部结果</button>
        <button className={filter === "recent" ? "selected" : ""} onClick={() => setFilter("recent")} type="button">最近生成</button>
        <button className={filter === "favorite" ? "selected" : ""} onClick={() => setFilter("favorite")} type="button">
          <Star size={17} fill="#f8d545" color="#161616" />
          收藏
        </button>
        {credits && <span className="credits-chip">积分 {credits.balance}</span>}
      </div>
      {submitError && <div className="video-submit-error">{submitError}</div>}
      <div className="results-feed video-results-feed">
        {filter === "all" ? (
          <>
            {videoExampleCards.map((card) => (
              <VideoResultCard
                card={card}
                key={card.id}
                isExample
                onDelete={() => {}}
                onFavorite={() => {}}
                onRegenerate={() => {}}
              />
            ))}
            {cards.map((card) => (
              <VideoResultCard
                card={card}
                key={card.id}
                onDelete={deleteTask}
                onFavorite={toggleFavorite}
                onRegenerate={regenerateTask}
              />
            ))}
          </>
        ) : (
          cards.length ? cards.map((card) => (
            <VideoResultCard
              card={card}
              key={card.id}
              onDelete={deleteTask}
              onFavorite={toggleFavorite}
              onRegenerate={regenerateTask}
            />
          )) : <div className="empty-results video-empty-results">暂无视频结果</div>
        )}
        {isSubmitting && (
          <VideoResultCard
            card={{
              id: "submitting",
              status: "processing",
              model: "创建中",
              ratio: "16:9",
              duration: 8,
              time: "--:--",
              rmb: null,
              price: "计算中",
              prompt: "正在提交视频生成任务",
              favorite: false
            }}
            onDelete={() => {}}
            onFavorite={() => {}}
            onRegenerate={() => {}}
          />
        )}
      </div>
      {options.models.length > 0 && <VideoComposerBar options={options} onSubmit={createTask} />}
    </section>
  );
}

const emptyChatOptions = { models: [], reasoningEfforts: [], defaultModel: "" };
const chatContextRoles = new Set(["system", "user", "assistant"]);

function toChatContext(messages) {
  return messages
    .filter((message) => (
      message.status !== "failed" &&
      chatContextRoles.has(message.role) &&
      (message.content?.trim() || message.attachments?.length)
    ))
    .map((message) => ({
      role: message.role,
      content: message.content?.trim() || "",
      attachments: message.attachments || []
    }));
}

function formatChatAttachmentSize(bytes = 0) {
  if (!bytes || Number.isNaN(Number(bytes))) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function ChatAttachmentList({ attachments = [], onRemove, isStatic = false }) {
  if (!attachments.length) return null;

  return (
    <div className="chat-attachment-list">
      {attachments.map((attachment, index) => (
        <div className={`chat-attachment-card ${isStatic ? "is-static" : ""}`} key={attachment.id || attachment.url || index}>
          <span className="chat-attachment-preview">
            {attachment.kind === "image" && attachment.url ? (
              <img src={attachment.url} alt="" />
            ) : (
              <FileText size={14} />
            )}
          </span>
          <span className="chat-attachment-meta">
            <strong title={attachment.originalName || "attachment"}>{attachment.originalName || "attachment"}</strong>
            <small>{formatChatAttachmentSize(attachment.size)}</small>
          </span>
          {!isStatic && (
            <button type="button" onClick={() => onRemove?.(index)} aria-label="移除附件">
              <X size={11} />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

function appendChatStreamChunk(current = "", chunk = "") {
  if (!chunk) return current;
  if (!current) return chunk;
  if (chunk === current) return current;
  if (chunk.startsWith(current)) return chunk;

  const maxOverlap = Math.min(current.length, chunk.length);
  for (let size = maxOverlap; size > 0; size -= 1) {
    if (current.endsWith(chunk.slice(0, size))) {
      return `${current}${chunk.slice(size)}`;
    }
  }

  return `${current}${chunk}`;
}

function ChatCanvas({ messages, isSubmitting, error }) {
  const hasStreamingMessage = messages.some((message) => message.status === "streaming");
  if (!messages.length && !isSubmitting && !error) {
    return (
      <div className="chat-main-canvas">
        <div className="chat-empty-state llm-empty-state">
          <h1>释放你的创作灵感</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-main-canvas" aria-live="polite">
      <div className="chat-conversation-thread">
        {messages.map((message) => (
          <div className={`chat-message-row ${message.role}`} key={message.id}>
            {message.role === "assistant" && (
              <span className={`chat-message-avatar ${message.status === "failed" ? "is-error" : ""}`}>
                <Bot size={17} />
              </span>
            )}
            <div className={`chat-message-bubble ${message.status === "failed" ? "is-error" : ""} ${message.status === "streaming" ? "is-streaming" : ""}`}>
              {message.status === "failed" ? (
                <>
                  <strong>这次没有回复成功</strong>
                  <p>{message.error || "对话服务暂时不可用，请稍后重试。"}</p>
                </>
              ) : (
                <>
                  {message.content || (message.status === "streaming" ? "正在思考..." : "")}
                  <ChatAttachmentList attachments={message.attachments || []} isStatic />
                  {message.points > 0 && <small className="chat-message-cost">{message.price || `${message.points} 积分`}</small>}
                </>
              )}
            </div>
          </div>
        ))}
        {isSubmitting && !hasStreamingMessage && (
          <div className="chat-message-row assistant">
            <span className="chat-message-avatar">
              <Bot size={17} />
            </span>
            <div className="chat-message-bubble is-loading">
              <Loader2 size={17} />
              <span>正在鎬濊€?..</span>
            </div>
          </div>
        )}
        {error && (
          <div className="chat-inline-error" role="alert">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}

function ChatComposerBar({ options, onSubmit, isSubmitting, model, onModelChange, reasoningEffort, onReasoningEffortChange }) {
  const [prompt, setPrompt] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [notice, setNotice] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const attachmentInputRef = useRef(null);

  const isReady = options.models.length > 0;
  const selectedModel = options.models.find((item) => item.value === model) || options.models[0];
  const canSubmit = isReady && (prompt.trim().length > 0 || attachments.length > 0) && model && !isSubmitting && !isUploadingAttachment;
  const modelLabel = isReady ? selectedModel?.label || "Deepseek V4" : "模型加载中";

  async function handleAttachmentSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (attachments.length >= 5) {
      setNotice("单次最多上传 5 个附件。");
      event.target.value = "";
      return;
    }

    setIsUploadingAttachment(true);
    setNotice("");
    try {
      const uploaded = await chatApi.uploadAttachment(file);
      setAttachments((current) => [...current, {
        id: uploaded.id || uploaded.url,
        url: uploaded.url,
        originalName: uploaded.originalName || file.name,
        mimeType: uploaded.mimeType || file.type,
        size: uploaded.size || file.size,
        kind: uploaded.kind || (file.type.startsWith("image/") ? "image" : "file")
      }]);
    } catch (error) {
      setNotice(error.message || "附件上传失败，请重试。");
    } finally {
      setIsUploadingAttachment(false);
      event.target.value = "";
    }
  }

  function removeAttachment(index) {
    setAttachments((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setNotice("");
  }

  function submitPrompt() {
    if (!canSubmit) {
      setNotice(isUploadingAttachment ? "附件上传完成后再发送。" : "请输入内容或上传附件后再发送。");
      return;
    }

    onSubmit({
      content: prompt.trim(),
      model,
      reasoningEffort,
      attachments
    });
    setPrompt("");
    setAttachments([]);
    setNotice("");
  }

  return (
    <div className="llm-composer chat-composer" aria-label="大模型输入框">
      <input
        ref={attachmentInputRef}
        type="file"
        hidden
        accept="image/jpeg,image/png,image/webp,application/pdf,text/plain,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleAttachmentSelect}
      />
      <textarea
        className="llm-input"
        value={prompt}
        onChange={(event) => {
          setPrompt(event.target.value);
          if (notice) setNotice("");
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submitPrompt();
          }
        }}
        placeholder={isReady ? "请告诉我您的想法......" : "正在加载对话模型..."}
      />
      <ChatAttachmentList attachments={attachments} onRemove={removeAttachment} />
      <div className="llm-toolbar">
        <div className="llm-left">
          <button
            className="llm-square"
            type="button"
            disabled={!isReady || isSubmitting || isUploadingAttachment || attachments.length >= 5}
            onClick={() => attachmentInputRef.current?.click()}
            aria-label="上传附件"
            title="上传附件"
          >
            {isUploadingAttachment ? <Loader2 size={16} /> : <Plus size={16} />}
          </button>
          <div className={`llm-select-wrap ${openMenu === "model" ? "is-open" : ""}`}>
            <button className="llm-select" type="button" disabled={!isReady} onClick={() => setOpenMenu((current) => (current === "model" ? null : "model"))}>
              <span>{modelLabel}</span>
              <ChevronDown size={16} />
            </button>
            <div className="llm-menu">
              {options.models.map((item) => (
                <button
                  type="button"
                  key={item.value}
                  className={item.value === model ? "is-selected" : ""}
                  onClick={() => {
                    onModelChange(item.value);
                    setOpenMenu(null);
                  }}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="llm-right">
          {options.reasoningEfforts.length > 0 && (
            <CustomSelect
              ariaLabel="推理强度"
              className="llm-reasoning-select"
              value={reasoningEffort}
              onChange={onReasoningEffortChange}
              options={options.reasoningEfforts}
            />
          )}
          <button className="llm-round primary" type="button" disabled={!canSubmit} onClick={submitPrompt} aria-label="发送">
            {isSubmitting ? <Loader2 size={18} /> : <Send size={18} />}
          </button>
        </div>
      </div>
      {notice && <div className="composer-notice warning">{notice}</div>}
    </div>
  );
}

function ChatHistoryRail({ conversations, activeConversationId, onSelect }) {
  if (!conversations.length) return null;

  return (
    <aside className="history-rail chat-history-rail" aria-label="AI 瀵硅瘽历史">
      <div className="history-rail-header">
        <span>历史瀵硅瘽</span>
        <strong>{conversations.length}</strong>
      </div>
      <div className="history-list chat-history-list">
        {conversations.map((conversation) => (
          <button
            className={`chat-history-item ${activeConversationId === conversation.id ? "is-selected" : ""}`}
            key={conversation.id}
            type="button"
            onClick={() => onSelect(conversation.id)}
          >
            <span>{conversation.title}</span>
            <small>{conversation.model} 璺?{conversation.time}</small>
          </button>
        ))}
      </div>
    </aside>
  );
}

function ChatGenerationView({ authUser, onOpenAuth }) {
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [options, setOptions] = useState(emptyChatOptions);
  const [credits, setCredits] = useState(null);
  const [conversationId, setConversationId] = useState(null);
  const [selectedModel, setSelectedModel] = useState("");
  const [selectedReasoningEffort, setSelectedReasoningEffort] = useState("none");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const isGuest = Boolean(authUser?.isGuest);

  // 模块由外层保活挂载，此处始终拉取对话配置与历史列表。
  useEffect(() => {
    let mounted = true;
    chatApi.getModels().then((value) => mounted && setOptions(value)).catch((error) => mounted && setSubmitError(error.message));
    chatApi.getCredits().then((value) => mounted && setCredits(value)).catch(() => {});
    chatApi.getConversations().then((value) => mounted && setConversations(value)).catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const defaultModel = options.defaultModel || options.models[0]?.value || "";
    const hasSelectedModel = options.models.some((item) => item.value === selectedModel);
    if (defaultModel && (!selectedModel || !hasSelectedModel)) {
      setSelectedModel(defaultModel);
    }
    const hasSelectedReasoningEffort = options.reasoningEfforts.some((item) => item.value === selectedReasoningEffort);
    if (options.reasoningEfforts[0]?.value && (!selectedReasoningEffort || !hasSelectedReasoningEffort)) {
      setSelectedReasoningEffort(options.reasoningEfforts[0].value);
    }
  }, [options, selectedModel, selectedReasoningEffort]);

  async function sendChatMessage({ content, model, reasoningEffort, attachments = [] }) {
    if (isGuest) {
      setSubmitError("请先登录");
      onOpenAuth?.("login");
      return;
    }

    const localId = Date.now();
    const userMessage = {
      id: `local-${localId}`,
      role: "user",
      content,
      attachments,
      status: "completed"
    };
    const streamingMessage = {
      id: `stream-${localId}`,
      role: "assistant",
      content: "",
      status: "streaming"
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setSubmitError("");
    setIsSubmitting(true);

    try {
      setMessages([...nextMessages, streamingMessage]);
      const result = await chatApi.streamMessage({
        conversationId,
        model,
        reasoningEffort,
        messages: toChatContext(nextMessages)
      }, {
        onDelta: (delta) => {
          setMessages((current) => current.map((message) => (
            message.id === streamingMessage.id
              ? { ...message, content: appendChatStreamChunk(message.content, delta) }
              : message
          )));
        }
      });
      setConversationId(result.conversationId);
      setMessages((current) => current.map((message) => (
        message.id === streamingMessage.id ? result.message : message
      )));
      if (result.credits) setCredits(result.credits);
      chatApi.getConversations().then(setConversations).catch(() => {});
    } catch (error) {
      setMessages((current) => current.map((message) => (
        message.id === streamingMessage.id
          ? { ...message, status: "failed", error: error.message || "发送失败" }
          : message
      )));
      setSubmitError(error.message || "发送失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  function startNewConversation() {
    setMessages([]);
    setConversationId(null);
    setSubmitError("");
    setIsHistoryOpen(false);
  }

  async function selectConversation(id) {
    setSubmitError("");
    setConversationId(id);
    setIsHistoryOpen(false);
    try {
      const historyMessages = await chatApi.getMessages(id);
      setMessages(historyMessages);
  } catch (error) {
      setSubmitError(error.message || "加载历史对话失败");
    }
  }

  const isIntroState = !messages.length && !isSubmitting && !submitError;
  const composer = (
    <ChatComposerBar
      options={options}
      onSubmit={sendChatMessage}
      isSubmitting={isSubmitting}
      model={selectedModel}
      onModelChange={setSelectedModel}
      reasoningEffort={selectedReasoningEffort}
      onReasoningEffortChange={setSelectedReasoningEffort}
    />
  );

  return (
    <section className={`chat-view-root ${isIntroState ? "is-intro" : ""}`}>
      <div className="chat-topbar">
        <h1>大模型</h1>
        {credits && <span className="credits-chip">积分 {credits.balance}</span>}
      </div>
      <div className="chat-content-layout">
        <div className="chat-dialog-column">
          {isIntroState ? (
            <div className="llm-intro-layout">
              <ChatCanvas messages={messages} isSubmitting={isSubmitting} error={submitError} />
              {composer}
            </div>
          ) : (
            <>
              <ChatCanvas messages={messages} isSubmitting={isSubmitting} error={submitError} />
              {composer}
            </>
          )}
        </div>
        <aside className="chat-actions-panel" aria-label="对话操作">
          {conversations.length > 0 && (
            <>
              <button className="chat-new-conversation-button" type="button" onClick={startNewConversation} disabled={isSubmitting}>
                <Plus size={16} />
                新建对话
              </button>
              <button className={`history-toggle ${isHistoryOpen ? "is-open" : ""}`} type="button" onClick={() => setIsHistoryOpen((value) => !value)}>
                <Layers size={17} />
                历史
                <span>{conversations.length}</span>
              </button>
            </>
          )}
          {isHistoryOpen && (
            <ChatHistoryRail
              conversations={conversations}
              activeConversationId={conversationId}
              onSelect={selectConversation}
            />
          )}
        </aside>
      </div>
    </section>
  );
}

const emptyDigitalHumanOptions = { models: [], defaults: { model: "", driveMode: "text" } };
const digitalHumanMaxAudioMs = 15000;
const ttsEmotionOptions = [
  { value: "", label: "自动" },
  { value: "calm", label: "平静" },
  { value: "happy", label: "开心" },
  { value: "sad", label: "悲伤" },
  { value: "angry", label: "愤怒" },
  { value: "fearful", label: "害怕" },
  { value: "disgusted", label: "厌恶" },
  { value: "surprised", label: "惊讶" }
];

function formatDurationMs(durationMs = 0) {
  return `${(Number(durationMs || 0) / 1000).toFixed(1)} 秒`;
}

function getDigitalHumanPreviewSignature({ text, voiceId, speed, volume, pitch, emotion }) {
  return JSON.stringify({
    text: String(text || "").trim(),
    voiceId,
    speed: Number(speed),
    volume: Number(volume),
    pitch: Number(pitch),
    emotion: emotion || ""
  });
}

const digitalHumanPublicPlaceholders = [
  { id: "public-anchor-dialogue", name: "主播对话", description: "适合主播对话、讲解与短视频口播内容。", language: "中文 / 通用", status: "ready", cover: "/assets/video/视频1.mp4?v=h264" },
  { id: "public-product", name: "产品讲解员", description: "适合产品介绍、卖点说明与功能演示。", language: "中文 / 通用", status: "ready", cover: "/assets/video/视频2.mp4" },
  { id: "public-medical", name: "健康科普官", description: "适合健康科普、知识普及与专业解读。", language: "中文 / 通用", status: "ready", cover: "/assets/video/视频3.mp4" },
  { id: "public-home-lady", name: "居家知性女性", description: "适合生活方式分享、日常推荐与轻内容表达。", language: "中文 / 通用", status: "ready", cover: "/assets/video/视频4.mp4" },
  { id: "public-real-estate", name: "房地产经纪人", description: "适合楼盘介绍、房产讲解与销售咨询。", language: "中文 / 通用", status: "ready", cover: "/assets/video/视频5.mp4" },
  { id: "public-travel", name: "文旅推荐官", description: "适合景点推荐、路线介绍与文旅宣传。", language: "中文 / 通用", status: "ready", cover: "/assets/video/视频6.mp4" },
  { id: "public-fashion-host", name: "时尚类女主播", description: "适合穿搭分享、时尚推荐与美妆内容。", language: "中文 / 通用", status: "ready", cover: "/assets/video/视频1.mp4?v=h264" },
  { id: "public-knowledge-host", name: "知识科普类女主播", description: "适合知识讲解、课程节选与信息梳理。", language: "中文 / 通用", status: "ready", cover: "/assets/video/视频2.mp4" },
  { id: "public-executive-lady", name: "职场女高管", description: "适合商务汇报、管理观点与职业表达。", language: "中文 / 通用", status: "ready", cover: "/assets/video/视频3.mp4" },
  { id: "public-business-host", name: "职场轻商务女主播", description: "适合企业宣传、职场分享与品牌内容。", language: "中文 / 通用", status: "ready", cover: "/assets/video/视频4.mp4" },
  { id: "public-finance", name: "财经主播", description: "适合财经解读、市场观察与资讯播报。", language: "中文 / 通用", status: "ready", cover: "/assets/video/视频5.mp4" },
  { id: "public-operations", name: "运营达人", description: "适合活动运营、增长案例与方法分享。", language: "中文 / 通用", status: "ready", cover: "/assets/video/视频6.mp4" }
];

function getDigitalHumanPublicAvatars(list = []) {
  const merged = new Map();
  digitalHumanPublicPlaceholders.forEach((item) => merged.set(item.id, item));
  list.forEach((item) => {
    const fallback = merged.get(item.id) || {};
    merged.set(item.id, {
      ...fallback,
      ...item,
      cover: item.cover || item.assetPath || item.imagePath || item.posterPath || fallback.cover
    });
  });
  return [...merged.values()];
}

function DigitalHumanEmptyMedia({ title, description, icon: Icon = UserRound }) {
  return (
    <div className="dh-empty-media">
      <span className="dh-empty-media-icon">
        <Icon size={24} />
      </span>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}

function DigitalHumanAvatarCard({ avatar, selected, onSelect, onPreview, onRename, onDelete, mine = false }) {
  const isTraining = avatar.status === "training";
  const isVideoCover = /\.(mp4|webm|mov)$/i.test(avatar.cover || "");
  return (
    <article className={`dh-avatar-card ${selected ? "is-selected" : ""} ${isTraining ? "is-training" : ""}`}>
      <button className="dh-avatar-cover" type="button" onClick={() => onSelect(avatar)} aria-label={`选择 ${avatar.name}`}>
        {isVideoCover ? (
          <video src={avatar.cover} muted loop playsInline preload="metadata" onMouseEnter={(event) => event.currentTarget.play()} onMouseLeave={(event) => event.currentTarget.pause()} />
        ) : avatar.cover ? (
          <img src={avatar.cover} alt={avatar.name} />
        ) : (
          <DigitalHumanEmptyMedia title="形象素材位" description="等待补充数字人视频或封面" />
        )}
        <span className="dh-avatar-badge">{selected ? "已选中" : isTraining ? "训练中" : avatar.cover ? "模板" : "占位"}</span>
      </button>
      <div className="dh-avatar-info">
        <strong>{avatar.name}</strong>
        <span>{avatar.language}</span>
        <p>{avatar.description}</p>
      </div>
      <div className="dh-avatar-actions">
        <button type="button" onClick={() => onPreview(avatar)}>
          <Play size={14} />
          预览
        </button>
        {mine && (
          <>
            <button type="button" onClick={() => onRename(avatar)}>
              <FileText size={14} />
              改名
            </button>
            <button type="button" onClick={() => onDelete(avatar.id)}>
              <Trash2 size={14} />
              删除
            </button>
          </>
        )}
      </div>
    </article>
  );
}

function DigitalHumanAvatarPreviewModal({ avatar, onClose }) {
  const isVideoCover = /\.(mp4|webm|mov)$/i.test(avatar?.cover || "");

  if (!avatar) return null;

  return (
    <div className="dh-modal-backdrop" role="dialog" aria-modal="true">
      <div className="dh-avatar-preview-modal">
        <div className="dh-modal-header">
          <div>
            <span>形象预览</span>
            <strong>{avatar.name}</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭">关闭</button>
        </div>
        <div className="dh-avatar-preview-body">
          {isVideoCover ? (
            <video src={avatar.cover} controls autoPlay playsInline />
          ) : avatar.cover ? (
            <img src={avatar.cover} alt={avatar.name} />
          ) : (
            <DigitalHumanEmptyMedia title="暂无预览素材" description="等待补充数字人视频或封面" />
          )}
        </div>
      </div>
    </div>
  );
}

function DigitalHumanTaskCard({ task, selected, onSelect, onDelete, onRegenerate }) {
  const isProcessing = task.status === "processing" || task.status === "pending";
  const isCompleted = task.status === "completed";
  const isFailed = task.status === "failed";
  return (
    <article className={`dh-task-card ${selected ? "is-selected" : ""}`}>
      <button className="dh-task-preview" type="button" onClick={() => onSelect(task)}>
        {task.resultUrl ? (
          <video src={task.resultUrl} muted playsInline preload="metadata" />
        ) : task.thumbnailUrl ? <img src={task.thumbnailUrl} alt={task.avatarName} /> : (
          <DigitalHumanEmptyMedia
            icon={Video}
            title={isFailed ? "生成失败" : isCompleted ? "结果待返回" : "生成中"}
            description={isFailed ? task.error || "任务失败，积分已退回" : isCompleted ? "点击查看生成结果" : `${task.progress || 0}%`}
          />
        )}
      </button>
      <div className="dh-task-meta">
        <strong>{task.avatarName}</strong>
        <span>{task.voiceName} 路 {task.driveMode === "audio" ? "音频驱动" : "文本驱动"} 路 {task.providerModel || "KIE Wan 2.7"}</span>
        <div className="dh-progress-track">
          <i style={{ width: `${task.progress || 0}%` }} />
        </div>
        <small>{task.createdAt}</small>
      </div>
      <div className="dh-task-actions">
        <button type="button" onClick={() => onRegenerate(task.id)} disabled={isProcessing}>
          <RefreshCcw size={14} />
        </button>
        <button type="button" onClick={() => onDelete(task.id)}>
          <Trash2 size={14} />
        </button>
      </div>
    </article>
  );
}

function DigitalHumanGeneratingState({ task }) {
  return (
    <div className="dh-generating-state">
      <span className="dh-spinner" aria-hidden="true" />
      <strong>正在生成口型视频</strong>
      <p>MiniMax 已生成驱动音频，KIE 正在合成数字人口播成片。</p>
      <div className="dh-generation-progress">
        <i style={{ width: `${task?.progress || 0}%` }} />
      </div>
      <small>{task?.progress || 0}% · 完成后会自动回填到这里</small>
    </div>
  );
}

function DigitalHumanCreateAvatarModal({ onClose, onCreate, isSubmitting }) {
  const fileInputRef = useRef(null);
  const [name, setName] = useState("");
  const [file, setFile] = useState(null);
  const [notice, setNotice] = useState("");

  function submit() {
    if (!name.trim()) {
      setNotice("请输入形象名称");
      return;
    }
    if (!file) {
      setNotice("请选择视频素材，当前只记录文件名作为占位。");
      return;
    }
    onCreate({ name: name.trim(), fileName: file.name });
  }

  return (
    <div className="dh-modal-backdrop" role="dialog" aria-modal="true">
      <div className="dh-modal">
        <div className="dh-modal-header">
          <div>
            <span>创建形象</span>
            <strong>预留训练素材入口</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭">关闭</button>
        </div>
        <div className="dh-modal-body">
          <label className="dh-field">
            <span>形象名称</span>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="例如：产品讲解员" />
          </label>
          <button className="dh-upload-zone" type="button" onClick={() => fileInputRef.current?.click()}>
            <input ref={fileInputRef} type="file" accept="video/*" hidden onChange={(event) => {
              setFile(event.target.files?.[0] || null);
              event.target.value = "";
            }} />
            {file && (
              <span
                className="upload-clear-button"
                role="button"
                tabIndex={0}
                title="取消上传"
                aria-label="取消上传"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setFile(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    event.stopPropagation();
                    setFile(null);
                  }
                }}
              >
                <X size={13} />
              </span>
            )}
            <Video size={24} />
            <strong>{file ? file.name : "选择数字人训练视频"}</strong>
            <span>{file ? "素材会在真实接口接入后上传" : "当前不上载文件，只保留 UI 和 API 结构"}</span>
          </button>
          {notice && <div className="dh-form-notice">{notice}</div>}
        </div>
        <div className="dh-modal-footer">
          <button type="button" onClick={onClose}>取消</button>
          <button type="button" onClick={submit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={16} /> : <Plus size={16} />}
            创建形象
          </button>
        </div>
      </div>
    </div>
  );
}

function DigitalHumanConfigPanel({ options, voices, selectedAvatar, onSubmit, isSubmitting }) {
  const audioInputRef = useRef(null);
  const [driveMode, setDriveMode] = useState("text");
  const [text, setText] = useState("大家好，欢迎来到我们的 AI 创作平台。今天我将为您介绍全新的数字人功能。");
  const [audioFile, setAudioFile] = useState(null);
  const [model, setModel] = useState(options.defaults?.model || options.models[0]?.value || "");
  const [voiceId, setVoiceId] = useState(voices[0]?.id || "");
  const [ttsSpeed, setTtsSpeed] = useState(1);
  const [ttsVolume, setTtsVolume] = useState(1);
  const [ttsPitch, setTtsPitch] = useState(0);
  const [ttsEmotion, setTtsEmotion] = useState("");
  const [isDesigningVoice, setIsDesigningVoice] = useState(false);
  const [voicePreviewUrl, setVoicePreviewUrl] = useState("");
  const [voicePreviewInfo, setVoicePreviewInfo] = useState(null);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!model && (options.defaults?.model || options.models[0]?.value)) {
      setModel(options.defaults?.model || options.models[0].value);
    }
    if (!voiceId && voices[0]?.id) setVoiceId(voices[0].id);
  }, [model, options, voiceId, voices]);

  const selectedModel = options.models.find((item) => item.value === model) || options.models[0];
  const selectedVoice = voices.find((item) => item.id === voiceId) || voices[0];
  const estimate = Math.max(1, Math.ceil(text.length / 180));
  const selectedAvatarIsVideo = /\.(mp4|webm|mov)$/i.test(selectedAvatar?.cover || "");
  const currentPreviewSignature = getDigitalHumanPreviewSignature({
    text,
    voiceId,
    speed: ttsSpeed,
    volume: ttsVolume,
    pitch: ttsPitch,
    emotion: ttsEmotion
  });
  const isPreviewCurrent = voicePreviewInfo?.signature === currentPreviewSignature;
  const currentAudioTooLong = isPreviewCurrent && voicePreviewInfo.durationMs > digitalHumanMaxAudioMs;

  async function previewVoice() {
    if (!text.trim()) {
      setNotice("请输入用于试听的文本脚本");
      return;
    }
    setNotice("");
    setIsDesigningVoice(true);
    try {
      const result = await digitalHumanApi.previewVoice({
        previewText: text.trim(),
        voiceId,
        speed: ttsSpeed,
        volume: ttsVolume,
        pitch: ttsPitch,
        emotion: ttsEmotion
      });
      if (result.audioDataUrl) setVoicePreviewUrl(result.audioDataUrl);
      const durationMs = Number(result.durationMs || 0);
      setVoicePreviewInfo({
        signature: currentPreviewSignature,
        durationMs,
        videoDuration: result.videoDuration || Math.ceil(durationMs / 1000)
      });
      setNotice(
        durationMs > digitalHumanMaxAudioMs
          ? `当前音频 ${formatDurationMs(durationMs)}，超过 15 秒，请缩短文本或切片后分段生成`
          : `已生成当前音色试听，视频时长将按音频反推为 ${result.videoDuration || Math.ceil(durationMs / 1000)} 秒`
      );
    } catch (error) {
      setNotice(error.message || "音色试听失败");
    } finally {
      setIsDesigningVoice(false);
    }
  }

  function submit() {
    if (!selectedAvatar) {
      setNotice("请先选择数字人形象");
      return;
    }
    if (driveMode === "text" && !text.trim()) {
      setNotice("请输入文本脚本");
      return;
    }
    if (driveMode === "audio" && !audioFile) {
      setNotice("请上传音频文件");
      return;
    }
    if (!voicePreviewInfo || !isPreviewCurrent) {
      setNotice("请先试听当前音色，系统会根据试听音频时长反推视频时长");
      return;
    }
    if (voicePreviewInfo.durationMs > digitalHumanMaxAudioMs) {
      setNotice(`当前音频 ${formatDurationMs(voicePreviewInfo.durationMs)}，超过 15 秒，请缩短文本或切片后分段生成`);
      return;
    }
    setNotice("");
    onSubmit({
      avatarId: selectedAvatar.id,
      avatarName: selectedAvatar.name,
      driveMode,
      text,
      audioName: audioFile?.name || "",
      voiceId,
      model,
      speed: ttsSpeed,
      volume: ttsVolume,
      pitch: ttsPitch,
      emotion: ttsEmotion
    });
  }

  return (
    <aside className="dh-config-panel">
      <div className="dh-config-header">
        <strong>数字人口播成片</strong>
      </div>
      <DigitalHumanShowcaseCard
        selectedAvatar={selectedAvatar}
        selectedAvatarIsVideo={selectedAvatarIsVideo}
        driveMode={driveMode}
        textLength={text.length}
        estimateMinutes={estimate}
        selectedVoiceName={selectedVoice?.name}
        selectedModelLabel={selectedModel?.label || selectedModel?.value}
        isSubmitting={isSubmitting}
      />
      <div className="dh-mode-tabs">
        <button className={driveMode === "text" ? "is-active" : ""} type="button" onClick={() => setDriveMode("text")}>文本驱动</button>
        <button type="button" disabled title="音频驱动将在第二阶段接入">音频驱动</button>
      </div>
      {driveMode === "text" ? (
        <label className="dh-field dh-script-field">
          <span>文本脚本 <small>{text.length} / 2000 字 · 预计 {estimate} 分钟</small></span>
          <textarea value={text} maxLength={2000} onChange={(event) => setText(event.target.value)} placeholder="请输入数字人要说的话..." />
        </label>
      ) : (
        <button className="dh-audio-upload" type="button" onClick={() => audioInputRef.current?.click()}>
          <input ref={audioInputRef} type="file" accept="audio/*" hidden onChange={(event) => {
            setAudioFile(event.target.files?.[0] || null);
            event.target.value = "";
          }} />
          {audioFile && (
            <span
              className="upload-clear-button"
              role="button"
              tabIndex={0}
              title="取消上传"
              aria-label="取消上传"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setAudioFile(null);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  event.stopPropagation();
                  setAudioFile(null);
                }
              }}
            >
              <X size={13} />
            </span>
          )}
          <Mic size={22} />
          <strong>{audioFile ? audioFile.name : "上传驱动音频"}</strong>
          <span>{audioFile ? "已选择，真实接口接入后上传" : "限制 3 分钟以内，当前为占位"}</span>
        </button>
      )}
      <label className="dh-field">
        <span>成片模型</span>
        <CustomSelect
          className="custom-select-theme-dh"
          ariaLabel="成片模型"
          value={model}
          onChange={setModel}
          options={options.models}
        />
        {selectedModel && <small>调用模型：{selectedModel.providerModel || selectedModel.value} · {selectedModel.resolution || "720p"}</small>}
      </label>
      <label className="dh-field">
        <span>音色</span>
        <CustomSelect
          className="custom-select-theme-dh"
          ariaLabel="音色"
          value={voiceId}
          onChange={setVoiceId}
          options={voices.map((item) => ({ value: item.id, label: item.name }))}
        />
        {selectedVoice && <small>{selectedVoice.description}</small>}
      </label>
      <div className="dh-settings-group">
        <div className="dh-minimax-options">
          <div className="dh-minimax-options-head">
            <span>MiniMax TTS 参数</span>
            <strong>音量、语速、音调与情绪</strong>
          </div>
          <label className="dh-field">
            <span>音色情绪</span>
            <CustomSelect className="custom-select-theme-dh" ariaLabel="音色情绪" value={ttsEmotion} onChange={setTtsEmotion} options={ttsEmotionOptions} />
          </label>
          <label className="dh-range-field">
            <span>语速 <small>{ttsSpeed.toFixed(2)}x</small></span>
            <input type="range" min="0.5" max="2" step="0.05" value={ttsSpeed} onChange={(event) => setTtsSpeed(Number(event.target.value))} />
          </label>
          <label className="dh-range-field">
            <span>音量 <small>{ttsVolume.toFixed(1)}</small></span>
            <input type="range" min="0.1" max="10" step="0.1" value={ttsVolume} onChange={(event) => setTtsVolume(Number(event.target.value))} />
          </label>
          <label className="dh-range-field">
            <span>音调 <small>{ttsPitch > 0 ? `+${ttsPitch}` : ttsPitch}</small></span>
            <input type="range" min="-12" max="12" step="1" value={ttsPitch} onChange={(event) => setTtsPitch(Number(event.target.value))} />
          </label>
        </div>
        <button className="dh-design-voice-button" type="button" onClick={previewVoice} disabled={isDesigningVoice}>
          {isDesigningVoice ? <Loader2 size={16} /> : <Mic size={16} />}
          试听当前音色
        </button>
        {voicePreviewUrl && <audio className="dh-voice-preview" src={voicePreviewUrl} controls />}
        <div className={`dh-duration-check ${currentAudioTooLong ? "is-warning" : isPreviewCurrent ? "is-ready" : ""}`}>
          {isPreviewCurrent ? (
            <span>
              当前音频 {formatDurationMs(voicePreviewInfo.durationMs)}
              {currentAudioTooLong ? "，超过 15 秒，需要切片" : `，视频将生成 ${voicePreviewInfo.videoDuration} 秒`}
            </span>
          ) : (
            <span>生成前请先试听当前音色，用真实音频时长反推视频时长</span>
          )}
        </div>
      </div>
      {notice && <div className="dh-form-notice">{notice}</div>}
      <button className="dh-generate-button" type="button" onClick={submit} disabled={isSubmitting || !isPreviewCurrent || currentAudioTooLong}>
        {isSubmitting ? <Loader2 size={18} /> : <Send size={18} />}
        用当前模板生成口型视频
      </button>
    </aside>
  );
}

function DigitalHumanGenerationView({ onReturnHome }) {
  const [tab, setTab] = useState("public");
  const [avatars, setAvatars] = useState({ public: [], mine: [] });
  const [tasks, setTasks] = useState([]);
  const [voices, setVoices] = useState([]);
  const [options, setOptions] = useState(emptyDigitalHumanOptions);
  const [credits, setCredits] = useState(null);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [previewAvatar, setPreviewAvatar] = useState(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // 模块由外层保活挂载，此处始终订阅数字人任务与形象
  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [modelData, avatarData, voiceData, taskData, creditData] = await Promise.all([
          digitalHumanApi.getModels(),
          digitalHumanApi.getAvatars(),
          digitalHumanApi.getVoices(),
          digitalHumanApi.getTasks(),
          digitalHumanApi.getCredits().catch(() => null)
        ]);
        if (!mounted) return;
        setOptions(modelData);
        setAvatars(avatarData);
        setVoices(voiceData.voices || []);
        setTasks(taskData);
        setCredits(creditData);
        setSelectedAvatar((current) => current || avatarData.public?.[0] || avatarData.mine?.[0] || null);
      } catch (loadError) {
        if (mounted) setError(loadError.message || "加载数字人功能失败");
      }
    }
    load();
    const unsubscribe = digitalHumanApi.subscribe(() => {
      digitalHumanApi.getTasks().then((value) => {
        if (!mounted) return;
        setTasks(value);
        setSelectedTask((current) => {
          if (!current) return current;
          return value.find((task) => String(task.id) === String(current.id)) || current;
        });
      }).catch(() => {});
      digitalHumanApi.getAvatars().then((value) => mounted && setAvatars(value)).catch(() => {});
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  async function createTask(payload) {
    setError("");
    setIsSubmitting(true);
    try {
      const task = await digitalHumanApi.createTask(payload);
      setSelectedTask(task);
      setTab("history");
    } catch (submitError) {
      setError(submitError.message || "创建数字人任务失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function createAvatar(payload) {
    setIsSubmitting(true);
    try {
      const avatar = await digitalHumanApi.createAvatar(payload);
      setSelectedAvatar(avatar);
      setTab("mine");
      setIsCreateOpen(false);
    } catch (submitError) {
      setError(submitError.message || "创建形象失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteAvatar(id) {
    await digitalHumanApi.deleteAvatar(id);
    setSelectedAvatar((current) => current?.id === id ? null : current);
  }

  async function renameAvatar(avatar) {
    const nextName = window.prompt("输入新的形象名称", avatar.name);
    if (!nextName?.trim()) return;
    const updated = await digitalHumanApi.updateAvatar(avatar.id, { name: nextName.trim() });
    setSelectedAvatar(updated);
  }

  async function deleteTask(id) {
    await digitalHumanApi.deleteTask(id);
    setSelectedTask((current) => current?.id === id ? null : current);
  }

  async function regenerateTask(id) {
    const task = await digitalHumanApi.regenerateTask(id);
    setSelectedTask(task);
  }

  const visibleAvatars = tab === "mine" ? avatars.mine : getDigitalHumanPublicAvatars(avatars.public);
  const currentPreviewTask = selectedTask;
  const isPreviewProcessing = currentPreviewTask && !["completed", "failed"].includes(currentPreviewTask.status);

  return (
    <section className="dh-view-root">
      <div className="dh-topbar">
        <div>
          <span>数字人</span>
          <h1>创建会说话的数字人视频</h1>
        </div>
        {credits && <span className="credits-chip">积分 {credits.balance}</span>}
      </div>
      {error && <div className="video-submit-error">{error}</div>}
      <div className={`dh-workspace ${currentPreviewTask ? "is-generating" : "is-browsing"}`}>
        {!currentPreviewTask ? (
        <section className="dh-library-panel">
          <div className="dh-library-heading">
            <div>
              <span>第 1 步</span>
              <strong>选择数字人模板</strong>
            </div>
            <small>{selectedAvatar ? `已选择：${selectedAvatar.name}` : "选择后右侧会显示当前模板和调用模型"}</small>
          </div>
          <div className="dh-tabs">
            <button className={tab === "public" ? "is-active" : ""} type="button" onClick={() => setTab("public")}>公共形象</button>
            <button className={tab === "mine" ? "is-active" : ""} type="button" onClick={() => setTab("mine")}>我的形象</button>
            <button className={tab === "history" ? "is-active" : ""} type="button" onClick={() => setTab("history")}>生成记录</button>
          </div>
          {tab === "mine" && (
            <button className="dh-create-card" type="button" onClick={() => setIsCreateOpen(true)}>
              <Plus size={20} />
              <strong>创建形象</strong>
              <span>预留视频训练入口</span>
            </button>
          )}
          {tab === "history" ? (
            <div className="dh-task-list">
              {tasks.length ? tasks.map((task) => (
                <DigitalHumanTaskCard
                  key={task.id}
                  task={task}
                  selected={currentPreviewTask?.id === task.id}
                  onSelect={setSelectedTask}
                  onDelete={deleteTask}
                  onRegenerate={regenerateTask}
                />
              )) : <DigitalHumanEmptyMedia icon={Video} title="暂无生成记录" description="提交任务后会在这里显示进度" />}
            </div>
          ) : (
            <div className="dh-avatar-list">
              {visibleAvatars.length ? visibleAvatars.map((avatar) => (
                <DigitalHumanAvatarCard
                  key={avatar.id}
                  avatar={avatar}
                  selected={selectedAvatar?.id === avatar.id}
                  onSelect={setSelectedAvatar}
                  onPreview={setPreviewAvatar}
                  onRename={renameAvatar}
                  onDelete={deleteAvatar}
                  mine={tab === "mine"}
                />
              )) : <DigitalHumanEmptyMedia title="还没有自定义形象" description="点击创建形象，后续接入 MiniMax 训练接口" />}
            </div>
          )}
        </section>
        ) : (
        <main className="dh-preview-stage">
          <div className="dh-preview-header">
            <div>
              <span>{currentPreviewTask ? "生成预览" : "形象预览"}</span>
              <strong>{currentPreviewTask?.avatarName || selectedAvatar?.name || "请选择数字人形象"}</strong>
            </div>
            <div className="dh-preview-header-actions">
              {currentPreviewTask?.resultUrl && (
                <a className="dh-download-button" href={currentPreviewTask.resultUrl} download target="_blank" rel="noreferrer">
                  <Download size={14} />
                  下载视频
                </a>
              )}
              <button className="dh-preview-back" type="button" onClick={() => setSelectedTask(null)}>
                <Layers size={14} />
                返回
              </button>
              {currentPreviewTask?.status === "completed" ? (
                <button className="dh-preview-return-home" type="button" onClick={onReturnHome}>
                  <Home size={14} />
                  返回
                </button>
              ) : currentPreviewTask ? (
                <small>{currentPreviewTask.status === "failed" ? "失败" : `生成中 ${currentPreviewTask.progress || 0}%`}</small>
              ) : null}
            </div>
          </div>
          <div className="dh-video-shell">
            {currentPreviewTask?.resultUrl ? (
              <video src={currentPreviewTask.resultUrl} controls />
            ) : isPreviewProcessing ? (
              <DigitalHumanGeneratingState task={currentPreviewTask} />
            ) : (
              <DigitalHumanEmptyMedia
                icon={currentPreviewTask ? Film : UserRound}
                title={currentPreviewTask?.status === "failed" ? "生成失败" : currentPreviewTask?.status === "completed" ? "视频结果待返回" : "正在生成数字人视频"}
                description={currentPreviewTask?.status === "failed" ? currentPreviewTask.error : currentPreviewTask ? `任务已提交，MiniMax 生成音频后由 KIE 生成口型视频。当前进度 ${currentPreviewTask.progress || 0}%` : "这里会展示选中形象或生成后的视频"}
              />
            )}
          </div>
          <div className="dh-preview-details">
            <div>
              <span>当前形象</span>
              <strong>{selectedAvatar?.name || "未选择"}</strong>
            </div>
            <div>
              <span>驱动方式</span>
              <strong>{currentPreviewTask?.driveMode === "audio" ? "音频驱动" : "文本驱动"}</strong>
            </div>
            <div>
              <span>接口状态</span>
              <strong>{currentPreviewTask?.providerModel || "MiniMax + KIE"}</strong>
            </div>
          </div>
        </main>
        )}
        <DigitalHumanConfigPanel
          options={options}
          voices={voices}
          selectedAvatar={selectedAvatar}
          onSubmit={createTask}
          isSubmitting={isSubmitting}
        />
      </div>
      {isCreateOpen && (
        <DigitalHumanCreateAvatarModal
          onClose={() => setIsCreateOpen(false)}
          onCreate={createAvatar}
          isSubmitting={isSubmitting}
        />
      )}
      {previewAvatar && (
        <DigitalHumanAvatarPreviewModal
          avatar={previewAvatar}
          onClose={() => setPreviewAvatar(null)}
        />
      )}
    </section>
  );
}

const emptyMotionTransferOptions = {
  models: [],
  defaults: { model: "kie-motion-transfer", resolution: "720p", characterOrientation: "image" },
  modes: [
    { value: "720p", label: "720p" },
    { value: "1080p", label: "1080p" }
  ],
  characterOrientations: [
    { value: "image", label: "图片朝向", maxSeconds: 10 },
    { value: "video", label: "视频朝向", maxSeconds: 30 }
  ],
  limits: {
    maxImageBytes: 10 * 1024 * 1024,
    maxVideoBytes: 100 * 1024 * 1024,
    recommendedVideoSeconds: 30
  }
};

const motionTransferCopy = {
  emptyTitle: "开启你的动作迁移",
  emptyDescription: "上传图片和动作视频，让静态人物动起来",
  completedTitle: "动作迁移已完成",
  processingCreate: "正在创建动作迁移任务",
  processingGenerate: "正在生成动作迁移视频",
  processingDescription: "正在上传人物图片和动作参考视频，并提交给 KIE 合成。完成后会自动回填到这里。",
  recentEmptyTitle: "暂无动作迁移结果",
  recentEmptyDescription: "生成完成的视频会保存在这里。",
  imageTitle: "上传单人图",
  imageHint: "主体清晰，单人效果最佳",
  videoTitle: "上传动作视频",
  submitLabel: "生成动作迁移视频",
  panelLabel: "动作迁移上传面板",
  imageRequired: "请先上传单人图片",
  videoRequired: "请先上传动作视频",
  imageFallback: "人物图片",
  videoFallback: "动作视频",
  loadError: "加载动作迁移失败",
  createError: "创建动作迁移任务失败"
};

const faceSwapCopy = {
  emptyTitle: "开启你的视频换脸",
  emptyDescription: "上传人脸图和目标视频，让人物身份自然融合到视频中",
  completedTitle: "视频换脸已完成",
  processingCreate: "正在创建视频换脸任务",
  processingGenerate: "正在生成换脸视频",
  processingDescription: "正在上传人脸图片和目标视频，并提交给 KIE 合成。完成后会自动回填到这里。",
  recentEmptyTitle: "暂无视频换脸结果",
  recentEmptyDescription: "生成完成的换脸视频会保存在这里。",
  imageTitle: "上传人脸图",
  imageHint: "正脸清晰，光线自然效果最佳",
  videoTitle: "上传目标视频",
  submitLabel: "生成换脸视频",
  panelLabel: "视频换脸上传面板",
  imageRequired: "请先上传人脸图片",
  videoRequired: "请先上传目标视频",
  imageFallback: "人脸图片",
  videoFallback: "目标视频",
  loadError: "加载视频换脸失败",
  createError: "创建视频换脸任务失败"
};

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}

function MotionTransferCenterState({ task, isSubmitting, error, onOpenRecent, copy = motionTransferCopy }) {
  if (task?.status === "completed") {
    return (
      <section className="motion-center-state is-completed">
        <div className="motion-result-player">
          <video src={task.resultUrl} controls playsInline poster={task.thumbnailUrl || task.imageUrl} />
        </div>
        <div className="motion-result-copy">
          <span className="motion-center-icon">
            <CheckCircle2 size={24} />
          </span>
          <h2>{copy.completedTitle}</h2>
          <p>{task.prompt}</p>
          <div className="motion-result-actions">
            <a href={task.resultUrl} download>
              <Download size={15} />
              下载
            </a>
            <button type="button" onClick={onOpenRecent}>
              查看历史
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (error || task?.status === "failed") {
    return (
      <section className="motion-center-state is-failed">
        <span className="motion-center-icon">
          <Sparkles size={24} />
        </span>
        <strong>这次没有生成成功</strong>
        <p>{error || task?.error || "生成服务返回了错误，积分会按任务状态自动处理。"}</p>
      </section>
    );
  }

  return (
    <section className="motion-center-state is-processing" aria-live="polite">
      <span className="motion-center-spinner">
        <Loader2 size={30} />
      </span>
      <strong>{isSubmitting ? copy.processingCreate : copy.processingGenerate}</strong>
      <p>{copy.processingDescription}</p>
      <div className="motion-center-progress">
        <i style={{ width: `${task?.progress || 28}%` }} />
      </div>
      <small>{task?.progress ? `${task.progress}%` : "任务准备中"} · 请保持页面打开</small>
    </section>
  );
}

function MotionTransferTaskCard({ task, onDelete, onFavorite, onRepeat, copy = motionTransferCopy }) {
  const isProcessing = task.status === "processing";
  const isFailed = task.status === "failed";
  return (
    <article className={`motion-task-card status-${task.status}`}>
      <div className="motion-task-preview">
        {task.resultUrl && !isFailed ? (
          <video src={task.resultUrl} controls playsInline preload="metadata" poster={task.thumbnailUrl || task.imageUrl} />
        ) : (
          <div className={`motion-task-placeholder ${isFailed ? "is-failed" : ""}`}>
            {isProcessing ? <Loader2 size={26} /> : <Video size={26} />}
            <strong>{isFailed ? "生成失败" : "生成中"}</strong>
          </div>
        )}
      </div>
      <div className="motion-task-meta">
        <div className="tag-row">
          <span className="model-tag">{task.providerModel || task.model}</span>
          <span className="ratio-tag">{task.resolution}</span>
          <span className="quality-tag">{task.characterOrientation === "video" ? "视频朝向" : "图片朝向"}</span>
        </div>
        <div className="time-row">
          <span>{task.time}</span>
          <strong>{task.price}</strong>
        </div>
        <p>{task.error || task.prompt}</p>
        <div className="motion-source-row">
          <span>
            <Image size={14} />
            {task.imageFileName || copy.imageFallback}
          </span>
          <span>
            <Film size={14} />
            {task.videoFileName || copy.videoFallback}
          </span>
        </div>
        <div className="card-actions motion-card-actions">
          <button className={`icon-circle ${task.favorite ? "is-favorite" : ""}`} type="button" onClick={() => onFavorite(task.id)} aria-label="收藏">
            <Star size={17} fill={task.favorite ? "#f8d545" : "none"} />
          </button>
          {task.resultUrl ? (
            <a className="card-action-link" href={task.resultUrl} download>
              <Download size={15} />
              下载
            </a>
          ) : (
            <button type="button" disabled>
              <Download size={15} />
              下载
            </button>
          )}
          <button type="button" onClick={() => onRepeat(task)}>
            <RefreshCcw size={15} />
            再次生成
          </button>
          <button type="button" onClick={() => onDelete(task.id)}>
            <Trash2 size={15} />
            删除
          </button>
        </div>
      </div>
    </article>
  );
}

function MotionTransferUploadSlot({ kind, title, hint, asset, previewUrl, isUploading, onSelect, onClear }) {
  const inputRef = useRef(null);
  const Icon = kind === "image" ? Image : Film;
  function clearFile(event) {
    event.preventDefault();
    event.stopPropagation();
    onClear?.();
  }
  return (
    <button className={`motion-upload-slot ${previewUrl ? "has-preview" : ""}`} type="button" onClick={() => inputRef.current?.click()}>
      <input
        ref={inputRef}
        type="file"
        accept={kind === "image" ? "image/*" : "video/*"}
        hidden
        onChange={(event) => {
          onSelect(event.target.files?.[0] || null);
          event.target.value = "";
        }}
      />
      {previewUrl ? (
        kind === "image" ? (
          <img src={previewUrl} alt={title} />
        ) : (
          <video src={previewUrl} muted playsInline preload="metadata" />
        )
      ) : (
        <>
          <Plus size={16} />
          <strong>{title}</strong>
          <span>{hint}</span>
        </>
      )}
      {previewUrl && !isUploading && (
        <span
          className="upload-clear-button"
          role="button"
          tabIndex={0}
          title="取消上传"
          aria-label="取消上传"
          onClick={clearFile}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") clearFile(event);
          }}
        >
          <X size={13} />
        </span>
      )}
      {asset && <small>{asset.fileName} · {formatBytes(asset.sizeBytes)}</small>}
      {isUploading && (
        <span className="motion-uploading">
          <Loader2 size={16} />
          上传中
        </span>
      )}
      {!isUploading && previewUrl && (
        <span className="motion-upload-kind">
          <Icon size={14} />
          更换素材
        </span>
      )}
    </button>
  );
}

function MotionTransferComposer({ options, onSubmit, isSubmitting, api = motionTransferApi, copy = motionTransferCopy }) {
  const [imageAsset, setImageAsset] = useState(null);
  const [videoAsset, setVideoAsset] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [videoPreview, setVideoPreview] = useState("");
  const [model, setModel] = useState(options.defaults?.model || options.models[0]?.value || "");
  const [resolution, setResolution] = useState(options.defaults?.resolution || "720p");
  const [characterOrientation, setCharacterOrientation] = useState(options.defaults?.characterOrientation || "image");
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState("");

  useEffect(() => {
    if (!model && (options.defaults?.model || options.models[0]?.value)) {
      setModel(options.defaults?.model || options.models[0].value);
    }
    if (!resolution && options.defaults?.resolution) setResolution(options.defaults.resolution);
    if (!characterOrientation && options.defaults?.characterOrientation) setCharacterOrientation(options.defaults.characterOrientation);
  }, [characterOrientation, model, options, resolution]);

  useEffect(() => {
    return () => {
      if (imagePreview) window.URL.revokeObjectURL(imagePreview);
      if (videoPreview) window.URL.revokeObjectURL(videoPreview);
    };
  }, [imagePreview, videoPreview]);

  const selectedModel = options.models.find((item) => item.value === model) || options.models[0];
  const price = `${selectedModel?.basePoints || 0} 积分`;
  const canSubmit = imageAsset && videoAsset && !uploading && !isSubmitting;

  async function selectImage(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
       setNotice("请上传图片文件");
      return;
    }
    if (file.size > (options.limits?.maxImageBytes || 10 * 1024 * 1024)) {
      setNotice("图片大小不能超过 10MB");
      return;
    }
    if (imagePreview) window.URL.revokeObjectURL(imagePreview);
    setImagePreview(window.URL.createObjectURL(file));
    setImageAsset(null);
    setUploading("image");
    setNotice("");
    try {
      setImageAsset(await api.uploadImage(file));
    } catch (error) {
      setImagePreview("");
      setNotice(error.message || "图片上传失败");
    } finally {
      setUploading("");
    }
  }

  async function selectVideo(file) {
    if (!file) return;
    if (!file.type.startsWith("video/")) {
      setNotice("请上传视频文件");
      return;
    }
    if (file.size > (options.limits?.maxVideoBytes || 100 * 1024 * 1024)) {
      setNotice("视频大小不能超过 200MB");
      return;
    }
    if (videoPreview) window.URL.revokeObjectURL(videoPreview);
    setVideoPreview(window.URL.createObjectURL(file));
    setVideoAsset(null);
    setUploading("video");
    setNotice("");
    try {
      setVideoAsset(await api.uploadVideo(file));
    } catch (error) {
      setVideoPreview("");
      setNotice(error.message || "视频上传失败");
    } finally {
      setUploading("");
    }
  }

  function clearImage() {
    setImageAsset(null);
    if (imagePreview) window.URL.revokeObjectURL(imagePreview);
    setImagePreview("");
    setNotice("");
  }

  function clearVideo() {
    setVideoAsset(null);
    if (videoPreview) window.URL.revokeObjectURL(videoPreview);
    setVideoPreview("");
    setNotice("");
  }

  function submit() {
    if (!imageAsset) {
      setNotice(copy.imageRequired);
      return;
    }
    if (!videoAsset) {
      setNotice(copy.videoRequired);
      return;
    }
    setNotice("");
    onSubmit({
      imageAssetId: imageAsset.id,
      videoAssetId: videoAsset.id,
      model,
      resolution,
      characterOrientation
    });
  }

  return (
    <div className="motion-composer" aria-label={copy.panelLabel}>
      <div className="motion-upload-grid">
        <MotionTransferUploadSlot
          kind="image"
          title={copy.imageTitle}
          hint={copy.imageHint}
          asset={imageAsset}
          previewUrl={imagePreview}
          isUploading={uploading === "image"}
          onSelect={selectImage}
          onClear={clearImage}
        />
        <MotionTransferUploadSlot
          kind="video"
          title={copy.videoTitle}
          hint={`建议 ${options.limits?.recommendedVideoSeconds || 30} 秒内`}
          asset={videoAsset}
          previewUrl={videoPreview}
          isUploading={uploading === "video"}
          onSelect={selectVideo}
          onClear={clearVideo}
        />
      </div>
      <div className="motion-composer-footer">
        <CustomSelect className="control-select model-select" ariaLabel="模型" icon={Box} value={model} onChange={setModel} options={options.models} />
        <CustomSelect
          className="control-select"
          ariaLabel="分辨率"
          icon={Ruler}
          value={resolution}
          onChange={setResolution}
          options={options.modes || emptyMotionTransferOptions.modes}
        />
        <CustomSelect
          className="control-select"
          ariaLabel="角色方向"
          icon={Timer}
          value={characterOrientation}
          onChange={setCharacterOrientation}
          options={options.characterOrientations || emptyMotionTransferOptions.characterOrientations}
        />
        <span className="price-pill">{price}</span>
        <button className="send-button" type="button" onClick={submit} disabled={!canSubmit} aria-label={copy.submitLabel}>
          {isSubmitting ? <Loader2 size={18} /> : <Send size={18} />}
        </button>
      </div>
      {notice && <div className="composer-notice warning">{notice}</div>}
    </div>
  );
}

function getMotionActiveTaskCacheKey(navId) {
  return `jingchuang-ai:${navId}:active-task-id`;
}

function readMotionActiveTaskId(navId) {
  try {
    return window.localStorage.getItem(getMotionActiveTaskCacheKey(navId));
  } catch {
    return null;
  }
}

function writeMotionActiveTaskId(navId, taskId) {
  try {
    const key = getMotionActiveTaskCacheKey(navId);
    if (taskId) window.localStorage.setItem(key, String(taskId));
    else window.localStorage.removeItem(key);
  } catch {
    // localStorage can be unavailable in restricted browser contexts.
  }
}

function MotionTransferView({ navId = "motion", api = motionTransferApi, copy = motionTransferCopy, splitResults = false }) {
  const [tasks, setTasks] = useState([]);
  const [options, setOptions] = useState(emptyMotionTransferOptions);
  const [credits, setCredits] = useState(null);
  const [filter, setFilter] = useState("all");
  const [viewTab, setViewTab] = useState("home");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedTaskId, setSubmittedTaskId] = useState(() => readMotionActiveTaskId(navId));

  function applyTaskData(taskData) {
    setTasks(taskData);
    setSubmittedTaskId((current) => {
      if (current && taskData.some((task) => String(task.id) === String(current))) return current;
      if (current) writeMotionActiveTaskId(navId, null);
      return null;
    });
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [modelData, taskData, creditData] = await Promise.all([
          api.getModels(),
          api.getTasks({ filter: splitResults ? "all" : filter }),
          api.getCredits().catch(() => null)
        ]);
        if (!mounted) return;
        setOptions(modelData);
        applyTaskData(taskData);
        setCredits(creditData);
      } catch (error) {
        if (mounted) setSubmitError(error.message || copy.loadError);
      }
    }
    load();
    const unsubscribe = api.subscribe(() => {
      api.getTasks({ filter: splitResults ? "all" : filter }).then((value) => mounted && applyTaskData(value)).catch(() => {});
      api.getCredits().then((value) => mounted && setCredits(value)).catch(() => {});
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [api, copy.loadError, filter, navId, splitResults]);

  useEffect(() => {
    writeMotionActiveTaskId(navId, submittedTaskId);
  }, [navId, submittedTaskId]);

  const submittedTask = tasks.find((task) => String(task.id) === String(submittedTaskId)) || null;
  const isFaceSwapView = splitResults && navId === "face-swap";
  const useWorkbenchView = isFaceSwapView || navId === "motion";
  const showCenterState = isSubmitting || submitError || submittedTask;
  const showEmptyHero = splitResults
    ? viewTab === "home" && !showCenterState
    : !showCenterState && tasks.length === 0 && filter !== "favorite";
  const visibleTasks = splitResults
    ? viewTab === "recent"
      ? submittedTaskId
        ? tasks.filter((task) => String(task.id) !== String(submittedTaskId))
        : tasks
      : viewTab === "favorite"
        ? tasks.filter((task) => task.favorite)
      : []
    : submittedTaskId
      ? tasks.filter((task) => String(task.id) !== String(submittedTaskId))
      : tasks;
  const showRecentEmpty = splitResults
    ? (viewTab === "recent" || viewTab === "favorite") && !showCenterState && visibleTasks.length === 0
    : !showEmptyHero && !showCenterState && visibleTasks.length === 0;

  async function createTask(payload) {
    setSubmitError("");
    setIsSubmitting(true);
    setSubmittedTaskId(null);
    try {
      const task = await api.createTask(payload);
      setSubmittedTaskId(task.id);
      writeMotionActiveTaskId(navId, task.id);
      if (splitResults) setViewTab("home");
      setTasks((current) => [task, ...current.filter((item) => item.id !== task.id)]);
    } catch (error) {
      setSubmitError(error.message || copy.createError);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteTask(id) {
    await api.deleteTask(id);
    setTasks((current) => current.filter((task) => task.id !== id));
    setSubmittedTaskId((current) => {
      if (String(current) !== String(id)) return current;
      writeMotionActiveTaskId(navId, null);
      return null;
    });
  }

  async function toggleFavorite(id) {
    const updated = await api.toggleFavorite(id);
    setTasks((current) => current.map((task) => String(task.id) === String(id) ? updated : task));
  }

  function repeatTask(task) {
    createTask({
      imageAssetId: task.imageAssetId,
      videoAssetId: task.videoAssetId,
      model: task.model,
      resolution: task.resolution,
      characterOrientation: task.characterOrientation,
      prompt: task.prompt
    });
  }

  return (
    <section className={`motion-view-root ${splitResults ? "face-swap-view-root" : ""}`}>
      <div className="image-filter-tabs motion-filter-tabs">
        {splitResults ? (
          <>
            <button className={viewTab === "home" ? "selected" : ""} type="button" onClick={() => setViewTab("home")}>主页</button>
            <button className={viewTab === "recent" ? "selected" : ""} type="button" onClick={() => {
              setViewTab("recent");
              setSubmittedTaskId(null);
              writeMotionActiveTaskId(navId, null);
            }}>最近生成</button>
            <button type="button" disabled>
              <Star size={17} fill="#f8d545" color="#161616" />
              收藏
            </button>
          </>
        ) : (
          <>
            <button className={filter === "all" ? "selected" : ""} type="button" onClick={() => setFilter("all")}>全部结果</button>
            <button className={filter === "favorite" ? "selected" : ""} type="button" onClick={() => setFilter("favorite")}>
              <Star size={17} fill="#f8d545" color="#161616" />
              收藏
            </button>
          </>
        )}
        {credits && <span className="credits-chip">积分 {credits.balance}</span>}
      </div>
      <div className={`motion-canvas ${showCenterState ? "has-active-task" : ""}`}>
        {useWorkbenchView && (isFaceSwapView ? viewTab === "home" : showEmptyHero) && !showCenterState && (
          <FaceSwapWorkbench
            options={options}
            onSubmit={createTask}
            isSubmitting={isSubmitting}
            api={api}
            copy={copy}
            heading={navId === "motion" ? "AI 动作迁移" : "AI 换脸工具"}
            privacyText={navId === "motion" ? "您上传的内容仅用于动作迁移处理，不会被用于其他用途。" : "您上传的内容仅用于换脸处理，不会被用于其他用途。"}
          />
        )}
        {!useWorkbenchView && showEmptyHero && (
          <div className="motion-hero-empty">
            <span className="motion-hero-icon">
              <Sparkles size={34} />
            </span>
            <h1>{copy.emptyTitle}</h1>
            <p>{copy.emptyDescription}</p>
          </div>
        )}
        {showCenterState && (
          <MotionTransferCenterState
            task={submittedTask}
            isSubmitting={isSubmitting && !submittedTask}
            error={submitError}
            onOpenRecent={() => {
              if (splitResults) setViewTab("recent");
              setSubmittedTaskId(null);
              writeMotionActiveTaskId(navId, null);
            }}
            copy={copy}
          />
        )}
        {showRecentEmpty && (
          <div className="motion-recent-empty">
            <Layers size={24} />
            <strong>{copy.recentEmptyTitle}</strong>
            <p>{copy.recentEmptyDescription}</p>
          </div>
        )}
        {(!useWorkbenchView || !showEmptyHero || (isFaceSwapView && viewTab !== "home")) && (
          <div className={`motion-results-feed ${visibleTasks.length ? "has-results" : ""}`}>
            {visibleTasks.map((task) => (
              <MotionTransferTaskCard
                key={task.id}
                task={task}
                onDelete={deleteTask}
                onFavorite={toggleFavorite}
                onRepeat={repeatTask}
                copy={copy}
              />
            ))}
          </div>
        )}
      </div>
      {options.models.length > 0 && !useWorkbenchView && (
        <MotionTransferComposer
          options={options}
          onSubmit={createTask}
          isSubmitting={isSubmitting}
          api={api}
          copy={copy}
        />
      )}
    </section>
  );
}

const emptyWatermarkOptions = {
  models: [],
  defaults: {
    imageModel: "kie-watermark-image",
    videoModel: "kie-watermark-video",
    imageResolution: "2K",
    videoResolution: "720p"
  },
  limits: {
    maxImageBytes: 10 * 1024 * 1024,
    maxVideoBytes: 200 * 1024 * 1024,
    recommendedVideoSeconds: 15
  }
};

function WatermarkCenterState({ task, isSubmitting, error, onOpenRecent }) {
  if (task?.status === "completed") {
    const isVideo = task.mediaType === "video";
    return (
      <section className="watermark-center-state is-completed">
        <div className={`watermark-result-stage ${isVideo ? "is-video" : ""}`}>
          {isVideo ? (
            <video src={task.resultUrl} controls playsInline poster={task.thumbnailUrl || task.sourceUrl} />
          ) : (
            <img src={task.resultUrl} alt={task.sourceFileName || "去水印结果"} />
          )}
        </div>
        <div className="watermark-result-copy">
          <span className="watermark-center-icon">
            <CheckCircle2 size={24} />
          </span>
          <h2>去水印已完成</h2>
          <p>{task.sourceFileName || "结果已保存到最近生成"}</p>
          <div className="watermark-result-actions">
            <a href={task.resultUrl} download>
              <Download size={15} />
              下载
            </a>
            <button type="button" onClick={onOpenRecent}>查看最近生成</button>
          </div>
        </div>
      </section>
    );
  }

  if (error || task?.status === "failed") {
    return (
      <section className="watermark-center-state is-failed">
        <span className="watermark-center-icon">
          <Eraser size={24} />
        </span>
        <strong>这次没有生成成功</strong>
        <p>{error || task?.error || "生成服务返回了错误，积分会按任务状态自动处理。"}</p>
      </section>
    );
  }

  return (
    <section className="watermark-center-state is-processing" aria-live="polite">
      <span className="watermark-center-spinner">
        <Loader2 size={30} />
      </span>
      <strong>{isSubmitting ? "正在创建去水印任务" : "正在智能去除水印"}</strong>
      <p>素材正在提交给 KIE 处理，完成后会自动回填到这里。</p>
      <div className="watermark-center-progress">
        <i style={{ width: `${task?.progress || 28}%` }} />
      </div>
      <small>{task?.progress ? `${task.progress}%` : "任务准备中"} · 请保持页面打开</small>
    </section>
  );
}

function WatermarkTaskCard({ task, onDelete, onFavorite, onRepeat }) {
  const isProcessing = task.status === "processing";
  const isFailed = task.status === "failed";
  const isVideo = task.mediaType === "video";

  return (
    <article className={`watermark-task-card status-${task.status}`}>
      <div className={`watermark-task-preview ${isVideo ? "is-video" : ""}`}>
        {task.resultUrl && !isFailed ? (
          isVideo ? (
            <video src={task.resultUrl} controls playsInline preload="metadata" poster={task.thumbnailUrl || task.sourceUrl} />
          ) : (
            <img src={task.resultUrl} alt={task.sourceFileName || "去水印结果"} />
          )
        ) : (
          <div className={`watermark-task-placeholder ${isFailed ? "is-failed" : ""}`}>
            {isProcessing ? <Loader2 size={26} /> : isVideo ? <Video size={26} /> : <Image size={26} />}
            <strong>{isFailed ? "生成失败" : "生成中"}</strong>
          </div>
        )}
      </div>
      <div className="watermark-task-meta">
        <div className="tag-row">
          <span className="model-tag">{task.mediaType === "video" ? "视频去水印" : "图片去水印"}</span>
          <span className="ratio-tag">{task.resolution}</span>
          <span className="quality-tag">{task.providerModel || task.model}</span>
        </div>
        <div className="time-row">
          <span>{task.time}</span>
          <strong>{task.price}</strong>
        </div>
        <p>{task.error || task.sourceFileName || "智能去水印结果"}</p>
        <div className="watermark-source-row">
          <span>
            {isVideo ? <Film size={14} /> : <Image size={14} />}
            {task.sourceFileName || "源素材"}
          </span>
        </div>
        <div className="card-actions watermark-card-actions">
          <button className={`icon-circle ${task.favorite ? "is-favorite" : ""}`} type="button" onClick={() => onFavorite(task.id)} aria-label="收藏">
            <Star size={17} fill={task.favorite ? "#f8d545" : "none"} />
          </button>
          {task.resultUrl ? (
            <a className="card-action-link" href={task.resultUrl} download>
              <Download size={15} />
              下载
            </a>
          ) : (
            <button type="button" disabled>
              <Download size={15} />
              下载
            </button>
          )}
          <button type="button" onClick={() => onRepeat(task)}>
            <RefreshCcw size={15} />
            再次生成
          </button>
          <button type="button" onClick={() => onDelete(task.id)}>
            <Trash2 size={15} />
            删除
          </button>
        </div>
      </div>
    </article>
  );
}

function WatermarkUploadSlot({ mode, sourceAsset, previewUrl, isUploading, onSelect, onClear }) {
  const inputRef = useRef(null);
  const isVideo = mode === "video";
  function clearFile(event) {
    event.preventDefault();
    event.stopPropagation();
    onClear?.();
  }
  return (
    <button className={`watermark-upload-slot ${previewUrl ? "has-preview" : ""}`} type="button" onClick={() => inputRef.current?.click()}>
      <input
        ref={inputRef}
        type="file"
        accept={isVideo ? "video/*" : "image/*"}
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0] || null;
          event.target.value = "";
          onSelect(file);
        }}
      />
      {previewUrl ? (
        isVideo ? (
          <video src={previewUrl} muted playsInline preload="metadata" />
        ) : (
          <img src={previewUrl} alt="上传素材预览" />
        )
      ) : (
        <>
          <Plus size={18} />
          <strong>{isVideo ? "+ 上传视频文件" : "+ 上传图片文件"}</strong>
          <span>{isVideo ? "建议 15 秒内，最大 200MB" : "支持 JPG/PNG，最大 10MB"}</span>
        </>
      )}
      {previewUrl && !isUploading && (
        <span
          className="upload-clear-button"
          role="button"
          tabIndex={0}
          title="取消上传"
          aria-label="取消上传"
          onClick={clearFile}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") clearFile(event);
          }}
        >
          <X size={13} />
        </span>
      )}
      {sourceAsset && <small>{sourceAsset.fileName} 路 {formatBytes(sourceAsset.sizeBytes)}</small>}
      {isUploading && (
        <span className="watermark-uploading">
          <Loader2 size={16} />
          上传中
        </span>
      )}
      {!isUploading && previewUrl && (
        <span className="watermark-upload-kind">
          {isVideo ? <Film size={14} /> : <Image size={14} />}
          更换素材
        </span>
      )}
    </button>
  );
}

function WatermarkComposer({ options, onSubmit, isSubmitting }) {
  const [mode, setMode] = useState("image");
  const [sourceAsset, setSourceAsset] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    return () => {
      if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const selectedModel = options.models.find((item) => item.kind === mode) || options.models[0];
  const resolution = mode === "video" ? options.defaults?.videoResolution || "720p" : options.defaults?.imageResolution || "2K";
  const price = `${selectedModel?.basePoints || 0} 积分`;
  const canSubmit = Boolean(sourceAsset && !uploading && !isSubmitting);

  function changeMode(nextMode) {
    setMode(nextMode);
    setSourceAsset(null);
    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setNotice("");
  }

  function clearSource() {
    setSourceAsset(null);
    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setNotice("");
  }

  async function selectSource(file) {
    if (!file) return;
    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if ((mode === "image" && !isImage) || (mode === "video" && !isVideo)) {
      setNotice(mode === "image" ? "请上传图片文件" : "请上传视频文件");
      return;
    }
    if (isImage && file.size > (options.limits?.maxImageBytes || 10 * 1024 * 1024)) {
      setNotice("图片大小不能超过 10MB");
      return;
    }
    if (isVideo && file.size > (options.limits?.maxVideoBytes || 200 * 1024 * 1024)) {
      setNotice("视频大小不能超过 100MB");
      return;
    }

    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    setPreviewUrl(window.URL.createObjectURL(file));
    setSourceAsset(null);
    setUploading(true);
    setNotice("");
    try {
      setSourceAsset(await watermarkApi.uploadSource(file));
      setNotice("素材上传完成");
    } catch (error) {
      setPreviewUrl("");
      setNotice(error.message || "素材上传失败");
    } finally {
      setUploading(false);
    }
  }

  function submit() {
    if (!sourceAsset) {
      setNotice(mode === "image" ? "请先上传图片文件" : "请先上传视频文件");
      return;
    }
    setNotice("");
    onSubmit({
      sourceAssetId: sourceAsset.id,
      model: selectedModel?.value,
      resolution
    });
  }

  return (
    <div className="watermark-composer" aria-label="去水印上传面板">
      <div className="watermark-mode-tabs">
        <button className={mode === "image" ? "is-active" : ""} type="button" onClick={() => changeMode("image")}>
          <Image size={15} />
          图片去水印
        </button>
        <button className={mode === "video" ? "is-active" : ""} type="button" onClick={() => changeMode("video")}>
          <Film size={15} />
          视频去水印
        </button>
      </div>
      <WatermarkUploadSlot
        mode={mode}
        sourceAsset={sourceAsset}
        previewUrl={previewUrl}
        isUploading={uploading}
        onSelect={selectSource}
        onClear={clearSource}
      />
      <div className="watermark-composer-footer">
        <span>{notice || (mode === "video" ? "视频会保留原音频并尝试自然修复水印区域" : "图片会自动修复水印区域并保持主体内容")}</span>
        <strong>{price}</strong>
        <button className="send-button" type="button" onClick={submit} disabled={!canSubmit} aria-label="开始去水印">
          {isSubmitting ? <Loader2 size={18} /> : <Send size={18} />}
        </button>
      </div>
    </div>
  );
}

function WatermarkRemovalView() {
  const [tasks, setTasks] = useState([]);
  const [options, setOptions] = useState(emptyWatermarkOptions);
  const [credits, setCredits] = useState(null);
  const [viewTab, setViewTab] = useState("home");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedTaskId, setSubmittedTaskId] = useState(null);

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const [modelData, taskData, creditData] = await Promise.all([
          watermarkApi.getModels(),
          watermarkApi.getTasks(),
          watermarkApi.getCredits().catch(() => null)
        ]);
        if (!mounted) return;
        setOptions(modelData);
        setTasks(taskData);
        setCredits(creditData);
      } catch (error) {
        if (mounted) setSubmitError(error.message || "加载去水印失败");
      }
    }
    load();
    const unsubscribe = watermarkApi.subscribe(() => {
      watermarkApi.getTasks().then((value) => mounted && setTasks(value)).catch(() => {});
      watermarkApi.getCredits().then((value) => mounted && setCredits(value)).catch(() => {});
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const submittedTask = tasks.find((task) => String(task.id) === String(submittedTaskId)) || null;
  const showCenterState = isSubmitting || submitError || submittedTask;
  const visibleTasks = viewTab === "favorite"
    ? tasks.filter((task) => task.favorite && String(task.id) !== String(submittedTaskId))
    : viewTab === "recent"
      ? tasks.filter((task) => String(task.id) !== String(submittedTaskId))
      : [];
  const showEmptyHero = viewTab === "home" && !showCenterState;
  const showRecentEmpty = (viewTab === "recent" || viewTab === "favorite") && !showCenterState && visibleTasks.length === 0;

  async function createTask(payload) {
    setSubmitError("");
    setIsSubmitting(true);
    setSubmittedTaskId(null);
    setViewTab("home");
    try {
      const task = await watermarkApi.createTask(payload);
      setSubmittedTaskId(task.id);
      setTasks((current) => [task, ...current.filter((item) => item.id !== task.id)]);
    } catch (error) {
      setSubmitError(error.message || "创建去水印任务失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteTask(id) {
    await watermarkApi.deleteTask(id);
    setTasks((current) => current.filter((task) => task.id !== id));
    setSubmittedTaskId((current) => String(current) === String(id) ? null : current);
  }

  async function toggleFavorite(id) {
    const updated = await watermarkApi.toggleFavorite(id);
    setTasks((current) => current.map((task) => String(task.id) === String(id) ? updated : task));
  }

  function repeatTask(task) {
    createTask({
      sourceAssetId: task.sourceAssetId,
      model: task.model,
      resolution: task.resolution,
      prompt: task.prompt
    });
  }

  return (
    <section className="watermark-view-root">
      <div className="image-filter-tabs watermark-filter-tabs">
        <button className={viewTab === "home" ? "selected" : ""} type="button" onClick={() => setViewTab("home")}>主页</button>
        <button className={viewTab === "recent" ? "selected" : ""} type="button" onClick={() => {
          setViewTab("recent");
          setSubmittedTaskId(null);
        }}>最近生成</button>
        <button className={viewTab === "favorite" ? "selected" : ""} type="button" onClick={() => {
          setViewTab("favorite");
          setSubmittedTaskId(null);
        }}>
          <Star size={17} fill="#f8d545" color="#161616" />
          收藏
        </button>
        {credits && <span className="credits-chip">积分 {credits.balance}</span>}
      </div>
      <div className={`watermark-canvas ${showCenterState ? "has-active-task" : ""} ${viewTab !== "home" ? "is-list" : ""}`}>
        {showEmptyHero && (
          <div className="watermark-hero-empty">
            <span className="watermark-hero-icon">
              <Eraser size={36} />
            </span>
            <h1>智能去水印</h1>
            <p>上传图片或视频，AI 智能一键去除水印</p>
          </div>
        )}
        {showCenterState && (
          <WatermarkCenterState
            task={submittedTask}
            isSubmitting={isSubmitting && !submittedTask}
            error={submitError}
            onOpenRecent={() => {
              setViewTab("recent");
              setSubmittedTaskId(null);
            }}
          />
        )}
        {showRecentEmpty && (
          <div className="watermark-recent-empty">
            <Eraser size={24} />
            <strong>{viewTab === "favorite" ? "暂无收藏结果" : "暂无最近生成"}</strong>
            <p>{viewTab === "favorite" ? "收藏后的去水印结果会显示在这里。" : "生成完成的图片或视频会保存在这里。"}</p>
          </div>
        )}
        <div className={`watermark-results-feed ${visibleTasks.length ? "has-results" : ""}`}>
          {visibleTasks.map((task) => (
            <WatermarkTaskCard
              key={task.id}
              task={task}
              onDelete={deleteTask}
              onFavorite={toggleFavorite}
              onRepeat={repeatTask}
            />
          ))}
        </div>
      </div>
      {viewTab === "home" && options.models.length > 0 && (
        <WatermarkComposer
          options={options}
          onSubmit={createTask}
          isSubmitting={isSubmitting}
        />
      )}
    </section>
  );
}

/** 各功能模块首次进入后常驻 DOM锛屼粎鍒囨崲 display锛岄伩鍏嶄晶鏍忓垏鎹㈡椂鍗歌浇瀵艰嚧鐘舵€佷涪澶?*/
function FeatureModuleKeepAlive({ id, activeNav, visitedIds, children }) {
  if (!visitedIds.has(id)) return null;
  return (
    <div
      className="feature-module-keepalive"
      style={{ display: activeNav === id ? "contents" : "none" }}
      aria-hidden={activeNav !== id}
      data-feature-module={id}
    >
      {children}
    </div>
  );
}

function ImageFeaturePage({ initialNav, onOpenHome, authUser, onOpenAuth, onLogout }) {
  const firstNav = initialNav && featureNavIdSet.has(initialNav) ? initialNav : "image";
  const isGuest = Boolean(authUser?.isGuest);
  const [activeNav, setActiveNav] = useState(firstNav);
  const [visitedIds, setVisitedIds] = useState(() => new Set([firstNav]));

  useEffect(() => {
    const next = initialNav && featureNavIdSet.has(initialNav) ? initialNav : "image";
    setActiveNav(next);
    setVisitedIds((prev) => new Set(prev).add(next));
  }, [initialNav]);

  useEffect(() => {
    if (featureNavIdSet.has(activeNav)) {
      setVisitedIds((prev) => new Set(prev).add(activeNav));
    }
  }, [activeNav]);

  const handleNavChange = useCallback((id) => {
    if (id === "home") {
      window.history.pushState(null, "", "#/home");
      onOpenHome();
      return;
    }
    const nextId = id;
    if (featureNavIdSet.has(nextId)) {
      window.history.pushState(null, "", `#/${nextId}`);
    }
    setActiveNav((current) => (current === nextId ? current : nextId));
  }, [onOpenHome]);

  return (
    <div className={`feature-page-shell ${isGuest ? "is-guest" : ""}`}>
      <FeatureSidebar activeNav={activeNav} onNavChange={handleNavChange} authUser={authUser} onOpenAuth={onOpenAuth} onLogout={onLogout} />
      {isGuest && (
        <div className="feature-guest-auth-actions" aria-label="游客璐﹀彿鍏ュ彛">
          <button type="button" onClick={() => onOpenAuth("login")}>登录</button>
          <button type="button" onClick={() => onOpenAuth("register")}>注册</button>
        </div>
      )}
      <main className="feature-main">
        <FeatureModuleKeepAlive id="assets" activeNav={activeNav} visitedIds={visitedIds}>
          <AssetsPage authUser={authUser} onOpenAuth={onOpenAuth} />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive id="image" activeNav={activeNav} visitedIds={visitedIds}>
          <ImageGenerationView authUser={authUser} onOpenAuth={onOpenAuth} />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive id="video" activeNav={activeNav} visitedIds={visitedIds}>
          <VideoGenerationView authUser={authUser} onOpenAuth={onOpenAuth} />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive id="chat" activeNav={activeNav} visitedIds={visitedIds}>
          <ChatGenerationView authUser={authUser} onOpenAuth={onOpenAuth} />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive id="digital-human" activeNav={activeNav} visitedIds={visitedIds}>
          <DigitalHumanGenerationView onReturnHome={() => handleNavChange("home")} />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive id="image-digital-human" activeNav={activeNav} visitedIds={visitedIds}>
          <ImageDigitalHumanView />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive id="motion" activeNav={activeNav} visitedIds={visitedIds}>
          <MotionTransferView splitResults />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive id="watermark" activeNav={activeNav} visitedIds={visitedIds}>
          <WatermarkRemovalView />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive id="voice" activeNav={activeNav} visitedIds={visitedIds}>
          <VoiceSynthesisView authUser={authUser} onOpenAuth={onOpenAuth} />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive id="voice-convert" activeNav={activeNav} visitedIds={visitedIds}>
          <VoiceConvertView />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive id="transcribe" activeNav={activeNav} visitedIds={visitedIds}>
          <TranscribeView authUser={authUser} />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive id="article" activeNav={activeNav} visitedIds={visitedIds}>
          <ArticleGenerationView authUser={authUser} onOpenAuth={onOpenAuth} />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive id="music" activeNav={activeNav} visitedIds={visitedIds}>
          <MusicGenerationView />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive id="replicate" activeNav={activeNav} visitedIds={visitedIds}>
          <ReplicateView authUser={authUser} />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive id="enhance" activeNav={activeNav} visitedIds={visitedIds}>
          <EnhanceView />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive id="remove-bg" activeNav={activeNav} visitedIds={visitedIds}>
          <RemoveBgView />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive id="video-voice" activeNav={activeNav} visitedIds={visitedIds}>
          <VideoDubbingView authUser={authUser} />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive id="face-swap" activeNav={activeNav} visitedIds={visitedIds}>
          <MotionTransferView navId="face-swap" api={faceSwapApi} copy={faceSwapCopy} splitResults />
        </FeatureModuleKeepAlive>
        {!["assets", "image", "video", "chat", "digital-human", "image-digital-human", "motion", "face-swap", "watermark", "voice", "voice-convert", "transcribe", "article", "music", "replicate", "enhance", "remove-bg", "video-voice"].includes(activeNav) && <ComingSoon activeNav={activeNav} />}
      </main>
    </div>
  );
}

function App() {
  const [view, setView] = useState(getInitialView);
  const [authUser, setAuthUser] = useState(null);
  const [authDrawerMode, setAuthDrawerMode] = useState(null);

  useEffect(() => {
    const onPopState = () => setView(getRouteView());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    let mounted = true;
    authApi.me()
      .then((state) => {
        if (mounted) setAuthUser(state.user);
      })
      .catch(() => {
        if (mounted) setAuthUser({ isGuest: true, displayName: "游客", username: "guest" });
      });
    return () => {
      mounted = false;
    };
  }, []);

  const openHome = useCallback(() => {
    setView("home");
  }, []);

  const openFeature = useCallback((id = "image") => {
    const nextId = featureNavIdSet.has(id) ? id : "image";
    window.history.pushState(null, "", `#/${nextId}`);
    setView(nextId);
  }, []);

  const finishAuth = useCallback((user) => {
    setAuthUser(user);
    setAuthDrawerMode(null);
    window.sessionStorage.setItem(appEntryStorageKey, "1");
    window.history.pushState(null, "", "#/home");
    window.location.reload();
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      window.location.reload();
    }
  }, []);

  const page = (() => {
    if (view === "home") {
      return <AppHome onOpenFeature={openFeature} authUser={authUser} onOpenAuth={setAuthDrawerMode} onLogout={logout} />;
    }

    if (featureNavIdSet.has(view)) {
      return <ImageFeaturePage initialNav={view} onOpenHome={openHome} authUser={authUser} onOpenAuth={setAuthDrawerMode} onLogout={logout} />;
    }

    return <SplashHome onOpenAuth={setAuthDrawerMode} />;
  })();

  return (
    <>
      {page}
      <AuthDrawer
        mode={authDrawerMode}
        onClose={() => setAuthDrawerMode(null)}
        onModeChange={setAuthDrawerMode}
        onSuccess={finishAuth}
      />
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
