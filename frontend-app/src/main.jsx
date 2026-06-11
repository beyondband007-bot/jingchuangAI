﻿import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createRoot } from "react-dom/client";
import {
  CircleAlert,
  Bot,
  Box,
  ChevronDown,
  CheckCircle2,
  Camera,
  Copy,
  Dice5,
  Download,
  Eraser,
  Eye,
  EyeOff,
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
  X,
} from "lucide-react";
import { authApi } from "./api/authApi";
import { paymentApi } from "./api/paymentApi";
import { imageApi } from "./api/imageApi";
import { videoApi } from "./api/videoApi";
import { chatApi } from "./api/chatApi";
import { digitalHumanApi } from "./api/digitalHumanApi";
import { motionTransferApi } from "./api/motionTransferApi";
import { faceSwapApi } from "./api/faceSwapApi";
import { imageDigitalHumanApi } from "./api/imageDigitalHumanApi";
import { watermarkApi } from "./api/watermarkApi";
import { emitCreditsUpdated, subscribeCreditsUpdated } from "./api/creditsEvents";
import { hasRunningTasks, taskStatusSignature } from "./api/taskPolling";
import { VoiceSynthesisView } from "./features/voice-synthesis-ui/VoiceSynthesisView";
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
import { ImageDigitalHumanFaceSwapWorkbench } from "./features/image-digital-human/ImageDigitalHumanFaceSwapWorkbench";
import { WaterfallGrid } from "./features/waterfall/WaterfallGrid";
import { DigitalHumanShowcaseCard } from "./features/digital-human/DigitalHumanShowcaseCard";
import { ViralGraphicGeneratorShowcaseCard } from "./features/viral-graphic-generator-ui/ViralGraphicGeneratorShowcaseCard";
import imageInspirationPrompts from "./data/imageInspirationPrompts.json";
import { StudioLanding } from "./StudioLanding";
import "./styles.css";

const caseImageFiles = [
  "1.jpg",
  "2.jpg",
  "3.jpg",
  "4.jpg",
  "5.jpg",
  "6.jpg",
  "7.jpg",
  "8.jpg",
  "9.jpg",
  "10.jpg",
  "11.jpg",
  "12.jpg",
  "13.jpg",
  "14.jpg",
  "15.jpg",
  "16.jpg",
  "17.jpg",
  "18.jpg",
  "20.jpg",
  "21.jpg",
  "22.jpg",
  "23.jpg",
  "24.jpg",
  "25.jpg",
  "26.jpg",
  "27.jpg",
  "28.jpg",
  "29.jpg",
  "30.jpg",
  "31.jpg",
  "32.jpg",
  "33.jpg",
  "34.jpg",
  "35.jpg",
  "36.jpg",
  "37.jpg",
  "39.jpg",
  "40.jpg",
  "41.jpg",
  "42.jpg",
  "43.jpg",
  "44.jpg",
  "45.jpg",
  "46.jpg",
  "47.jpg",
  "48.jpg",
  "49.jpg",
  "50.jpg",
  "51.jpg",
  "52.jpg",
  "53.jpg",
  "54.jpg",
  "55.jpg",
  "56.jpg",
  "70.jpg",
  "71.jpg",
  "72.jpg",
  "73.jpg",
  "74.jpg",
  "75.jpg",
  "89.jpg",
  "90.jpg",
  "91.jpg",
  "92.jpg",
  "93.jpg",
  "94.jpg",
  "108.jpg",
  "109.jpg",
  "110.jpg",
  "gallery-1.jpg",
  "gallery-10.jpg",
  "gallery-2.jpg",
  "gallery-3.jpg",
  "gallery-4.jpg",
  "gallery-5.jpg",
  "gallery-6.jpg",
  "gallery-7.jpg",
  "gallery-8.jpg",
  "gallery-9.jpg",
  "hot-1-digital-human.jpg",
  "hot-2-music.jpg",
  "hot-3-motion.jpg",
  "hot-4-faceswap.jpg",
  "hot-5-tts.jpg",
  "hot-6-article.jpg",
  "hot-7-watermark.jpg",
  "thumb-ai-chat.jpg",
  "thumb-digital-human.jpg",
  "thumb-img-gen.jpg",
];
const wideInspirationFiles = new Set([
  "7.jpg",
  "8.jpg",
  "9.jpg",
  "10.jpg",
  "12.jpg",
  "13.jpg",
  "14.jpg",
  "15.jpg",
  "16.jpg",
  "17.jpg",
  "18.jpg",
  "20.jpg",
  "21.jpg",
  "22.jpg",
  "26.jpg",
  "27.jpg",
  "28.jpg",
  "30.jpg",
  "31.jpg",
  "32.jpg",
  "33.jpg",
  "35.jpg",
  "43.jpg",
  "44.jpg",
  "45.jpg",
  "46.jpg",
  "47.jpg",
  "49.jpg",
  "50.jpg",
  "51.jpg",
  "52.jpg",
  "53.jpg",
  "55.jpg",
  "70.jpg",
  "71.jpg",
  "72.jpg",
  "73.jpg",
  "89.jpg",
  "90.jpg",
  "91.jpg",
  "94.jpg",
  "108.jpg",
  "thumb-ai-chat.jpg",
  "thumb-img-gen.jpg",
]);
const squareInspirationFiles = new Set([
  "gallery-1.jpg",
  "gallery-4.jpg",
  "gallery-5.jpg",
  "gallery-8.jpg",
]);

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
  const buckets = cards.reduce(
    (next, card) => {
      next[card.aspect || "portrait"].push(card);
      return next;
    },
    { portrait: [], square: [], wide: [] },
  );
  const nonWideCards = [];
  while (buckets.portrait.length || buckets.square.length) {
    nonWideCards.push(
      takeFirstAvailable(
        buckets,
        nonWideCards.length % 5 === 1
          ? ["square", "portrait"]
          : ["portrait", "square"],
      ),
    );
  }
  const total = cards.length;
  const baseLength = Math.floor(total / columnCount);
  const extraColumns = total % columnCount;
  const columnLengths = Array.from(
    { length: columnCount },
    (_, index) => baseLength + (index < extraColumns ? 1 : 0),
  );
  const wideTargets = columnLengths.map((length) => Math.floor(length / 2));
  let remainingWide =
    buckets.wide.length - wideTargets.reduce((sum, count) => sum + count, 0);
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

const exampleImages = caseImageFiles.map((file, index) => {
  const metadata = imageInspirationPrompts[file] || {};
  return {
    file,
    src: `/refactor/cases/${encodeURIComponent(file)}`,
    label: `案例 ${String(index + 1).padStart(2, "0")}`,
    prompt: metadata.prompt || `案例 ${String(index + 1).padStart(2, "0")}`,
    description: metadata.description || "",
    style: metadata.style || "",
    mood: metadata.mood || "",
    tags: metadata.tags || [],
    model: "图片生成",
    ratio: "案例图",
    quality: "精选",
    price: "参考",
    aspect: getInspirationAspect(file),
  };
});

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
  { id: "remove-bg", label: "智能抠图", icon: Layers },
];

const navSections = [
  { type: "item", id: "home" },
  { type: "item", id: "chat" },
  {
    type: "group",
    id: "vision",
    label: "视觉生成",
    icon: Box,
    children: ["image", "video", "face-swap", "motion"],
  },
  {
    type: "group",
    id: "avatar",
    label: "数字人",
    icon: UserRound,
    children: ["digital-human", "image-digital-human"],
  },
  {
    type: "group",
    id: "audio",
    label: "音频处理",
    icon: Music,
    children: ["voice", "music", "voice-convert"],
  },
  {
    type: "group",
    id: "marketing",
    label: "营销工具",
    icon: Send,
    children: [
      "article",
      "video-voice",
      "watermark",
      "remove-bg",
      "enhance",
      "replicate",
      "transcribe",
    ],
  },
  { type: "item", id: "assets" },
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
  "video-voice",
];

const appEntryStorageKey = "jingchuang:enter-app";
const originalFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) =>
  originalFetch(input, { credentials: "include", ...init });
const featureNavIds = navItems
  .map((item) => item.id)
  .filter((id) => id !== "home");
const featureNavIdSet = new Set(featureNavIds);
const appNavIdSet = new Set(navItems.map((item) => item.id));

function getRouteView() {
  const hashView = window.location.hash.replace(/^#\/?/, "");
  if (appNavIdSet.has(hashView)) return hashView;
  if (window.location.pathname === "/chat" || window.location.hash === "#/chat")
    return "chat";
  if (window.location.pathname === "/home" || window.location.hash === "#/home")
    return "home";
  if (
    window.location.pathname === "/image-digital-human" ||
    window.location.hash === "#/image-digital-human"
  )
    return "image-digital-human";
  if (
    window.location.pathname === "/digital-human" ||
    window.location.hash === "#/digital-human"
  )
    return "digital-human";
  if (
    window.location.pathname === "/motion-transfer" ||
    window.location.hash === "#/motion"
  )
    return "motion";
  if (
    window.location.pathname === "/face-swap" ||
    window.location.hash === "#/face-swap"
  )
    return "face-swap";
  if (
    window.location.pathname === "/watermark" ||
    window.location.hash === "#/watermark"
  )
    return "watermark";
  if (
    window.location.pathname === "/voice-conversion" ||
    window.location.hash === "#/voice-convert"
  )
    return "voice-convert";
  if (
    window.location.pathname === "/transcribe" ||
    window.location.hash === "#/transcribe"
  )
    return "transcribe";
  if (
    window.location.pathname === "/article" ||
    window.location.hash === "#/article"
  )
    return "article";
  if (
    window.location.pathname === "/music" ||
    window.location.hash === "#/music"
  )
    return "music";
  if (
    window.location.pathname === "/replicate" ||
    window.location.hash === "#/replicate"
  )
    return "replicate";
  if (
    window.location.pathname === "/enhance" ||
    window.location.hash === "#/enhance"
  )
    return "enhance";
  if (
    window.location.pathname === "/remove-bg" ||
    window.location.hash === "#/remove-bg"
  )
    return "remove-bg";
  if (
    window.location.pathname === "/voice" ||
    window.location.hash === "#/voice"
  )
    return "voice";
  if (
    window.location.pathname === "/video" ||
    window.location.hash === "#/video"
  )
    return "video";
  if (
    window.location.pathname === "/image" ||
    window.location.hash === "#/image"
  )
    return "image";
  return "splash";
}

function getInitialView() {
  const shouldEnterApp =
    window.sessionStorage.getItem(appEntryStorageKey) === "1";
  if (shouldEnterApp) {
    window.sessionStorage.removeItem(appEntryStorageKey);
    return getRouteView();
  }
  if (window.location.pathname !== "/" || window.location.hash) {
    window.history.replaceState(null, "", "/");
  }
  return "splash";
}

let tencentCaptchaScriptPromise = null;

function loadTencentCaptchaScript() {
  if (window.TencentCaptcha) {
    return Promise.resolve();
  }
  if (tencentCaptchaScriptPromise) {
    return tencentCaptchaScriptPromise;
  }

  tencentCaptchaScriptPromise = new Promise((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[src="https://turing.captcha.qcloud.com/TJCaptcha.js"]',
    );
    if (existingScript) {
      existingScript.addEventListener("load", resolve, { once: true });
      existingScript.addEventListener(
        "error",
        () => reject(new Error("验证码组件加载失败，请稍后重试")),
        { once: true },
      );
      return;
    }

    const script = document.createElement("script");
    script.src = "https://turing.captcha.qcloud.com/TJCaptcha.js";
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error("验证码组件加载失败，请稍后重试"));
    document.head.appendChild(script);
  });

  return tencentCaptchaScriptPromise;
}

function AuthDrawer({ mode, onClose, onModeChange, onSuccess }) {
  const [loginMethod, setLoginMethod] = useState("phone-code");
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
  const isRegister = renderMode === "register";
  const isForgot = renderMode === "forgot";
  const isLogin = renderMode === "login";
  const isPasswordLogin = isLogin && loginMethod === "password";
  const isPhoneCodeLogin = isLogin && loginMethod === "phone-code";

  useEffect(() => {
    if (!mode) return;
    setRenderMode(mode);
    setIsClosing(false);
    setLoginMethod("phone-code");
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
    if (captchaConfig.provider !== "tencent" || !captchaConfig.enabled || !captchaConfig.appId) {
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
            if (Number(result?.ret) === 0 && result?.ticket && result?.randstr) {
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
      return "使用手机号完成验证，注册后立即获得 1000 积分。";
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
        <div className="auth-drawer-kicker">JINGCHUANG AI ACCOUNT</div>
        <h2 id="auth-drawer-title">{getTitle()}</h2>
        <p>{getDescription()}</p>
        <form className="auth-form" onSubmit={submit}>
          {isLogin && (
            <div className="auth-method-tabs" role="tablist" aria-label="登录方式">
              <button
                type="button"
                className={`auth-method-tab ${loginMethod === "phone-code" ? "is-active" : ""}`}
                onClick={() => setLoginMethod("phone-code")}
              >
                手机号登录
              </button>
              <button
                type="button"
                className={`auth-method-tab ${loginMethod === "password" ? "is-active" : ""}`}
                onClick={() => setLoginMethod("password")}
              >
                密码登录
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
          <button className="auth-submit" type="submit" disabled={isSubmitting}>
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

function LogoutConfirmDialog({ isSubmitting, onCancel, onConfirm }) {
  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === "Escape" && !isSubmitting) {
        onCancel();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isSubmitting, onCancel]);

  return (
    <div className="logout-confirm-layer" role="presentation">
      <button
        className="logout-confirm-backdrop"
        type="button"
        aria-label="取消退出登录"
        onClick={isSubmitting ? undefined : onCancel}
      />
      <section
        className="logout-confirm-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="logout-confirm-title"
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
      </section>
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
            link.addEventListener(
              "click",
              (event) => {
                event.preventDefault();
                event.stopPropagation();
                event.stopImmediatePropagation();
                handler();
              },
              true,
            );
          });
        };
        bindLink('a[href="#signin"], a[href*="#signin"]', () =>
          onOpenAuth("login"),
        );
        bindLink('a[href="#signup"], a[href*="#signup"]', () =>
          onOpenAuth("register"),
        );
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
      <iframe
        ref={(node) => {
          frameRefs.current[0] = node;
        }}
        className="original-home-frame"
        title="Facemini AI"
        src="/new_page/studio.html?v=20260527"
        onLoad={handleFrameLoad}
      />
      <iframe
        ref={(node) => {
          frameRefs.current[1] = node;
        }}
        className="original-home-frame"
        title="椴稿垱AI首页"
        src="/new_page/page.html"
        onLoad={handleFrameLoad}
      />
    </div>
  );
});

const AppHome = memo(function AppHome({
  onOpenFeature,
  onOpenLanding,
  authUser,
  onOpenAuth,
  onLogout,
}) {
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
        const route = card.dataset.featureRoute || homeFeatureRoutes[index];
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

  const handleNavChange = useCallback(
    (id) => {
      if (id === "home") {
        window.history.pushState(null, "", "#/home");
        return;
      }
      onOpenFeature(id);
    },
    [onOpenFeature],
  );

  return (
    <div
      className={`feature-page-shell home-page-shell ${isGuest ? "is-guest" : ""}`}
    >
      <FeatureSidebar
        activeNav="home"
        onNavChange={handleNavChange}
        onOpenLanding={onOpenLanding}
        authUser={authUser}
        onOpenAuth={onOpenAuth}
        onLogout={onLogout}
      />
      {isGuest && (
        <div
          className="feature-guest-auth-actions"
          aria-label="游客璐﹀彿鍏ュ彛"
        >
          <button type="button" onClick={() => onOpenAuth("login")}>
            登录
          </button>
          <button type="button" onClick={() => onOpenAuth("register")}>
            注册
          </button>
        </div>
      )}
      <main className="feature-main home-feature-main">
        <div
          className={`original-home-shell app-home-shell ${isReady ? "is-ready" : "is-loading"}`}
        >
          <iframe
            ref={frameRef}
            className="original-home-frame"
            title="Facemini.com ??"
            src="/refactor/index.html"
            onLoad={handleFrameLoad}
          />
        </div>
      </main>
    </div>
  );
});

const FeatureSidebar = memo(function FeatureSidebar({
  activeNav,
  onNavChange,
  onOpenLanding,
  authUser,
  onOpenAuth,
  onLogout,
}) {
  const isLoadingUser = !authUser;
  const isGuest = Boolean(authUser?.isGuest);
  const [query, setQuery] = useState("");
  const [openGroups, setOpenGroups] = useState(() => ({
    vision: true,
    avatar: true,
    audio: true,
    marketing: true,
  }));
  const normalizedQuery = query.trim().toLowerCase();

  const getNavItem = useCallback(
    (id) => navItems.find((item) => item.id === id),
    [],
  );
  const isVisible = useCallback(
    (item) => {
      if (!normalizedQuery) return true;
      return (
        item?.label?.toLowerCase().includes(normalizedQuery) ||
        item?.id?.toLowerCase().includes(normalizedQuery)
      );
    },
    [normalizedQuery],
  );

  const toggleGroup = useCallback((id) => {
    setOpenGroups((current) => ({ ...current, [id]: !current[id] }));
  }, []);

  return (
    <aside className="feature-sidebar">
      <button
        className="feature-brand"
        type="button"
        onClick={onOpenLanding}
        aria-label="返回 Facemini 首页"
      >
        <span className="feature-brand-text">Facemini</span>
        <span className="feature-brand-beta">Beta</span>
      </button>
      <label className="feature-nav-search">
        <Search size={16} />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          type="search"
          placeholder="搜索..."
        />
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
                <button
                  className={`feature-nav-item ${active ? "is-active" : ""}`}
                  onClick={() => onNavChange(item.id)}
                  type="button"
                >
                  <Icon size={18} strokeWidth={1.9} />
                  <span>{item.label}</span>
                </button>
              </div>
            );
          }

          if (section.type === "external") {
            if (
              normalizedQuery &&
              !section.label.toLowerCase().includes(normalizedQuery) &&
              !section.id.toLowerCase().includes(normalizedQuery)
            )
              return null;
            const Icon = section.icon;
            return (
              <div className="feature-nav-section" key={section.id}>
                <button
                  className="feature-nav-item"
                  onClick={() =>
                    window.open(section.href, "_blank", "noopener,noreferrer")
                  }
                  type="button"
                >
                  <Icon size={18} strokeWidth={1.9} />
                  <span>{section.label}</span>
                </button>
              </div>
            );
          }

          const children = section.children
            .map(getNavItem)
            .filter(Boolean)
            .filter(isVisible);
          const hasActiveChild = section.children.includes(activeNav);
          if (!children.length && normalizedQuery) return null;
          const GroupIcon = section.icon;
          const isOpen = Boolean(
            openGroups[section.id] || hasActiveChild || normalizedQuery,
          );
          return (
            <div
              className="feature-nav-section feature-nav-section--group"
              key={section.id}
            >
              <button
                className={`feature-nav-group ${hasActiveChild ? "is-active" : ""} ${isOpen ? "is-open" : ""}`}
                type="button"
                onClick={() => toggleGroup(section.id)}
              >
                <GroupIcon size={18} strokeWidth={1.9} />
                <span>{section.label}</span>
                <ChevronDown className="feature-nav-chevron" size={16} />
              </button>
              <div
                className={`feature-nav-children ${isOpen ? "is-open" : ""}`}
              >
                {children.map((item) => {
                  const Icon = item.icon;
                  const active = activeNav === item.id;
                  return (
                    <button
                      className={`feature-nav-child ${active ? "is-active" : ""}`}
                      key={item.id}
                      onClick={() => onNavChange(item.id)}
                      type="button"
                    >
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
        <button
          className="feature-login"
          type="button"
          onClick={() => onOpenAuth("login")}
        >
          <LogIn size={16} />
          <span>登录</span>
        </button>
      ) : (
        <div className={`feature-user-panel ${isGuest ? "is-guest" : ""}`}>
          <div className="feature-user-avatar">
            <UserRound size={17} />
          </div>
          <div className="feature-user-copy">
            <strong>
              {isGuest ? "游客" : authUser.displayName}
            </strong>
            {!isGuest && (
              <>
                <span className="feature-user-credit-text">积分 {authUser.credits ?? "-"}</span>
              </>
            )}
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
  const current = useMemo(
    () => navItems.find((item) => item.id === activeNav),
    [activeNav],
  );
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
const paymentCodeTtlSeconds = 3 * 60;
const paymentResultTtlSeconds = 5;
const paymentProviderOptions = [
  { value: "alipay", label: "支付宝支付" },
  { value: "wechat", label: "微信支付" },
];

function paymentProviderText(provider) {
  return paymentProviderOptions.find((item) => item.value === provider)?.label || "支付宝支付";
}

function paymentProviderOrderTitle(provider) {
  return provider === "wechat" ? "微信订单码" : "支付宝订单码";
}

function formatPaymentCountdown(seconds) {
  const safeSeconds = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function getPaymentExpiresAt(order) {
  const expiresInSeconds = Number(order?.expiresInSeconds);
  if (Number.isFinite(expiresInSeconds)) {
    return Date.now() + Math.max(0, expiresInSeconds) * 1000;
  }
  return Date.now() + paymentCodeTtlSeconds * 1000;
}

const finalPaymentStatuses = new Set([
  "PAID",
  "CLOSED",
  "CANCELED",
  "REFUNDED",
  "AMOUNT_MISMATCH",
]);

function paymentStatusText(status) {
  return (
    {
      CREATED: "已创建",
      QR_READY: "待扫码",
      WAITING_PAYMENT: "待支付",
      SCANNED: "已扫码",
      PAID: "已到账",
      CLOSED: "已关闭",
      CANCELED: "已取消",
      AMOUNT_MISMATCH: "异常",
    }[status] ||
    status ||
    "-"
  );
}

function paymentResultInfo(status) {
  return (
    {
      PAID: {
        tone: "success",
        title: "支付成功",
        message: "积分已到账，资产余额已刷新",
        icon: CheckCircle2,
      },
      CLOSED: {
        tone: "cancel",
        title: "订单已关闭",
        message: "订单已关闭，未产生积分变动",
        icon: X,
      },
      CANCELED: {
        tone: "cancel",
        title: "已取消支付",
        message: "已关闭订单码弹窗，未确认支付结果",
        icon: X,
      },
      EXPIRED: {
        tone: "cancel",
        title: "订单码已过期",
        message: "订单码有效期已结束，请重新发起充值",
        icon: Timer,
      },
      AMOUNT_MISMATCH: {
        tone: "danger",
        title: "支付异常",
        message: "订单金额校验异常，请联系管理员处理",
        icon: CircleAlert,
      },
      REFUNDED: {
        tone: "cancel",
        title: "订单已退款",
        message: "订单已退款，积分变动以收支记录为准",
        icon: RefreshCcw,
      },
    }[status] || {
      tone: "danger",
      title: "支付失败",
      message: "暂未完成支付，请稍后在充值订单中确认状态",
      icon: CircleAlert,
    }
  );
}

const txTypeMap = {
  grant: { label: "系统赠送", color: "#a855f7" },
  debit: { label: "消费扣费", color: "#dc2626" },
  refund: { label: "积分退回", color: "#2563eb" },
  recharge: { label: "充值到账", color: "#16a34a" },
};

const transactionsPageSize = 20;

function AssetsPage({ authUser, onOpenAuth }) {
  const isGuest = Boolean(authUser?.isGuest);
  const [credits, setCredits] = useState(null);
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState(1);
  const [activePreset, setActivePreset] = useState(1);
  const [paymentProvider, setPaymentProvider] = useState("alipay");
  const [activeTab, setActiveTab] = useState("recharge");
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [paymentDialog, setPaymentDialog] = useState(null);
  const [paymentCountdown, setPaymentCountdown] = useState(paymentCodeTtlSeconds);
  const [paymentResultDialog, setPaymentResultDialog] = useState(null);
  const [paymentResultCountdown, setPaymentResultCountdown] = useState(paymentResultTtlSeconds);

  const points = Math.max(1, Number(amount) || 1) * 100;
  const recentRechargeOrders = useMemo(() => {
    const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return orders
      .filter((order) => {
        const createdAt = new Date(order.createdAt).getTime();
        return Number.isFinite(createdAt) && createdAt >= oneMonthAgo;
      })
      .slice(0, 10);
  }, [orders]);
  const transactionsTotalPages = Math.max(
    1,
    Math.ceil(transactions.length / transactionsPageSize),
  );
  const visibleTransactions = useMemo(() => {
    const start = (transactionsPage - 1) * transactionsPageSize;
    return transactions.slice(start, start + transactionsPageSize);
  }, [transactions, transactionsPage]);

  const refreshAssets = useCallback(async () => {
    if (isGuest) return;
    setIsLoading(true);
    setError("");
    try {
      const [creditsState, orderState, txState] = await Promise.all([
        paymentApi.getCredits(),
        paymentApi.listOrders(),
        paymentApi.getCreditTransactions(),
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
    setTransactionsPage((page) => Math.min(page, transactionsTotalPages));
  }, [transactionsTotalPages]);

  function showPaymentResult(order, statusOverride) {
    const isExpiredClosedOrder =
      order?.status === "CLOSED" && String(order?.statusMessage || "").includes("超时");
    const status = statusOverride || (isExpiredClosedOrder ? "EXPIRED" : order?.status) || "CLOSED";
    const info = paymentResultInfo(status);
    setPaymentDialog(null);
    setPaymentResultCountdown(paymentResultTtlSeconds);
    setPaymentResultDialog({
      order,
      status,
      ...info,
    });
  }

  useEffect(() => {
    if (!paymentDialog || finalPaymentStatuses.has(paymentDialog.order?.status))
      return undefined;
    let alive = true;
    const sync = async () => {
      try {
        const order = await paymentApi.syncOrder(
          paymentDialog.order.outTradeNo,
          paymentDialog.orderToken,
        );
        if (!alive) return;
        if (finalPaymentStatuses.has(order.status)) {
          await refreshAssets();
          if (alive) showPaymentResult(order);
          return;
        }
        setPaymentDialog((current) =>
          current ? { ...current, order } : current,
        );
      } catch (nextError) {
        if (alive)
          setPaymentDialog((current) =>
            current ? { ...current, error: nextError.message } : current,
          );
      }
    };
    const timer = window.setInterval(sync, 3000);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [
    paymentDialog?.order?.outTradeNo,
    paymentDialog?.orderToken,
    paymentDialog?.order?.status,
    refreshAssets,
  ]);

  useEffect(() => {
    if (!paymentDialog) return undefined;
    if (finalPaymentStatuses.has(paymentDialog.order?.status)) {
      showPaymentResult(paymentDialog.order);
      return undefined;
    }
    const expiresAt = paymentDialog.expiresAt || getPaymentExpiresAt(paymentDialog.order);
    const tick = () => {
      const nextSeconds = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setPaymentCountdown(nextSeconds);
      if (nextSeconds <= 0) {
        const expiredOrder = {
          ...paymentDialog.order,
          status: "CLOSED",
          statusMessage: "订单已超时，未完成支付",
        };
        showPaymentResult(expiredOrder, "EXPIRED");
        paymentApi
          .syncOrder(paymentDialog.order.outTradeNo, paymentDialog.orderToken)
          .then(refreshAssets)
          .catch(() => {});
      }
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [
    paymentDialog?.expiresAt,
    paymentDialog?.order?.outTradeNo,
    paymentDialog?.order?.status,
  ]);

  useEffect(() => {
    if (!paymentResultDialog) return undefined;
    setPaymentResultCountdown(paymentResultTtlSeconds);
    const openedAt = Date.now();
    const timer = window.setInterval(() => {
      const nextSeconds = Math.max(0, paymentResultTtlSeconds - Math.floor((Date.now() - openedAt) / 1000));
      setPaymentResultCountdown(nextSeconds);
      if (nextSeconds <= 0) {
        window.clearInterval(timer);
        setPaymentResultDialog(null);
      }
    }, 1000);
    return () => window.clearInterval(timer);
  }, [paymentResultDialog?.status, paymentResultDialog?.order?.outTradeNo]);

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
      const created = await paymentApi.createOrder(Number(amount), paymentProvider);
      const qrState = await paymentApi.getQrCode(
        created.order.outTradeNo,
        created.orderToken,
      );
      if (finalPaymentStatuses.has(qrState.order?.status)) {
        showPaymentResult(qrState.order);
        await refreshAssets();
        return;
      }
      setPaymentDialog({
        order: qrState.order,
        orderToken: created.orderToken,
        qrCodeDataUrl: qrState.qrCodeDataUrl,
        provider: qrState.order?.provider || paymentProvider,
        expiresAt: getPaymentExpiresAt(qrState.order),
        error: "",
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
        </div>
        <button
          className="assets-icon-button"
          type="button"
          onClick={refreshAssets}
          disabled={isLoading || isGuest}
          aria-label="刷新资产"
        >
          <RefreshCcw size={18} className={isLoading ? "is-spinning" : ""} />
        </button>
      </header>

      {isGuest ? (
        <div className="assets-login-panel">
          <Wallet size={32} />
          <strong>登录后查看资产</strong>
          <p>登录后可查看积分余额、充值记录和消费明细</p>
          <button type="button" onClick={() => onOpenAuth("login")}>
            登录
          </button>
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
              <button type="button" onClick={() => setActiveTab("transactions")}>
                <History size={18} />
                收支记录
              </button>
            </div>
          </div>

          {activeTab === "recharge" && (
            <div className="assets-recharge-panel">
              <div className="assets-section-title">
                <Wallet size={18} />
                <strong>在线充值</strong>
              </div>
              <div className="assets-presets">
                {rechargePresets.map((value) => (
                  <button
                    className={activePreset === value ? "is-active" : ""}
                    key={value}
                    type="button"
                    onClick={() => selectPreset(value)}
                  >
                    <span>{value} 元</span>
                    <small>{value * 100} 积分</small>
                  </button>
                ))}
              </div>
              <label className="assets-custom-amount">
                <span>自定义金额</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(event) => updateAmount(event.target.value)}
                />
                <em>{points} 积分</em>
              </label>
              <div className="assets-payment-method-row">
                <span>支付方式</span>
                <div className="assets-payment-methods" aria-label="选择支付方式">
                  {paymentProviderOptions.map((option) => (
                    <button
                      className={paymentProvider === option.value ? "is-active" : ""}
                      key={option.value}
                      type="button"
                      onClick={() => setPaymentProvider(option.value)}
                    >
                      <Wallet size={16} />
                      <span>{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              {error && <div className="assets-error">{error}</div>}
              <button
                className="assets-primary-action"
                type="button"
                onClick={createOrder}
                disabled={isCreating}
              >
                {isCreating ? (
                  <Loader2 size={18} className="is-spinning" />
                ) : (
                  <Wallet size={18} />
                )}
                <span>立即支付</span>
              </button>

              <div className="assets-orders-section">
                <div className="assets-section-title">
                  <FileText size={18} />
                  <strong>近期充值订单</strong>
                </div>
                <div className="assets-order-list">
                  {recentRechargeOrders.length ? (
                    recentRechargeOrders.map((order) => (
                      <div
                        className={`assets-order-row status-${order.status}`}
                        key={order.outTradeNo}
                      >
                        <div>
                          <strong>{order.totalAmount} 元</strong>
                          <span>{paymentProviderText(order.provider)} · {order.outTradeNo}</span>
                        </div>
                        <div>
                          <strong>{order.points} 积分</strong>
                          <span>{paymentStatusText(order.status)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="assets-empty-state">近一个月暂无充值订单</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === "transactions" && (
            <div className="assets-transactions-panel">
              <div className="assets-section-title">
                <History size={18} />
                <strong>收支记录</strong>
              </div>
              {transactions.length ? (
                <>
                  <div className="assets-transactions-table">
                    <div className="assets-transactions-header">
                      <span>时间</span>
                      <span>类型</span>
                      <span>变动</span>
                      <span>余额</span>
                      <span>备注</span>
                    </div>
                    {visibleTransactions.map((tx) => {
                      const typeInfo = txTypeMap[tx.type] || {
                        label: tx.type,
                        color: "#64748b",
                      };
                      const isIncome =
                        tx.type === "recharge" ||
                        tx.type === "refund" ||
                        tx.type === "grant";
                      return (
                        <div className="assets-transaction-row" key={tx.id}>
                          <span>
                            {new Date(tx.createdAt).toLocaleString("zh-CN")}
                          </span>
                          <span style={{ color: typeInfo.color }}>
                            {typeInfo.label}
                          </span>
                          <span
                            style={{
                              color: isIncome ? "#16a34a" : "#dc2626",
                              fontWeight: 700,
                            }}
                          >
                            {isIncome ? "+" : ""}
                            {tx.amount}
                          </span>
                          <span>{tx.balanceAfter}</span>
                          <span title={tx.memo}>{tx.memo || "-"}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="assets-pagination">
                    <span>
                      第 {transactionsPage} / {transactionsTotalPages} 页
                    </span>
                    <div>
                      <button
                        type="button"
                        onClick={() => setTransactionsPage((page) => Math.max(1, page - 1))}
                        disabled={transactionsPage <= 1}
                      >
                        上一页
                      </button>
                      <button
                        type="button"
                        onClick={() => setTransactionsPage((page) => Math.min(transactionsTotalPages, page + 1))}
                        disabled={transactionsPage >= transactionsTotalPages}
                      >
                        下一页
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="assets-empty-state">暂无收支记录</div>
              )}
            </div>
          )}
        </>
      )}

      {paymentDialog && (
        <div
          className="assets-payment-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={`${paymentProviderText(paymentDialog.order?.provider || paymentDialog.provider)}二维码`}
        >
          <div className="assets-payment-dialog">
            <button
              className="assets-dialog-close"
              type="button"
              onClick={() => showPaymentResult(paymentDialog.order, "CANCELED")}
              aria-label="关闭"
            >
              <X size={18} />
            </button>
            <div className="assets-payment-dialog-head">
              <span>{paymentProviderText(paymentDialog.order?.provider || paymentDialog.provider)}</span>
              <strong>
                {paymentDialog.order?.status === "PAID"
                  ? "充值成功"
                  : paymentProviderOrderTitle(paymentDialog.order?.provider || paymentDialog.provider)}
              </strong>
            </div>
            <div className="assets-qr-box">
              {paymentDialog.qrCodeDataUrl ? (
                <img src={paymentDialog.qrCodeDataUrl} alt={`${paymentProviderText(paymentDialog.order?.provider || paymentDialog.provider)}充值二维码`} />
              ) : (
                <Loader2 size={28} className="is-spinning" />
              )}
            </div>
            <div className="assets-dialog-meta-card">
              <span>订单号</span>
              <strong>{paymentDialog.order?.outTradeNo}</strong>
              <span>支付金额</span>
              <em>¥ {Number(paymentDialog.order?.totalAmount || 0).toFixed(0)}</em>
              <span>到账积分</span>
              <strong>{Number(paymentDialog.order?.points || 0).toLocaleString("zh-CN")} 积分</strong>
            </div>
            <div className="assets-dialog-countdown">
              <span>订单码有效期</span>
              <strong>{formatPaymentCountdown(paymentCountdown)}</strong>
            </div>
            {paymentDialog.error && (
              <div className="assets-error">{paymentDialog.error}</div>
            )}
          </div>
        </div>
      )}

      {paymentResultDialog && (
        <div
          className="assets-payment-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label={paymentResultDialog.title}
        >
          <div className={`assets-payment-result-dialog tone-${paymentResultDialog.tone}`}>
            <button
              className="assets-dialog-close"
              type="button"
              onClick={() => setPaymentResultDialog(null)}
              aria-label="关闭"
            >
              <X size={18} />
            </button>
            <div className="assets-result-icon">
              {React.createElement(paymentResultDialog.icon, { size: 30 })}
            </div>
            <div className="assets-payment-dialog-head">
              <span>{paymentProviderText(paymentResultDialog.order?.provider || paymentProvider)}</span>
              <strong>{paymentResultDialog.title}</strong>
            </div>
            <p className="assets-result-message">{paymentResultDialog.message}</p>
            {paymentResultDialog.order?.outTradeNo && (
              <div className="assets-dialog-meta-card">
                <span>订单号</span>
                <strong>{paymentResultDialog.order.outTradeNo}</strong>
                <span>支付金额</span>
                <em>¥ {Number(paymentResultDialog.order.totalAmount || 0).toFixed(0)}</em>
                <span>订单状态</span>
                <strong>{paymentStatusText(paymentResultDialog.status)}</strong>
              </div>
            )}
            <div className="assets-dialog-countdown">
              <span>弹窗自动关闭</span>
              <strong>{paymentResultCountdown}s</strong>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function ResultCard({
  card,
  onDelete,
  onFavorite,
  onRegenerate,
  onPreview,
  isExample = false,
  isImageGallery = false,
  isSelected = false,
}) {
  const isProcessing =
    card.status === "pending" || card.status === "processing";
  const isFailed = card.status === "failed";
  const canPreview = Boolean(
    card.image && onPreview && !isProcessing && !isFailed,
  );
  const shouldShowPlaceholder = isProcessing || isFailed || !card.image;

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
      <div
        className={`result-preview ${card.grid ? "preview-grid" : ""} ${shouldShowPlaceholder ? "is-placeholder-preview" : ""}`}
      >
        {isProcessing && <div className="processing-state">生成中...</div>}
        {isFailed && <div className="failed-state">生成失败</div>}
        {!isProcessing && !isFailed && card.image ? (
          card.grid ? (
            <>
              <PreloadImage src={card.image} alt={card.prompt} />
              <PreloadImage src="/assets/image/gallery-3.jpg" alt={card.prompt} />
              <PreloadImage src="/assets/image/gallery-4.jpg" alt={card.prompt} />
              <PreloadImage src="/assets/image/gallery-5.jpg" alt={card.prompt} />
            </>
          ) : (
            <PreloadImage src={card.image} alt={card.prompt} />
          )
        ) : null}
        {canPreview && isImageGallery && (
          <button
            className="result-preview-hitarea"
            type="button"
            onClick={() => onPreview(card)}
            aria-label="放大查看图片"
          >
            <Maximize2 size={18} />
          </button>
        )}
        {card.referenceImageUrl && (
          <span className="result-reference-thumb" title="参考图">
            <img src={card.referenceImageUrl} alt="" />
          </span>
        )}
        {!isProcessing && !isFailed && !card.image && (
          <span className="broken-image-mark" aria-hidden="true" />
        )}
      </div>
      <div className="result-meta">
        <div className="tag-row">
          {!isImageGallery && <span className="model-tag">{card.model}</span>}
          {!isImageGallery && <span className="ratio-tag">{card.ratio}</span>}
          {!isImageGallery && (
            <span className="quality-tag">{card.quality}</span>
          )}
          {card.referenceImageUrl && !isImageGallery && (
            <span className="reference-tag">参考图</span>
          )}
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
            <p>{card.error || card.title || card.prompt}</p>
            <strong>{card.price}</strong>
          </div>
        ) : (
          <>
            <p>{card.error || card.prompt}</p>
            <div className="card-actions">
              <button
                className={`icon-circle ${card.favorite ? "is-favorite" : ""}`}
                type="button"
                onClick={() => onFavorite(card.id)}
                aria-label="收藏"
                disabled={isExample}
              >
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
              <button
                type="button"
                onClick={() => onRegenerate(card.id)}
                disabled={isExample}
              >
                <RefreshCcw size={15} />
                再次生成
              </button>
              <button
                type="button"
                onClick={() => onDelete(card.id)}
                disabled={isExample}
              >
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
          <strong title={image?.originalName || "参考图"}>
            {image?.originalName || "参考图"}
          </strong>
          <small>{formatReferenceImageSize(image?.size)}</small>
        </span>
        <button type="button" onClick={onRemove} aria-label="移除参考图">
          <X size={12} />
        </button>
      </div>
    </div>
  );
}

function ComposerBar({
  options,
  onSubmit,
  placement = "sticky",
  collapsed = false,
  onFocus,
  onBlur,
  seed,
  resetSignal = 0,
  shellRef,
}) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(options.models[0]?.value || "");
  const [ratio, setRatio] = useState(options.ratios[0] || "");
  const [quality, setQuality] = useState(options.qualities[0]?.value || "");
  const [referenceImage, setReferenceImage] = useState(null);
  const [isUploadingReference, setIsUploadingReference] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const referenceInputRef = useRef(null);
  const previousResetSignalRef = useRef(resetSignal);

  function showToast(message) {
    setToastMessage(message);
  }

  useEffect(() => {
    if (!seed) return;
    setPrompt(seed.prompt || "");
    setReferenceImage(seed.referenceImage || null);
    if (seed.model && options.models.some((item) => item.value === seed.model)) {
      setModel(seed.model);
    }
    if (seed.ratio && options.ratios.includes(seed.ratio)) {
      setRatio(seed.ratio);
    }
    if (
      seed.quality &&
      options.qualities.some((item) => item.value === seed.quality)
    ) {
      setQuality(seed.quality);
    }
  }, [options.models, options.qualities, options.ratios, seed]);

  useEffect(() => {
    if (previousResetSignalRef.current === resetSignal) return;
    previousResetSignalRef.current = resetSignal;
    setPrompt("");
    setReferenceImage(null);
    setToastMessage("");
  }, [resetSignal]);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timer = window.setTimeout(() => setToastMessage(""), 2000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (!model && options.models[0]) setModel(options.models[0].value);
    if (!ratio && options.ratios[0]) setRatio(options.ratios[0]);
    if (!quality && options.qualities[0])
      setQuality(options.qualities[0].value);
  }, [model, options, quality, ratio]);

  const count = 1;
  const price = imageApi.calculatePrice({
    model,
    quality,
    count,
    models: options.models,
    qualities: options.qualities,
  });
  const canSubmit = prompt.trim().length > 0 && !isUploadingReference;

  function clearPrompt() {
    setPrompt("");
    setReferenceImage(null);
  }

  function fillRandomPrompt() {
    setPrompt(imageApi.getRandomPrompt());
  }

  async function handleReferenceSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingReference(true);
    try {
      const uploaded = await imageApi.uploadReference(file);
      setReferenceImage({
        url: uploaded.referenceImageUrl || uploaded.url,
        originalName: uploaded.originalName || file.name,
        size: uploaded.size || file.size,
        mimeType: uploaded.mimeType || file.type,
      });
    } catch (error) {
      showToast(error.message || "参考图上传失败，请重试");
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
  }

  function submitPrompt() {
    if (!canSubmit) {
      showToast(
        isUploadingReference ? "参考图上传完成后再生成" : "请先输入图片描述",
      );
      return;
    }

    if (referenceImage && model !== "gpt_image_2") {
      showToast("当前模型暂不支持参考图，请切换 GPT Image 2");
      return;
    }

    onSubmit({
      prompt: prompt.trim(),
      model,
      ratio,
      quality,
      count,
      referenceImageUrl: referenceImage?.url || null,
    });
    setPrompt("");
    setReferenceImage(null);
  }

  return (
    <div
      ref={shellRef}
      className={`sowa-composer image-composer-shell is-${placement} ${collapsed ? "is-collapsed" : ""}`}
      aria-label="图片生成输入框"
      onFocus={onFocus}
      onBlur={onBlur}
    >
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
          if (toastMessage) setToastMessage("");
        }}
        onSubmit={submitPrompt}
        canSubmit={canSubmit}
        notice=""
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
        collapsed={collapsed}
        dropdownPlacement={placement === "inline" ? "bottom" : "top"}
        referenceSlot={
          <ReferenceImageSlot
            image={referenceImage}
            isUploading={isUploadingReference}
            onRemove={removeReferenceImage}
          />
        }
      />
      {toastMessage && (
        <div className="image-composer-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

function ImageGenerationWorkbench({
  tasks,
  historyThreads,
  selectedTask,
  contextTasks,
  activeTask,
  activePrompt,
  submitError,
  isSubmitting,
  options,
  composerSeed,
  resetSignal,
  onSubmit,
  onSelect,
  onNewContext,
  onPreview,
  onDownload,
  onReference,
  onRegenerate,
}) {
  const contextRef = useRef(null);
  const contextTask = activeTask || selectedTask;
  const threadTasks = contextTasks?.length
    ? contextTasks
    : contextTask
      ? [contextTask]
      : [];
  const threadSignature = threadTasks
    .map((task) => `${task.id}:${task.status}:${task.image || ""}`)
    .join("|");
  const hasThreadProcessing = threadTasks.some(
    (task) => task.status === "pending" || task.status === "processing",
  );
  const empty = threadTasks.length === 0 && !activePrompt && !submitError;
  const scrollContextToLatest = useCallback((behavior = "smooth") => {
    const context = contextRef.current;
    if (!context) return;
    window.requestAnimationFrame(() => {
      context.scrollTo({
        top: context.scrollHeight,
        behavior,
      });
    });
  }, []);

  useEffect(() => {
    scrollContextToLatest();
  }, [
    activePrompt,
    empty,
    isSubmitting,
    scrollContextToLatest,
    submitError,
    threadSignature,
  ]);

  return (
    <div className="image-workbench-layout">
      <main className="image-workbench-main" aria-label="图片生成上下文工作台">
        <div className="image-workbench-context" ref={contextRef}>
          {empty && (
            <div className="image-workbench-empty">
              <span className="image-workbench-empty-icon">
                <Sparkles size={24} />
              </span>
              <h2>开启新的图片创作</h2>
            </div>
          )}

          {threadTasks.map((task) => {
            const taskProcessing =
              task.status === "pending" || task.status === "processing";
            const taskFailed = task.status === "failed";
            const taskCompleted = task.status === "completed" && task.image;
            return (
              <article className="image-workbench-thread-item" key={task.id}>
                {task.prompt && (
                  <div className="image-workbench-prompt">
                    <p>{task.prompt}</p>
                  </div>
                )}

                {taskProcessing && (
                  <div className="image-workbench-status is-processing" role="status" aria-live="polite">
                    <Loader2 size={18} />
                    <strong>图片正在生成中</strong>
                  </div>
                )}

                {taskFailed && (
                  <div className="image-workbench-status is-failed" role="status">
                    <CircleAlert size={24} />
                    <strong>这次没有生成成功</strong>
                    <p>{task.error || "图片生成遇到问题，请稍后重试。"}</p>
                    <button type="button" onClick={() => onRegenerate(task.id)}>
                      <RefreshCcw size={16} />
                      重新生成
                    </button>
                  </div>
                )}

                {taskCompleted && (
                  <div className="image-workbench-result">
                    <button
                      className="image-workbench-result-image"
                      type="button"
                      onClick={() => onPreview(task)}
                      aria-label="查看生成图片"
                    >
                      <img
                        src={task.image}
                        alt={task.prompt}
                        onLoad={() => scrollContextToLatest("auto")}
                      />
                    </button>
                    <div className="image-workbench-result-meta">
                      <p>以上内容由 AI 生成，本次消耗 {task.price || "积分"}</p>
                      <div className="image-workbench-actions">
                        <a href={task.image} download onClick={() => onDownload?.(task)}>
                          <Download size={16} />
                          下载
                        </a>
                        <button type="button" onClick={() => onReference(task)}>
                          <Copy size={16} />
                          引用
                        </button>
                        <button type="button" onClick={() => onRegenerate(task.id)}>
                          <RefreshCcw size={16} />
                          重新生成
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </article>
            );
          })}

          {isSubmitting && activePrompt && !threadTasks.some((task) => task.prompt === activePrompt) && (
            <div className="image-workbench-prompt">
              <p>{activePrompt}</p>
            </div>
          )}

          {isSubmitting && !hasThreadProcessing && (
            <div className="image-workbench-status is-processing" role="status" aria-live="polite">
              <Loader2 size={18} />
              <strong>图片正在生成中</strong>
            </div>
          )}

          {submitError && !contextTask && (
            <div className="image-workbench-status is-failed" role="status">
              <CircleAlert size={26} />
              <strong>这次没有生成成功</strong>
              <p>{submitError || "图片生成遇到问题，请稍后重试。"}</p>
            </div>
          )}
        </div>

        {options.models.length > 0 && (
          <ComposerBar
            key="image-workbench-composer"
            options={options}
            onSubmit={onSubmit}
            placement="workbench"
            collapsed={false}
            seed={composerSeed}
            resetSignal={resetSignal}
          />
        )}
      </main>

      <aside className="image-workbench-history" aria-label="图片生成历史记录">
        <div className="image-workbench-history-head">
          <div>
            <span>生成</span>
            <strong>历史记录</strong>
          </div>
          <button type="button" onClick={onNewContext}>
            <Plus size={16} />
            新创作
          </button>
        </div>
        <div className="image-workbench-history-list">
          {historyThreads.length ? (
            historyThreads.map((thread) => {
              const task = thread.latestTask;
              const isSelected = thread.ids.includes(contextTask?.id);
              const isTaskProcessing =
                task.status === "pending" || task.status === "processing";
              const isTaskFailed = task.status === "failed";
              return (
                <button
                  className={`image-workbench-history-item ${isSelected ? "is-selected" : ""}`}
                  key={thread.id}
                  type="button"
                  onClick={() => onSelect(thread.id)}
                >
                  <span className="image-workbench-history-thumb">
                    {task.image && !isTaskFailed ? (
                      <img src={task.image} alt="" />
                    ) : isTaskProcessing ? (
                      <Loader2 size={18} />
                    ) : (
                      <Image size={18} />
                    )}
                  </span>
                  <span className="image-workbench-history-copy">
                    <strong>{task.prompt || "未命名图片任务"}</strong>
                    <small>
                      {isTaskProcessing
                        ? "生成中"
                        : isTaskFailed
                          ? "生成失败"
                          : thread.count > 1
                            ? `${thread.count} 条上下文 · ${task.time || "已完成"}`
                            : task.time || task.ratio || "已完成"}
                    </small>
                  </span>
                </button>
              );
            })
          ) : (
            <div className="image-workbench-history-empty">
              <span>暂无生成记录</span>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

const emptyOptions = { models: [], ratios: [], qualities: [], counts: [] };
const imageGenerationSessionKey = "jingchuang:image-generation-session";
const imageGenerationThreadsKey = "jingchuang:image-generation-threads";

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
    window.sessionStorage.setItem(
      imageGenerationSessionKey,
      JSON.stringify(next),
    );
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

function createImageThreadId() {
  const uuid = window.crypto?.randomUUID?.();
  return uuid
    ? `image-thread-${uuid}`
    : `image-thread-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function readImageGenerationThreads() {
  try {
    const cached = window.sessionStorage.getItem(imageGenerationThreadsKey);
    return cached ? JSON.parse(cached) : {};
  } catch {
    return {};
  }
}

function writeImageGenerationThread(ids) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return uniqueIds;
  try {
    const threads = readImageGenerationThreads();
    uniqueIds.forEach((id) => {
      threads[id] = uniqueIds;
    });
    window.sessionStorage.setItem(
      imageGenerationThreadsKey,
      JSON.stringify(threads),
    );
  } catch {
    // Ignore storage errors; the in-memory state still drives the current view.
  }
  return uniqueIds;
}

function getTaskReferenceUrl(task) {
  return (
    task?.referenceImageUrl ||
    task?.referenceImage?.url ||
    task?.referenceUrl ||
    task?.sourceImageUrl ||
    null
  );
}

function getTaskThreadId(task) {
  return typeof task?.threadId === "string" && task.threadId.trim()
    ? task.threadId.trim()
    : null;
}

function resolveThreadIdFromTaskIds(ids, tasks) {
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  for (const id of ids) {
    const threadId = getTaskThreadId(taskMap.get(id));
    if (threadId) return threadId;
  }
  return null;
}

function resolveImageThreadIds(taskId, tasks) {
  if (!taskId) return [];
  const stored = readImageGenerationThreads();
  const storedIds = Array.isArray(stored[taskId]) ? stored[taskId] : [];
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const selectedTask = taskMap.get(taskId);
  const selectedThreadId = getTaskThreadId(selectedTask);
  const imageToId = new Map(
    tasks.filter((task) => task.image).map((task) => [task.image, task.id]),
  );
  const related = new Set(storedIds.filter((id) => taskMap.has(id)));
  related.add(taskId);
  if (selectedThreadId) {
    tasks.forEach((task) => {
      if (getTaskThreadId(task) === selectedThreadId) {
        related.add(task.id);
      }
    });
  }

  let changed = true;
  while (changed) {
    changed = false;
    tasks.forEach((task) => {
      const referenceUrl = getTaskReferenceUrl(task);
      const parentId = referenceUrl ? imageToId.get(referenceUrl) : null;
      if (parentId && related.has(parentId) && !related.has(task.id)) {
        related.add(task.id);
        changed = true;
      }
      if (parentId && related.has(task.id) && !related.has(parentId)) {
        related.add(parentId);
        changed = true;
      }
    });
  }

  const ids = [...related];
  if (storedIds.length) {
    const storedOrder = storedIds.filter((id) => related.has(id));
    ids.forEach((id) => {
      if (!storedOrder.includes(id)) storedOrder.push(id);
    });
    return storedOrder;
  }
  return tasks
    .filter((task) => ids.includes(task.id))
    .map((task) => task.id)
    .reverse();
}

function buildImageHistoryThreads(tasks) {
  const stored = readImageGenerationThreads();
  const taskMap = new Map(tasks.map((task) => [task.id, task]));
  const visited = new Set();
  const threads = [];

  tasks.forEach((task) => {
    if (visited.has(task.id)) return;
    const storedIds = Array.isArray(stored[task.id]) ? stored[task.id] : [];
    const threadId = getTaskThreadId(task);
    const ids = threadId
      ? tasks
          .filter((item) => getTaskThreadId(item) === threadId)
          .map((item) => item.id)
          .reverse()
      : storedIds.length
        ? storedIds.filter((id) => taskMap.has(id))
        : resolveImageThreadIds(task.id, tasks);
    const uniqueIds = [...new Set(ids.length ? ids : [task.id])];
    uniqueIds.forEach((id) => visited.add(id));
    const threadTasks = uniqueIds.map((id) => taskMap.get(id)).filter(Boolean);
    if (!threadTasks.length) return;
    const latestTask = [...threadTasks]
      .reverse()
      .find((item) => item.image || item.status !== "completed") || threadTasks[threadTasks.length - 1];
    threads.push({
      id: uniqueIds[uniqueIds.length - 1],
      ids: uniqueIds,
      latestTask,
      count: uniqueIds.length,
    });
  });

  return threads;
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
    <div
      className="image-generating-feed-state"
      role="status"
      aria-live="polite"
    >
      <div className="image-generating-orbit" aria-hidden="true">
        <span />
        <Loader2 size={30} />
      </div>
      <div>
        <strong>图片正在生成中</strong>
        <p>
          {prompt
            ? `正在处理：“${prompt}”`
            : "已收到你的请求，正在为你生成图片。"}
        </p>
      </div>
    </div>
  );
}

function ImageCompletedNotice({ task, onReveal }) {
  if (!task?.image) return null;

  return (
    <button
      className="image-completed-notice"
      type="button"
      onClick={() => onReveal(task)}
      aria-label="查看生成结果"
    >
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
            <button
              className="chat-result-image"
              type="button"
              onClick={() => onPreview(task)}
              aria-label="查看生成图片"
            >
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

function ImageWorkspaceCanvas({
  status,
  selectedTask,
  activePrompt,
  submitError,
  onRetry,
  onPreview,
}) {
  if (status === "generating") {
    return <GeneratingCanvas prompt={selectedTask?.prompt || activePrompt} />;
  }

  if (status === "completed" && selectedTask?.image) {
    return <CompletedCanvas task={selectedTask} onPreview={onPreview} />;
  }

  if (status === "failed") {
    return (
      <FailedCanvas
        task={selectedTask}
        prompt={activePrompt}
        error={submitError}
        onRetry={onRetry}
      />
    );
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

function ImagePreviewLightbox({
  task,
  onClose,
  onCopyPrompt,
  onRemix,
  onReference,
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [task?.id]);

  useEffect(() => {
    if (!task?.image) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, task?.image]);

  if (!task?.image) return null;

  async function copyPrompt() {
    await onCopyPrompt?.(task);
    setCopied(true);
  }

  return (
    <div
      className="image-preview-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label="图片放大预览"
    >
      <button
        className="image-preview-backdrop"
        type="button"
        onClick={onClose}
        aria-label="关闭图片预览"
      />
      <div className="image-preview-panel">
        <div className="image-preview-toolbar">
          <div>
            <span>预览</span>
            <strong>{task.title || task.prompt || "图片详情"}</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭图片预览">
            <X size={18} />
          </button>
        </div>
        <div className="image-preview-body">
          <div className="image-preview-canvas">
            <div className="image-preview-stage">
              <img src={task.image} alt={task.prompt || task.title} />
            </div>
            <div className="image-preview-actions">
              <a href={task.image} download>
                <Download size={16} />
                下载
              </a>
            </div>
          </div>
          <aside className="image-preview-details" aria-label="图片生成信息">
            <div className="image-preview-detail-heading">
              <div>
                <span>图片提示词</span>
                <strong>{task.title || "AI 图片创作"}</strong>
              </div>
              <button
                type="button"
                onClick={copyPrompt}
                aria-label="复制图片提示词"
              >
                <Copy size={16} />
                {copied ? "已复制" : "复制"}
              </button>
            </div>
            <p className="image-preview-prompt">{task.prompt}</p>
            <div className="image-preview-tags">
              {task.model && <span>{task.model}</span>}
              {task.ratio && <span>{task.ratio}</span>}
              {task.quality && <span>{task.quality}</span>}
              {task.style && <span>{task.style}</span>}
            </div>
            <div className="image-preview-detail-actions">
              <button type="button" onClick={() => onRemix?.(task)}>
                <Sparkles size={16} />
                做同款
              </button>
              <button type="button" onClick={() => onReference?.(task)}>
                <Image size={16} />
                用作参考图
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function PreloadImage({ src, alt }) {
  const [loadState, setLoadState] = useState(src ? "loading" : "empty");

  useEffect(() => {
    if (!src) {
      setLoadState("empty");
      return undefined;
    }

    let cancelled = false;
    let retryTimer;
    setLoadState("loading");

    const loadImage = () => {
      const probe = new window.Image();
      probe.decoding = "async";
      probe.onload = () => {
        if (!cancelled) setLoadState("ready");
      };
      probe.onerror = () => {
        if (cancelled) return;
        setLoadState("loading");
        retryTimer = window.setTimeout(loadImage, 2500);
      };
      probe.src = src;
    };

    loadImage();

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [src]);

  if (!src) return null;

  const isLoading = loadState === "loading" || loadState === "failed";

  return (
    <span className="preload-image-frame">
      {isLoading && (
        <span className="image-preload-skeleton" aria-label="图片加载中">
          <Loader2 size={22} />
          <span>图片加载中</span>
        </span>
      )}
      <img
        className={isLoading ? "is-image-loading" : ""}
        src={src}
        alt={alt}
        onLoad={() => setLoadState("ready")}
        onError={() => setLoadState("failed")}
      />
    </span>
  );
}

function HistoryRail({
  cards,
  selectedTaskId,
  onSelect,
  onDelete,
  onFavorite,
  onRegenerate,
}) {
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
          const isProcessing =
            card.status === "pending" || card.status === "processing";
          const isFailed = card.status === "failed";

          return (
            <article
              className={`history-item ${isSelected ? "is-selected" : ""} status-${card.status}`}
              key={card.id}
            >
              <button
                className="history-preview"
                type="button"
                onClick={() => onSelect(card.id)}
                aria-label={`查看 ${card.prompt}`}
              >
                {card.image && !isFailed ? (
                  <img src={card.image} alt={card.prompt} />
                ) : null}
                {isProcessing && (
                  <span className="history-processing">
                    <Loader2 size={18} />
                  </span>
                )}
                {isFailed && <span className="history-failed">失败</span>}
                {!card.image && !isProcessing && !isFailed && (
                  <span className="broken-image-mark" aria-hidden="true" />
                )}
              </button>
              <div className="history-meta">
                <button
                  className="history-title"
                  type="button"
                  onClick={() => onSelect(card.id)}
                >
                  {card.prompt}
                </button>
                <div className="history-tags">
                  <span>{card.ratio}</span>
                  <span>{card.quality}</span>
                  <span>{card.time}</span>
                </div>
                <div className="history-actions">
                  <button
                    type="button"
                    onClick={() => onFavorite(card.id)}
                    aria-label="收藏"
                  >
                    <Star size={15} fill={card.favorite ? "#f8d545" : "none"} />
                  </button>
                  {card.image && (
                    <a href={card.image} download aria-label="下载图片">
                      <Download size={15} />
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => onRegenerate(card.id)}
                    aria-label="再次生成"
                  >
                    <RefreshCcw size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(card.id)}
                    aria-label="删除"
                  >
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

function ImageGenerationView({
  authUser,
  onOpenAuth,
  isActive = true,
  resetSignal = 0,
}) {
  const cachedSessionRef = useRef(null);
  if (!cachedSessionRef.current) {
    cachedSessionRef.current = readImageGenerationSession();
  }
  const cachedSession = cachedSessionRef.current;
  const [filter, setFilter] = useState("inspiration");
  const [cards, setCards] = useState([]);
  const [options, setOptions] = useState(emptyOptions);
  const [credits, setCredits] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(
    cachedSession.selectedTaskId || null,
  );
  const [submittedTaskId, setSubmittedTaskId] = useState(
    cachedSession.submittedTaskId || null,
  );
  const [activePrompt, setActivePrompt] = useState(
    cachedSession.activePrompt || "",
  );
  const [contextTaskIds, setContextTaskIds] = useState(
    Array.isArray(cachedSession.contextTaskIds)
      ? cachedSession.contextTaskIds
      : cachedSession.selectedTaskId
        ? [cachedSession.selectedTaskId]
        : [],
  );
  const [activeThreadId, setActiveThreadId] = useState(
    cachedSession.activeThreadId || null,
  );
  const [isSubmitting, setIsSubmitting] = useState(
    Boolean(cachedSession.isSubmitting),
  );
  const [submitError, setSubmitError] = useState("");
  const [pageToastMessage, setPageToastMessage] = useState("");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [previewTask, setPreviewTask] = useState(null);
  const [composerSeed, setComposerSeed] = useState(null);
  const [isComposerPastThreshold, setIsComposerPastThreshold] = useState(false);
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const imageComposerRef = useRef(null);
  const wasActiveRef = useRef(isActive);
  const taskStatusSignatureRef = useRef("");

  function showImagePageToast(message) {
    if (!message) return;
    setPageToastMessage(message);
  }

  useEffect(() => {
    if (!pageToastMessage) return undefined;
    const timer = window.setTimeout(() => setPageToastMessage(""), 2000);
    return () => window.clearTimeout(timer);
  }, [pageToastMessage]);

  // 常驻挂载：切换侧栏其它模块时不卸载，避免生成中状态与列表缓存丢失
  useEffect(() => {
    let mounted = true;
    function applyTaskList(value, runningValue = value) {
      if (!mounted) return;
      const nextSignature = taskStatusSignature(value);
      const didStatusChange =
        taskStatusSignatureRef.current &&
        taskStatusSignatureRef.current !== nextSignature;
      taskStatusSignatureRef.current = nextSignature;
      imageApi.setHasRunningTasks(hasRunningTasks(runningValue));
      setCards(value);
      if (didStatusChange) {
        imageApi
          .refreshCredits()
          .then((creditsValue) =>
            mounted && applyCreditsUpdate(setCredits, creditsValue),
          )
          .catch(() => {});
      }
    }
    imageApi.getModels().then((value) => mounted && setOptions(value));
    imageApi
      .getCredits()
      .then((value) => mounted && applyCreditsUpdate(setCredits, value));
    async function refreshTasks() {
      const [taskData, runningTaskData] =
        filter === "all"
          ? [await imageApi.getTasks({ filter }), null]
          : await Promise.all([
              imageApi.getTasks({ filter }),
              imageApi.getTasks({ filter: "all" }),
            ]);
      applyTaskList(taskData, runningTaskData || taskData);
    }
    refreshTasks();

    const unsubscribe = imageApi.subscribe(() => {
      refreshTasks();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [filter]);

  useEffect(() => {
    function syncComposerThreshold() {
      const pastThreshold = window.scrollY > 240;
      setIsComposerPastThreshold(pastThreshold);
      if (pastThreshold) {
        setIsComposerFocused(false);
      }
    }

    syncComposerThreshold();
    window.addEventListener("scroll", syncComposerThreshold, { passive: true });
    return () => window.removeEventListener("scroll", syncComposerThreshold);
  }, []);

  useEffect(() => {
    setIsComposerFocused(false);
  }, [filter]);

  useEffect(() => {
    function handleDocumentPointerDown(event) {
      const composer = imageComposerRef.current;
      if (!composer || composer.contains(event.target)) return;
      setIsComposerFocused(false);
    }

    document.addEventListener("pointerdown", handleDocumentPointerDown, true);
    return () =>
      document.removeEventListener(
        "pointerdown",
        handleDocumentPointerDown,
        true,
      );
  }, []);

  useEffect(() => {
    if (isActive && !wasActiveRef.current && filter === "recent") {
      startNewImageContext();
    }
    wasActiveRef.current = isActive;
  }, [filter, isActive]);

  useEffect(() => {
    if (filter === "recent") {
      startNewImageContext();
      return;
    }
    setComposerSeed({
      id: `reset-${resetSignal}-${Date.now()}`,
      prompt: "",
      referenceImage: null,
      notice: "",
    });
  }, [resetSignal]);

  const selectedTask = useMemo(
    () => cards.find((card) => card.id === selectedTaskId) || null,
    [cards, selectedTaskId],
  );
  const submittedTask = useMemo(
    () => cards.find((card) => card.id === submittedTaskId) || null,
    [cards, submittedTaskId],
  );
  const activeGenerationTask = submittedTask || selectedTask;
  const hasActiveGeneration = Boolean(
    isSubmitting ||
    activeGenerationTask?.status === "pending" ||
    activeGenerationTask?.status === "processing",
  );
  const hasCompletedNotice = false;
  const contextTasks = useMemo(() => {
    const taskMap = new Map(cards.map((card) => [card.id, card]));
    return contextTaskIds.map((id) => taskMap.get(id)).filter(Boolean);
  }, [cards, contextTaskIds]);
  const historyThreads = useMemo(
    () => buildImageHistoryThreads(cards),
    [cards, contextTaskIds],
  );
  const imageExampleCards = useMemo(
    () =>
      exampleImages.map((item, index) => ({
        id: `example-image-${index}`,
        status: "completed",
        model: item.model,
        ratio: item.ratio,
        quality: item.quality,
        count: 1,
        time: "示例",
        price: item.price,
        title: item.label,
        prompt: item.prompt,
        description: item.description,
        style: item.style,
        mood: item.mood,
        tags: item.tags,
        image: item.src,
        aspect: item.aspect,
        favorite: false,
      })),
    [],
  );
  const arrangedImageExampleCards = useMemo(
    () => arrangeInspirationCards(imageExampleCards, 6),
    [imageExampleCards],
  );
  const galleryItems = useMemo(() => {
    if (filter === "inspiration") {
      return arrangedImageExampleCards.map((card) => ({
        card,
        isExample: true,
      }));
    }

    const shouldShowExamples =
      filter === "all" &&
      cards.length === 0 &&
      !submittedTaskId &&
      !selectedTaskId &&
      !isSubmitting;
    if (shouldShowExamples) {
      return [
        ...arrangedImageExampleCards.map((card) => ({ card, isExample: true })),
      ];
    }
    return cards.map((card) => ({ card, isExample: false }));
  }, [
    arrangedImageExampleCards,
    cards,
    filter,
    isSubmitting,
    selectedTaskId,
    submittedTaskId,
  ]);

  useEffect(() => {
    if (
      submittedTask &&
      (submittedTask.status === "completed" ||
        submittedTask.status === "failed")
    ) {
      setSelectedTaskId(submittedTask.id);
      setContextTaskIds((ids) =>
        writeImageGenerationThread(
          ids.includes(submittedTask.id) ? ids : [...ids, submittedTask.id],
        ),
      );
      setIsSubmitting(false);
    }
  }, [submittedTask]);

  useEffect(() => {
    if (!submittedTaskId || !submittedTask) return;
    setSelectedTaskId(submittedTask.id);
  }, [submittedTask, submittedTaskId]);

  useEffect(() => {
    if (
      !submittedTaskId &&
      !selectedTaskId &&
      !activePrompt &&
      !isSubmitting &&
      contextTaskIds.length === 0
    ) {
      clearImageGenerationSession();
      return;
    }

    writeImageGenerationSession({
      submittedTaskId,
      selectedTaskId,
      contextTaskIds,
      activeThreadId,
      activePrompt,
      isSubmitting,
      updatedAt: Date.now(),
    });
  }, [activePrompt, activeThreadId, contextTaskIds, isSubmitting, selectedTaskId, submittedTaskId]);

  const canvasStatus = useMemo(() => {
    if (submitError) return "failed";
    if (isSubmitting) return "generating";
    if (
      selectedTask?.status === "pending" ||
      selectedTask?.status === "processing"
    )
      return "generating";
    if (selectedTask?.status === "failed") return "failed";
    if (selectedTask?.status === "completed" && selectedTask.image)
      return "completed";
    return "idle_examples";
  }, [isSubmitting, selectedTask, submitError]);
  const showHistory = Boolean(
    submittedTaskId || selectedTaskId || isSubmitting,
  );
  const isGuest = Boolean(authUser?.isGuest);
  const showComposer = options.models.length > 0 && filter === "inspiration";
  const isComposerSticky = filter === "recent" || (filter === "inspiration" && isComposerPastThreshold);
  const isComposerCollapsed = isComposerSticky && !isComposerFocused;
  const composerPlacement = isComposerSticky ? "sticky" : "inline";

  function requestLoginForGeneration() {
    setSubmitError("");
    showImagePageToast("请先登录");
    setIsSubmitting(false);
    onOpenAuth?.("login");
  }

  function selectImageThread(id) {
    const resolvedIds = resolveImageThreadIds(id, cards);
    const nextIds = writeImageGenerationThread(
      resolvedIds.length ? resolvedIds : [id],
    );
    const nextThreadId =
      resolveThreadIdFromTaskIds(nextIds, cards) ||
      getTaskThreadId(cards.find((card) => card.id === id));
    setSelectedTaskId(id);
    setContextTaskIds(nextIds);
    setActiveThreadId(nextThreadId || null);
    setSubmittedTaskId(null);
    setActivePrompt("");
    setIsSubmitting(false);
    setSubmitError("");
  }

  async function createTask(payload) {
    if (isGuest) {
      requestLoginForGeneration();
      return;
    }

    const shouldStartNewThread = filter === "inspiration";
    const baseThreadIds = shouldStartNewThread
      ? []
      : contextTaskIds.length > 0
        ? contextTaskIds
        : selectedTaskId
          ? resolveImageThreadIds(selectedTaskId, cards)
          : [];
    const nextThreadId = shouldStartNewThread
      ? createImageThreadId()
      : activeThreadId ||
        resolveThreadIdFromTaskIds(baseThreadIds, cards) ||
        createImageThreadId();
    const pendingSelectedTaskId = shouldStartNewThread ? null : selectedTaskId;
    setActivePrompt(payload.prompt);
    setSubmitError("");
    setIsSubmitting(true);
    setActiveThreadId(nextThreadId);
    if (shouldStartNewThread) {
      setSelectedTaskId(null);
      setSubmittedTaskId(null);
      setContextTaskIds([]);
    }
    setIsHistoryOpen(false);
    setPreviewTask(null);
    setFilter("recent");
    writeImageGenerationSession({
      submittedTaskId: null,
      selectedTaskId: pendingSelectedTaskId,
      contextTaskIds: baseThreadIds,
      activeThreadId: nextThreadId,
      activePrompt: payload.prompt,
      isSubmitting: true,
      updatedAt: Date.now(),
    });

    try {
      const task = await imageApi.createTask({
        ...payload,
        threadId: nextThreadId,
        contextTaskIds: baseThreadIds,
      });
      imageApi
        .refreshCredits()
        .then((value) => applyCreditsUpdate(setCredits, value))
        .catch(() => {});
      setSubmittedTaskId(task.id);
      setSelectedTaskId(task.id);
      const persistedThreadId = task.threadId || nextThreadId;
      const nextThreadIds = writeImageGenerationThread([
        ...baseThreadIds,
        task.id,
      ]);
      setActiveThreadId(persistedThreadId);
      setContextTaskIds(nextThreadIds);
      writeImageGenerationSession({
        submittedTaskId: task.id,
        selectedTaskId: task.id,
        contextTaskIds: nextThreadIds,
        activeThreadId: persistedThreadId,
        activePrompt: task.prompt || payload.prompt,
        isSubmitting: task.status === "pending" || task.status === "processing",
        updatedAt: Date.now(),
      });
      if (task.status === "failed") {
        setIsSubmitting(false);
      }
    } catch (error) {
      setSubmitError("");
      showImagePageToast(error.message || "创建生成任务失败");
      setIsSubmitting(false);
    }
  }

  async function deleteTask(id) {
    await imageApi.deleteTask(id);
    if (selectedTaskId === id) {
      setSelectedTaskId(null);
      setContextTaskIds((ids) => ids.filter((taskId) => taskId !== id));
    }
    if (submittedTaskId === id) {
      setSubmittedTaskId(null);
      setActivePrompt("");
      setContextTaskIds((ids) => ids.filter((taskId) => taskId !== id));
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
    const baseThreadIds = contextTaskIds.includes(id)
      ? contextTaskIds
      : resolveImageThreadIds(id, cards);
    const nextThreadId =
      activeThreadId ||
      resolveThreadIdFromTaskIds(baseThreadIds, cards) ||
      createImageThreadId();
    if (source) {
      setActivePrompt(source.prompt);
    }
    setSubmitError("");
    setIsSubmitting(true);
    setActiveThreadId(nextThreadId);
    setIsHistoryOpen(false);
    setPreviewTask(null);
    writeImageGenerationSession({
      submittedTaskId: null,
      selectedTaskId: id,
      contextTaskIds: baseThreadIds,
      activeThreadId: nextThreadId,
      activePrompt: source?.prompt || activePrompt,
      isSubmitting: true,
      updatedAt: Date.now(),
    });

    try {
      const created = await imageApi.regenerateTask(id, {
        threadId: nextThreadId,
        contextTaskIds: baseThreadIds,
      });
      imageApi
        .refreshCredits()
        .then((value) => applyCreditsUpdate(setCredits, value))
        .catch(() => {});
      setSubmittedTaskId(created.id);
      setSelectedTaskId(created.id);
      const persistedThreadId = created.threadId || nextThreadId;
      const nextThreadIds = writeImageGenerationThread([
        ...baseThreadIds,
        created.id,
      ]);
      setActiveThreadId(persistedThreadId);
      setContextTaskIds(nextThreadIds);
      writeImageGenerationSession({
        submittedTaskId: created.id,
        selectedTaskId: created.id,
        contextTaskIds: nextThreadIds,
        activeThreadId: persistedThreadId,
        activePrompt: created.prompt || source?.prompt || activePrompt,
        isSubmitting:
          created.status === "pending" || created.status === "processing",
        updatedAt: Date.now(),
      });
    } catch (error) {
      setSubmitError("");
      showImagePageToast(error.message || "创建生成任务失败");
      setIsSubmitting(false);
    }
  }

  async function copyTaskPrompt(task) {
    const copied = await writeClipboardText(task?.prompt);
    showImagePageToast(copied ? "提示词已复制" : "提示词复制失败，请重试");
  }

  function remixTask(task) {
    if (!task?.prompt) return;
    setPreviewTask(null);
    setSelectedTaskId(null);
    setSubmittedTaskId(null);
    setContextTaskIds([]);
    setActiveThreadId(null);
    setActivePrompt("");
    setIsSubmitting(false);
    setSubmitError("");
    setFilter("recent");
    clearImageGenerationSession();
    setComposerSeed({
      id: `remix-${task.id}-${Date.now()}`,
      prompt: task.prompt,
      model: task.modelKey || null,
      ratio: task.ratio,
      quality: task.quality,
      referenceImage: null,
      notice: "",
    });
  }

  function revealGeneratedTask(task) {
    if (!task?.image) return;
    setFilter("recent");
    setSelectedTaskId(task.id);
    setContextTaskIds([task.id]);
    setActiveThreadId(task.threadId || null);
    setPreviewTask(task);
    setSubmittedTaskId(null);
    setActivePrompt("");
    clearImageGenerationSession();
  }

  function startNewImageContext() {
    setSelectedTaskId(null);
    setSubmittedTaskId(null);
    setContextTaskIds([]);
    setActiveThreadId(null);
    setActivePrompt("");
    setIsSubmitting(false);
    setSubmitError("");
    setPreviewTask(null);
    setComposerSeed({
      id: `empty-${Date.now()}`,
      prompt: "",
      referenceImage: null,
      notice: "",
    });
    clearImageGenerationSession();
  }

  function openImageGenerationWorkbench() {
    startNewImageContext();
    setFilter("recent");
  }

  function referenceTask(task) {
    if (!task?.image) return;
    const isPersistedTask = cards.some((card) => card.id === task.id);
    setPreviewTask(null);
    if (!isPersistedTask) {
      setSelectedTaskId(null);
      setSubmittedTaskId(null);
      setContextTaskIds([]);
      setActiveThreadId(null);
      setActivePrompt("");
      setIsSubmitting(false);
      setSubmitError("");
      clearImageGenerationSession();
    }
    const nextThreadId = task.threadId || activeThreadId || createImageThreadId();
    setFilter("recent");
    if (isPersistedTask) {
      setSelectedTaskId(task.id);
      setActiveThreadId(nextThreadId);
      setContextTaskIds((ids) =>
        writeImageGenerationThread(
          ids.includes(task.id) ? ids : [...ids, task.id],
        ),
      );
    }
    setComposerSeed({
      id: `reference-${task.id}-${Date.now()}`,
      prompt: "",
      referenceImage: {
        url: task.image,
        originalName: "引用结果图",
        size: 0,
        mimeType: "image/png",
      },
      notice: "",
    });
  }

  return (
    <section
      className={`image-gen-view video-gen-view-root ${filter === "recent" ? "is-generation-workbench" : ""} ${hasCompletedNotice ? "has-completed-notice" : ""}`}
    >
      <div className="image-filter-tabs">
        <button
          className={filter === "inspiration" ? "selected" : ""}
          onClick={() => setFilter("inspiration")}
          type="button"
        >
          <Sparkles size={17} />
          灵感
        </button>
        <button
          className={filter === "recent" ? "selected" : ""}
          onClick={openImageGenerationWorkbench}
          type="button"
        >
          生成
        </button>
        <button
          className={filter === "favorite" ? "selected" : ""}
          onClick={() => setFilter("favorite")}
          type="button"
        >
          <Star size={17} fill="#f8d545" color="#161616" />
          收藏
        </button>
        {credits && (
          <span className="credits-chip">积分 {credits.balance}</span>
        )}
      </div>
      {pageToastMessage && (
        <div className="image-page-toast" role="status" aria-live="polite">
          {pageToastMessage}
        </div>
      )}
      {hasCompletedNotice && filter !== "recent" && (
        <ImageCompletedNotice
          task={submittedTask}
          onReveal={revealGeneratedTask}
        />
      )}
      {showComposer && (
        <>
          {!isComposerSticky && (
            <div className="image-composer-heading">释放你的创作灵感</div>
          )}
          <ComposerBar
            options={options}
            onSubmit={createTask}
            placement={composerPlacement}
            collapsed={isComposerCollapsed}
            shellRef={imageComposerRef}
            onFocus={() => setIsComposerFocused(true)}
            resetSignal={resetSignal}
          />
        </>
      )}
      {filter === "recent" ? (
        <ImageGenerationWorkbench
          tasks={cards}
          historyThreads={historyThreads}
          selectedTask={selectedTask}
          contextTasks={contextTasks}
          activeTask={activeGenerationTask}
          activePrompt={activePrompt}
          submitError={submitError}
          isSubmitting={isSubmitting}
          options={options}
          composerSeed={composerSeed}
          onSubmit={createTask}
          resetSignal={resetSignal}
          onSelect={(id) => {
            selectImageThread(id);
          }}
          onNewContext={startNewImageContext}
          onPreview={(task) => setPreviewTask(task)}
          onReference={referenceTask}
          onRegenerate={regenerateTask}
        />
      ) : galleryItems.length ? (
        <WaterfallGrid
          className={`image-results-feed ${hasCompletedNotice ? "has-completed-notice" : ""}`}
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
      <ImagePreviewLightbox
        task={previewTask}
        onClose={() => setPreviewTask(null)}
        onCopyPrompt={copyTaskPrompt}
        onRemix={remixTask}
        onReference={referenceTask}
      />
    </section>
  );
}

const emptyVideoOptions = {
  models: [],
  ratios: [],
  durations: [],
  counts: [1],
  modes: [],
};

const videoInspirationItems = [
  ["3a-game-style-remake-1", "3A 游戏风格重制", "电影级游戏镜头，英雄角色穿越废墟战场，镜头低角度推进，粒子火花与体积光交织，动作张力强。"],
  ["3a-game-style-remake-2", "3A 游戏动作场景", "高规格游戏宣传片风格，主角在未来城市中高速奔跑，镜头跟随切换，霓虹灯、烟雾和金属反光细节丰富。"],
  ["ai-3d-animation", "AI 3D 动画", "高质量 3D 动画短片，抽象能量体在深色空间中旋转展开，光线丝带形成流动轨迹，镜头平滑推进。"],
  ["ai-3d-bleach-vs-naruto", "热血动漫对战", "日漫热血战斗风格，两名角色在破碎场景中高速交锋，刀光、冲击波、烟尘和夸张动作定格。"],
  ["axiom-visual-concept-ad", "科技概念广告", "高端科技产品概念广告，黑色背景中产品以金属质感旋转出现，光带扫过边缘，节奏高级克制。"],
  ["boxing-king-returns", "拳王归来", "拳击冠军从阴影中走向擂台，观众欢呼，聚光灯切换，汗水飞溅，慢动作表现力量感。"],
  ["camera", "相机产品片", "专业相机产品广告，镜头结构分层展开，玻璃与金属材质反射清晰，黑金色调，商业质感。"],
  ["car-ad", "汽车广告", "高端汽车在城市夜景道路疾驰，雨后地面反射霓虹，镜头从轮毂推至车身流线，速度感强。"],
  ["car-visual-concept-ad", "汽车视觉概念片", "未来概念车从暗场灯光中驶出，车身线条被光轨勾勒，大片级运镜，科技豪华风。"],
  ["chagee-visual-concept-ad", "茶饮视觉广告", "新中式茶饮广告，茶叶、冰块和液体在空中慢动作飞溅，清透光线，品牌视觉大片。"],
  ["cola", "可乐广告", "冰镇可乐罐从水花与冰块中弹出，红色品牌视觉，气泡喷涌，夏日清爽商业广告。"],
  ["costume-drama", "古装剧情", "古装人物在宫殿与灯火中缓步转身，衣袂飘动，柔和逆光，东方影视剧质感。"],
  ["fallen-god", "坠落神明", "暗黑奇幻场景，神明从破碎天空坠落，羽翼与光尘散开，巨大尺度和史诗氛围。"],
  ["former-king", "昔日王者", "暗黑色调，阴云密布，血色残阳，天地死寂压抑。无数锈剑从地底、古坟、废墟中疯狂破土而出，黑金色剑气撕裂长空，万剑齐鸣如鬼哭。"],
  ["golden-pomelo-1", "金柚产品片", "金色柚子在清澈水花中旋转，果肉晶莹剔透，阳光穿透果粒，清新食品广告风格。"],
  ["golden-pomelo-2", "金柚饮品广告", "柚子切片、气泡与冰块组合成饮品视觉，金黄色调，镜头微距推进，清爽高级。"],
  ["isekai-demon-king", "异世界魔王", "异世界魔王登场，巨大城堡与魔法阵背景，紫黑能量涌动，镜头环绕角色，压迫感强。"],
  ["live-action-yuelin-qiji-remake", "真人奇迹重制", "真人奇幻重制短片，角色站在神秘森林光束中，魔法粒子环绕，镜头缓慢推进。"],
  ["massage-device", "按摩仪广告", "智能按摩设备产品广告，温暖灯光与家居场景，产品细节特写，舒适放松氛围。"],
  ["mecha-transformation-1", "机甲变形 01", "机甲组件高速组装，金属外壳闭合，蓝色能量线点亮，镜头快速切换。"],
  ["mecha-transformation-2", "机甲变形 02", "巨大机甲从地面站起，机械臂展开，城市废墟背景，震撼科幻大片感。"],
  ["mecha-transformation-3", "机甲变形 03", "机甲战士在光雨中变形，装甲片层层覆盖，粒子特效和冲击波同步爆发。"],
  ["mecha-transformation-4", "机甲变形 04", "紧凑机甲变形镜头，机械结构精密咬合，冷色调灯光，工业科幻质感。"],
  ["medical-ultrasound-device-1", "医疗超声设备", "医疗超声设备商业展示，洁净实验室环境，屏幕数据流动，专业可信的科技医疗风。"],
  ["smartphone-4", "手机产品片", "智能手机在黑色背景中旋转，屏幕光效流动，边框高光扫过，科技新品发布片风格。"],
  ["tenth-freezer", "冰柜产品片", "商用冰柜产品广告，冷雾溢出，食品排列整齐，白蓝色调突出制冷能力。"],
  ["tianmen-weihe", "天门奇景", "山河峡谷与云海之间的宏大自然场景，镜头穿越云层俯冲，东方奇观大片感。"],
  ["wuhan-cherry-blossom-season", "武汉樱花季", "春日武汉樱花盛开，花瓣随风飘落，城市建筑与游客穿行其中，温柔浪漫纪录片质感。"],
  ["yongyeti", "雪域巨兽", "雪山深处巨兽苏醒，冰雪飞溅，低角度镜头表现巨大体型，冷色调奇幻冒险风。"],
  ["yuelin-qiji-3d-remake", "月林奇迹 3D", "3D 奇幻森林场景，月光洒落，角色穿过发光植物与薄雾，梦幻探索氛围。"],
  ["zhang-xue-motorcycle-remake", "摩托车重制", "人物骑摩托车穿越雨夜街道，车灯划破水雾，镜头贴地跟拍，速度与孤独感并存。"],
].map(([slug, title, prompt]) => ({
  id: `video-inspiration-${slug}`,
  slug,
  title,
  prompt,
  model: "Seedance 2.0",
  feature: "文生视频",
  ratio: "16:9",
  duration: 5,
  video: `/assets/videoInspiration/${slug}.webm`,
  preview: `/assets/videoInspiration/previews/${slug}-preview.webm`,
  poster: `/assets/videoInspiration/posters/${slug}.jpg`,
}));

function getVideoModelOptions(options, modelKey) {
  const selectedModel =
    options.models.find((item) => item.value === modelKey) || options.models[0];
  return {
    model: selectedModel,
    ratios: selectedModel?.ratios?.length
      ? selectedModel.ratios
      : options.ratios,
    durations: selectedModel?.durations?.length
      ? selectedModel.durations
      : options.durations,
  };
}

function getVideoTaskTimestamp(task) {
  const value =
    task?.createdAt ||
    task?.created_at ||
    task?.updatedAt ||
    task?.updated_at;
  const timestamp = value ? new Date(value).getTime() : NaN;
  if (Number.isFinite(timestamp)) return timestamp;
  return Number(task?.id) || 0;
}

function sortVideoTasksByNewest(tasks) {
  return [...tasks].sort((a, b) => {
    const timestampDiff = getVideoTaskTimestamp(b) - getVideoTaskTimestamp(a);
    if (timestampDiff !== 0) return timestampDiff;
    return (Number(b?.id) || 0) - (Number(a?.id) || 0);
  });
}

function VideoPreview({ task }) {
  const isProcessing =
    task.status === "pending" || task.status === "processing";
  const isFailed = task.status === "failed";

  if (task.video && !isFailed) {
    return <video src={task.video} controls playsInline preload="metadata" />;
  }

  return (
    <div className={`video-placeholder ${isFailed ? "is-failed" : ""}`}>
      {isProcessing ? (
        <Loader2 size={24} />
      ) : (
        <Play size={34} fill="currentColor" />
      )}
      {(isFailed || isProcessing) && (
        <span>{isFailed ? "生成失败" : "生成中"}</span>
      )}
    </div>
  );
}

function VideoResultCard({
  card,
  onDelete,
  onFavorite,
  onRegenerate,
  isExample = false,
}) {
  return (
    <article
      className={`result-card video-result-card status-${card.status} ${isExample ? "is-example" : ""}`}
    >
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
          <button
            className={`icon-circle ${card.favorite ? "is-favorite" : ""}`}
            type="button"
            onClick={() => onFavorite(card.id)}
            aria-label="收藏"
            disabled={isExample}
          >
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
          <button
            type="button"
            onClick={() => onRegenerate(card.id)}
            disabled={isExample}
          >
            <RefreshCcw size={15} />
            再次生成
          </button>
          <button
            type="button"
            onClick={() => onDelete(card.id)}
            disabled={isExample}
          >
            <Trash2 size={15} />
            删除
          </button>
        </div>
      </div>
    </article>
  );
}

function VideoInspirationCard({ item, onOpen }) {
  const previewRef = useRef(null);

  function playPreview() {
    const video = previewRef.current;
    if (!video) return;
    video.currentTime = 0;
    video.play().catch(() => {});
  }

  function stopPreview() {
    const video = previewRef.current;
    if (!video) return;
    video.pause();
    video.currentTime = 0;
  }

  return (
    <button
      className="video-inspiration-card"
      type="button"
      onClick={() => onOpen(item)}
      onMouseEnter={playPreview}
      onMouseLeave={stopPreview}
      onFocus={playPreview}
      onBlur={stopPreview}
    >
      <span className="video-inspiration-media">
        <img src={item.poster} alt={item.title} loading="lazy" decoding="async" />
        <video
          ref={previewRef}
          src={item.preview}
          muted
          playsInline
          preload="metadata"
        />
        <span className="video-inspiration-play">
          <Play size={17} fill="currentColor" />
        </span>
      </span>
    </button>
  );
}

function VideoInspirationModal({ item, onClose, onRemix }) {
  if (!item) return null;
  return (
    <div className="video-inspiration-modal" role="dialog" aria-modal="true" aria-label={`${item.title} 视频灵感`}>
      <button className="video-inspiration-modal-backdrop" type="button" aria-label="关闭" onClick={onClose} />
      <section className="video-inspiration-dialog">
        <div className="video-inspiration-player">
          <video src={item.video} poster={item.poster} controls playsInline autoPlay />
        </div>
        <aside className="video-inspiration-detail">
          <button className="video-inspiration-close" type="button" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
          <div>
            <span>创意提示词</span>
            <p>{item.prompt}</p>
          </div>
          <dl>
            <div>
              <dt>使用模型</dt>
              <dd>{item.model}</dd>
            </div>
            <div>
              <dt>使用功能</dt>
              <dd>{item.feature}</dd>
            </div>
            <div>
              <dt>画面比例</dt>
              <dd>{item.ratio}</dd>
            </div>
          </dl>
          <button
            className="video-inspiration-remix"
            type="button"
            onClick={() => onRemix(item)}
          >
            <Copy size={17} />
            做同款
          </button>
        </aside>
      </section>
    </div>
  );
}

function VideoComposerBar({
  options,
  onSubmit,
  resetSignal = 0,
  seed,
  placement = "inline",
  collapsed = false,
  shellRef,
  onFocus,
  onBlur,
}) {
  const [prompt, setPrompt] = useState("");
  const [model, setModel] = useState(options.models[0]?.value || "");
  const modelOptions = getVideoModelOptions(options, model);
  const [ratio, setRatio] = useState(
    modelOptions.model?.defaultRatio || modelOptions.ratios[0] || "",
  );
  const [duration, setDuration] = useState(
    modelOptions.model?.defaultDuration || modelOptions.durations[0] || "",
  );
  const [toastMessage, setToastMessage] = useState("");

  function showVideoComposerToast(message) {
    if (!message) return;
    setToastMessage(message);
  }

  useEffect(() => {
    if (!model && options.models[0]) {
      setModel(options.models[0].value);
      return;
    }

    const nextOptions = getVideoModelOptions(options, model);
    if (nextOptions.model) {
      if (!nextOptions.ratios.includes(ratio))
        setRatio(nextOptions.model.defaultRatio || nextOptions.ratios[0] || "");
      if (!nextOptions.durations.includes(Number(duration)))
        setDuration(
          nextOptions.model.defaultDuration || nextOptions.durations[0] || "",
        );
    }
  }, [duration, model, options, ratio]);

  useEffect(() => {
    setPrompt("");
    setToastMessage("");
  }, [resetSignal]);

  useEffect(() => {
    if (!seed) return;
    setPrompt(seed.prompt || "");
    setToastMessage(seed.notice || "");
  }, [seed]);

  useEffect(() => {
    if (!toastMessage) return undefined;
    const timer = window.setTimeout(() => setToastMessage(""), 2000);
    return () => window.clearTimeout(timer);
  }, [toastMessage]);

  const count = 1;
  const price = videoApi.calculatePrice({
    model,
    duration,
    count,
    models: options.models,
  });
  const rmb = videoApi.calculateRmb({
    model,
    duration,
    count,
    models: options.models,
  });
  const canSubmit = prompt.trim().length > 0 && model && ratio && duration;

  function clearPrompt() {
    setPrompt("");
    showVideoComposerToast("已清空提示词");
  }

  function fillRandomPrompt() {
    setPrompt(videoApi.getRandomPrompt());
    showVideoComposerToast("已填入随机提示词");
  }

  function handleAddPrompt() {
    showVideoComposerToast("当前视频生成暂不支持添加参考素材");
  }

  function submitPrompt() {
    if (!canSubmit) {
      showVideoComposerToast("请先输入视频描述");
      return;
    }

    onSubmit({
      prompt: prompt.trim(),
      model,
      ratio,
      duration: Number(duration),
      mode: "first-frame",
      count,
    });
    showVideoComposerToast("已创建视频生成任务");
    setPrompt("");
  }

  return (
    <div
      ref={shellRef}
      className={`sowa-composer video-composer is-${placement} ${collapsed ? "is-collapsed" : ""}`}
      aria-label="视频生成输入框"
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <VideoPromptDialog
        ariaLabel="视频生成输入框"
        placeholder="请描述你想生成的视频..."
        value={prompt}
        onChange={(value) => {
          setPrompt(value);
          if (toastMessage) setToastMessage("");
        }}
        onSubmit={submitPrompt}
        canSubmit={canSubmit}
        notice=""
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
        collapsed={collapsed}
        dropdownPlacement={placement === "inline" ? "bottom" : "top"}
      />
      {toastMessage && (
        <div className="video-composer-toast" role="status" aria-live="polite">
          {toastMessage}
        </div>
      )}
    </div>
  );
}

function VideoGenerationView({ authUser, onOpenAuth, resetSignal = 0 }) {
  const [filter, setFilter] = useState("inspiration");
  const [cards, setCards] = useState([]);
  const [options, setOptions] = useState(emptyVideoOptions);
  const [credits, setCredits] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [pageToastMessage, setPageToastMessage] = useState("");
  const [selectedInspiration, setSelectedInspiration] = useState(null);
  const [composerSeed, setComposerSeed] = useState(null);
  const [isComposerPastThreshold, setIsComposerPastThreshold] = useState(
    () => window.scrollY > 240,
  );
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const videoComposerRef = useRef(null);
  const taskStatusSignatureRef = useRef("");
  const isGuest = Boolean(authUser?.isGuest);

  function showVideoPageToast(message) {
    if (!message) return;
    setPageToastMessage(message);
  }

  useEffect(() => {
    if (!pageToastMessage) return undefined;
    const timer = window.setTimeout(() => setPageToastMessage(""), 2000);
    return () => window.clearTimeout(timer);
  }, [pageToastMessage]);

  function requestLoginForGeneration() {
    setSubmitError("");
    showVideoPageToast("请先登录");
    setIsSubmitting(false);
    onOpenAuth?.("login");
  }

  // 模块由外层保活挂载，此处始终订阅任务列表
  useEffect(() => {
    let mounted = true;
    function applyTaskList(value, runningValue = value) {
      if (!mounted) return;
      const nextSignature = taskStatusSignature(value);
      const didStatusChange =
        taskStatusSignatureRef.current &&
        taskStatusSignatureRef.current !== nextSignature;
      taskStatusSignatureRef.current = nextSignature;
      videoApi.setHasRunningTasks(hasRunningTasks(runningValue));
      setCards(value);
      if (didStatusChange) {
        videoApi
          .refreshCredits()
          .then((creditsValue) =>
            mounted && applyCreditsUpdate(setCredits, creditsValue),
          )
          .catch(() => {});
      }
    }
    videoApi.getModels().then((value) => mounted && setOptions(value));
    videoApi
      .getCredits()
      .then((value) => mounted && applyCreditsUpdate(setCredits, value));
    async function refreshTasks() {
      const [taskData, runningTaskData] =
        filter === "inspiration"
          ? [[], await videoApi.getTasks({ filter: "all" })]
          : await Promise.all([
              videoApi.getTasks({ filter }),
              videoApi.getTasks({ filter: "all" }),
            ]);
      applyTaskList(taskData, runningTaskData || taskData);
    }
    refreshTasks();

    const unsubscribe = videoApi.subscribe(() => {
      refreshTasks();
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [filter]);

  useEffect(() => {
    function syncComposerThreshold() {
      const pastThreshold = filter === "inspiration" && window.scrollY > 360;
      setIsComposerPastThreshold(pastThreshold);
      if (pastThreshold) setIsComposerFocused(false);
    }

    syncComposerThreshold();
    window.addEventListener("scroll", syncComposerThreshold, { passive: true });
    return () => window.removeEventListener("scroll", syncComposerThreshold);
  }, [filter]);

  useEffect(() => {
    if (filter !== "inspiration") return;
    setIsComposerFocused(false);
    setIsComposerPastThreshold(false);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0 });
    });
  }, [filter]);

  useEffect(() => {
    function handleDocumentPointerDown(event) {
      const composer = videoComposerRef.current;
      if (!composer || composer.contains(event.target)) return;
      setIsComposerFocused(false);
    }

    document.addEventListener("pointerdown", handleDocumentPointerDown, true);
    return () =>
      document.removeEventListener(
        "pointerdown",
        handleDocumentPointerDown,
        true,
      );
  }, []);

  async function createTask(payload) {
    if (isGuest) {
      requestLoginForGeneration();
      return;
    }
    setSubmitError("");
    setIsSubmitting(true);
    try {
      await videoApi.createTask(payload);
      setFilter("recent");
      videoApi
        .refreshCredits()
        .then((value) => applyCreditsUpdate(setCredits, value))
        .catch(() => {});
    } catch (error) {
      setSubmitError("");
      showVideoPageToast(error.message || "创建视频生成任务失败");
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
      videoApi
        .refreshCredits()
        .then((value) => applyCreditsUpdate(setCredits, value))
        .catch(() => {});
    } catch (error) {
      setSubmitError("");
      showVideoPageToast(error.message || "创建视频生成任务失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  const sortedCards = useMemo(() => sortVideoTasksByNewest(cards), [cards]);
  const isComposerSticky =
    filter === "inspiration" && isComposerPastThreshold;
  const isComposerCollapsed = isComposerSticky && !isComposerFocused;

  function openVideoInspiration() {
    setFilter("inspiration");
    setIsComposerFocused(false);
    setIsComposerPastThreshold(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function useVideoInspiration(item) {
    setSelectedInspiration(null);
    setFilter("inspiration");
    setComposerSeed({
      id: `${item.id}-${Date.now()}`,
      prompt: item.prompt,
      notice: "已填入同款提示词",
    });
    window.requestAnimationFrame(() => {
      const top =
        (videoComposerRef.current?.getBoundingClientRect().top || 0) +
        window.scrollY -
        92;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    });
  }

  return (
    <section className="video-gen-view video-gen-view-root">
      <div className="image-filter-tabs">
        <button
          className={filter === "inspiration" ? "selected" : ""}
          onClick={openVideoInspiration}
          type="button"
        >
          <Sparkles size={17} />
          灵感广场
        </button>
        <button
          className={filter === "recent" ? "selected" : ""}
          onClick={() => setFilter("recent")}
          type="button"
        >
          最近生成
        </button>
        <button
          className={filter === "favorite" ? "selected" : ""}
          onClick={() => setFilter("favorite")}
          type="button"
        >
          <Star size={17} fill="#f8d545" color="#161616" />
          收藏
        </button>
        {credits && (
          <span className="credits-chip">积分 {credits.balance}</span>
        )}
      </div>
      {pageToastMessage && (
        <div className="video-page-toast" role="status" aria-live="polite">
          {pageToastMessage}
        </div>
      )}
      {options.models.length > 0 && filter === "inspiration" && (
        <>
          {!isComposerSticky && (
            <div className="video-composer-heading">释放你的创作灵感</div>
          )}
          <VideoComposerBar
            options={options}
            onSubmit={createTask}
            resetSignal={resetSignal}
            seed={composerSeed}
            placement={isComposerSticky ? "sticky" : "inline"}
            collapsed={isComposerCollapsed}
            shellRef={videoComposerRef}
            onFocus={() => setIsComposerFocused(true)}
            onBlur={() => {}}
          />
        </>
      )}
      {filter === "inspiration" ? (
        <WaterfallGrid
          className="video-inspiration-grid"
          gap={12}
          maxColumns={4}
          items={videoInspirationItems}
          renderItem={(item) => (
            <VideoInspirationCard
              item={item}
              onOpen={setSelectedInspiration}
            />
          )}
        />
      ) : (
        <div className="results-feed video-results-feed">
          {isSubmitting && filter === "recent" && (
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
                favorite: false,
              }}
              onDelete={() => {}}
              onFavorite={() => {}}
              onRegenerate={() => {}}
            />
          )}
          {sortedCards.length ? (
          sortedCards.map((card) => (
            <VideoResultCard
              card={card}
              key={card.id}
              onDelete={deleteTask}
              onFavorite={toggleFavorite}
              onRegenerate={regenerateTask}
            />
          ))
        ) : (
          <div className="empty-results video-empty-results">暂无视频结果</div>
        )}
        </div>
      )}
      <VideoInspirationModal
        item={selectedInspiration}
        onClose={() => setSelectedInspiration(null)}
        onRemix={useVideoInspiration}
      />
    </section>
  );
}

const emptyChatOptions = { models: [], reasoningEfforts: [], defaultModel: "" };
const chatContextRoles = new Set(["system", "user", "assistant"]);

function toChatContext(messages) {
  return messages
    .filter(
      (message) =>
        message.status !== "failed" &&
        chatContextRoles.has(message.role) &&
        (message.content?.trim() || message.attachments?.length),
    )
    .map((message) => ({
      role: message.role,
      content: message.content?.trim() || "",
      attachments: message.attachments || [],
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
        <div
          className={`chat-attachment-card ${isStatic ? "is-static" : ""}`}
          key={attachment.id || attachment.url || index}
        >
          <span className="chat-attachment-preview">
            {attachment.kind === "image" && attachment.url ? (
              <img src={attachment.url} alt="" />
            ) : (
              <FileText size={14} />
            )}
          </span>
          <span className="chat-attachment-meta">
            <strong title={attachment.originalName || "attachment"}>
              {attachment.originalName || "attachment"}
            </strong>
            <small>{formatChatAttachmentSize(attachment.size)}</small>
          </span>
          {!isStatic && (
            <button
              type="button"
              onClick={() => onRemove?.(index)}
              aria-label="移除附件"
            >
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
  const hasStreamingMessage = messages.some(
    (message) => message.status === "streaming",
  );
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
              <span
                className={`chat-message-avatar ${message.status === "failed" ? "is-error" : ""}`}
              >
                <Bot size={17} />
              </span>
            )}
            <div
              className={`chat-message-bubble ${message.status === "failed" ? "is-error" : ""} ${message.status === "streaming" ? "is-streaming" : ""}`}
            >
              {message.status === "failed" ? (
                <>
                  <strong>这次没有回复成功</strong>
                  <p>{message.error || "对话服务暂时不可用，请稍后重试。"}</p>
                </>
              ) : (
                <>
                  {message.content ||
                    (message.status === "streaming" ? "正在思考..." : "")}
                  <ChatAttachmentList
                    attachments={message.attachments || []}
                    isStatic
                  />
                  {message.points > 0 && (
                    <small className="chat-message-cost">
                      {message.price || `${message.points} 积分`}
                    </small>
                  )}
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
              <span>正在思考...</span>
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

function ChatComposerBar({
  options,
  onSubmit,
  isSubmitting,
  model,
  onModelChange,
  onModelSwitchNotice,
  reasoningEffort,
  onReasoningEffortChange,
}) {
  const [prompt, setPrompt] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const [notice, setNotice] = useState("");
  const [openMenu, setOpenMenu] = useState(null);
  const attachmentInputRef = useRef(null);
  const modelMenuRef = useRef(null);

  const isReady = options.models.length > 0;
  const selectedModel =
    options.models.find((item) => item.value === model) || options.models[0];
  const canSubmit =
    isReady &&
    (prompt.trim().length > 0 || attachments.length > 0) &&
    model &&
    !isSubmitting &&
    !isUploadingAttachment;
  const modelLabel = isReady
    ? selectedModel?.label || "Deepseek V4"
    : "模型加载中";
  const visibleReasoningEfforts = options.reasoningEfforts
    .filter((item) => item.value === "none" || item.value === "low")
    .map((item) =>
      item.value === "low" ? { ...item, label: "深度思考" } : item,
    );

  useEffect(() => {
    if (!openMenu) return undefined;

    function closeOnOutside(event) {
      if (!modelMenuRef.current?.contains(event.target)) {
        setOpenMenu(null);
      }
    }

    function closeOnPageInteraction(event) {
      if (!modelMenuRef.current?.contains(event.target)) {
        setOpenMenu(null);
      }
    }

    document.addEventListener("pointerdown", closeOnOutside, true);
    document.addEventListener("wheel", closeOnPageInteraction, true);
    document.addEventListener("touchmove", closeOnPageInteraction, true);
    window.addEventListener("resize", closeOnPageInteraction);
    window.addEventListener("scroll", closeOnPageInteraction, true);

    return () => {
      document.removeEventListener("pointerdown", closeOnOutside, true);
      document.removeEventListener("wheel", closeOnPageInteraction, true);
      document.removeEventListener("touchmove", closeOnPageInteraction, true);
      window.removeEventListener("resize", closeOnPageInteraction);
      window.removeEventListener("scroll", closeOnPageInteraction, true);
    };
  }, [openMenu]);

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
      setAttachments((current) => [
        ...current,
        {
          id: uploaded.id || uploaded.url,
          url: uploaded.url,
          originalName: uploaded.originalName || file.name,
          mimeType: uploaded.mimeType || file.type,
          size: uploaded.size || file.size,
          kind:
            uploaded.kind ||
            (file.type.startsWith("image/") ? "image" : "file"),
        },
      ]);
    } catch (error) {
      setNotice(error.message || "附件上传失败，请重试。");
    } finally {
      setIsUploadingAttachment(false);
      event.target.value = "";
    }
  }

  function removeAttachment(index) {
    setAttachments((current) =>
      current.filter((_, itemIndex) => itemIndex !== index),
    );
    setNotice("");
  }

  function submitPrompt() {
    if (!canSubmit) {
      setNotice(
        isUploadingAttachment
          ? "附件上传完成后再发送。"
          : "请输入内容或上传附件后再发送。",
      );
      return;
    }

    onSubmit({
      content: prompt.trim(),
      model,
      reasoningEffort,
      attachments,
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
      <ChatAttachmentList
        attachments={attachments}
        onRemove={removeAttachment}
      />
      <div className="llm-toolbar">
        <div className="llm-left">
          <button
            className="llm-square"
            type="button"
            disabled={
              !isReady ||
              isSubmitting ||
              isUploadingAttachment ||
              attachments.length >= 5
            }
            onClick={() => attachmentInputRef.current?.click()}
            aria-label="上传附件"
            title="上传附件"
          >
            {isUploadingAttachment ? <Loader2 size={16} /> : <Plus size={16} />}
          </button>
          <div
            ref={modelMenuRef}
            className={`llm-select-wrap ${openMenu === "model" ? "is-open" : ""}`}
          >
            <button
              className="llm-select"
              type="button"
              disabled={!isReady}
              onClick={() =>
                setOpenMenu((current) => (current === "model" ? null : "model"))
              }
            >
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
                    if (item.value !== model) {
                      onModelSwitchNotice?.();
                    }
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
          {visibleReasoningEfforts.length > 0 && (
            <CustomSelect
              ariaLabel="推理强度"
              className="llm-reasoning-select"
              value={reasoningEffort}
              onChange={onReasoningEffortChange}
              options={visibleReasoningEfforts}
            />
          )}
          <button
            className="llm-round primary"
            type="button"
            disabled={!canSubmit}
            onClick={submitPrompt}
            aria-label="发送"
          >
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
    <aside className="history-rail chat-history-rail" aria-label="AI 对话历史">
      <div className="history-rail-header">
        <span>历史对话</span>
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
            <small>
              {conversation.model} · {conversation.time}
            </small>
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
  const [selectedReasoningEffort, setSelectedReasoningEffort] =
    useState("none");
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [modelSwitchNotice, setModelSwitchNotice] = useState("");
  const isGuest = Boolean(authUser?.isGuest);
  const historyPanelWidth = useMemo(() => {
    if (!conversations.length) return 120;

    const longestTitleLength = conversations.reduce((longest, item) => {
      const titleLength = [...String(item.title || "")].length;
      return Math.max(longest, titleLength);
    }, 0);

    return Math.min(300, Math.max(120, 120 + longestTitleLength * 14));
  }, [conversations]);

  // 模块由外层保活挂载，此处始终拉取对话配置与历史列表。
  useEffect(() => {
    let mounted = true;
    chatApi
      .getModels()
      .then((value) => mounted && setOptions(value))
      .catch((error) => mounted && setSubmitError(error.message));
    chatApi
      .getCredits()
      .then((value) => mounted && setCredits(value))
      .catch(() => {});
    chatApi
      .getConversations()
      .then((value) => mounted && setConversations(value))
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!modelSwitchNotice) return undefined;

    const timer = window.setTimeout(() => {
      setModelSwitchNotice("");
    }, 2600);

    return () => window.clearTimeout(timer);
  }, [modelSwitchNotice]);

  const showModelSwitchNotice = useCallback(() => {
    if (!messages.length && !isSubmitting && !submitError) return;
    setModelSwitchNotice("对话中更换模型可能会导致输出不稳定");
  }, [isSubmitting, messages.length, submitError]);

  useEffect(() => {
    const defaultModel = options.defaultModel || options.models[0]?.value || "";
    const hasSelectedModel = options.models.some(
      (item) => item.value === selectedModel,
    );
    if (defaultModel && (!selectedModel || !hasSelectedModel)) {
      setSelectedModel(defaultModel);
    }
    const hasSelectedReasoningEffort = options.reasoningEfforts.some(
      (item) => item.value === selectedReasoningEffort,
    );
    if (
      options.reasoningEfforts[0]?.value &&
      (!selectedReasoningEffort || !hasSelectedReasoningEffort)
    ) {
      setSelectedReasoningEffort(options.reasoningEfforts[0].value);
    }
  }, [options, selectedModel, selectedReasoningEffort]);

  async function sendChatMessage({
    content,
    model,
    reasoningEffort,
    attachments = [],
  }) {
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
      status: "completed",
    };
    const streamingMessage = {
      id: `stream-${localId}`,
      role: "assistant",
      content: "",
      status: "streaming",
    };
    const nextMessages = [...messages, userMessage];
    setMessages(nextMessages);
    setSubmitError("");
    setIsSubmitting(true);

    try {
      setMessages([...nextMessages, streamingMessage]);
      const result = await chatApi.streamMessage(
        {
          conversationId,
          model,
          reasoningEffort,
          messages: toChatContext(nextMessages),
        },
        {
          onDelta: (delta) => {
            setMessages((current) =>
              current.map((message) =>
                message.id === streamingMessage.id
                  ? {
                      ...message,
                      content: appendChatStreamChunk(message.content, delta),
                    }
                  : message,
              ),
            );
          },
        },
      );
      setConversationId(result.conversationId);
      setMessages((current) =>
        current.map((message) =>
          message.id === streamingMessage.id ? result.message : message,
        ),
      );
      if (result.credits) setCredits(result.credits);
      chatApi
        .getConversations()
        .then(setConversations)
        .catch(() => {});
    } catch (error) {
      setMessages((current) =>
        current.map((message) =>
          message.id === streamingMessage.id
            ? {
                ...message,
                status: "failed",
                error: error.message || "发送失败",
              }
            : message,
        ),
      );
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
    setModelSwitchNotice("");
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
      onModelSwitchNotice={showModelSwitchNotice}
      reasoningEffort={selectedReasoningEffort}
      onReasoningEffortChange={setSelectedReasoningEffort}
    />
  );

  return (
    <section
      className={`chat-view-root ${isIntroState ? "is-intro" : ""}`}
      style={{ "--chat-actions-width": `${historyPanelWidth}px` }}
    >
      <div className="chat-topbar">
        <h1>大模型</h1>
        {credits && (
          <span className="credits-chip">积分 {credits.balance}</span>
        )}
      </div>
      {modelSwitchNotice && (
        <div className="chat-floating-notice" role="status" aria-live="polite">
          <span className="chat-floating-notice-icon">
            <CircleAlert size={16} />
          </span>
          <span>{modelSwitchNotice}</span>
        </div>
      )}
      <div className="chat-content-layout">
        <div className="chat-dialog-column">
          {isIntroState ? (
            <div className="llm-intro-layout">
              <ChatCanvas
                messages={messages}
                isSubmitting={isSubmitting}
                error={submitError}
              />
              {composer}
            </div>
          ) : (
            <>
              <ChatCanvas
                messages={messages}
                isSubmitting={isSubmitting}
                error={submitError}
              />
              {composer}
            </>
          )}
        </div>
        <aside className="chat-actions-panel" aria-label="对话操作">
          {conversations.length > 0 && (
            <>
              <button
                className="chat-new-conversation-button"
                type="button"
                onClick={startNewConversation}
                disabled={isSubmitting}
              >
                <Plus size={16} />
                新建对话
              </button>
              <button
                className={`history-toggle ${isHistoryOpen ? "is-open" : ""}`}
                type="button"
                onClick={() => setIsHistoryOpen((value) => !value)}
              >
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

const emptyDigitalHumanOptions = {
  models: [],
  defaults: { model: "", driveMode: "text" },
};
const digitalHumanMaxAudioMs = 15000;
const ttsEmotionOptions = [
  { value: "", label: "自动" },
  { value: "calm", label: "平静" },
  { value: "happy", label: "开心" },
  { value: "sad", label: "悲伤" },
  { value: "angry", label: "愤怒" },
  { value: "fearful", label: "害怕" },
  { value: "disgusted", label: "厌恶" },
  { value: "surprised", label: "惊讶" },
];

function formatDurationMs(durationMs = 0) {
  return `${(Number(durationMs || 0) / 1000).toFixed(1)} 秒`;
}

function formatProviderLabel(value, fallback = "视频合成") {
  const text = String(value || "").trim();
  if (!text || /\bkie\b/i.test(text)) {
    return fallback;
  }
  return text;
}

function applyCreditsUpdate(setCredits, credits) {
  if (!credits) return;
  setCredits(credits);
  emitCreditsUpdated(credits);
}

function getDigitalHumanPreviewSignature({
  text,
  voiceId,
  speed,
  volume,
  pitch,
  emotion,
}) {
  return JSON.stringify({
    text: String(text || "").trim(),
    voiceId,
    speed: Number(speed),
    volume: Number(volume),
    pitch: Number(pitch),
    emotion: emotion || "",
  });
}

const digitalHumanPublicPlaceholders = [
  {
    id: "public-anchor-dialogue",
    name: "主播对话",
    description: "适合主播对话、讲解与短视频口播内容。",
    language: "中文 / 通用",
    status: "ready",
  },
  {
    id: "public-product",
    name: "产品讲解员",
    description: "适合产品介绍、卖点说明与功能演示。",
    language: "中文 / 通用",
    status: "ready",
  },
  {
    id: "public-medical",
    name: "健康科普官",
    description: "适合健康科普、知识普及与专业解读。",
    language: "中文 / 通用",
    status: "ready",
  },
  {
    id: "public-home-lady",
    name: "居家知性女性",
    description: "适合生活方式分享、日常推荐与轻内容表达。",
    language: "中文 / 通用",
    status: "ready",
  },
  {
    id: "public-real-estate",
    name: "房地产经纪人",
    description: "适合楼盘介绍、房产讲解与销售咨询。",
    language: "中文 / 通用",
    status: "ready",
  },
  {
    id: "public-travel",
    name: "文旅推荐官",
    description: "适合景点推荐、路线介绍与文旅宣传。",
    language: "中文 / 通用",
    status: "ready",
  },
  {
    id: "public-fashion-host",
    name: "时尚类女主播",
    description: "适合穿搭分享、时尚推荐与美妆内容。",
    language: "中文 / 通用",
    status: "ready",
  },
  {
    id: "public-knowledge-host",
    name: "知识科普类女主播",
    description: "适合知识讲解、课程节选与信息梳理。",
    language: "中文 / 通用",
    status: "ready",
  },
  {
    id: "public-executive-lady",
    name: "职场女高管",
    description: "适合商务汇报、管理观点与职业表达。",
    language: "中文 / 通用",
    status: "ready",
  },
  {
    id: "public-business-host",
    name: "职场轻商务女主播",
    description: "适合企业宣传、职场分享与品牌内容。",
    language: "中文 / 通用",
    status: "ready",
  },
  {
    id: "public-finance",
    name: "财经主播",
    description: "适合财经解读、市场观察与资讯播报。",
    language: "中文 / 通用",
    status: "ready",
  },
  {
    id: "public-operations",
    name: "运营达人",
    description: "适合活动运营、增长案例与方法分享。",
    language: "中文 / 通用",
    status: "ready",
  },
];

function getDigitalHumanPublicAvatars(list = []) {
  const merged = new Map();
  digitalHumanPublicPlaceholders.forEach((item) => merged.set(item.id, item));
  list.forEach((item) => {
    const fallback = merged.get(item.id) || {};
    merged.set(item.id, {
      ...fallback,
      ...item,
      cover:
        item.cover ||
        item.assetPath ||
        item.imagePath ||
        item.posterPath ||
        fallback.cover,
    });
  });
  return [...merged.values()];
}

function isDigitalHumanVideoCover(value) {
  const source = String(value || "").split(/[?#]/)[0];
  return /\.(mp4|webm|mov)$/i.test(source);
}

function resolveDigitalHumanAvatarSelection(current, avatarData) {
  const allAvatars = getDigitalHumanPublicAvatars(avatarData.public);
  const myAvatars = Array.isArray(avatarData.mine) ? avatarData.mine : [];
  const matchedAvatar = current?.id
    ? [...allAvatars, ...myAvatars].find((item) => String(item.id) === String(current.id))
    : null;
  if (matchedAvatar) return matchedAvatar;
  if (current) return current;
  return allAvatars[0] || myAvatars[0] || null;
}

function DigitalHumanEmptyMedia({
  title,
  description,
  icon: Icon = UserRound,
}) {
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

function DigitalHumanCoverSkeleton({ label = "封面加载中" }) {
  return (
    <div className="dh-cover-skeleton" aria-label={label}>
      <Loader2 size={24} />
      <span>{label}</span>
    </div>
  );
}

function DigitalHumanPreloadCover({ avatar, isVideoCover }) {
  const [loadState, setLoadState] = useState("loading");
  const cover = avatar?.cover || "";

  useEffect(() => {
    setLoadState(cover ? "loading" : "empty");
  }, [cover]);

  if (!cover) {
    return (
      <DigitalHumanEmptyMedia
        title="形象素材位"
        description="等待补充数字人视频或封面"
      />
    );
  }

  const isLoading = loadState === "loading";
  const isFailed = loadState === "failed";

  if (isFailed) {
    return (
      <DigitalHumanEmptyMedia
        title="封面暂不可用"
        description="稍后刷新或选择其他数字人模板"
      />
    );
  }

  return (
    <>
      {isVideoCover ? (
        <video
          className={isLoading ? "is-cover-loading" : ""}
          src={cover}
          muted
          loop
          playsInline
          preload="metadata"
          onLoadedData={() => setLoadState("ready")}
          onCanPlay={() => setLoadState("ready")}
          onError={() => setLoadState("failed")}
          onMouseEnter={(event) => {
            if (loadState === "ready") event.currentTarget.play();
          }}
          onMouseLeave={(event) => event.currentTarget.pause()}
        />
      ) : (
        <img
          className={isLoading ? "is-cover-loading" : ""}
          src={cover}
          alt={avatar.name}
          onLoad={() => setLoadState("ready")}
          onError={() => setLoadState("failed")}
        />
      )}
    </>
  );
}

function DigitalHumanAvatarCard({
  avatar,
  selected,
  onSelect,
  onPreview,
  onRename,
  onDelete,
  mine = false,
}) {
  const isTraining = avatar.status === "training";
  const isVideoCover = isDigitalHumanVideoCover(avatar.cover);
  return (
    <article
      className={`dh-avatar-card ${selected ? "is-selected" : ""} ${isTraining ? "is-training" : ""}`}
    >
      <button
        className="dh-avatar-cover"
        type="button"
        onClick={() => onSelect(avatar)}
        aria-label={`选择 ${avatar.name}`}
      >
        <DigitalHumanPreloadCover avatar={avatar} isVideoCover={isVideoCover} />
        <span className="dh-avatar-badge">
          {selected
            ? "已选中"
            : isTraining
              ? "训练中"
              : avatar.cover
                ? "模板"
                : "占位"}
        </span>
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
  const isVideoCover = isDigitalHumanVideoCover(avatar?.cover);

  if (!avatar) return null;

  return (
    <div className="dh-modal-backdrop" role="dialog" aria-modal="true">
      <div className="dh-avatar-preview-modal">
        <div className="dh-modal-header">
          <div>
            <span>形象预览</span>
            <strong>{avatar.name}</strong>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭">
            <X size={18} />
          </button>
        </div>
        <div className="dh-avatar-preview-body">
          {isVideoCover ? (
            <video src={avatar.cover} controls autoPlay playsInline />
          ) : avatar.cover ? (
            <img src={avatar.cover} alt={avatar.name} />
          ) : (
            <DigitalHumanEmptyMedia
              title="暂无预览素材"
              description="等待补充数字人视频或封面"
            />
          )}
        </div>
      </div>
    </div>
  );
}

function DigitalHumanTaskCard({
  task,
  selected,
  onSelect,
  onDelete,
  onRegenerate,
}) {
  const isProcessing =
    task.status === "processing" || task.status === "pending";
  const isCompleted = task.status === "completed";
  const isFailed = task.status === "failed";
  return (
    <article className={`dh-task-card ${selected ? "is-selected" : ""}`}>
      <button
        className="dh-task-preview"
        type="button"
        onClick={() => onSelect(task)}
      >
        {task.resultUrl ? (
          <video src={task.resultUrl} muted playsInline preload="metadata" />
        ) : task.thumbnailUrl ? (
          <img src={task.thumbnailUrl} alt={task.avatarName} />
        ) : (
          <DigitalHumanEmptyMedia
            icon={Video}
            title={
              isFailed ? "生成失败" : isCompleted ? "结果待返回" : "生成中"
            }
            description={
              isFailed
                ? task.error || "任务失败，积分已退回"
                : isCompleted
                  ? "点击查看生成结果"
                  : `${task.progress || 0}%`
            }
          />
        )}
      </button>
      <div className="dh-task-meta">
        <strong>{task.avatarName}</strong>
        <span>
          {task.voiceName} 路{" "}
          {task.driveMode === "audio" ? "音频驱动" : "文本驱动"} 路{" "}
          {formatProviderLabel(task.providerModel)}
        </span>
        <div className="dh-progress-track">
          <i style={{ width: `${task.progress || 0}%` }} />
        </div>
        <small>{task.createdAt}</small>
      </div>
      <div className="dh-task-actions">
        <button
          type="button"
          onClick={() => onRegenerate(task.id)}
          disabled={isProcessing}
        >
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
      <p>驱动音频已生成，正在合成数字人口播成片。</p>
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
          <button type="button" onClick={onClose} aria-label="关闭">
            关闭
          </button>
        </div>
        <div className="dh-modal-body">
          <label className="dh-field">
            <span>形象名称</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="例如：产品讲解员"
            />
          </label>
          <button
            className="dh-upload-zone"
            type="button"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              hidden
              onChange={(event) => {
                setFile(event.target.files?.[0] || null);
                event.target.value = "";
              }}
            />
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
            <span>
              {file
                ? "素材会在真实接口接入后上传"
                : "当前不上载文件，只保留 UI 和 API 结构"}
            </span>
          </button>
          {notice && <div className="dh-form-notice">{notice}</div>}
        </div>
        <div className="dh-modal-footer">
          <button type="button" onClick={onClose}>
            取消
          </button>
          <button type="button" onClick={submit} disabled={isSubmitting}>
            {isSubmitting ? <Loader2 size={16} /> : <Plus size={16} />}
            创建形象
          </button>
        </div>
      </div>
    </div>
  );
}

function DigitalHumanConfigPanel({
  options,
  voices,
  selectedAvatar,
  onSubmit,
  isSubmitting,
}) {
  const audioInputRef = useRef(null);
  const [driveMode, setDriveMode] = useState("text");
  const [text, setText] = useState(
    "大家好，欢迎来到我们的 AI 创作平台。今天我将为您介绍全新的数字人功能。",
  );
  const [audioFile, setAudioFile] = useState(null);
  const [model, setModel] = useState(
    options.defaults?.model || options.models[0]?.value || "",
  );
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

  const selectedModel =
    options.models.find((item) => item.value === model) || options.models[0];
  const selectedVoice = voices.find((item) => item.id === voiceId) || voices[0];
  const estimate = Math.max(1, Math.ceil(text.length / 180));
  const selectedAvatarIsVideo = isDigitalHumanVideoCover(selectedAvatar?.cover);
  const currentPreviewSignature = getDigitalHumanPreviewSignature({
    text,
    voiceId,
    speed: ttsSpeed,
    volume: ttsVolume,
    pitch: ttsPitch,
    emotion: ttsEmotion,
  });
  const isPreviewCurrent =
    voicePreviewInfo?.signature === currentPreviewSignature;
  const currentAudioTooLong =
    isPreviewCurrent && voicePreviewInfo.durationMs > digitalHumanMaxAudioMs;

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
        emotion: ttsEmotion,
      });
      if (result.audioDataUrl) setVoicePreviewUrl(result.audioDataUrl);
      const durationMs = Number(result.durationMs || 0);
      setVoicePreviewInfo({
        signature: currentPreviewSignature,
        durationMs,
        videoDuration: result.videoDuration || Math.ceil(durationMs / 1000),
      });
      setNotice(
        durationMs > digitalHumanMaxAudioMs
          ? `当前音频 ${formatDurationMs(durationMs)}，超过 15 秒，请缩短文本或切片后分段生成`
          : `已生成当前音色试听，视频时长将按音频反推为 ${result.videoDuration || Math.ceil(durationMs / 1000)} 秒`,
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
      setNotice(
        `当前音频 ${formatDurationMs(voicePreviewInfo.durationMs)}，超过 15 秒，请缩短文本或切片后分段生成`,
      );
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
      emotion: ttsEmotion,
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
        <button
          className={driveMode === "text" ? "is-active" : ""}
          type="button"
          onClick={() => setDriveMode("text")}
        >
          文本驱动
        </button>
        <button type="button" disabled title="音频驱动将在第二阶段接入">
          音频驱动
        </button>
      </div>
      {driveMode === "text" ? (
        <label className="dh-field dh-script-field">
          <span>
            文本脚本{" "}
            <small>
              {text.length} / 2000 字 · 预计 {estimate} 分钟
            </small>
          </span>
          <textarea
            value={text}
            maxLength={2000}
            onChange={(event) => setText(event.target.value)}
            placeholder="请输入数字人要说的话..."
          />
        </label>
      ) : (
        <button
          className="dh-audio-upload"
          type="button"
          onClick={() => audioInputRef.current?.click()}
        >
          <input
            ref={audioInputRef}
            type="file"
            accept="audio/*"
            hidden
            onChange={(event) => {
              setAudioFile(event.target.files?.[0] || null);
              event.target.value = "";
            }}
          />
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
          <span>
            {audioFile
              ? "已选择，真实接口接入后上传"
              : "限制 3 分钟以内，当前为占位"}
          </span>
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
        {selectedModel && (
          <small>
            调用模型：
            {formatProviderLabel(selectedModel.providerModel, selectedModel.value)} ·{" "}
            {selectedModel.resolution || "720p"}
          </small>
        )}
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
            <CustomSelect
              className="custom-select-theme-dh"
              ariaLabel="音色情绪"
              value={ttsEmotion}
              onChange={setTtsEmotion}
              options={ttsEmotionOptions}
            />
          </label>
          <label className="dh-range-field">
            <span>
              语速 <small>{ttsSpeed.toFixed(2)}x</small>
            </span>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.05"
              value={ttsSpeed}
              onChange={(event) => setTtsSpeed(Number(event.target.value))}
            />
          </label>
          <label className="dh-range-field">
            <span>
              音量 <small>{ttsVolume.toFixed(1)}</small>
            </span>
            <input
              type="range"
              min="0.1"
              max="10"
              step="0.1"
              value={ttsVolume}
              onChange={(event) => setTtsVolume(Number(event.target.value))}
            />
          </label>
          <label className="dh-range-field">
            <span>
              音调 <small>{ttsPitch > 0 ? `+${ttsPitch}` : ttsPitch}</small>
            </span>
            <input
              type="range"
              min="-12"
              max="12"
              step="1"
              value={ttsPitch}
              onChange={(event) => setTtsPitch(Number(event.target.value))}
            />
          </label>
        </div>
        <button
          className="dh-design-voice-button"
          type="button"
          onClick={previewVoice}
          disabled={isDesigningVoice}
        >
          {isDesigningVoice ? <Loader2 size={16} /> : <Mic size={16} />}
          试听当前音色
        </button>
        {voicePreviewUrl && (
          <audio className="dh-voice-preview" src={voicePreviewUrl} controls />
        )}
        <div
          className={`dh-duration-check ${currentAudioTooLong ? "is-warning" : isPreviewCurrent ? "is-ready" : ""}`}
        >
          {isPreviewCurrent ? (
            <span>
              当前音频 {formatDurationMs(voicePreviewInfo.durationMs)}
              {currentAudioTooLong
                ? "，超过 15 秒，需要切片"
                : `，视频将生成 ${voicePreviewInfo.videoDuration} 秒`}
            </span>
          ) : (
            <span>生成前请先试听当前音色，用真实音频时长反推视频时长</span>
          )}
        </div>
      </div>
      {notice && <div className="dh-form-notice">{notice}</div>}
      <button
        className="dh-generate-button"
        type="button"
        onClick={submit}
        disabled={isSubmitting || !isPreviewCurrent || currentAudioTooLong}
      >
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
  const taskStatusSignatureRef = useRef("");

  // 模块由外层保活挂载，此处始终订阅数字人任务与形象
  useEffect(() => {
    let mounted = true;
    function applyTaskList(value) {
      if (!mounted) return;
      const nextSignature = taskStatusSignature(value);
      const didStatusChange =
        taskStatusSignatureRef.current &&
        taskStatusSignatureRef.current !== nextSignature;
      taskStatusSignatureRef.current = nextSignature;
      digitalHumanApi.setHasRunningTasks(hasRunningTasks(value));
      setTasks(value);
      setSelectedTask((current) => {
        if (!current) return current;
        return (
          value.find((task) => String(task.id) === String(current.id)) ||
          current
        );
      });
      if (didStatusChange) {
        digitalHumanApi
          .getCredits()
          .then((creditsValue) =>
            mounted && applyCreditsUpdate(setCredits, creditsValue),
          )
          .catch(() => {});
      }
    }
    async function load() {
      try {
        const [modelData, avatarData, voiceData, taskData, creditData] =
          await Promise.all([
            digitalHumanApi.getModels(),
            digitalHumanApi.getAvatars(),
            digitalHumanApi.getVoices(),
            digitalHumanApi.getTasks(),
            digitalHumanApi.getCredits().catch(() => null),
          ]);
        if (!mounted) return;
        setOptions(modelData);
        setAvatars(avatarData);
        setVoices(voiceData.voices || []);
        applyTaskList(taskData);
        applyCreditsUpdate(setCredits, creditData);
        setSelectedAvatar((current) => resolveDigitalHumanAvatarSelection(current, avatarData));
      } catch (loadError) {
        if (mounted) setError(loadError.message || "加载数字人功能失败");
      }
    }
    load();
    const unsubscribe = digitalHumanApi.subscribe(() => {
      digitalHumanApi
        .getTasks()
        .then(applyTaskList)
        .catch(() => {});
      digitalHumanApi
        .getAvatars()
        .then((value) => mounted && setAvatars(value))
        .then((value) => {
          if (!mounted || !value) return;
          setSelectedAvatar((current) => resolveDigitalHumanAvatarSelection(current, value));
        })
        .catch(() => {});
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
      digitalHumanApi
        .getCredits()
        .then((value) => applyCreditsUpdate(setCredits, value))
        .catch(() => {});
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
    setSelectedAvatar((current) => (current?.id === id ? null : current));
  }

  async function renameAvatar(avatar) {
    const nextName = window.prompt("输入新的形象名称", avatar.name);
    if (!nextName?.trim()) return;
    const updated = await digitalHumanApi.updateAvatar(avatar.id, {
      name: nextName.trim(),
    });
    setSelectedAvatar(updated);
  }

  async function deleteTask(id) {
    await digitalHumanApi.deleteTask(id);
    setSelectedTask((current) => (current?.id === id ? null : current));
  }

  async function regenerateTask(id) {
    const task = await digitalHumanApi.regenerateTask(id);
    digitalHumanApi
      .getCredits()
      .then((value) => applyCreditsUpdate(setCredits, value))
      .catch(() => {});
    setSelectedTask(task);
  }

  const visibleAvatars =
    tab === "mine"
      ? avatars.mine
      : getDigitalHumanPublicAvatars(avatars.public);
  const currentPreviewTask = selectedTask;
  const isPreviewProcessing =
    currentPreviewTask &&
    !["completed", "failed"].includes(currentPreviewTask.status);

  return (
    <section className="dh-view-root">
      <div className="dh-topbar">
        <div>
          <span>数字人</span>
          <h1>创建会说话的数字人视频</h1>
        </div>
        {credits && (
          <span className="credits-chip">积分 {credits.balance}</span>
        )}
      </div>
      {error && <div className="video-submit-error">{error}</div>}
      <div
        className={`dh-workspace ${currentPreviewTask ? "is-generating" : "is-browsing"}`}
      >
        {!currentPreviewTask ? (
          <section className="dh-library-panel">
            <div className="dh-library-heading">
              <div>
                <span>第 1 步</span>
                <strong>选择数字人模板</strong>
              </div>
              <small>
                {selectedAvatar
                  ? `已选择：${selectedAvatar.name}`
                  : "选择后右侧会显示当前模板和调用模型"}
              </small>
            </div>
            <div className="dh-tabs">
              <button
                className={tab === "public" ? "is-active" : ""}
                type="button"
                onClick={() => setTab("public")}
              >
                公共形象
              </button>
              <button
                className={tab === "mine" ? "is-active" : ""}
                type="button"
                onClick={() => setTab("mine")}
              >
                我的形象
              </button>
              <button
                className={tab === "history" ? "is-active" : ""}
                type="button"
                onClick={() => setTab("history")}
              >
                生成记录
              </button>
            </div>
            {tab === "mine" && (
              <button
                className="dh-create-card"
                type="button"
                onClick={() => setIsCreateOpen(true)}
              >
                <Plus size={20} />
                <strong>创建形象</strong>
                <span>预留视频训练入口</span>
              </button>
            )}
            {tab === "history" ? (
              <div className="dh-task-list">
                {tasks.length ? (
                  tasks.map((task) => (
                    <DigitalHumanTaskCard
                      key={task.id}
                      task={task}
                      selected={currentPreviewTask?.id === task.id}
                      onSelect={setSelectedTask}
                      onDelete={deleteTask}
                      onRegenerate={regenerateTask}
                    />
                  ))
                ) : (
                  <DigitalHumanEmptyMedia
                    icon={Video}
                    title="暂无生成记录"
                    description="提交任务后会在这里显示进度"
                  />
                )}
              </div>
            ) : (
              <div className="dh-avatar-list">
                {visibleAvatars.length ? (
                  visibleAvatars.map((avatar) => (
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
                  ))
                ) : (
                  <DigitalHumanEmptyMedia
                    title="还没有自定义形象"
                    description="点击创建形象，后续接入 MiniMax 训练接口"
                  />
                )}
              </div>
            )}
          </section>
        ) : (
          <main className="dh-preview-stage">
            <div className="dh-preview-header">
              <div>
                <span>{currentPreviewTask ? "生成预览" : "形象预览"}</span>
                <strong>
                  {currentPreviewTask?.avatarName ||
                    selectedAvatar?.name ||
                    "请选择数字人形象"}
                </strong>
              </div>
              <div className="dh-preview-header-actions">
                {currentPreviewTask?.resultUrl && (
                  <a
                    className="dh-download-button"
                    href={currentPreviewTask.resultUrl}
                    download
                    target="_blank"
                    rel="noreferrer"
                  >
                    <Download size={14} />
                    下载视频
                  </a>
                )}
                <button
                  className="dh-preview-back"
                  type="button"
                  onClick={() => setSelectedTask(null)}
                >
                  <Layers size={14} />
                  返回
                </button>
                {currentPreviewTask?.status === "completed" ? (
                  <button
                    className="dh-preview-return-home"
                    type="button"
                    onClick={onReturnHome}
                  >
                    <Home size={14} />
                    返回
                  </button>
                ) : currentPreviewTask ? (
                  <small>
                    {currentPreviewTask.status === "failed"
                      ? "失败"
                      : `生成中 ${currentPreviewTask.progress || 0}%`}
                  </small>
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
                  title={
                    currentPreviewTask?.status === "failed"
                      ? "生成失败"
                      : currentPreviewTask?.status === "completed"
                        ? "视频结果待返回"
                        : "正在生成数字人视频"
                  }
                  description={
                    currentPreviewTask?.status === "failed"
                      ? currentPreviewTask.error
                      : currentPreviewTask
                        ? `任务已提交，正在生成口型视频。当前进度 ${currentPreviewTask.progress || 0}%`
                        : "这里会展示选中形象或生成后的视频"
                  }
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
                <strong>
                  {currentPreviewTask?.driveMode === "audio"
                    ? "音频驱动"
                    : "文本驱动"}
                </strong>
              </div>
              <div>
                <span>接口状态</span>
                <strong>
                  {formatProviderLabel(
                    currentPreviewTask?.providerModel,
                    "音视频合成",
                  )}
                </strong>
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
  defaults: {
    model: "kie-motion-transfer",
    resolution: "720p",
    characterOrientation: "image",
  },
  modes: [
    { value: "720p", label: "720p" },
    { value: "1080p", label: "1080p" },
  ],
  characterOrientations: [
    { value: "image", label: "图片朝向", maxSeconds: 10 },
    { value: "video", label: "视频朝向", maxSeconds: 30 },
  ],
  limits: {
    maxImageBytes: 10 * 1024 * 1024,
    maxVideoBytes: 100 * 1024 * 1024,
    recommendedVideoSeconds: 30,
  },
};

const motionTransferCopy = {
  emptyTitle: "开启你的动作迁移",
  emptyDescription: "上传图片和动作视频，让静态人物动起来",
  completedTitle: "动作迁移已完成",
  processingCreate: "正在创建动作迁移任务",
  processingGenerate: "正在生成动作迁移视频",
  processingDescription:
    "正在上传人物图片和动作参考视频。完成后会自动回填到这里。",
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
  createError: "创建动作迁移任务失败",
};

const faceSwapCopy = {
  emptyTitle: "开启你的视频换脸",
  emptyDescription: "上传人脸图和目标视频，让人物身份自然融合到视频中",
  completedTitle: "视频换脸已完成",
  processingCreate: "正在创建视频换脸任务",
  processingGenerate: "正在生成换脸视频",
  processingDescription:
    "正在上传人脸图片和目标视频。完成后会自动回填到这里。",
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
  createError: "创建视频换脸任务失败",
};

const imageDigitalHumanCopy = {
  ...faceSwapCopy,
  emptyTitle: "开启你的图片数字人",
  emptyDescription: "上传人物正面图，配置脚本与音色，快速生成口型自然的视频内容",
  completedTitle: "图片数字人已完成",
  processingCreate: "正在创建图片数字人任务",
  processingGenerate: "正在生成数字人视频",
  processingDescription:
    "正在处理人物图片、脚本和音色配置。完成后会自动回填到这里。",
  recentEmptyTitle: "暂无图片数字人结果",
  recentEmptyDescription: "生成完成的数字人视频会保存在这里。",
  imageTitle: "上传人物图",
  imageHint: "正面清晰，光线自然效果最佳",
  videoTitle: "配置脚本与音色",
  submitLabel: "生成数字人视频",
  panelLabel: "图片数字人生成面板",
  imageRequired: "请先上传人物图片",
  videoRequired: "请先完成脚本与音色配置",
  imageFallback: "人物图片",
  videoFallback: "数字人视频",
  loadError: "加载图片数字人失败",
  createError: "创建图片数字人任务失败",
};

const voiceSynthesisCopy = {
  ...faceSwapCopy,
  emptyDescription: "上传目标音色并输入文本，一键生成专属语音",
};

const musicGenerationCopy = {
  ...faceSwapCopy,
  emptyDescription: "输入风格描述和歌词，AI 为你快速创作专属音乐",
};

const voiceConversionCopy = {
  ...faceSwapCopy,
  emptyDescription: "上传目标音色和源音频，自动提取内容并转换成目标声音",
};

function mapImageDigitalHumanMotionTask(task) {
  if (!task) return task;
  return {
    ...task,
    prompt: task.text || "图片数字人视频",
    imageUrl: task.portraitUrl || task.imageUrl || "",
    imageFileName: "人物图片",
    videoFileName: task.voiceName || "数字人视频",
    model: task.model || task.modelKey || "image-digital-human",
    providerModel: task.providerModel || task.usedProviderModel || task.model,
    resolution: task.duration ? `${task.duration}s` : "数字人",
    characterOrientation: "image",
    price: task.costPoints ? `积分 ${task.costPoints}` : "",
    favorite: Boolean(task.favorite),
  };
}

const imageDigitalHumanMotionApi = {
  subscribe: imageDigitalHumanApi.subscribe,
  setHasRunningTasks: imageDigitalHumanApi.setHasRunningTasks,
  getCredits: imageDigitalHumanApi.getCredits,
  getModels: imageDigitalHumanApi.getModels,

  async getTasks({ filter = "all" } = {}) {
    const tasks = await imageDigitalHumanApi.getTasks();
    const mapped = tasks.map(mapImageDigitalHumanMotionTask);
    if (filter === "favorite") return mapped.filter((task) => task.favorite);
    return mapped;
  },

  async createTask() {
    throw new Error("请在主页提交图片数字人任务");
  },

  async deleteTask(id) {
    return imageDigitalHumanApi.deleteTask(id);
  },

  async toggleFavorite(id) {
    const tasks = await imageDigitalHumanApi.getTasks();
    const task = tasks.find((item) => String(item.id) === String(id));
    return mapImageDigitalHumanMotionTask(task || { id, favorite: false });
  },
};

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value >= 1024 * 1024) return `${(value / 1024 / 1024).toFixed(1)} MB`;
  if (value >= 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${value} B`;
}

function MotionTransferCenterState({
  task,
  isSubmitting,
  error,
  onOpenRecent,
  copy = motionTransferCopy,
}) {
  if (task?.status === "completed") {
    return (
      <section className="motion-center-state is-completed">
        <div className="motion-result-player">
          <video
            src={task.resultUrl}
            controls
            playsInline
            poster={task.thumbnailUrl || task.imageUrl}
          />
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
        <p>
          {error ||
            task?.error ||
            "生成服务返回了错误，积分会按任务状态自动处理。"}
        </p>
      </section>
    );
  }

  return (
    <section className="motion-center-state is-processing" aria-live="polite">
      <span className="motion-center-spinner">
        <Loader2 size={30} />
      </span>
      <strong>
        {isSubmitting ? copy.processingCreate : copy.processingGenerate}
      </strong>
      <p>{copy.processingDescription}</p>
      <div className="motion-center-progress">
        <i style={{ width: `${task?.progress || 28}%` }} />
      </div>
      <small>
        {task?.progress ? `${task.progress}%` : "任务准备中"} · 请保持页面打开
      </small>
    </section>
  );
}

function MotionTransferTaskCard({
  task,
  onDelete,
  onFavorite,
  onRepeat,
  copy = motionTransferCopy,
}) {
  const isProcessing = task.status === "processing";
  const isFailed = task.status === "failed";
  return (
    <article className={`motion-task-card status-${task.status}`}>
      <div className="motion-task-preview">
        {task.resultUrl && !isFailed ? (
          <video
            src={task.resultUrl}
            controls
            playsInline
            preload="metadata"
            poster={task.thumbnailUrl || task.imageUrl}
          />
        ) : (
          <div
            className={`motion-task-placeholder ${isFailed ? "is-failed" : ""}`}
          >
            {isProcessing ? <Loader2 size={26} /> : <Video size={26} />}
            <strong>{isFailed ? "生成失败" : "生成中"}</strong>
          </div>
        )}
      </div>
      <div className="motion-task-meta">
        <div className="tag-row">
          <span className="model-tag">
            {formatProviderLabel(task.providerModel || task.model)}
          </span>
          <span className="ratio-tag">{task.resolution}</span>
          <span className="quality-tag">
            {task.characterOrientation === "video" ? "视频朝向" : "图片朝向"}
          </span>
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
          <button
            className={`icon-circle ${task.favorite ? "is-favorite" : ""}`}
            type="button"
            onClick={() => onFavorite(task.id)}
            aria-label="收藏"
          >
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

function MotionTransferUploadSlot({
  kind,
  title,
  hint,
  asset,
  previewUrl,
  isUploading,
  onSelect,
  onClear,
}) {
  const inputRef = useRef(null);
  const Icon = kind === "image" ? Image : Film;
  function clearFile(event) {
    event.preventDefault();
    event.stopPropagation();
    onClear?.();
  }
  return (
    <button
      className={`motion-upload-slot ${previewUrl ? "has-preview" : ""}`}
      type="button"
      onClick={() => inputRef.current?.click()}
    >
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
      {asset && (
        <small>
          {asset.fileName} · {formatBytes(asset.sizeBytes)}
        </small>
      )}
      {isUploading && (
        <span className="motion-uploading">
          <Loader2 size={16} />
          上传中
        </span>
      )}
    </button>
  );
}

function MotionTransferComposer({
  options,
  onSubmit,
  isSubmitting,
  api = motionTransferApi,
  copy = motionTransferCopy,
}) {
  const [imageAsset, setImageAsset] = useState(null);
  const [videoAsset, setVideoAsset] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [videoPreview, setVideoPreview] = useState("");
  const [model, setModel] = useState(
    options.defaults?.model || options.models[0]?.value || "",
  );
  const [resolution, setResolution] = useState(
    options.defaults?.resolution || "720p",
  );
  const [characterOrientation, setCharacterOrientation] = useState(
    options.defaults?.characterOrientation || "image",
  );
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState("");

  useEffect(() => {
    if (!model && (options.defaults?.model || options.models[0]?.value)) {
      setModel(options.defaults?.model || options.models[0].value);
    }
    if (!resolution && options.defaults?.resolution)
      setResolution(options.defaults.resolution);
    if (!characterOrientation && options.defaults?.characterOrientation)
      setCharacterOrientation(options.defaults.characterOrientation);
  }, [characterOrientation, model, options, resolution]);

  useEffect(() => {
    return () => {
      if (imagePreview) window.URL.revokeObjectURL(imagePreview);
      if (videoPreview) window.URL.revokeObjectURL(videoPreview);
    };
  }, [imagePreview, videoPreview]);

  const selectedModel =
    options.models.find((item) => item.value === model) || options.models[0];
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
      characterOrientation,
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
        <CustomSelect
          className="control-select model-select content-fit-select"
          ariaLabel="模型"
          icon={Box}
          value={model}
          onChange={setModel}
          options={options.models}
        />
        <CustomSelect
          className="control-select content-fit-select"
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
          options={
            options.characterOrientations ||
            emptyMotionTransferOptions.characterOrientations
          }
        />
        <span className="price-pill">{price}</span>
        <button
          className="send-button"
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          aria-label={copy.submitLabel}
        >
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

function MotionTransferView({
  navId = "motion",
  api = motionTransferApi,
  copy = motionTransferCopy,
  splitResults = false,
  WorkbenchComponent = FaceSwapWorkbench,
  heading,
  privacyText,
}) {
  const [tasks, setTasks] = useState([]);
  const [options, setOptions] = useState(emptyMotionTransferOptions);
  const [credits, setCredits] = useState(null);
  const [filter, setFilter] = useState("all");
  const [viewTab, setViewTab] = useState("home");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submittedTaskId, setSubmittedTaskId] = useState(() =>
    readMotionActiveTaskId(navId),
  );
  const taskStatusSignatureRef = useRef("");

  function applyTaskData(taskData, runningTaskData = taskData) {
    const nextSignature = taskStatusSignature(taskData);
    const didStatusChange =
      taskStatusSignatureRef.current &&
      taskStatusSignatureRef.current !== nextSignature;
    taskStatusSignatureRef.current = nextSignature;
    api.setHasRunningTasks?.(hasRunningTasks(runningTaskData));
    setTasks(taskData);
    setSubmittedTaskId((current) => {
      if (
        current &&
        taskData.some((task) => String(task.id) === String(current))
      )
        return current;
      if (current) writeMotionActiveTaskId(navId, null);
      return null;
    });
    if (didStatusChange) {
      api
        .getCredits()
        .then((value) => applyCreditsUpdate(setCredits, value))
        .catch(() => {});
    }
  }

  useEffect(() => {
    let mounted = true;
    async function load() {
      try {
        const taskFilter = splitResults ? "all" : filter;
        const [modelData, taskData, runningTaskData, creditData] = await Promise.all([
          api.getModels(),
          api.getTasks({ filter: taskFilter }),
          taskFilter === "all"
            ? Promise.resolve(null)
            : api.getTasks({ filter: "all" }),
          api.getCredits().catch(() => null),
        ]);
        if (!mounted) return;
        setOptions(modelData);
        applyTaskData(taskData, runningTaskData || taskData);
        applyCreditsUpdate(setCredits, creditData);
      } catch (error) {
        if (mounted) setSubmitError(error.message || copy.loadError);
      }
    }
    load();
    const unsubscribe = api.subscribe(() => {
      const taskFilter = splitResults ? "all" : filter;
      const taskRequest =
        taskFilter === "all"
          ? api
              .getTasks({ filter: taskFilter })
              .then((value) => [value, value])
          : Promise.all([
              api.getTasks({ filter: taskFilter }),
              api.getTasks({ filter: "all" }),
            ]);
      taskRequest
        .then(([value, runningValue]) => mounted && applyTaskData(value, runningValue))
        .catch(() => {});
      api
        .getCredits()
        .then((value) => mounted && applyCreditsUpdate(setCredits, value))
        .catch(() => {});
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, [api, copy.loadError, filter, navId, splitResults]);

  useEffect(() => {
    writeMotionActiveTaskId(navId, submittedTaskId);
  }, [navId, submittedTaskId]);

  const submittedTask =
    tasks.find((task) => String(task.id) === String(submittedTaskId)) || null;
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
    ? (viewTab === "recent" || viewTab === "favorite") &&
      !showCenterState &&
      visibleTasks.length === 0
    : !showEmptyHero && !showCenterState && visibleTasks.length === 0;

  async function createTask(payload) {
    setSubmitError("");
    setIsSubmitting(true);
    setSubmittedTaskId(null);
    try {
      const task = await api.createTask(payload);
      api
        .getCredits()
        .then((value) => applyCreditsUpdate(setCredits, value))
        .catch(() => {});
      setSubmittedTaskId(task.id);
      writeMotionActiveTaskId(navId, task.id);
      if (splitResults) setViewTab("home");
      setTasks((current) => [
        task,
        ...current.filter((item) => item.id !== task.id),
      ]);
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
    setTasks((current) =>
      current.map((task) => (String(task.id) === String(id) ? updated : task)),
    );
  }

  function repeatTask(task) {
    createTask({
      imageAssetId: task.imageAssetId,
      videoAssetId: task.videoAssetId,
      model: task.model,
      resolution: task.resolution,
      characterOrientation: task.characterOrientation,
      prompt: task.prompt,
    });
  }

  return (
    <section
      className={`motion-view-root ${splitResults ? "face-swap-view-root" : ""}`}
    >
      <div className="image-filter-tabs motion-filter-tabs">
        {splitResults ? (
          <>
            <button
              className={viewTab === "home" ? "selected" : ""}
              type="button"
              onClick={() => setViewTab("home")}
            >
              主页
            </button>
            <button
              className={viewTab === "recent" ? "selected" : ""}
              type="button"
              onClick={() => {
                setViewTab("recent");
                setSubmittedTaskId(null);
                writeMotionActiveTaskId(navId, null);
              }}
            >
              最近生成
            </button>
            <button type="button" disabled>
              <Star size={17} fill="#f8d545" color="#161616" />
              收藏
            </button>
          </>
        ) : (
          <>
            <button
              className={filter === "all" ? "selected" : ""}
              type="button"
              onClick={() => setFilter("all")}
            >
              全部结果
            </button>
            <button
              className={filter === "favorite" ? "selected" : ""}
              type="button"
              onClick={() => setFilter("favorite")}
            >
              <Star size={17} fill="#f8d545" color="#161616" />
              收藏
            </button>
          </>
        )}
        {credits && (
          <span className="credits-chip">积分 {credits.balance}</span>
        )}
      </div>
      <div
        className={`motion-canvas ${showCenterState ? "has-active-task" : ""}`}
      >
        {useWorkbenchView &&
          (isFaceSwapView ? viewTab === "home" : showEmptyHero) &&
          !showCenterState && (
            <WorkbenchComponent
              options={options}
              onSubmit={createTask}
              isSubmitting={isSubmitting}
              api={api}
              copy={copy}
              heading={heading || (navId === "motion" ? "AI 动作迁移" : "AI 换脸工具")}
              privacyText={
                privacyText ||
                (navId === "motion"
                  ? "您上传的内容仅用于动作迁移处理，不会被用于其他用途。"
                  : "您上传的内容仅用于换脸处理，不会被用于其他用途。")
              }
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
        {(!useWorkbenchView ||
          !showEmptyHero ||
          (isFaceSwapView && viewTab !== "home")) && (
          <div
            className={`motion-results-feed ${visibleTasks.length ? "has-results" : ""}`}
          >
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
    videoResolution: "720p",
  },
  limits: {
    maxImageBytes: 10 * 1024 * 1024,
    maxVideoBytes: 200 * 1024 * 1024,
    recommendedVideoSeconds: 15,
  },
};

function WatermarkCenterState({ task, isSubmitting, error, onOpenRecent }) {
  if (task?.status === "completed") {
    const isVideo = task.mediaType === "video";
    return (
      <section className="watermark-center-state is-completed">
        <div className={`watermark-result-stage ${isVideo ? "is-video" : ""}`}>
          {isVideo ? (
            <video
              src={task.resultUrl}
              controls
              playsInline
              poster={task.thumbnailUrl || task.sourceUrl}
            />
          ) : (
            <img
              src={task.resultUrl}
              alt={task.sourceFileName || "去水印结果"}
            />
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
            <button type="button" onClick={onOpenRecent}>
              查看最近生成
            </button>
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
        <p>
          {error ||
            task?.error ||
            "生成服务返回了错误，积分会按任务状态自动处理。"}
        </p>
      </section>
    );
  }

  return (
    <section
      className="watermark-center-state is-processing"
      aria-live="polite"
    >
      <span className="watermark-center-spinner">
        <Loader2 size={30} />
      </span>
      <strong>
        {isSubmitting ? "正在创建去水印任务" : "正在智能去除水印"}
      </strong>
      <p>素材正在处理中，完成后会自动回填到这里。</p>
      <div className="watermark-center-progress">
        <i style={{ width: `${task?.progress || 28}%` }} />
      </div>
      <small>
        {task?.progress ? `${task.progress}%` : "任务准备中"} · 请保持页面打开
      </small>
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
            <video
              src={task.resultUrl}
              controls
              playsInline
              preload="metadata"
              poster={task.thumbnailUrl || task.sourceUrl}
            />
          ) : (
            <img
              src={task.resultUrl}
              alt={task.sourceFileName || "去水印结果"}
            />
          )
        ) : (
          <div
            className={`watermark-task-placeholder ${isFailed ? "is-failed" : ""}`}
          >
            {isProcessing ? (
              <Loader2 size={26} />
            ) : isVideo ? (
              <Video size={26} />
            ) : (
              <Image size={26} />
            )}
            <strong>{isFailed ? "生成失败" : "生成中"}</strong>
          </div>
        )}
      </div>
      <div className="watermark-task-meta">
        <div className="tag-row">
          <span className="model-tag">
            {task.mediaType === "video" ? "视频去水印" : "图片去水印"}
          </span>
          <span className="ratio-tag">{task.resolution}</span>
          <span className="quality-tag">
            {formatProviderLabel(task.providerModel || task.model, "智能处理")}
          </span>
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
          <button
            className={`icon-circle ${task.favorite ? "is-favorite" : ""}`}
            type="button"
            onClick={() => onFavorite(task.id)}
            aria-label="收藏"
          >
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

function WatermarkUploadSlot({
  mode,
  sourceAsset,
  previewUrl,
  isUploading,
  onSelect,
  onClear,
}) {
  const inputRef = useRef(null);
  const isVideo = mode === "video";
  function clearFile(event) {
    event.preventDefault();
    event.stopPropagation();
    onClear?.();
  }
  return (
    <button
      className={`watermark-upload-slot ${previewUrl ? "has-preview" : ""}`}
      type="button"
      onClick={() => inputRef.current?.click()}
    >
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
          <span>
            {isVideo ? "建议 15 秒内，最大 200MB" : "支持 JPG/PNG，最大 10MB"}
          </span>
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
      {sourceAsset && (
        <small>
          {sourceAsset.fileName} 路 {formatBytes(sourceAsset.sizeBytes)}
        </small>
      )}
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

  const selectedModel =
    options.models.find((item) => item.kind === mode) || options.models[0];
  const resolution =
    mode === "video"
      ? options.defaults?.videoResolution || "720p"
      : options.defaults?.imageResolution || "2K";
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
    if (
      isImage &&
      file.size > (options.limits?.maxImageBytes || 10 * 1024 * 1024)
    ) {
      setNotice("图片大小不能超过 10MB");
      return;
    }
    if (
      isVideo &&
      file.size > (options.limits?.maxVideoBytes || 200 * 1024 * 1024)
    ) {
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
      resolution,
    });
  }

  return (
    <div className="watermark-composer" aria-label="去水印上传面板">
      <div className="watermark-mode-tabs">
        <button
          className={mode === "image" ? "is-active" : ""}
          type="button"
          onClick={() => changeMode("image")}
        >
          <Image size={15} />
          图片去水印
        </button>
        <button
          className={mode === "video" ? "is-active" : ""}
          type="button"
          onClick={() => changeMode("video")}
        >
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
        <span>
          {notice ||
            (mode === "video"
              ? "视频会保留原音频并尝试自然修复水印区域"
              : "图片会自动修复水印区域并保持主体内容")}
        </span>
        <strong>{price}</strong>
        <button
          className="send-button"
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          aria-label="开始去水印"
        >
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
  const taskStatusSignatureRef = useRef("");

  useEffect(() => {
    let mounted = true;
    function applyTaskList(value) {
      if (!mounted) return;
      const nextSignature = taskStatusSignature(value);
      const didStatusChange =
        taskStatusSignatureRef.current &&
        taskStatusSignatureRef.current !== nextSignature;
      taskStatusSignatureRef.current = nextSignature;
      watermarkApi.setHasRunningTasks(hasRunningTasks(value));
      setTasks(value);
      if (didStatusChange) {
        watermarkApi
          .getCredits()
          .then((creditsValue) =>
            mounted && applyCreditsUpdate(setCredits, creditsValue),
          )
          .catch(() => {});
      }
    }
    async function load() {
      try {
        const [modelData, taskData, creditData] = await Promise.all([
          watermarkApi.getModels(),
          watermarkApi.getTasks(),
          watermarkApi.getCredits().catch(() => null),
        ]);
        if (!mounted) return;
        setOptions(modelData);
        applyTaskList(taskData);
        applyCreditsUpdate(setCredits, creditData);
      } catch (error) {
        if (mounted) setSubmitError(error.message || "加载去水印失败");
      }
    }
    load();
    const unsubscribe = watermarkApi.subscribe(() => {
      watermarkApi
        .getTasks()
        .then(applyTaskList)
        .catch(() => {});
      watermarkApi
        .getCredits()
        .then((value) => mounted && applyCreditsUpdate(setCredits, value))
        .catch(() => {});
    });
    return () => {
      mounted = false;
      unsubscribe();
    };
  }, []);

  const submittedTask =
    tasks.find((task) => String(task.id) === String(submittedTaskId)) || null;
  const showCenterState = isSubmitting || submitError || submittedTask;
  const visibleTasks =
    viewTab === "favorite"
      ? tasks.filter(
          (task) =>
            task.favorite && String(task.id) !== String(submittedTaskId),
        )
      : viewTab === "recent"
        ? tasks.filter((task) => String(task.id) !== String(submittedTaskId))
        : [];
  const showEmptyHero = viewTab === "home" && !showCenterState;
  const showRecentEmpty =
    (viewTab === "recent" || viewTab === "favorite") &&
    !showCenterState &&
    visibleTasks.length === 0;

  async function createTask(payload) {
    setSubmitError("");
    setIsSubmitting(true);
    setSubmittedTaskId(null);
    setViewTab("home");
    try {
      const task = await watermarkApi.createTask(payload);
      watermarkApi
        .getCredits()
        .then((value) => applyCreditsUpdate(setCredits, value))
        .catch(() => {});
      setSubmittedTaskId(task.id);
      setTasks((current) => [
        task,
        ...current.filter((item) => item.id !== task.id),
      ]);
    } catch (error) {
      setSubmitError(error.message || "创建去水印任务失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function deleteTask(id) {
    await watermarkApi.deleteTask(id);
    setTasks((current) => current.filter((task) => task.id !== id));
    setSubmittedTaskId((current) =>
      String(current) === String(id) ? null : current,
    );
  }

  async function toggleFavorite(id) {
    const updated = await watermarkApi.toggleFavorite(id);
    setTasks((current) =>
      current.map((task) => (String(task.id) === String(id) ? updated : task)),
    );
  }

  function repeatTask(task) {
    createTask({
      sourceAssetId: task.sourceAssetId,
      model: task.model,
      resolution: task.resolution,
      prompt: task.prompt,
    });
  }

  return (
    <section className="watermark-view-root">
      <div className="image-filter-tabs watermark-filter-tabs">
        <button
          className={viewTab === "home" ? "selected" : ""}
          type="button"
          onClick={() => setViewTab("home")}
        >
          主页
        </button>
        <button
          className={viewTab === "recent" ? "selected" : ""}
          type="button"
          onClick={() => {
            setViewTab("recent");
            setSubmittedTaskId(null);
          }}
        >
          最近生成
        </button>
        <button
          className={viewTab === "favorite" ? "selected" : ""}
          type="button"
          onClick={() => {
            setViewTab("favorite");
            setSubmittedTaskId(null);
          }}
        >
          <Star size={17} fill="#f8d545" color="#161616" />
          收藏
        </button>
        {credits && (
          <span className="credits-chip">积分 {credits.balance}</span>
        )}
      </div>
      <div
        className={`watermark-canvas ${showCenterState ? "has-active-task" : ""} ${viewTab !== "home" ? "is-list" : ""}`}
      >
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
            <strong>
              {viewTab === "favorite" ? "暂无收藏结果" : "暂无生成记录"}
            </strong>
            <p>
              {viewTab === "favorite"
                ? "收藏后的去水印结果会显示在这里"
                : "生成完成的图片或视频会保存在这里"}
            </p>
          </div>
        )}
        <div
          className={`watermark-results-feed ${visibleTasks.length ? "has-results" : ""}`}
        >
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

function ImageFeaturePage({
  initialNav,
  onOpenHome,
  onOpenLanding,
  authUser,
  onOpenAuth,
  onLogout,
}) {
  const firstNav =
    initialNav && featureNavIdSet.has(initialNav) ? initialNav : "image";
  const isGuest = Boolean(authUser?.isGuest);
  const [activeNav, setActiveNav] = useState(firstNav);
  const [visitedIds, setVisitedIds] = useState(() => new Set([firstNav]));
  const [composerResetSignals, setComposerResetSignals] = useState({
    image: 0,
    video: 0,
  });

  useEffect(() => {
    const next =
      initialNav && featureNavIdSet.has(initialNav) ? initialNav : "image";
    setActiveNav(next);
    setVisitedIds((prev) => new Set(prev).add(next));
  }, [initialNav]);

  useEffect(() => {
    if (featureNavIdSet.has(activeNav)) {
      setVisitedIds((prev) => new Set(prev).add(activeNav));
    }
  }, [activeNav]);

  const handleNavChange = useCallback(
    (id) => {
      if (id === "home") {
        window.history.pushState(null, "", "#/home");
        onOpenHome();
        return;
      }
      const nextId = id;
      if (nextId === "image" || nextId === "video") {
        setComposerResetSignals((signals) => ({
          ...signals,
          [nextId]: signals[nextId] + 1,
        }));
      }
      if (featureNavIdSet.has(nextId)) {
        window.history.pushState(null, "", `#/${nextId}`);
      }
      setActiveNav((current) => (current === nextId ? current : nextId));
    },
    [onOpenHome],
  );

  return (
    <div className={`feature-page-shell ${isGuest ? "is-guest" : ""}`}>
      <FeatureSidebar
        activeNav={activeNav}
        onNavChange={handleNavChange}
        onOpenLanding={onOpenLanding}
        authUser={authUser}
        onOpenAuth={onOpenAuth}
        onLogout={onLogout}
      />
      {isGuest && (
        <div
          className="feature-guest-auth-actions"
          aria-label="游客璐﹀彿鍏ュ彛"
        >
          <button type="button" onClick={() => onOpenAuth("login")}>
            登录
          </button>
          <button type="button" onClick={() => onOpenAuth("register")}>
            注册
          </button>
        </div>
      )}
      <main className="feature-main">
        <FeatureModuleKeepAlive
          id="assets"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <AssetsPage authUser={authUser} onOpenAuth={onOpenAuth} />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="image"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <ImageGenerationView
            authUser={authUser}
            isActive={activeNav === "image"}
            onOpenAuth={onOpenAuth}
            resetSignal={composerResetSignals.image}
          />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="video"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <VideoGenerationView
            authUser={authUser}
            onOpenAuth={onOpenAuth}
            resetSignal={composerResetSignals.video}
          />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="chat"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <ChatGenerationView authUser={authUser} onOpenAuth={onOpenAuth} />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="digital-human"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <DigitalHumanGenerationView
            onReturnHome={() => handleNavChange("home")}
          />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="image-digital-human"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <MotionTransferView
            navId="image-digital-human"
            api={imageDigitalHumanMotionApi}
            copy={imageDigitalHumanCopy}
            splitResults
            WorkbenchComponent={ImageDigitalHumanFaceSwapWorkbench}
            heading="图片数字人生成"
          />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="motion"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <MotionTransferView splitResults />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="watermark"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <WatermarkRemovalView />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="voice"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <VoiceSynthesisView authUser={authUser} onOpenAuth={onOpenAuth} />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="voice-convert"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <VoiceConvertView />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="transcribe"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <TranscribeView authUser={authUser} />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="article"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <ArticleGenerationView
            authUser={authUser}
            onOpenAuth={onOpenAuth}
            ShowcaseCardComponent={ViralGraphicGeneratorShowcaseCard}
          />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="music"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <MusicGenerationView />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="replicate"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <ReplicateView authUser={authUser} />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="enhance"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <EnhanceView />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="remove-bg"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <RemoveBgView />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="video-voice"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <VideoDubbingView authUser={authUser} />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="face-swap"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <MotionTransferView
            navId="face-swap"
            api={faceSwapApi}
            copy={faceSwapCopy}
            splitResults
          />
        </FeatureModuleKeepAlive>
        {![
          "assets",
          "image",
          "video",
          "chat",
          "digital-human",
          "image-digital-human",
          "motion",
          "face-swap",
          "watermark",
          "voice",
          "voice-convert",
          "transcribe",
          "article",
          "music",
          "replicate",
          "enhance",
          "remove-bg",
          "video-voice",
        ].includes(activeNav) && <ComingSoon activeNav={activeNav} />}
      </main>
    </div>
  );
}

function App() {
  const [view, setView] = useState(getInitialView);
  const [authUser, setAuthUser] = useState(null);
  const [authDrawerMode, setAuthDrawerMode] = useState(null);
  const [isLogoutConfirmOpen, setIsLogoutConfirmOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    const onPopState = () => setView(getRouteView());
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    let mounted = true;
    authApi
      .me()
      .then((state) => {
        if (mounted) setAuthUser(state.user);
      })
      .catch(() => {
        if (mounted)
          setAuthUser({
            isGuest: true,
            displayName: "游客",
            username: "guest",
          });
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    return subscribeCreditsUpdated((credits) => {
      const nextCredits = credits?.balance;
      if (typeof nextCredits === "undefined") return;
      setAuthUser((current) =>
        current && !current.isGuest
          ? { ...current, credits: nextCredits }
          : current,
      );
    });
  }, []);

  const openHome = useCallback(() => {
    setView("home");
  }, []);

  const openFeature = useCallback((id = "image") => {
    const nextId = featureNavIdSet.has(id) ? id : "image";
    window.history.pushState(null, "", `#/${nextId}`);
    setView(nextId);
  }, []);

  const openLanding = useCallback(() => {
    window.history.pushState(null, "", "/");
    setView("splash");
  }, []);

  const enterAppHome = useCallback(() => {
    window.sessionStorage.setItem(appEntryStorageKey, "1");
    window.history.pushState(null, "", "#/home");
    setView("home");
  }, []);

  const finishAuth = useCallback((user) => {
    setAuthUser(user);
    setAuthDrawerMode(null);
    window.sessionStorage.setItem(appEntryStorageKey, "1");
    window.history.pushState(null, "", "#/home");
    window.location.reload();
  }, []);

  const requestLogout = useCallback(() => {
    setIsLogoutConfirmOpen(true);
  }, []);

  const cancelLogout = useCallback(() => {
    if (!isLoggingOut) {
      setIsLogoutConfirmOpen(false);
    }
  }, [isLoggingOut]);

  const confirmLogout = useCallback(async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await authApi.logout();
    } finally {
      window.location.reload();
    }
  }, [isLoggingOut]);

  const page = (() => {
    if (view === "home") {
      return (
        <AppHome
          onOpenFeature={openFeature}
          onOpenLanding={openLanding}
          authUser={authUser}
          onOpenAuth={setAuthDrawerMode}
          onLogout={requestLogout}
        />
      );
    }

    if (featureNavIdSet.has(view)) {
      return (
        <ImageFeaturePage
          initialNav={view}
          onOpenHome={openHome}
          onOpenLanding={openLanding}
          authUser={authUser}
          onOpenAuth={setAuthDrawerMode}
          onLogout={requestLogout}
        />
      );
    }

    return (
      <StudioLanding onOpenAuth={setAuthDrawerMode} onEnterApp={enterAppHome} />
    );
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
      {isLogoutConfirmOpen && (
        <LogoutConfirmDialog
          isSubmitting={isLoggingOut}
          onCancel={cancelLogout}
          onConfirm={confirmLogout}
        />
      )}
    </>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
