import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import BillingPoints from "./components/BillingPoints.jsx";
import { createRoot } from "react-dom/client";
import { ConfigProvider } from "@arco-design/web-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  CircleAlert,
  Bell,
  Bot,
  Box,
  ChevronDown,
  ChevronRight,
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
  Gift,
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
  SquarePen,
  Star,
  Target,
  Timer,
  Trash2,
  UploadCloud,
  UserRound,
  Video,
  Wallet,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { authApi } from "./api/authApi";
import { paymentApi } from "./api/paymentApi";
import { invitationApi } from "./api/invitationApi";
import { imageApi } from "./api/imageApi";
import { videoApi } from "./api/videoApi";
import { chatApi } from "./api/chatApi";
import { digitalHumanApi } from "./api/digitalHumanApi";
import { motionTransferApi } from "./api/motionTransferApi";
import { faceSwapApi } from "./api/faceSwapApi";
import { imageDigitalHumanApi } from "./api/imageDigitalHumanApi";
import { watermarkApi } from "./api/watermarkApi";
import {
  emitCreditsUpdated,
  subscribeCreditsUpdated,
} from "./api/creditsEvents";
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
import {
  useDeleteConfirmation,
  useRegenerateConfirmation,
} from "./components/DeleteConfirmDialog";
import { ArticleGenerationView } from "./features/article/ArticleGenerationView";
import { DigitalHumanHubView } from "./features/digital-human-hub/DigitalHumanHubView";
import { articleApi } from "./features/article/articleApi";
import { EnhanceView } from "./features/enhance/EnhanceView";
import {
  privacyPolicyMarkdown,
  userAgreementMarkdown,
} from "./legalDocuments";
import { RemoveBgView } from "./features/remove-bg/RemoveBgView";
import { VideoDubbingView } from "./features/video-dubbing/VideoDubbingView";
import { FaceSwapWorkbench } from "./features/face-swap/FaceSwapWorkbench";
import { WaterfallGrid } from "./features/waterfall/WaterfallGrid";
import { VideoGenStage } from "./features/video/VideoGenStage";
import { VideoGenerationResultPlayer } from "./features/video/VideoGenerationResultPlayer";
import { useVideoGenStateMachine } from "./features/video/useVideoGenStateMachine";
import "./features/video/videoGenStage.css";
import { ViralGraphicGeneratorShowcaseCard } from "./features/viral-graphic-generator-ui/ViralGraphicGeneratorShowcaseCard";
import imgInspirationManifest from "./data/imgInspirationManifest.json";
import { StudioLanding } from "./StudioLanding";
import { formatBeijingDateTime, formatBeijingHistoryTime } from "./utils/time";
import "@arco-design/web-react/dist/css/arco.css";
import "./styles.scss";
import "./features/article/articleTopTabs.scss";
import "./features/article/articlePopularWorkbench.scss";
import "./features/article/articleHistory.scss";
import "./features/article/ArticlePopularResultPanel.scss";

const caseImageFiles = [
  "001.webp",
  "002.webp",
  "003.webp",
  "004.webp",
  "005.webp",
  "006.webp",
  "007.webp",
  "008.webp",
  "009.webp",
  "010.webp",
  "011.webp",
  "012.webp",
  "013.webp",
  "014.webp",
  "015.webp",
  "016.webp",
  "017.webp",
  "018.webp",
  "019.webp",
  "020.webp",
  "021.webp",
  "022.webp",
  "023.webp",
  "024.webp",
  "025.webp",
  "026.webp",
  "027.webp",
  "028.webp",
  "029.webp",
  "030.webp",
  "031.webp",
  "032.webp",
  "033.webp",
  "034.webp",
  "035.webp",
  "036.webp",
  "037.webp",
  "038.webp",
  "039.webp",
  "040.webp",
  "041.webp",
  "042.webp",
  "043.webp",
  "044.webp",
  "045.webp",
  "046.webp",
  "047.webp",
  "048.webp",
  "049.webp",
  "050.webp",
  "051.webp",
  "052.webp",
  "053.webp",
  "054.webp",
  "055.webp",
  "056.webp",
  "057.webp",
  "058.webp",
  "059.webp",
  "060.webp",
  "061.webp",
  "062.webp",
  "063.webp",
  "064.webp",
  "065.webp",
  "066.webp",
  "067.webp",
  "068.webp",
  "069.webp",
  "070.webp",
  "071.webp",
  "072.webp",
  "073.webp",
  "074.webp",
  "075.webp",
  "076.webp",
  "077.webp",
  "078.webp",
  "079.webp",
  "080.webp",
  "081.webp",
  "082.webp",
  "083.webp",
  "084.webp",
  "085.webp",
  "086.webp",
  "087.webp",
  "088.webp",
  "089.webp",
  "090.webp",
  "091.webp",
  "092.webp",
  "093.webp",
  "094.webp",
  "095.webp",
  "096.webp",
  "097.webp",
  "098.webp",
  "099.webp",
  "100.webp",
  "101.webp",
  "102.webp",
  "103.webp",
  "104.webp",
  "105.webp",
  "106.webp",
  "107.webp",
  "108.webp",
  "109.webp",
  "110.webp",
  "111.webp",
  "112.webp",
  "113.webp",
  "114.webp",
  "115.webp",
  "116.webp",
  "117.webp",
  "118.webp",
  "119.webp",
  "120.webp",
  "121.webp",
  "122.webp",
  "123.webp",
  "124.webp",
  "125.webp",
  "126.webp",
  "127.webp",
  "128.webp",
];
const wideInspirationFiles = new Set([
  "001.webp",
  "002.webp",
  "010.webp",
  "011.webp",
  "012.webp",
  "013.webp",
  "014.webp",
  "015.webp",
  "016.webp",
  "017.webp",
  "018.webp",
  "019.webp",
  "020.webp",
  "023.webp",
  "024.webp",
  "025.webp",
  "026.webp",
  "027.webp",
  "028.webp",
  "029.webp",
  "030.webp",
  "031.webp",
  "032.webp",
  "041.webp",
  "042.webp",
  "043.webp",
  "044.webp",
  "046.webp",
  "048.webp",
  "049.webp",
  "050.webp",
  "051.webp",
  "052.webp",
  "054.webp",
  "055.webp",
  "056.webp",
  "057.webp",
  "058.webp",
  "059.webp",
  "060.webp",
  "061.webp",
  "062.webp",
  "070.webp",
  "072.webp",
  "073.webp",
  "074.webp",
  "075.webp",
  "077.webp",
  "078.webp",
  "079.webp",
  "083.webp",
  "084.webp",
  "085.webp",
  "087.webp",
  "088.webp",
  "089.webp",
  "090.webp",
  "091.webp",
  "092.webp",
  "093.webp",
  "095.webp",
  "096.webp",
  "097.webp",
  "098.webp",
  "105.webp",
  "106.webp",
  "107.webp",
  "108.webp",
  "112.webp",
  "113.webp",
  "114.webp",
  "115.webp",
  "121.webp",
  "122.webp",
  "123.webp",
  "124.webp",
  "125.webp",
]);
const squareInspirationFiles = new Set([]);

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

function getInspirationAspectBucket(aspect) {
  if (aspect === "wide" || aspect === "square" || aspect === "portrait") {
    return aspect;
  }
  if (typeof aspect === "number" && Number.isFinite(aspect)) {
    if (aspect >= 1.18) return "wide";
    if (aspect >= 0.86) return "square";
  }
  return "portrait";
}

function useIncrementalItems(
  items,
  resetKey,
  { batchSize = 30, enabled = true, delay = 720 } = {},
) {
  const [visibleCount, setVisibleCount] = useState(batchSize);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const isLoadingMoreRef = useRef(false);
  const loadMoreTimerRef = useRef(0);
  const total = items.length;
  const hasMore = enabled && visibleCount < total;

  useEffect(() => {
    if (loadMoreTimerRef.current) {
      window.clearTimeout(loadMoreTimerRef.current);
      loadMoreTimerRef.current = 0;
    }
    isLoadingMoreRef.current = false;
    setVisibleCount(batchSize);
    setIsLoadingMore(false);
  }, [batchSize, resetKey]);

  useEffect(() => {
    if (!enabled || !hasMore) return undefined;

    let frameId = 0;
    function loadMoreIfNeeded() {
      if (!hasMore || isLoadingMoreRef.current) return;
      const scrollPosition = window.innerHeight + window.scrollY;
      const triggerPosition = document.documentElement.scrollHeight - 420;
      if (scrollPosition >= triggerPosition) {
        isLoadingMoreRef.current = true;
        setIsLoadingMore(true);
        loadMoreTimerRef.current = window.setTimeout(() => {
          setVisibleCount((count) => Math.min(total, count + batchSize));
          isLoadingMoreRef.current = false;
          setIsLoadingMore(false);
          loadMoreTimerRef.current = 0;
        }, delay);
      }
    }

    function scheduleCheck() {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(loadMoreIfNeeded);
    }

    scheduleCheck();
    window.addEventListener("scroll", scheduleCheck, { passive: true });
    window.addEventListener("resize", scheduleCheck);
    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", scheduleCheck);
      window.removeEventListener("resize", scheduleCheck);
    };
  }, [batchSize, delay, enabled, hasMore, total]);

  return {
    items: enabled ? items.slice(0, visibleCount) : items,
    isLoadingMore,
    hasMore,
  };
}

function IncrementalLoadMoreIndicator({ active }) {
  if (!active) return null;
  return (
    <div className="incremental-load-more" role="status" aria-live="polite">
      <Loader2 size={18} className="is-spinning" />
      <span>加载中...</span>
    </div>
  );
}

function arrangeInspirationCards(cards, columnCount = 6) {
  const buckets = cards.reduce(
    (next, card) => {
      next[getInspirationAspectBucket(card.aspect)].push(card);
      return next;
    },
    { portrait: [], square: [], wide: [] },
  );
  if (buckets.wide.length === cards.length) return cards;

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
    const wideCount = Math.min(wideTargets[columnIndex], buckets.wide.length);
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

function arrangeInspirationCardsByBatch(cards, columnCount = 6, batchSize = 30) {
  const arranged = [];
  for (let index = 0; index < cards.length; index += batchSize) {
    arranged.push(
      ...arrangeInspirationCards(cards.slice(index, index + batchSize), columnCount),
    );
  }
  return arranged;
}

const imageInspirationCategoryTabs = [
  { id: "all", label: "全部" },
  { id: "baokuan", label: "爆款模板" },
  { id: "sheying", label: "摄影写真" },
  { id: "dianshang", label: "电商营销" },
  { id: "dongman", label: "动漫游戏" },
  { id: "chahua", label: "风格插画" },
];

const exampleImages = imgInspirationManifest.map((item, index) => ({
  file: `${item.baseName}.webp`,
  categoryId: item.categoryId,
  categoryLabel: item.categoryLabel,
  src: item.thumbnailWebp || item.thumbnailJpg,
  fallbackSrc: item.thumbnailJpg || item.thumbnailWebp,
  hdSrc: item.imageWebp || item.imageJpg,
  hdFallbackSrc: item.imageJpg || item.imageWebp,
  label:
    item.title ||
    `${item.categoryLabel} ${String(index + 1).padStart(2, "0")}`,
  prompt: item.prompt || item.title || `${item.categoryLabel}灵感图`,
  description: item.description || "",
  style: item.categoryLabel || "",
  mood: "",
  tags: [item.categoryLabel].filter(Boolean),
  model: "图片生成",
  ratio: item.ratio || "高清原图",
  quality: "精选",
  price: "参考",
  aspect:
    item.width && item.height
      ? item.width / item.height
      : getInspirationAspect(`${item.baseName}.webp`),
}));

function summarizeInspirationTitle(text, fallback = "AI 图片案例") {
  const normalized = String(text || "").trim();
  if (!normalized) return fallback;
  return normalized.length > 20 ? `${normalized.slice(0, 20)}…` : normalized;
}

const fmImageGenerationInspirations = exampleImages.map((item, index) => ({
  id: `image-gen-${item.categoryId || "all"}-${item.file || index}`,
  title: summarizeInspirationTitle(item.description || item.prompt, item.label),
  category: item.categoryLabel || "图片灵感",
  prompt: item.prompt,
  thumbnail: item.src,
  fallbackThumbnail: item.fallbackSrc,
  source: item.hdSrc || item.src,
  fallbackSource: item.hdFallbackSrc || item.hdSrc || item.src,
  ratio: item.ratio,
  aspect: item.aspect,
  model: item.model || "图片生成",
  material: "高清原图",
}));

const navItems = [
  { id: "home", label: "首页", icon: Home },
  { id: "creation", label: "创作中心", icon: Sparkles },
  { id: "assets", label: "我的资产", icon: Wallet },
  { id: "profile", label: "个人中心", icon: UserRound },
  { id: "favorites", label: "我的收藏", icon: Star },
  { id: "billing", label: "积分充值", icon: Wallet },
  { id: "image", label: "图片生成", icon: Image },
  { id: "video", label: "视频生成", icon: Video },
  { id: "chat", label: "大模型", icon: Bot },
  { id: "digital-human", label: "数字人形象", icon: UserRound },
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
  { type: "item", id: "creation" },
  { type: "item", id: "chat" },
  {
    type: "group",
    id: "vision",
    label: "视觉生成",
    icon: Box,
    children: ["image", "video", "face-swap", "motion"],
  },
  { type: "item", id: "digital-human" },
  { type: "item", id: "article" },
  {
    type: "group",
    id: "marketing",
    label: "营销工具",
    icon: Send,
    children: ["watermark", "remove-bg", "enhance", "replicate"],
  },
  {
    type: "group",
    id: "audio",
    label: "音频处理",
    icon: Music,
    children: ["voice", "music", "voice-convert", "transcribe", "video-voice"],
  },
  { type: "item", id: "assets" },
  { type: "item", id: "billing" },
];

const homeFeatureRoutes = [
  "image",
  "video",
  "chat",
  "digital-human",
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

const faceminiAsset = (path) => `/assets/facemini/${path}`;
const defaultUserAvatarSrc = "/assets/avatars/1.jpg";
const pendingInviteCodeStorageKey = "facemini:pending-invite-code";
const pendingInviteBonusStorageKey = "facemini:pending-invite-bonus";
const inspirationFavoritesStorageKey = "facemini:inspiration-favorites";
const inspirationFavoritesChangedEvent = "facemini-inspiration-favorites-changed";

function getInspirationFavoriteId(item) {
  return item?.id ? String(item.id) : "";
}

function readInspirationFavoriteIds() {
  try {
    const value = window.localStorage.getItem(inspirationFavoritesStorageKey);
    const ids = JSON.parse(value || "[]");
    return new Set(Array.isArray(ids) ? ids.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeInspirationFavoriteIds(ids) {
  try {
    window.localStorage.setItem(
      inspirationFavoritesStorageKey,
      JSON.stringify([...ids]),
    );
    window.dispatchEvent(
      new CustomEvent(inspirationFavoritesChangedEvent, {
        detail: { ids: [...ids] },
      }),
    );
  } catch {
    // Local storage can be unavailable in restricted browser contexts.
  }
}

function publishInspirationFavoriteIds(ids) {
  writeInspirationFavoriteIds(ids);
}

async function loadInspirationFavoriteIds({ allowFallback = true } = {}) {
  try {
    const result = await imageApi.getInspirationFavorites();
    const ids = new Set(Array.isArray(result?.ids) ? result.ids.map(String) : []);
    publishInspirationFavoriteIds(ids);
    return ids;
  } catch (error) {
    if (allowFallback) return readInspirationFavoriteIds();
    throw error;
  }
}

async function toggleInspirationFavoriteId(id) {
  const favoriteId = String(id || "");
  if (!favoriteId) return false;
  const result = await imageApi.toggleInspirationFavorite(favoriteId);
  const nextValue = Boolean(result?.favorite);
  const ids = readInspirationFavoriteIds();
  if (nextValue) ids.add(favoriteId);
  else ids.delete(favoriteId);
  publishInspirationFavoriteIds(ids);
  return nextValue;
}

function isInspirationFavorite(item) {
  const id = getInspirationFavoriteId(item);
  return Boolean(id && readInspirationFavoriteIds().has(id));
}
const registerGrantPoints = 200;
const inviteRewardPoints = 200;

function buildClientInviteLink(inviteCode) {
  const code = String(inviteCode || "").trim();
  if (!code) return "";
  const origin =
    typeof window !== "undefined" && window.location?.origin
      ? window.location.origin
      : "http://127.0.0.1:8088";
  return `${origin}/#/home?invite=${encodeURIComponent(code)}`;
}

function normalizeInviteCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 32);
}

function readInviteCodeFromLocation() {
  const candidates = [];
  try {
    candidates.push(new URLSearchParams(window.location.search).get("invite"));
    const hash = window.location.hash || "";
    const queryIndex = hash.indexOf("?");
    if (queryIndex >= 0) {
      candidates.push(
        new URLSearchParams(hash.slice(queryIndex + 1)).get("invite"),
      );
    }
  } catch {
    // Ignore malformed URLs; invitation capture is best-effort.
  }
  return normalizeInviteCode(candidates.find(Boolean));
}

function captureInviteCodeFromLocation() {
  const inviteCode = readInviteCodeFromLocation();
  if (inviteCode) {
    try {
      window.localStorage.setItem(pendingInviteCodeStorageKey, inviteCode);
    } catch {
      // Local storage can be unavailable in restricted browser contexts.
    }
  }
  return inviteCode;
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

function isLoggedInUser(authUser) {
  return Boolean(authUser && !authUser.isGuest);
}

const legalDocuments = {
  "user-agreement": {
    title: "用户协议",
    subtitle: "Facemini 用户服务协议",
    markdown: userAgreementMarkdown,
  },
  "privacy-policy": {
    title: "隐私政策",
    subtitle: "Facemini 隐私政策",
    markdown: privacyPolicyMarkdown,
  },
};

function getLegalDocumentKeyFromLocation() {
  const hashView = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  const path = window.location.pathname.replace(/^\/+/, "");
  const legalKey = [hashView, path]
    .map((value) => value.replace(/^legal\/?/, ""))
    .find((value) => legalDocuments[value]);
  return legalKey || "";
}

function clearPendingInviteCode() {
  try {
    window.localStorage.removeItem(pendingInviteCodeStorageKey);
  } catch {
    // Local storage can be unavailable in restricted browser contexts.
  }
}

function captureInviteCodeForCurrentLocation() {
  const inviteCode = captureInviteCodeFromLocation();
  if (inviteCode) {
    invitationApi.track("invite.link_visit", inviteCode, {
      path: window.location.pathname,
      hash: window.location.hash,
    });
  }
  return inviteCode;
}

function BrandWordmark({ compact = false }) {
  return (
    <span className={`fm-brand-wordmark ${compact ? "compact" : ""}`}>
      <span className="fm-brand-name">Facemini</span>
      <span className="fm-beta-badge">Beta</span>
    </span>
  );
}

const fmHomeFeatures = [
  [
    "强大的模型支持",
    "接入主流大模型能力，支持多模态灵感、提示词和内容生成。",
    "home-icons/01.svg",
  ],
  [
    "多模态创作能力",
    "覆盖文本、图片、视频、音频等内容形态，快速组合成完整工作流。",
    "home-icons/02.svg",
  ],
  [
    "数字人内容生产",
    "面向口播、带货和知识讲解场景，提升内容生产效率。",
    "home-icons/03.svg",
  ],
  [
    "智能营销工作流",
    "从灵感、生成到二次处理，串联常用营销工具。",
    "home-icons/04.svg",
  ],
  [
    "稳定安全的服务体验",
    "为企业级权限、积分和任务体系保留清晰架构。",
    "home-icons/05.svg",
  ],
  [
    "清晰可控的资产管理",
    "作品、提示词和灵感素材在同一套界面中沉淀。",
    "home-icons/06.svg",
  ],
];

const fmHomeModules = [
  [
    "企业级AI智能体",
    "深度结合业务场景，构建更高效的AI协作体验。",
    "home/01.png",
    "home-icons/07.svg",
    "chat",
  ],
  [
    "垂类行业AI落地",
    "面向行业需求，提供可复用的AI应用能力。",
    "home/02.png",
    "home-icons/08.svg",
    "creation",
  ],
  [
    "AI漫剧内容生产",
    "提升内容创作效率，助力多样化视觉内容快速生成。",
    "home/03.png",
    "home-icons/09.svg",
    "video",
  ],
  [
    "通用性营销工具",
    "聚焦增长与传播需求，帮助品牌提升内容转化。",
    "home/04.png",
    "home-icons/10.svg",
    "article",
  ],
];

const fmImageOriginalExtension = {
  "huaban-6611068022": "jpg",
  "huaban-6854630930": "jpg",
  "huaban-6929323331": "jpg",
};

const getFaceminiImageOriginalFile = (id) =>
  `${id}.${fmImageOriginalExtension[id] || "png"}`;

const fmImageDimensions = {
  "huaban-6006882171": [816, 1456],
  "huaban-6337337122": [568, 852],
  "huaban-6366433900": [576, 1024],
  "huaban-6384921628": [1024, 2048],
  "huaban-6485103869": [1200, 1600],
  "huaban-6524298886": [720, 1280],
  "huaban-6553923406": [1200, 1600],
  "huaban-6611068022": [736, 1308],
  "huaban-6624334273": [768, 1024],
  "huaban-6699919842": [1024, 1536],
  "huaban-6703441531": [720, 1280],
  "huaban-6735284749": [1080, 720],
  "huaban-6738588563": [768, 1344],
  "huaban-6744389287": [1200, 675],
  "huaban-6781282455": [1200, 1800],
  "huaban-6810189037": [1200, 2133],
  "huaban-6823396722": [2304, 1728],
  "huaban-6854630930": [5000, 3355],
  "huaban-6907897240": [1200, 1600],
  "huaban-6929323331": [816, 1456],
  "huaban-7047676154": [1200, 1607],
  "huaban-7118167125": [1024, 1280],
  "huaban-7147202189": [1535, 2732],
  "huaban-7156636947": [1000, 1339],
};

const fmCommonAspectRatios = [
  ["1:2", 1 / 2],
  ["9:16", 9 / 16],
  ["2:3", 2 / 3],
  ["3:4", 3 / 4],
  ["4:5", 4 / 5],
  ["1:1", 1],
  ["4:3", 4 / 3],
  ["3:2", 3 / 2],
  ["16:9", 16 / 9],
];

function getGreatestCommonDivisor(a, b) {
  let x = Math.abs(a);
  let y = Math.abs(b);
  while (y) {
    const next = x % y;
    x = y;
    y = next;
  }
  return x || 1;
}

function formatFaceminiImageRatio(id) {
  const [width, height] = fmImageDimensions[id] || [];
  if (!width || !height) return "高清原图";
  const aspect = width / height;
  const nearest = fmCommonAspectRatios
    .map(([label, value]) => ({
      label,
      diff: Math.abs(aspect - value) / value,
    }))
    .sort((a, b) => a.diff - b.diff)[0];
  if (nearest && nearest.diff <= 0.025) return nearest.label;
  const divisor = getGreatestCommonDivisor(width, height);
  return `${width / divisor}:${height / divisor}`;
}

const fmImageInspirations = [
  [
    "huaban-6006882171",
    "阳台落日独处",
    "图片灵感",
    "傍晚城市阳台视角，一位女孩坐在绿植旁看向夕阳，天空云层被暖金色日落照亮，生活方式摄影，宁静治愈氛围，细腻自然光。",
  ],
  [
    "huaban-6337337122",
    "奢侈品手机静物",
    "爆款图文",
    "银色手机从黑色菱格链条包中露出，背景是热带绿植和金黄色光影，高端奢侈品广告构图，浅景深，商业静物摄影。",
  ],
  [
    "huaban-6366433900",
    "都市动漫情侣",
    "图片灵感",
    "精致动漫情侣半身像，黑色礼服与暖色室内灯光，男生回眸、女生靠近镜头，浪漫都市氛围，细腻线稿，高级插画质感。",
  ],
  [
    "huaban-6384921628",
    "自媒体橙色街景",
    "爆款图文",
    "明亮橙粉色商业街插画，礼盒购物车、冰淇淋、热带树和促销小店，适合自媒体种草封面，轻快节日氛围，3D卡通质感。",
  ],
  [
    "huaban-6485103869",
    "手机概念广告",
    "爆款图文",
    "黑色智能手机竖立在红色岩石星球表面，碎石飞散，夕阳和深色天空形成强烈对比，科技产品广告大片，超现实商业摄影。",
  ],
  [
    "huaban-6524298886",
    "带货女主播",
    "数字人形象",
    "年轻女性主播坐在直播间展示商品，背景有服装板和课程屏幕，柔和棚拍光，清爽美妆带货风格，真实口播人物形象。",
  ],
  [
    "huaban-6553923406",
    "产品测评直播",
    "视频灵感",
    "镜头前的产品测评直播场景，前景相机和麦克风清晰可见，女性拿着护肤品讲解，室内暖光，真实自媒体拍摄氛围。",
  ],
  [
    "huaban-6611068022",
    "蓝焰动漫角色",
    "图片灵感",
    "深色动漫少年从蓝色火焰和碎片中伸手，强透视构图，高对比冷光，粒子飞散，暗黑幻想插画，电影级冲击力。",
  ],
  [
    "huaban-6624334273",
    "促销购物车海报",
    "爆款图文",
    "粉橙渐变促销海报，购物车装满优惠券、礼盒、金币和购物袋，漂浮的折扣元素，明亮电商大促视觉，适合商品活动封面。",
  ],
  [
    "huaban-6699919842",
    "彩光动漫头像",
    "图片灵感",
    "柔和彩色碎光洒在动漫少年脸上，蓝色眼睛，水彩与玻璃反光质感，清透梦幻氛围，精致二次元头像插画。",
  ],
  [
    "huaban-6703441531",
    "新闻口播主播",
    "数字人形象",
    "女性主持人站在新闻演播室，手持麦克风面对镜头微笑，背景有新闻屏幕，职业口播形象，清晰棚拍光，媒体报道风格。",
  ],
  [
    "huaban-6735284749",
    "商场购物场景",
    "视频灵感",
    "高端商场中女性拎着多只购物袋行走，暖色天花灯和玻璃橱窗反射，商业生活方式摄影，适合消费场景短视频。",
  ],
  [
    "huaban-6738588563",
    "未来感人像",
    "图片灵感",
    "未来感女性头像，透明发光护目镜，银白短发，浅蓝背景，皮肤高光通透，科技时尚人像，干净高级的AI视觉风格。",
  ],
  [
    "huaban-6744389287",
    "品牌宣传口播",
    "数字人形象",
    "戴眼镜的女性讲师在书架和补光灯前展示书本，真实直播间环境，品牌宣传和知识分享口播风格，温和专业。",
  ],
  [
    "huaban-6781282455",
    "紫色护肤品广告",
    "爆款图文",
    "紫色护肤精华瓶置于黑色岩石和水面上，紫色液体飞溅，深色高级背景，化妆品商业广告，强烈质感和品牌视觉。",
  ],
  [
    "huaban-6810189037",
    "虚拟主播购物车",
    "数字人形象",
    "卡通玩具和零食超市场景，男孩推着购物车穿过彩色货架，独角兽和玩偶漂浮，虚拟主播与带货场景结合，欢乐3D动画风。",
  ],
  [
    "huaban-6823396722",
    "母婴生活方式",
    "视频灵感",
    "明亮洗衣房内母亲陪伴宝宝，洗衣机、婴儿座椅和柔和居家光线，母婴产品种草视频场景，温馨真实。",
  ],
  [
    "huaban-6854630930",
    "活动现场直播",
    "视频灵感",
    "年轻女性站在人群和环形补光灯前做直播，现场观众围绕，真实活动记录氛围，适合达人探店、发布会和短视频封面。",
  ],
  [
    "huaban-6907897240",
    "商务会议协作",
    "爆款图文",
    "明亮会议室中团队围坐讨论方案，白板图表、笔记本电脑和自然窗光，企业品牌宣传、带货文案和商务协作场景。",
  ],
  [
    "huaban-6929323331",
    "咖啡馆生活方式",
    "视频灵感",
    "阳光穿过绿植洒进咖啡馆，女性在吧台制作饮品，咖啡机和温暖木质空间，真实生活方式摄影，适合探店短视频。",
  ],
  [
    "huaban-7047676154",
    "古风手部特写",
    "图片灵感",
    "古风人物手部特写，红线缠绕指尖，华丽织物与金色粒子光效，浅景深，东方幻想氛围，适合仙侠视觉海报。",
  ],
  [
    "huaban-7118167125",
    "舞台演出瞬间",
    "视频灵感",
    "霓虹舞台上的二次元歌手演出，动感姿态，黄色丝带与聚光灯穿插，音乐现场视觉海报，活力充沛。",
  ],
  [
    "huaban-7147202189",
    "虚拟主播直播间",
    "数字人形象",
    "蓝粉色电竞直播间，猫耳二次元虚拟主播拿着饮品坐在麦克风前，桌面设备丰富，横竖屏口播场景，赛博可爱风。",
  ],
  [
    "huaban-7156636947",
    "料理机产品摄影",
    "爆款图文",
    "厨房台面上的料理机产品摄影，水果、玻璃杯和暖色自然光，干净家居商业广告，适合电商主图和详情页视觉。",
  ],
].map(([id, title, category, prompt], index) => ({
  id,
  title,
  category,
  prompt,
  thumbnail: faceminiAsset(`inspirations/image/thumbs/${id}.webp`),
  source: faceminiAsset(
    `inspirations/image/originals/${getFaceminiImageOriginalFile(id)}`,
  ),
  dimensions: fmImageDimensions[id],
  ratio: formatFaceminiImageRatio(id),
  aspect:
    fmImageDimensions[id]?.[0] && fmImageDimensions[id]?.[1]
      ? fmImageDimensions[id][0] / fmImageDimensions[id][1]
      : "portrait",
}));

const fmDigitalHumanInspirations = [
  [
    "public-anchor-dialogue",
    "主播对话",
    "双主播围绕热点话题自然互动，一问一答拆解观点，节奏轻松、信息密度高，适合直播切片和访谈口播。",
  ],
  [
    "public-product",
    "产品讲解员",
    "以亲和专业的语气介绍产品卖点，结合使用场景、核心功能和购买理由，像短视频带货主播一样清晰种草。",
  ],
  [
    "public-medical",
    "健康科普员",
    "用通俗易懂的表达科普健康知识，先点出现象，再解释原因和日常建议，语气温和可信，避免夸大承诺。",
  ],
  [
    "public-home-lady",
    "居家知性女性",
    "在温暖居家场景中分享生活经验、好物心得或情绪陪伴，表达自然细腻，营造松弛、可信赖的陪伴感。",
  ],
  [
    "public-real-estate",
    "房地产经纪人",
    "以专业经纪人的口吻介绍房源亮点，讲清区位、户型、配套和适合人群，表达稳重利落，突出真实看房感。",
  ],
  [
    "public-travel",
    "文旅推荐官",
    "像本地向导一样推荐目的地，串联景点亮点、路线体验和拍照氛围，语言有画面感，激发立即出发的兴趣。",
  ],
  [
    "public-fashion-host",
    "时尚类女主播",
    "用精致自信的语气讲解穿搭、妆容或潮流单品，突出风格关键词、适配场景和细节质感，节奏轻快高级。",
  ],
  [
    "public-knowledge-host",
    "知识科普类女主播",
    "把复杂知识拆成清楚的三点，用案例开场、逻辑递进、结尾总结，适合科普、教育和观点类短视频。",
  ],
  [
    "public-executive-lady",
    "职场女高管",
    "以成熟干练的管理者视角分享商业判断、团队管理或职业成长建议，表达坚定克制，观点清晰有分量。",
  ],
  [
    "public-business-host",
    "职场轻商务女主播",
    "用轻商务风格介绍办公工具、效率方法或品牌服务，语气专业但不生硬，突出解决问题和提升效率的价值。",
  ],
  [
    "public-finance",
    "财经主播",
    "以财经主播口吻解读市场变化、行业趋势或投资常识，先给结论再讲逻辑，表达冷静理性，提醒风险边界。",
  ],
  [
    "public-operations",
    "运营达人",
    "从运营实战角度拆解增长方法、活动策划或内容策略，强调目标、动作和复盘指标，语言直接、可执行。",
  ],
].map(([avatarId, title, prompt, assetName]) => {
  const fileName = assetName || title;
  return {
    id: `digital-human-${avatarId}`,
    avatarId,
    title,
    category: "数字人形象",
    prompt,
    thumbnail: `/assets/digital-human/posters/${fileName}.jpg`,
    poster: `/assets/digital-human/posters/${fileName}.jpg`,
    source: `/assets/digital-human/${fileName}.mp4`,
    videoSrc: `/assets/digital-human/${fileName}.mp4`,
    ratio: "3s",
    model: "kling-ai-avatar-pro",
    material: "视频封面",
    aspect: "wide",
  };
});

const digitalHumanOfficialAvatarFallbacks = fmDigitalHumanInspirations.map(
  (item) => ({
    id: item.avatarId,
    name: item.title,
    description: `适合${item.title}类数字人口播、讲解与短视频内容`,
    language: "中文 / 通用",
    status: "ready",
    cover: item.source,
    assetPath: item.source,
    poster: item.poster,
  }),
);

const fmCreationScenes = [
  [
    "自媒体创作",
    "脚本、种草、朋友圈文案一键生成",
    "creation/scenes/self-media.png",
    ["小红书", "抖音", "朋友圈"],
    "article",
    "进入自媒体文案",
  ],
  [
    "电商美工",
    "主图、海报、详情页视觉快速出图",
    "creation/scenes/ecommerce-design.png",
    ["淘宝", "京东", "拼多多"],
    "image",
    "进入图片生成",
  ],
  [
    "虚拟主播",
    "选形象配音色，口型自然对口播",
    "creation/scenes/virtual-anchor.png",
    ["抖音", "淘宝直播", "视频号"],
    "digital-human",
    "进入数字人形象",
  ],
  [
    "文案带货",
    "标题、标语、带货话术智能撰写",
    "creation/scenes/copy-selling.png",
    ["淘宝", "抖音", "小红书"],
    "article",
    "进入带货文案",
  ],
  [
    "品牌宣传",
    "海报文案物料，一站式制作",
    "creation/scenes/brand-promo.png",
    ["公众号", "抖音", "品牌私域"],
    "article",
    "进入品牌宣传",
  ],
  [
    "母婴种草",
    "育儿干货、好物测评、宝宝文案",
    "creation/scenes/mom-baby.png",
    ["小红书", "抖音", "宝宝树"],
    "article",
    "进入母婴种草",
  ],
];

const getCreationSceneImage = (image) =>
  image.includes("/")
    ? faceminiAsset(image)
    : faceminiAsset(`inspirations/image/thumbs/${image}.webp`);

function getCreationCenterInspirations(activeTab) {
  switch (activeTab) {
    case "图片灵感":
      return fmImageGenerationInspirations;
    case "视频灵感":
      return getFaceminiVideoInspirations();
    case "数字人形象":
      return fmDigitalHumanInspirations;
    default:
      return fmImageInspirations.filter((item) => item.category === activeTab);
  }
}

const fmInspirationCategoryRouteMap = {
  图片灵感: { feature: "image", target: "image", model: "Kling Image" },
  视频灵感: { feature: "video", target: "video", model: "Kling Video" },
  数字人形象: {
    feature: "digital-human",
    target: "digital-human",
    model: "Digital Human",
  },
  爆款图文: { feature: "article", target: "article", model: "AI 图文" },
};

const fmInspirationLibraryDefaultTab = "全部";
const fmInspirationLibraryTabs = ["全部", "图片模板", "视频模板"];

const fmInspirationLibraryItems = [
  { title: "电商主图", icon: "🛍️", tab: "图片模板", route: "image" },
  { title: "赛博海报", icon: "🌃", tab: "图片模板", route: "image" },
  { title: "插画头像", icon: "🎨", tab: "图片模板", route: "image" },
  { title: "3D 产品", icon: "✨", tab: "图片模板", route: "image" },
  { title: "国潮美食", icon: "🍜", tab: "图片模板", route: "image" },
  { title: "品牌 IP", icon: "🐱", tab: "图片模板", route: "image" },
  { title: "人像写真", icon: "👤", tab: "图片模板", route: "image" },
  { title: "节日海报", icon: "🎉", tab: "图片模板", route: "image" },
  { title: "短视频口播", icon: "🎤", tab: "视频模板", route: "video" },
  { title: "产品种草", icon: "🌿", tab: "视频模板", route: "video" },
  { title: "漫剧片段", icon: "🎭", tab: "视频模板", route: "video" },
  { title: "蝶舞", icon: "🦋", tab: "视频模板", route: "video" },
  { title: "趣味短剧", icon: "🐱", tab: "视频模板", route: "video" },
  { title: "城市延时", icon: "🌃", tab: "视频模板", route: "video" },
  { title: "产品旋转", icon: "📦", tab: "视频模板", route: "video" },
  { title: "口播带货", icon: "🛒", tab: "视频模板", route: "video" },
];

function getFaceminiInspirationRoute(item) {
  return (
    fmInspirationCategoryRouteMap[item?.category] ||
    fmInspirationCategoryRouteMap["图片灵感"]
  );
}

function resolveFaceminiInspirationImageUrl(item) {
  if (!item) return "";
  return (
    item.videoSrc ||
    item.hdSrc ||
    item.imageUrl ||
    item.image ||
    item.source ||
    item.poster ||
    item.thumbnail ||
    item.src ||
    ""
  );
}

function getFaceminiVideoInspirations() {
  return videoInspirationItems.map((item) => ({
    ...item,
    id: `creation-${item.id}`,
    category: "视频灵感",
    thumbnail: item.poster,
    source: item.video,
    videoSrc: item.video,
    material: "视频素材",
    aspect: "wide",
  }));
}

function InspirationLibraryDrawer({
  open,
  activeTab,
  onTabChange,
  onClose,
  onOpenFeature,
}) {
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  const filteredItems = useMemo(() => {
    const query = keyword.trim().toLowerCase();
    return fmInspirationLibraryItems.filter((item) => {
      const matchesTab = activeTab === "全部" || item.tab === activeTab;
      const matchesKeyword =
        !query ||
        item.title.toLowerCase().includes(query) ||
        item.tab.toLowerCase().includes(query);
      return matchesTab && matchesKeyword;
    });
  }, [activeTab, keyword]);

  if (!open) return null;

  function selectItem(item) {
    onClose?.();
    onOpenFeature?.(item.route);
  }

  return (
    <div
      className="fm-library-drawer-shell"
      role="dialog"
      aria-modal="true"
      aria-label="灵感库"
    >
      <button
        className="fm-library-drawer-mask"
        type="button"
        aria-label="关闭灵感库"
        onClick={onClose}
      />
      <aside className="fm-library-drawer">
        <header className="fm-library-head">
          <div className="fm-library-title">
            <Sparkles size={18} />
            <h2>灵感库</h2>
          </div>
          <button
            className="fm-library-close"
            type="button"
            aria-label="关闭灵感库"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>
        <nav className="fm-library-tabs" aria-label="灵感库分类">
          {fmInspirationLibraryTabs.map((tab) => (
            <button
              className={activeTab === tab ? "is-active" : ""}
              type="button"
              key={tab}
              onClick={() => onTabChange(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>
        <label className="fm-library-search">
          <Search size={16} />
          <input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="搜索模板名称、风格、场景..."
          />
        </label>
        <div className="fm-library-grid">
          {filteredItems.map((item) => (
            <button
              className="fm-library-card"
              type="button"
              key={`${item.tab}-${item.title}`}
              onClick={() => selectItem(item)}
            >
              <span className="fm-library-icon" aria-hidden="true">
                {item.icon}
              </span>
              <span>{item.title}</span>
            </button>
          ))}
        </div>
        {!filteredItems.length && (
          <div className="fm-library-empty">
            <Sparkles size={24} />
            <strong>暂无匹配模板</strong>
            <p>换个关键词或分类试试</p>
          </div>
        )}
      </aside>
    </div>
  );
}

const appEntryStorageKey = "jingchuang:enter-app";
const pendingGenerationSeedKey = "facemini:pending-generation-seed";
const assetGalleryTabStorageKey = "facemini:asset-gallery-tab";
const assetsViewModeStorageKey = "facemini:assets-view-mode";
const favoriteModuleTabs = ["图片灵感", "视频灵感", "数字人形象", "爆款图文"];
const favoriteTabToAssetType = {
  图片灵感: "AI 图片",
  视频灵感: "AI 视频",
  数字人形象: "数字人",
  爆款图文: "爆款图文",
};
const originalFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) =>
  originalFetch(input, { credentials: "include", ...init });
const featureNavIds = navItems
  .map((item) => item.id)
  .filter((id) => id !== "home");
const featureNavIdSet = new Set(featureNavIds);
const appNavIdSet = new Set(navItems.map((item) => item.id));

const pendingGenerationSeedMemory = {
  image: null,
  video: null,
  "digital-human": null,
  article: null,
};

function writePendingGenerationSeed(seed) {
  const normalized = { ...seed, createdAt: Date.now() };
  if (seed?.target) {
    pendingGenerationSeedMemory[seed.target] = normalized;
  }
  try {
    window.sessionStorage.setItem(
      pendingGenerationSeedKey,
      JSON.stringify(normalized),
    );
  } catch {
    // Session storage can be unavailable in restricted browser contexts.
  }
}

function peekPendingGenerationSeed(target) {
  if (pendingGenerationSeedMemory[target]) {
    return pendingGenerationSeedMemory[target];
  }
  try {
    const raw = window.sessionStorage.getItem(pendingGenerationSeedKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.target === target ? parsed : null;
  } catch {
    return null;
  }
}

function clearPendingGenerationSeed(target) {
  if (target) {
    pendingGenerationSeedMemory[target] = null;
  }
  try {
    const raw = window.sessionStorage.getItem(pendingGenerationSeedKey);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!target || parsed?.target === target) {
      window.sessionStorage.removeItem(pendingGenerationSeedKey);
    }
  } catch {
    // Ignore storage failures.
  }
}

function takePendingGenerationSeed(target) {
  const pendingSeed = peekPendingGenerationSeed(target);
  if (!pendingSeed) return null;
  clearPendingGenerationSeed(target);
  return pendingSeed;
}

function hasPendingGenerationSeed(target) {
  return Boolean(peekPendingGenerationSeed(target));
}

function buildImageComposerSeedFromPending(pendingSeed) {
  if (!pendingSeed) return null;
  const prompt = pendingSeed.prompt || "";
  const referenceImage = pendingSeed.referenceImage?.url
    ? pendingSeed.referenceImage
    : null;
  if (!prompt && !referenceImage) return null;
  return {
    id: `pending-image-${pendingSeed.createdAt || Date.now()}`,
    prompt,
    referenceImage,
    model: pendingSeed.model || null,
    ratio: pendingSeed.ratio || null,
    quality: pendingSeed.quality || null,
    notice: pendingSeed.notice || "",
  };
}

function buildImageLaunchSeedPayload(seed = {}) {
  return {
    prompt: seed.prompt || "",
    referenceImage: seed.referenceImage || null,
    model: seed.model || null,
    ratio: seed.ratio || null,
    quality: seed.quality || null,
    notice: seed.notice || "",
    createdAt: Date.now(),
  };
}

function getRouteView() {
  const hashView = window.location.hash.replace(/^#\/?/, "").split("?")[0];
  const legalDocumentKey = getLegalDocumentKeyFromLocation();
  if (legalDocumentKey) return `legal:${legalDocumentKey}`;
  if (appNavIdSet.has(hashView)) return hashView;
  if (window.location.pathname === "/chat" || hashView === "chat")
    return "chat";
  if (window.location.pathname === "/home" || hashView === "home")
    return "home";
  if (
    window.location.pathname === "/image-digital-human" ||
    hashView === "image-digital-human"
  )
    return "digital-human";
  if (
    window.location.pathname === "/digital-human" ||
    hashView === "digital-human"
  )
    return "digital-human";
  if (window.location.pathname === "/motion-transfer" || hashView === "motion")
    return "motion";
  if (window.location.pathname === "/face-swap" || hashView === "face-swap")
    return "face-swap";
  if (window.location.pathname === "/watermark" || hashView === "watermark")
    return "watermark";
  if (
    window.location.pathname === "/voice-conversion" ||
    hashView === "voice-convert"
  )
    return "voice-convert";
  if (window.location.pathname === "/transcribe" || hashView === "transcribe")
    return "transcribe";
  if (window.location.pathname === "/article" || hashView === "article")
    return "article";
  if (window.location.pathname === "/music" || hashView === "music")
    return "music";
  if (window.location.pathname === "/replicate" || hashView === "replicate")
    return "replicate";
  if (window.location.pathname === "/enhance" || hashView === "enhance")
    return "enhance";
  if (window.location.pathname === "/remove-bg" || hashView === "remove-bg")
    return "remove-bg";
  if (window.location.pathname === "/voice" || hashView === "voice")
    return "voice";
  if (window.location.pathname === "/video" || hashView === "video")
    return "video";
  if (window.location.pathname === "/image" || hashView === "image")
    return "image";
  return "home";
}

function getInitialView() {
  const routeView = getRouteView();
  if (routeView !== "splash") return routeView;

  const shouldEnterApp =
    window.sessionStorage.getItem(appEntryStorageKey) === "1";
  if (shouldEnterApp) {
    window.sessionStorage.removeItem(appEntryStorageKey);
    return "home";
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
  const isSubmitDisabled =
    isSubmitting || (isLogin && !agreementAccepted);

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
          inviteCode: getPendingInviteCode(),
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
            inviteCode: getPendingInviteCode(),
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

function LegalDocumentPage({ documentKey, onOpenHome }) {
  const documentConfig =
    legalDocuments[documentKey] || legalDocuments["user-agreement"];
  const content = documentConfig.markdown.replace(
    /\*\*(mail@facemini\.com)\*\*/g,
    "[$1](mailto:$1)",
  );

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [documentKey]);

  return (
    <main className="legal-page-shell">
      <section className="legal-page-hero">
        <div>
          <span>Facemini Legal</span>
          <h1>{documentConfig.title}</h1>
        </div>
      </section>
      <article className="legal-markdown-card">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            a({ href = "", children, ...props }) {
              return (
                <a href={href} {...props}>
                  {children}
                </a>
              );
            },
          }}
        >
          {content}
        </ReactMarkdown>
      </article>
    </main>
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
  const isGuest = !authUser || authUser.isGuest;

  return (
    <main className="home-feature-main fm-home-page">
      <nav className="fm-home-nav" aria-label="首页导航">
        <button type="button" onClick={onOpenLanding} aria-label="返回落地页">
          <BrandWordmark />
        </button>
        <div className="fm-home-nav-center">
          <a href="#why">关于我们</a>
          <a href="#modules">关于产品</a>
          <a href="#footer">探索我们</a>
        </div>
        <div className="fm-home-actions">
          <button
            type="button"
            className="fm-primary fm-home-enter-creation"
            onClick={() => onOpenFeature("creation")}
          >
            开始探索
          </button>
        </div>
      </nav>
      <section className="fm-hero-section">
        <h1>千面创想 一面即达</h1>
        <p>Facemini，让未来的工作方式，提前发生</p>
        <button
          className="fm-primary fm-hero-cta"
          type="button"
          onClick={() => onOpenFeature("creation")}
        >
          开始探索
        </button>
        <div className="fm-metrics">
          {[
            ["10M+", "AI能力日调用量"],
            ["99.99%", "平台稳定可用性"],
            ["50ms", "平均响应延迟"],
            ["500+", "企业客户与个人"],
          ].map(([value, label]) => (
            <div key={value}>
              <strong>{value}</strong>
              <span>{label}</span>
            </div>
          ))}
        </div>
      </section>
      <section className="fm-home-section" id="why">
        <h2>为什么选择Facemini</h2>
        <p>一站式解决AI应用开发的所有挑战，让您专注于产品创新</p>
        <div className="fm-feature-grid">
          {fmHomeFeatures.map(([title, body, icon]) => (
            <button
              className="fm-feature-card"
              type="button"
              key={title}
              onClick={() => onOpenFeature("creation")}
            >
              <span className="fm-svg-icon">
                <img src={faceminiAsset(icon)} alt="" />
              </span>
              <h3>{title}</h3>
              <p>{body}</p>
            </button>
          ))}
        </div>
      </section>
      <section className="fm-home-section fm-module-section" id="modules">
        <h2>Facemini能做什么</h2>
        <p>聚焦AI应用落地，助力企业与内容业务高效增长</p>
        <div className="fm-module-list">
          {fmHomeModules.map(([title, desc, image, icon, route]) => (
            <button
              className="fm-module-row"
              type="button"
              key={title}
              onClick={() => onOpenFeature(route)}
            >
              <img src={faceminiAsset(image)} alt="" />
              <div>
                <span className="fm-svg-icon">
                  <img src={faceminiAsset(icon)} alt="" />
                </span>
                <h3>{title}</h3>
                <p>{desc}</p>
                <ul>
                  <li>模板化配置，快速启动应用</li>
                  <li>统一素材资产，便于复用沉淀</li>
                </ul>
              </div>
            </button>
          ))}
        </div>
      </section>
      <section className="fm-final-cta">
        <h2>准备好开启你的AI创意之旅了吗？</h2>
        <p>立即体验Facemini的强大能力</p>
        <button
          className="fm-primary"
          type="button"
          onClick={() => onOpenFeature("creation")}
        >
          开始探索
        </button>
        <div className="fm-footer-brand-block">
          <BrandWordmark />
          <p>AI 驱动的创意工具平台，面向企业营销、数字内容与个人创作场景。</p>
        </div>
      </section>
      <footer className="fm-home-footer" id="footer">
        <div className="fm-footer-links">
          <a>关于我们</a>
          <a>关于产品</a>
          <a>探索我们</a>
          <a>帮助中心</a>
        </div>
        <p>
          © 2026 Facemini All rights reserved.{" "}
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
          >
            鄂ICP备2021002927号-3
          </a>
        </p>
      </footer>
    </main>
  );
});

function CreationCenterView({
  onOpenFeature,
  onOpenInvite,
  onOpenLibrary,
  authUser,
  onOpenAuth,
}) {
  const [activeTab, setActiveTab] = useState("图片灵感");
  const [bannerIndex, setBannerIndex] = useState(0);
  const [isBannerSliding, setIsBannerSliding] = useState(false);
  const [modalItem, setModalItem] = useState(null);
  const [favoriteInspirationIds, setFavoriteInspirationIds] = useState(() =>
    readInspirationFavoriteIds(),
  );
  const heroBanners = [
    {
      image: faceminiAsset("creation/banners/home-top-slider-1.jpg"),
      action: "chat",
      label: "打开大模型",
    },
    {
      image: faceminiAsset("creation/banners/home-top-slider-2.png"),
      action: "invite",
      label: "打开邀请有礼",
    },
  ];
  const categories = ["图片灵感", "视频灵感", "数字人形象", "爆款图文"];
  const filteredImages = getCreationCenterInspirations(activeTab);
  const visibleFilteredImages = useIncrementalItems(
    filteredImages,
    `creation-${activeTab}-${filteredImages.length}`,
  );
  const arrangedVisibleFilteredImages = useMemo(
    () => arrangeInspirationCardsByBatch(visibleFilteredImages.items, 5),
    [visibleFilteredImages.items],
  );
  const nextBannerIndex = (bannerIndex + 1) % heroBanners.length;

  useEffect(() => {
    function syncFavoriteIds() {
      setFavoriteInspirationIds(readInspirationFavoriteIds());
    }
    window.addEventListener(inspirationFavoritesChangedEvent, syncFavoriteIds);
    return () =>
      window.removeEventListener(
        inspirationFavoritesChangedEvent,
        syncFavoriteIds,
      );
  }, []);

  useEffect(() => {
    if (!isLoggedInUser(authUser)) return;
    loadInspirationFavoriteIds().then(setFavoriteInspirationIds).catch(() => {});
  }, [authUser?.id]);

  const advanceHeroBanner = useCallback(() => {
    if (isBannerSliding) return;
    setIsBannerSliding(true);
    window.setTimeout(() => {
      setBannerIndex((index) => (index + 1) % heroBanners.length);
      setIsBannerSliding(false);
    }, 520);
  }, [heroBanners.length, isBannerSliding]);

  useEffect(() => {
    const timer = window.setInterval(advanceHeroBanner, 3600);
    return () => window.clearInterval(timer);
  }, [advanceHeroBanner]);

  function openInspiration(item) {
    const route = getFaceminiInspirationRoute(item);
    const favoriteId = getInspirationFavoriteId(item);
    setModalItem({
      ...item,
      favorite: favoriteInspirationIds.has(favoriteId),
      image: resolveFaceminiInspirationImageUrl(item),
      material:
        item.material || (item.category === "数字人形象" ? "视频封面" : "高清原图"),
      model: item.model || route.model,
    });
  }

  async function toggleInspirationFavorite(item) {
    if (!isLoggedInUser(authUser)) {
      onOpenAuth?.("login");
      throw new Error("请先登录");
    }
    const nextValue = await toggleInspirationFavoriteId(
      getInspirationFavoriteId(item),
    );
    const nextIds = readInspirationFavoriteIds();
    setFavoriteInspirationIds(nextIds);
    setModalItem((current) =>
      current && getInspirationFavoriteId(current) === getInspirationFavoriteId(item)
        ? { ...current, favorite: nextValue }
        : current,
    );
    return nextValue;
  }

  function remixInspiration(item) {
    const route = getFaceminiInspirationRoute(item);
    const launchSeed = buildImageLaunchSeedPayload({
      prompt: item.prompt,
      ratio: item.ratio || null,
      notice: "已填入同款提示词",
    });
    writePendingGenerationSeed({
      target: route.target,
      title: item.title,
      category: item.category,
      avatarId: item.avatarId || null,
      ...launchSeed,
    });
    setModalItem(null);
    onOpenFeature(route.feature, launchSeed);
  }

  function referenceInspiration(item) {
    const imageUrl = resolveFaceminiInspirationImageUrl(item);
    const launchSeed = buildImageLaunchSeedPayload({
      prompt: item.prompt || "",
      referenceImage: imageUrl
        ? {
            url: imageUrl,
            originalName: `${item.title || "参考图"}.png`,
            size: 0,
            mimeType: "image/png",
          }
        : null,
      model: "gpt_image_2",
      notice: "已添加为参考图",
    });
    writePendingGenerationSeed({
      target: "image",
      title: item.title,
      category: item.category,
      ...launchSeed,
    });
    setModalItem(null);
    onOpenFeature("image", launchSeed);
  }

  function handleHeroBannerClick() {
    const activeBanner = heroBanners[bannerIndex];
    if (activeBanner?.action === "invite") {
      onOpenInvite?.();
      return;
    }
    onOpenFeature(activeBanner?.action || "image");
  }

  return (
    <section className="fm-work-page fm-creation-page">
      <div className="fm-banner-row">
        <div className="fm-banner-card fm-banner-large">
          <button
            className="fm-banner-main-hit"
            type="button"
            onClick={handleHeroBannerClick}
            aria-label={heroBanners[bannerIndex]?.label || "打开创作功能"}
          >
            <span
              className={`fm-hero-banner-stage ${isBannerSliding ? "is-sliding" : ""}`}
            >
              <img src={heroBanners[bannerIndex].image} alt="" />
              <img src={heroBanners[nextBannerIndex].image} alt="" />
            </span>
          </button>
          <button
            className="fm-banner-arrow is-left"
            type="button"
            onClick={advanceHeroBanner}
            aria-label="上一张"
          >
            <ChevronDown size={20} />
          </button>
          <button
            className="fm-banner-arrow is-right"
            type="button"
            onClick={advanceHeroBanner}
            aria-label="下一张"
          >
            <ChevronDown size={20} />
          </button>
        </div>
        <button
          className="fm-banner-card"
          type="button"
          onClick={() => onOpenFeature("image")}
        >
          <img src={faceminiAsset("creation/banners/banner-01.png")} alt="" />
        </button>
        <button
          className="fm-banner-card"
          type="button"
          onClick={() => onOpenFeature("digital-human")}
        >
          <img src={faceminiAsset("creation/banners/banner-02.png")} alt="" />
        </button>
      </div>
      <section className="fm-section-block">
        <h2>场景化创作入口</h2>
        <div className="fm-scene-grid">
          {fmCreationScenes.map(
            ([title, desc, image, tags, route, entryLabel]) => (
              <button
                className="fm-scene-card"
                type="button"
                key={title}
                onClick={() => onOpenFeature(route)}
              >
                <div className="fm-scene-image">
                  <img src={getCreationSceneImage(image)} alt="" />
                  <span className="fm-scene-entry">{entryLabel}</span>
                </div>
                <div className="fm-scene-body">
                  <h3>{title}</h3>
                  <p>{desc}</p>
                  <div className="fm-scene-tags">
                    {tags.map((tag) => (
                      <span key={tag}>{tag}</span>
                    ))}
                  </div>
                </div>
              </button>
            ),
          )}
        </div>
      </section>
      <section className="fm-section-block">
        <div className="fm-section-title-row fm-inspiration-title-row">
          <h2>灵感广场</h2>
          <div className="fm-pill-tabs fm-inspiration-tabs">
            {categories.map((tab) => (
              <button
                className={tab === activeTab ? "active" : ""}
                type="button"
                key={tab}
                onClick={() => setActiveTab(tab)}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
        <WaterfallGrid
          key={`creation-inspiration-${activeTab}`}
          className="fm-masonry"
          gap={12}
          maxColumns={5}
          minColumnWidth={172}
          items={arrangedVisibleFilteredImages}
          renderItem={(item) => (
            <div className="fm-image-card">
              <button
                className="fm-image-card-hit"
                type="button"
                onClick={() => openInspiration(item)}
                aria-label={item.title}
              >
                <img
                  src={item.thumbnail}
                  alt={item.title}
                  loading="lazy"
                  onError={(event) => {
                    if (
                      item.fallbackThumbnail &&
                      event.currentTarget.src !== item.fallbackThumbnail
                    ) {
                      event.currentTarget.src = item.fallbackThumbnail;
                    }
                  }}
                />
              </button>
              <button
                className="fm-image-card-remix"
                type="button"
                onClick={() => remixInspiration(item)}
              >
                生成同款
              </button>
            </div>
          )}
        />
        <IncrementalLoadMoreIndicator
          active={visibleFilteredImages.isLoadingMore && visibleFilteredImages.hasMore}
        />
      </section>
      <FaceminiInspirationModal
        item={modalItem}
        onClose={() => setModalItem(null)}
        onRemix={remixInspiration}
        onReference={referenceInspiration}
        onFavorite={toggleInspirationFavorite}
      />
    </section>
  );
}

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
    marketing: false,
    audio: false,
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

  const sidebarSections = navSections.filter(
    (section) => section.id !== "assets" && section.id !== "billing",
  );
  const assetsItem = getNavItem("assets");
  const AssetsIcon = assetsItem?.icon;

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
        {sidebarSections.map((section) => {
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
      {assetsItem && AssetsIcon && (
        <div className="feature-nav-assets-dock">
          <button
            className={`feature-nav-item feature-nav-asset-bottom ${
              activeNav === "assets" ? "is-active" : ""
            }`}
            onClick={() => onNavChange("assets")}
            type="button"
          >
            <AssetsIcon size={18} strokeWidth={1.9} />
            <span>{assetsItem.label}</span>
            <ChevronDown className="feature-nav-chevron" size={16} />
          </button>
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
const paymentResultTtlSeconds = 3;
const paymentProviderOptions = [
  { value: "alipay", label: "支付宝支付" },
  { value: "wechat", label: "微信支付" },
];

function paymentProviderText(provider) {
  return (
    paymentProviderOptions.find((item) => item.value === provider)?.label ||
    "支付宝支付"
  );
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
        message: "订单已退款，积分变动以积分明细为准",
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
  invitegift: { label: "邀请有礼", color: "#16a34a" },
};

const transactionsPageSize = 20;
const transactionFilterOptions = [
  ["all", "全部"],
  ["invitegift", "邀请有礼"],
  ["recharge", "充值"],
  ["grant", "注册赠送"],
  ["debit", "消费"],
  ["refund", "退款"],
];
const assetTimeFilterOptions = [
  ["all", "全部时间"],
  ["today", "今天"],
  ["7d", "近 7 天"],
  ["30d", "近 30 天"],
  ["custom", "自定义"],
];
const articleImageSource = "article";
const articlePromptMarker = "爆款图文设计";

function formatDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getAssetTimeRange(preset, startDate, endDate) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let rangeStart = null;
  let rangeEnd = null;

  if (preset === "today") {
    rangeStart = todayStart;
    rangeEnd = new Date(todayStart);
  } else if (preset === "7d") {
    rangeStart = new Date(todayStart);
    rangeStart.setDate(rangeStart.getDate() - 6);
    rangeEnd = new Date(todayStart);
  } else if (preset === "30d") {
    rangeStart = new Date(todayStart);
    rangeStart.setDate(rangeStart.getDate() - 29);
    rangeEnd = new Date(todayStart);
  } else if (preset === "custom") {
    if (startDate) rangeStart = new Date(`${startDate}T00:00:00`);
    if (endDate) rangeEnd = new Date(`${endDate}T00:00:00`);
  }

  const startMs = rangeStart instanceof Date && Number.isFinite(rangeStart.getTime())
    ? new Date(rangeStart.getFullYear(), rangeStart.getMonth(), rangeStart.getDate()).getTime()
    : null;
  const endMs = rangeEnd instanceof Date && Number.isFinite(rangeEnd.getTime())
    ? new Date(rangeEnd.getFullYear(), rangeEnd.getMonth(), rangeEnd.getDate(), 23, 59, 59, 999).getTime()
    : null;

  return {
    startDate: startMs !== null ? formatDateInputValue(new Date(startMs)) : "",
    endDate: endMs !== null ? formatDateInputValue(new Date(endMs)) : "",
    startMs,
    endMs,
  };
}

function isTimestampInRange(timestamp, range) {
  if (!timestamp) return false;
  if (range.startMs !== null && timestamp < range.startMs) return false;
  if (range.endMs !== null && timestamp > range.endMs) return false;
  return true;
}

function isArticleImageTask(task) {
  return (
    task?.source === articleImageSource ||
    String(task?.prompt || "").includes(articlePromptMarker)
  );
}

function getAssetTaskTime(task) {
  const value = task?.createdAt || task?.updatedAt || task?.time || "";
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function getAssetTaskTitle(type, task) {
  return (
    task?.title ||
    task?.avatarName ||
    task?.sourceFileName ||
    task?.videoFileName ||
    task?.prompt ||
    {
      "AI 图片": "AI 图片作品",
      "AI 视频": "AI 视频作品",
      数字人: "数字人作品",
      照片数字人: "照片数字人作品",
      爆款图文: "爆款图文作品",
    }[type] ||
    "作品"
  );
}

function isVideoMediaUrl(url = "") {
  return /\.(mp4|webm|mov|m4v)(\?|$)/i.test(String(url || "").split("#")[0]);
}

function firstImageMediaUrl(...urls) {
  return urls.find((url) => url && !isVideoMediaUrl(url)) || "";
}

function getAssetTaskPreview(type, task) {
  if (type === "AI 图片") {
    return firstImageMediaUrl(
      task?.image,
      task?.imageUrl,
      task?.thumbnailUrl,
      task?.resultUrl,
    );
  }
  if (type === "AI 视频")
    return (
      task?.poster || task?.thumbnailUrl || task?.image || task?.cover || ""
    );
  if (type === "数字人" || type === "照片数字人")
    return (
      task?.thumbnailUrl ||
      task?.poster ||
      task?.portraitUrl ||
      task?.imageUrl ||
      task?.cover ||
      ""
    );
  return task?.image || task?.thumbnailUrl || task?.cover || "";
}

function isDigitalHumanAssetType(type) {
  return type === "数字人" || type === "照片数字人";
}

function matchesAssetGalleryTab(item, tab) {
  if (tab === "全部") return true;
  if (tab === "数字人") return isDigitalHumanAssetType(item.type);
  return item.type === tab;
}

function mapAssetTasks(type, tasks = []) {
  const source = Array.isArray(tasks) ? tasks : [];
  return source.map((task) => {
    const preview = getAssetTaskPreview(type, task);
    const video =
      type === "AI 视频" || isDigitalHumanAssetType(type)
        ? task?.video || task?.resultUrl || task?.url || ""
        : "";
    const isVideo =
      Boolean(video) || type === "AI 视频" || isDigitalHumanAssetType(type);
    const highRes =
      type === "AI 图片"
        ? firstImageMediaUrl(task?.imageUrl, task?.image, preview) || preview
        : "";
    return {
      id: `${type}-${task.id}`,
      rawId: task.id,
      type,
      src: isVideo ? preview : preview || video,
      image: preview,
      imageUrl: highRes,
      poster: preview || task?.poster || task?.thumbnailUrl || "",
      video,
      videoUrl: video,
      posterUrl: preview || task?.poster || task?.thumbnailUrl || "",
      prompt:
        task.prompt || task.text || task.error || getAssetTaskTitle(type, task),
      title: getAssetTaskTitle(type, task),
      category: type,
      model: task.model || task.modelKey || task.providerModel || "",
      ratio:
        task.ratio ||
        task.resolution ||
        (task.duration ? `${task.duration}s` : ""),
      isVideo,
      favorite: Boolean(task.favorite),
      status: task.status || "",
      sortTime: getAssetTaskTime(task),
    };
  });
}

function mapArticleAssets(tasks = []) {
  const source = Array.isArray(tasks) ? tasks : [];
  return source.map((task) => {
    const preview =
      task?.image ||
      task?.imageUrl ||
      task?.images?.[0] ||
      task?.imageTasks?.[0]?.imageUrl ||
      task?.imageTasks?.[0]?.image ||
      "";
    const title =
      task?.copy?.title ||
      task?.title ||
      String(task?.copy?.body || "").trim().slice(0, 40) ||
      "爆款图文作品";
    return {
      id: `爆款图文-${task.id}`,
      rawId: task.id,
      type: "爆款图文",
      src: preview,
      image: preview,
      imageUrl: preview,
      poster: preview,
      video: "",
      videoUrl: "",
      posterUrl: preview,
      prompt: task?.copy?.body || task?.prompt || title,
      title,
      category: "爆款图文",
      model: task.model || task.modelKey || "",
      ratio: task.ratio || "",
      isVideo: false,
      favorite: Boolean(task.favorite),
      status: task.status || "",
      sortTime: getAssetTaskTime(task),
    };
  });
}

function canFavoriteAsset(card) {
  const status = String(card?.status || "").toLowerCase();
  return status !== "failed" && status !== "error";
}

function isBuiltInAvatarUrl(value) {
  return /^\/assets\/avatars\/(?:[1-9]|1\d|2[0-5])\.jpg$/.test(
    String(value || ""),
  );
}

function CreditTransactionsPanel({
  transactions,
  transactionsPage,
  transactionsTotalPages,
  transactionMeta,
  transactionFilter,
  isLoading,
  onFilterChange,
  onPageChange,
  timeFilterControl,
}) {
  return (
    <div className="fm-assets-transactions-view">
      <div className="fm-transaction-toolbar">
        <div className="fm-transaction-filters" aria-label="账单分类">
          {transactionFilterOptions.map(([value, label]) => (
            <button
              key={value}
              type="button"
              className={transactionFilter === value ? "is-active" : ""}
              onClick={() => onFilterChange(value)}
            >
              {label}
            </button>
          ))}
        </div>
        {timeFilterControl}
      </div>
      {transactions.length ? (
        <>
          <div className="assets-transactions-table fm-transactions-table">
            <div className="assets-transactions-header">
              <span>时间</span>
              <span>类型</span>
              <span>变动</span>
              <span>余额</span>
              <span>备注</span>
            </div>
            {transactions.map((tx) => {
              const typeInfo = txTypeMap[tx.type] || {
                label: tx.type,
                color: "#64748b",
              };
              const isIncome = Number(tx.amount || 0) > 0;
              return (
                <div className="assets-transaction-row" key={tx.id}>
                  <span>{formatBeijingDateTime(tx.createdAt)}</span>
                  <span style={{ color: typeInfo.color }}>{typeInfo.label}</span>
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
              第 {transactionMeta.page || transactionsPage} /{" "}
              {transactionsTotalPages} 页 · 共 {transactionMeta.total || 0} 条
            </span>
            <div>
              <button
                type="button"
                onClick={() => onPageChange(Math.max(1, transactionsPage - 1))}
                disabled={transactionsPage <= 1 || isLoading}
              >
                上一页
              </button>
              <button
                type="button"
                onClick={() =>
                  onPageChange(
                    Math.min(transactionsTotalPages, transactionsPage + 1),
                  )
                }
                disabled={
                  transactionsPage >= transactionsTotalPages || isLoading
                }
              >
                下一页
              </button>
            </div>
          </div>
        </>
      ) : (
        <div className="fm-assets-empty-state">
          <History size={34} />
          <strong>{isLoading ? "正在加载明细" : "暂无积分明细"}</strong>
          <p>
            {transactionFilter === "invitegift"
              ? "邀请奖励到账后会显示在这里"
              : "暂无符合条件的积分变动"}
          </p>
        </div>
      )}
    </div>
  );
}

function AssetsPage({
  authUser,
  onOpenAuth,
  onOpenFeature,
  onOpenInvite,
  pageMode = null,
}) {
  const isGuest = !authUser || Boolean(authUser.isGuest);
  const [credits, setCredits] = useState(null);
  const [orders, setOrders] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [userAssets, setUserAssets] = useState([]);
  const [activeAssetTab, setActiveAssetTab] = useState(() => {
    try {
      return window.sessionStorage.getItem(assetGalleryTabStorageKey) || "全部";
    } catch {
      return "全部";
    }
  });
  const [viewMode, setViewMode] = useState(() => {
    try {
      const stored = window.sessionStorage.getItem(assetsViewModeStorageKey);
      if (
        stored === "profile" ||
        stored === "favorites" ||
        stored === "gallery"
      ) {
        return stored;
      }
      return "gallery";
    } catch {
      return "gallery";
    }
  });
  const [inviteProfile, setInviteProfile] = useState(null);
  const [inviteLinkCopied, setInviteLinkCopied] = useState(false);
  const [monthlyConsumedCredits, setMonthlyConsumedCredits] = useState(0);
  const [favoriteTab, setFavoriteTab] = useState("图片灵感");
  const [amount, setAmount] = useState(1);
  const [activePreset, setActivePreset] = useState(1);
  const [paymentProvider, setPaymentProvider] = useState("alipay");
  const [activeTab, setActiveTab] = useState("recharge");
  const [transactionsPage, setTransactionsPage] = useState(1);
  const [transactionFilter, setTransactionFilter] = useState("all");
  const [assetTimePreset, setAssetTimePreset] = useState("all");
  const [assetStartDate, setAssetStartDate] = useState("");
  const [assetEndDate, setAssetEndDate] = useState("");
  const [transactionMeta, setTransactionMeta] = useState({
    page: 1,
    pageSize: transactionsPageSize,
    total: 0,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");
  const [paymentDialog, setPaymentDialog] = useState(null);
  const [paymentCountdown, setPaymentCountdown] = useState(
    paymentCodeTtlSeconds,
  );
  const [paymentResultDialog, setPaymentResultDialog] = useState(null);
  const [paymentResultCountdown, setPaymentResultCountdown] = useState(
    paymentResultTtlSeconds,
  );
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [accountSettingsPanel, setAccountSettingsPanel] = useState("list");
  const [accountSettingsTab, setAccountSettingsTab] = useState("built-in");
  const [accountSettingsError, setAccountSettingsError] = useState("");
  const [accountSettingsSuccess, setAccountSettingsSuccess] = useState("");
  const [accountSettingsToast, setAccountSettingsToast] = useState(null);
  const [accountSettingsSubmitting, setAccountSettingsSubmitting] =
    useState(false);
  const [accountSmsSending, setAccountSmsSending] = useState("");
  const [accountSmsCooldowns, setAccountSmsCooldowns] = useState({});
  const [selectedAvatarUrl, setSelectedAvatarUrl] = useState("");
  const [avatarUploadSrc, setAvatarUploadSrc] = useState("");
  const [avatarZoom, setAvatarZoom] = useState(1);
  const [avatarOffset, setAvatarOffset] = useState({ x: 0, y: 0 });
  const [avatarDragState, setAvatarDragState] = useState(null);
  const avatarImageRef = useRef(null);
  const accountToastTimerRef = useRef(null);
  const [nicknameDraft, setNicknameDraft] = useState("");
  const [phoneDraft, setPhoneDraft] = useState({
    oldPhoneCode: "",
    newPhone: "",
    newPhoneCode: "",
    phoneChangeToken: "",
  });
  const [phoneChangeStep, setPhoneChangeStep] = useState("old");
  const [passwordMode, setPasswordMode] = useState("password");
  const [passwordDraft, setPasswordDraft] = useState({
    oldPassword: "",
    smsCode: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [previewAsset, setPreviewAsset] = useState(null);
  const effectiveViewMode = pageMode || viewMode;

  const points = Math.max(1, Number(amount) || 1) * 100;
  const totalCreations = userAssets.length;
  const profileDisplayName =
    authUser?.displayName || authUser?.username || "用户";
  const profileCredits = Number(
    credits?.balance ?? authUser?.credits ?? 0,
  ).toLocaleString("zh-CN");
  const profileInviteCode =
    inviteProfile?.inviteCode || authUser?.inviteCode || "";
  const profileInviteLink =
    inviteProfile?.inviteLink || buildClientInviteLink(profileInviteCode);
  const favoriteAssets = useMemo(
    () => userAssets.filter((asset) => asset.favorite && canFavoriteAsset(asset)),
    [userAssets],
  );
  const totalFavorites = favoriteAssets.length;
  const favoriteTabCards = useMemo(
    () =>
      favoriteAssets.filter((asset) => {
        if (favoriteTab === "数字人形象") {
          return isDigitalHumanAssetType(asset.type);
        }
        return asset.type === favoriteTabToAssetType[favoriteTab];
      }),
    [favoriteAssets, favoriteTab],
  );
  const recentRechargeOrders = useMemo(() => {
    const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return orders
      .filter((order) => {
        const createdAt = new Date(order.createdAt).getTime();
        return Number.isFinite(createdAt) && createdAt >= oneMonthAgo;
      })
      .slice(0, 10);
  }, [orders]);
  const transactionsTotalPages = transactionMeta.totalPages || 1;
  const assetTimeRange = useMemo(
    () => getAssetTimeRange(assetTimePreset, assetStartDate, assetEndDate),
    [assetEndDate, assetStartDate, assetTimePreset],
  );
  const visibleTransactions = transactions.filter((tx) => {
    if (assetTimePreset === "all") return true;
    return isTimestampInRange(new Date(tx.createdAt).getTime(), assetTimeRange);
  });
  const latestTransaction = visibleTransactions[0] || null;

  const refreshAssets = useCallback(async () => {
    if (isGuest) return;
    setIsLoading(true);
    setError("");
    try {
      const [
        creditsState,
        orderState,
        txState,
        monthDebitState,
        imageTasks,
        videoTasks,
        digitalHumanTasks,
        imageDigitalHumanTasks,
        articleTasks,
      ] = await Promise.all([
        paymentApi.getCredits(),
        paymentApi.listOrders(),
        paymentApi.getCreditTransactions({
          type: transactionFilter,
          page: transactionsPage,
          pageSize: transactionsPageSize,
          startDate: assetTimeRange.startDate,
          endDate: assetTimeRange.endDate,
        }),
        paymentApi
          .getCreditTransactions({
            type: "debit",
            page: 1,
            pageSize: 200,
            keyword: "",
          })
          .catch(() => ({ transactions: [] })),
        imageApi.getTasks({ filter: "all" }).catch(() => []),
        videoApi.getTasks({ filter: "all" }).catch(() => []),
        digitalHumanApi.getTasks().catch(() => []),
        imageDigitalHumanApi.getTasks().catch(() => []),
        articleApi.getTasks({ filter: "all" }).catch(() => []),
      ]);
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthlyConsumed = (monthDebitState.transactions || [])
        .filter((tx) => new Date(tx.createdAt).getTime() >= monthStart.getTime())
        .reduce(
          (sum, tx) => sum + Math.abs(Number(tx.amount) || 0),
          0,
        );
      setMonthlyConsumedCredits(monthlyConsumed);
      setCredits(creditsState);
      setOrders(orderState.orders || []);
      setTransactions(txState.transactions || []);
      setTransactionMeta({
        page: txState.page || 1,
        pageSize: txState.pageSize || transactionsPageSize,
        total: txState.total || 0,
        totalPages: txState.totalPages || 1,
      });
      const regularImageTasks = imageTasks.filter(
        (task) => !isArticleImageTask(task),
      );
      setUserAssets(
        [
          ...mapAssetTasks("AI 图片", regularImageTasks),
          ...mapAssetTasks("AI 视频", videoTasks),
          ...mapAssetTasks("数字人", digitalHumanTasks),
          ...mapAssetTasks("照片数字人", imageDigitalHumanTasks),
          ...mapArticleAssets(articleTasks),
        ].sort((a, b) => b.sortTime - a.sortTime),
      );
    } catch (nextError) {
      setError(nextError.message || "资产信息加载失败");
    } finally {
      setIsLoading(false);
    }
  }, [
    assetTimeRange.endDate,
    assetTimeRange.startDate,
    isGuest,
    transactionFilter,
    transactionsPage,
  ]);

  useEffect(() => {
    refreshAssets();
  }, [refreshAssets]);

  useEffect(() => {
    if (isGuest || effectiveViewMode !== "profile") return undefined;
    let alive = true;
    invitationApi
      .me()
      .then((profile) => {
        if (alive) setInviteProfile(profile);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [authUser?.id, effectiveViewMode, isGuest]);

  useEffect(() => {
    setTransactionsPage((page) => Math.min(page, transactionsTotalPages));
  }, [transactionsTotalPages]);

  useEffect(() => {
    setTransactionsPage(1);
  }, [assetTimeRange.endDate, assetTimeRange.startDate, transactionFilter]);

  function showPaymentResult(order, statusOverride) {
    const isExpiredClosedOrder =
      order?.status === "CLOSED" &&
      String(order?.statusMessage || "").includes("超时");
    const status =
      statusOverride ||
      (isExpiredClosedOrder ? "EXPIRED" : order?.status) ||
      "CLOSED";
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
    const expiresAt =
      paymentDialog.expiresAt || getPaymentExpiresAt(paymentDialog.order);
    const tick = () => {
      const nextSeconds = Math.max(
        0,
        Math.ceil((expiresAt - Date.now()) / 1000),
      );
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
      const nextSeconds = Math.max(
        0,
        paymentResultTtlSeconds - Math.floor((Date.now() - openedAt) / 1000),
      );
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
      const created = await paymentApi.createOrder(
        Number(amount),
        paymentProvider,
      );
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

  const assetGalleryTabs = ["全部", "AI 图片", "AI 视频", "数字人", "爆款图文"];
  const assetGalleryCards = useMemo(() => {
    return userAssets
      .filter((item) => matchesAssetGalleryTab(item, activeAssetTab))
      .filter((item) => {
        if (assetTimePreset === "all") return true;
        return isTimestampInRange(item.sortTime, assetTimeRange);
      })
      .filter((item) => {
        if (item.type !== "AI 图片") return true;
        if (item.isVideo) return false;
        return Boolean(item.src || item.image || item.imageUrl);
      });
  }, [activeAssetTab, assetTimePreset, assetTimeRange, userAssets]);
  const visibleFavoriteCards = favoriteTabCards.filter((item) => {
    if (assetTimePreset === "all") return true;
    return isTimestampInRange(item.sortTime, assetTimeRange);
  });

  useEffect(() => {
    if (!assetGalleryTabs.includes(activeAssetTab)) setActiveAssetTab("全部");
    try {
      const nextSubTab = window.sessionStorage.getItem(
        "facemini:assets-subtab",
      );
      const nextViewMode = window.sessionStorage.getItem(assetsViewModeStorageKey);
      if (
        nextViewMode === "profile" ||
        nextViewMode === "favorites" ||
        nextViewMode === "gallery"
      ) {
        setViewMode(nextViewMode);
      }
      if (nextSubTab === "transactions" || nextSubTab === "recharge") {
        setActiveTab(nextSubTab);
      }
      if (
        window.sessionStorage.getItem("facemini:open-transactions-modal") === "1"
      ) {
        setShowTransactionsModal(true);
        window.sessionStorage.removeItem("facemini:open-transactions-modal");
      }
      window.sessionStorage.removeItem("facemini:assets-subtab");
      window.sessionStorage.removeItem(assetsViewModeStorageKey);
    } catch {
      // Session storage can be unavailable in restricted browser contexts.
    }
    function handleAssetTabChange(event) {
      const nextTab = event.detail?.tab;
      const nextSubTab = event.detail?.subTab;
      const nextViewMode = event.detail?.viewMode;
      if (assetGalleryTabs.includes(nextTab)) setActiveAssetTab(nextTab);
      if (
        nextViewMode === "profile" ||
        nextViewMode === "favorites" ||
        nextViewMode === "gallery"
      ) {
        setViewMode(nextViewMode);
      }
      if (nextSubTab === "transactions" || nextSubTab === "recharge") {
        setActiveTab(nextSubTab);
      }
      if (event.detail?.openTransactionsModal) {
        setShowTransactionsModal(true);
      }
    }
    window.addEventListener("facemini-assets-tab-change", handleAssetTabChange);
    try {
      window.sessionStorage.removeItem(assetGalleryTabStorageKey);
    } catch {
      // Session storage can be unavailable in restricted browser contexts.
    }
    return () => {
      window.removeEventListener(
        "facemini-assets-tab-change",
        handleAssetTabChange,
      );
    };
  }, []);

  useEffect(() => {
    if (!showTransactionsModal) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") setShowTransactionsModal(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showTransactionsModal]);

  useEffect(() => {
    if (!showAccountSettings) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") setShowAccountSettings(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [showAccountSettings]);

  useEffect(() => {
    if (!showAccountSettings) return undefined;
    setAccountSettingsPanel("list");
    setAccountSettingsTab("built-in");
    setAccountSettingsError("");
    setAccountSettingsSuccess("");
    setAccountSettingsSubmitting(false);
    setSelectedAvatarUrl(
      isBuiltInAvatarUrl(authUser?.avatarUrl)
        ? authUser.avatarUrl
        : defaultUserAvatarSrc,
    );
    setNicknameDraft(profileDisplayName);
    setPhoneDraft({
      oldPhoneCode: "",
      newPhone: "",
      newPhoneCode: "",
      phoneChangeToken: "",
    });
    setPhoneChangeStep("old");
    setPasswordMode("password");
    setPasswordDraft({
      oldPassword: "",
      smsCode: "",
      newPassword: "",
      confirmPassword: "",
    });
    setAvatarZoom(1);
    setAvatarOffset({ x: 0, y: 0 });
  }, [authUser?.avatarUrl, profileDisplayName, showAccountSettings]);

  useEffect(() => {
    if (!avatarUploadSrc) return undefined;
    return () => {
      URL.revokeObjectURL(avatarUploadSrc);
    };
  }, [avatarUploadSrc]);

  useEffect(() => {
    const hasCooldown = Object.values(accountSmsCooldowns).some(
      (value) => Number(value) > 0,
    );
    if (!hasCooldown) return undefined;
    const timer = window.setTimeout(() => {
      setAccountSmsCooldowns((current) =>
        Object.fromEntries(
          Object.entries(current).map(([key, value]) => [
            key,
            Math.max(0, Number(value) - 1),
          ]),
        ),
      );
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [accountSmsCooldowns]);

  useEffect(() => {
    return () => {
      if (accountToastTimerRef.current) {
        window.clearTimeout(accountToastTimerRef.current);
      }
    };
  }, []);

  function selectAssetTab(tab) {
    setActiveAssetTab(tab);
    try {
      window.sessionStorage.setItem(assetGalleryTabStorageKey, tab);
    } catch {
      // Session storage can be unavailable in restricted browser contexts.
    }
  }

  function selectTransactionFilter(nextFilter) {
    setTransactionFilter(nextFilter);
    setTransactionsPage(1);
  }

  function selectAssetTimePreset(nextPreset) {
    setAssetTimePreset(nextPreset);
    if (nextPreset !== "custom") {
      setAssetStartDate("");
      setAssetEndDate("");
    }
    setTransactionsPage(1);
  }

  function updateAssetStartDate(value) {
    setAssetTimePreset("custom");
    setAssetStartDate(value);
    setTransactionsPage(1);
  }

  function updateAssetEndDate(value) {
    setAssetTimePreset("custom");
    setAssetEndDate(value);
    setTransactionsPage(1);
  }

  async function performDeleteAsset(item) {
    if (!item) return;
    if (item.type === "AI 图片") await imageApi.deleteTask(item.rawId);
    if (item.type === "爆款图文") await articleApi.deleteTask(item.rawId);
    if (item.type === "AI 视频") await videoApi.deleteTask(item.rawId);
    if (item.type === "照片数字人") {
      await imageDigitalHumanApi.deleteTask(item.rawId);
    } else if (item.type === "数字人") {
      await digitalHumanApi.deleteTask(item.rawId);
    }
    setPreviewAsset((current) => (current?.id === item.id ? null : current));
    await refreshAssets();
  }

  const { requestDelete: deleteAsset, deleteConfirmDialog } =
    useDeleteConfirmation({
      onConfirm: performDeleteAsset,
      title: "删除资产？",
      message: "该作品会从我的资产中移除，删除后无法恢复。",
    });

  async function toggleAssetFavorite(item) {
    if (!item) return;
    if (!canFavoriteAsset(item)) return;
    if (item.type === "AI 图片") await imageApi.toggleFavorite(item.rawId);
    if (item.type === "爆款图文") await articleApi.toggleFavorite(item.rawId);
    if (item.type === "AI 视频") await videoApi.toggleFavorite(item.rawId);
    if (item.type === "数字人" || item.type === "照片数字人" || item.type === "爆款图文") {
      setUserAssets((current) =>
        current.map((asset) =>
          asset.id === item.id
            ? { ...asset, favorite: !asset.favorite }
            : asset,
        ),
      );
      return;
    }
    await refreshAssets();
  }

  async function togglePreviewAssetFavorite(item) {
    if (!item) return Boolean(item?.favorite);
    if (!canFavoriteAsset(item)) return false;
    const nextValue = !Boolean(item.favorite);
    setPreviewAsset((current) =>
      current?.id === item.id ? { ...current, favorite: nextValue } : current,
    );
    try {
      await toggleAssetFavorite(item);
      return nextValue;
    } catch (error) {
      setPreviewAsset((current) =>
        current?.id === item.id
          ? { ...current, favorite: item.favorite }
          : current,
      );
      throw error;
    }
  }

  function remixAsset(item) {
    const target = item.isVideo ? "video" : "image";
    writePendingGenerationSeed({
      target,
      prompt: item.prompt || item.title,
      notice: "已填入同款提示词",
    });
    setPreviewAsset(null);
    onOpenFeature?.(target);
  }

  function referenceAsset(item) {
    writePendingGenerationSeed({
      target: "image",
      referenceImage: {
        url: item.image || item.src || item.poster,
        originalName: `${item.title || "参考图"}.png`,
        size: 0,
        mimeType: "image/png",
      },
      notice: "已添加为参考图",
    });
    setPreviewAsset(null);
    onOpenFeature?.("image");
  }

  function goToFavoritesView() {
    setViewMode("favorites");
    setFavoriteTab("图片灵感");
    onOpenFeature?.("favorites");
  }

  function goToGalleryView() {
    setViewMode("gallery");
    onOpenFeature?.("assets");
  }

  function goToBillingView({ openTransactions = false } = {}) {
    try {
      if (openTransactions) {
        window.sessionStorage.setItem("facemini:open-transactions-modal", "1");
      }
    } catch {
      // Session storage can be unavailable in restricted browser contexts.
    }
    onOpenFeature?.("billing");
  }

  async function copyInviteLink() {
    if (!profileInviteLink) return;
    let copied = false;
    try {
      await navigator.clipboard.writeText(profileInviteLink);
      copied = true;
    } catch {
      copied = false;
    }
    if (copied) {
      setInviteLinkCopied(true);
      window.setTimeout(() => setInviteLinkCopied(false), 1800);
    }
  }

  function publishAuthUserUpdate(user) {
    if (!user) return;
    window.dispatchEvent(
      new CustomEvent("facemini-auth-user-updated", { detail: { user } }),
    );
  }

  function accountErrorMessage(error, fallback) {
    if (Number(error?.status) === 404) {
      return "账号设置接口未生效，请重启后端服务后重试";
    }
    return error?.message || fallback;
  }

  function showAccountToast(message, type = "error") {
    if (!message) return;
    if (accountToastTimerRef.current) {
      window.clearTimeout(accountToastTimerRef.current);
    }
    setAccountSettingsToast({
      message,
      type,
      id: Date.now(),
    });
    accountToastTimerRef.current = window.setTimeout(() => {
      setAccountSettingsToast(null);
      accountToastTimerRef.current = null;
    }, 2000);
  }

  function openAccountSettingsPanel(panel) {
    setAccountSettingsPanel(panel);
    setAccountSettingsError("");
    setAccountSettingsSuccess("");
    if (panel === "avatar") {
      setSelectedAvatarUrl(
        isBuiltInAvatarUrl(authUser?.avatarUrl)
          ? authUser.avatarUrl
          : defaultUserAvatarSrc,
      );
      setAccountSettingsTab("built-in");
    }
    if (panel === "nickname") {
      setNicknameDraft(profileDisplayName);
    }
    if (panel === "phone") {
      setPhoneDraft({
        oldPhoneCode: "",
        newPhone: "",
        newPhoneCode: "",
        phoneChangeToken: "",
      });
      setPhoneChangeStep("old");
    }
    if (panel === "password") {
      setPasswordMode("password");
      setPasswordDraft({
        oldPassword: "",
        smsCode: "",
        newPassword: "",
        confirmPassword: "",
      });
    }
  }

  async function runAccountTencentCaptcha() {
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

  async function sendAccountSmsCode({ key, scene, phone }) {
    const targetPhone = String(phone || "").trim();
    setAccountSettingsError("");
    setAccountSettingsSuccess("");
    if (!targetPhone) {
      showAccountToast("请输入手机号", "error");
      return;
    }
    setAccountSmsSending(key);
    try {
      const captcha = await runAccountTencentCaptcha();
      if (!captcha) return;
      const result = await authApi.sendSmsCode({
        phone: targetPhone,
        scene,
        captcha,
      });
      setAccountSmsCooldowns((current) => ({ ...current, [key]: 60 }));
      showAccountToast(
        result.debugCode
          ? `短信验证码已发送，调试码：${result.debugCode}`
          : "短信验证码已发送",
        "success",
      );
    } catch (nextError) {
      showAccountToast(accountErrorMessage(nextError, "验证码发送失败"), "error");
    } finally {
      setAccountSmsSending("");
    }
  }

  function updateAvatarUploadSrc(file) {
    if (!file) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type || "")) {
      showAccountToast("请选择 JPG、PNG 或 WebP 图片", "error");
      return;
    }
    setAccountSettingsError("");
    setAccountSettingsSuccess("");
    setAvatarUploadSrc((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setAvatarZoom(1);
    setAvatarOffset({ x: 0, y: 0 });
  }

  function drawCroppedAvatarBlob() {
    return new Promise((resolve, reject) => {
      const image = avatarImageRef.current;
      if (!image?.naturalWidth || !image?.naturalHeight) {
        reject(new Error("请先选择头像图片"));
        return;
      }
      const previewSize = 220;
      const canvasSize = 120;
      const minSide = Math.min(image.naturalWidth, image.naturalHeight);
      const scale = (previewSize / minSide) * avatarZoom;
      const sourceSize = previewSize / scale;
      const centerX =
        image.naturalWidth / 2 - avatarOffset.x / scale;
      const centerY =
        image.naturalHeight / 2 - avatarOffset.y / scale;
      const half = sourceSize / 2;
      const sourceX = Math.min(
        Math.max(0, centerX - half),
        image.naturalWidth - sourceSize,
      );
      const sourceY = Math.min(
        Math.max(0, centerY - half),
        image.naturalHeight - sourceSize,
      );
      const canvas = document.createElement("canvas");
      canvas.width = canvasSize;
      canvas.height = canvasSize;
      const context = canvas.getContext("2d");
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(
        image,
        sourceX,
        sourceY,
        sourceSize,
        sourceSize,
        0,
        0,
        canvasSize,
        canvasSize,
      );
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("头像压缩失败，请重试"));
            return;
          }
          resolve(blob);
        },
        "image/jpeg",
        0.95,
      );
    });
  }

  async function saveBuiltInAvatar() {
    setAccountSettingsError("");
    setAccountSettingsSuccess("");
    setAccountSettingsSubmitting(true);
    try {
      const result = await authApi.selectAvatar({ avatarUrl: selectedAvatarUrl });
      publishAuthUserUpdate(result.user);
      showAccountToast("头像已更新", "success");
    } catch (nextError) {
      showAccountToast(accountErrorMessage(nextError, "头像保存失败"), "error");
    } finally {
      setAccountSettingsSubmitting(false);
    }
  }

  async function saveUploadedAvatar() {
    setAccountSettingsError("");
    setAccountSettingsSuccess("");
    setAccountSettingsSubmitting(true);
    try {
      const blob = await drawCroppedAvatarBlob();
      const file = new File([blob], "avatar.jpg", { type: "image/jpeg" });
      const result = await authApi.uploadAvatar({
        file,
        owner: authUser?.id || "user",
      });
      publishAuthUserUpdate(result.user);
      setSelectedAvatarUrl(result.user?.avatarUrl || selectedAvatarUrl);
      showAccountToast("头像已更新", "success");
    } catch (nextError) {
      showAccountToast(accountErrorMessage(nextError, "头像保存失败"), "error");
    } finally {
      setAccountSettingsSubmitting(false);
    }
  }

  async function saveNickname() {
    setAccountSettingsError("");
    setAccountSettingsSuccess("");
    setAccountSettingsSubmitting(true);
    try {
      const result = await authApi.updateProfile({
        displayName: nicknameDraft,
      });
      publishAuthUserUpdate(result.user);
      showAccountToast("昵称已更新", "success");
    } catch (nextError) {
      showAccountToast(accountErrorMessage(nextError, "昵称保存失败"), "error");
    } finally {
      setAccountSettingsSubmitting(false);
    }
  }

  async function savePhone() {
    setAccountSettingsError("");
    setAccountSettingsSuccess("");
    setAccountSettingsSubmitting(true);
    try {
      const result = await authApi.changePhone(phoneDraft);
      publishAuthUserUpdate(result.user);
      setPhoneDraft({
        oldPhoneCode: "",
        newPhone: "",
        newPhoneCode: "",
        phoneChangeToken: "",
      });
      setPhoneChangeStep("old");
      showAccountToast("手机号已更新", "success");
    } catch (nextError) {
      showAccountToast(accountErrorMessage(nextError, "手机号保存失败"), "error");
    } finally {
      setAccountSettingsSubmitting(false);
    }
  }

  async function verifyOldPhone() {
    setAccountSettingsError("");
    setAccountSettingsSuccess("");
    setAccountSettingsSubmitting(true);
    try {
      const result = await authApi.verifyCurrentPhone({
        oldPhoneCode: phoneDraft.oldPhoneCode,
      });
      setPhoneDraft((current) => ({
        ...current,
        phoneChangeToken: result.phoneChangeToken || "",
      }));
      setPhoneChangeStep("new");
      showAccountToast("当前手机号验证通过", "success");
    } catch (nextError) {
      showAccountToast(accountErrorMessage(nextError, "当前手机号验证失败"), "error");
    } finally {
      setAccountSettingsSubmitting(false);
    }
  }

  async function savePassword() {
    setAccountSettingsError("");
    setAccountSettingsSuccess("");
    if (passwordDraft.newPassword !== passwordDraft.confirmPassword) {
      showAccountToast("两次输入的新密码不一致", "error");
      return;
    }
    setAccountSettingsSubmitting(true);
    try {
      await authApi.changePassword({
        mode: passwordMode,
        oldPassword: passwordDraft.oldPassword,
        code: passwordDraft.smsCode,
        newPassword: passwordDraft.newPassword,
      });
      setPasswordDraft({
        oldPassword: "",
        smsCode: "",
        newPassword: "",
        confirmPassword: "",
      });
      showAccountToast("密码已更新", "success");
    } catch (nextError) {
      showAccountToast(accountErrorMessage(nextError, "密码保存失败"), "error");
    } finally {
      setAccountSettingsSubmitting(false);
    }
  }

  function renderAccountActionRow({
    primaryLabel,
    submittingLabel = "保存中...",
    onPrimary,
    primaryDisabled = false,
  }) {
    return (
      <div className="fm-account-action-row">
        <button
          className="fm-account-secondary"
          type="button"
          onClick={() => openAccountSettingsPanel("list")}
        >
          返回
        </button>
        <button
          className="fm-account-primary"
          type="button"
          disabled={accountSettingsSubmitting || primaryDisabled}
          onClick={onPrimary}
        >
          {accountSettingsSubmitting ? submittingLabel : primaryLabel}
        </button>
      </div>
    );
  }

  function getAccountSettingsTitle() {
    return (
      {
        avatar: "修改头像",
        nickname: "修改昵称",
        phone: "修改手机号",
        password: "修改密码",
      }[accountSettingsPanel] || "账号设置"
    );
  }

  function renderAccountSettingsContent() {
    const builtInAvatars = Array.from(
      { length: 25 },
      (_, index) => `/assets/avatars/${index + 1}.jpg`,
    );
    const currentPhone = authUser?.phone || "";
    const oldPhoneCooldown = Number(accountSmsCooldowns.oldPhone || 0);
    const newPhoneCooldown = Number(accountSmsCooldowns.newPhone || 0);
    const passwordCooldown = Number(accountSmsCooldowns.password || 0);

    if (accountSettingsPanel === "avatar") {
      return (
        <>
          <div className="fm-account-settings-tabs" role="tablist">
            <button
              type="button"
              className={accountSettingsTab === "built-in" ? "is-active" : ""}
              onClick={() => {
                setAccountSettingsTab("built-in");
                setSelectedAvatarUrl((current) =>
                  isBuiltInAvatarUrl(current) ? current : defaultUserAvatarSrc,
                );
              }}
            >
              内置头像
            </button>
            <button
              type="button"
              className={accountSettingsTab === "upload" ? "is-active" : ""}
              onClick={() => setAccountSettingsTab("upload")}
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
                    onClick={() => setSelectedAvatarUrl(avatarUrl)}
                  >
                    <img src={avatarUrl} alt="" />
                  </button>
                ))}
              </div>
              {renderAccountActionRow({
                primaryLabel: "保存头像",
                onPrimary: saveBuiltInAvatar,
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
                    updateAvatarUploadSrc(event.target.files?.[0])
                  }
                />
              </label>
              <div className="fm-avatar-crop-wrap">
                {avatarUploadSrc ? (
                  <div
                    className="fm-avatar-crop-box"
                    onPointerDown={(event) => {
                      event.currentTarget.setPointerCapture(event.pointerId);
                      setAvatarDragState({
                        x: event.clientX,
                        y: event.clientY,
                        offset: avatarOffset,
                      });
                    }}
                    onPointerMove={(event) => {
                      if (!avatarDragState) return;
                      setAvatarOffset({
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
                    onPointerUp={() => setAvatarDragState(null)}
                    onPointerCancel={() => setAvatarDragState(null)}
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
                  onChange={(event) => setAvatarZoom(Number(event.target.value))}
                  disabled={!avatarUploadSrc}
                />
              </label>
              {renderAccountActionRow({
                primaryLabel: "保存裁剪头像",
                onPrimary: saveUploadedAvatar,
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
              onChange={(event) => setNicknameDraft(event.target.value)}
              placeholder="请输入昵称"
            />
          </label>
          {renderAccountActionRow({
            primaryLabel: "保存昵称",
            onPrimary: saveNickname,
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
                      setPhoneDraft((current) => ({
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
                      sendAccountSmsCode({
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
              {renderAccountActionRow({
                primaryLabel: "下一步",
                submittingLabel: "验证中...",
                onPrimary: verifyOldPhone,
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
                    setPhoneDraft((current) => ({
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
                      setPhoneDraft((current) => ({
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
                      sendAccountSmsCode({
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
              {renderAccountActionRow({
                primaryLabel: "保存手机号",
                onPrimary: savePhone,
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
              onClick={() => setPasswordMode("password")}
            >
              原密码
            </button>
            <button
              type="button"
              className={passwordMode === "sms" ? "is-active" : ""}
              onClick={() => setPasswordMode("sms")}
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
                  setPasswordDraft((current) => ({
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
                    setPasswordDraft((current) => ({
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
                    sendAccountSmsCode({
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
                setPasswordDraft((current) => ({
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
                setPasswordDraft((current) => ({
                  ...current,
                  confirmPassword: event.target.value,
                }))
              }
              placeholder="请再次输入新密码"
            />
          </label>
          {renderAccountActionRow({
            primaryLabel: "保存密码",
            onPrimary: savePassword,
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
            onClick={() => openAccountSettingsPanel(panel)}
          >
            <span>{label}</span>
            <ChevronRight size={20} />
          </button>
        ))}
      </div>
    );
  }

  const assetTimeFilterControl = (
    <div className="fm-assets-time-filter" aria-label="时间筛选">
      <div className="fm-assets-time-presets">
        {assetTimeFilterOptions.map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={assetTimePreset === value ? "is-active" : ""}
            onClick={() => selectAssetTimePreset(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {assetTimePreset === "custom" && (
        <div className="fm-assets-date-range">
          <input
            type="date"
            value={assetStartDate}
            max={assetEndDate || undefined}
            onChange={(event) => updateAssetStartDate(event.target.value)}
            aria-label="开始日期"
          />
          <span>至</span>
          <input
            type="date"
            value={assetEndDate}
            min={assetStartDate || undefined}
            onChange={(event) => updateAssetEndDate(event.target.value)}
            aria-label="结束日期"
          />
        </div>
      )}
    </div>
  );

  if (effectiveViewMode === "gallery") {
    return (
      <section className="assets-view-root fm-assets-gallery-view">
        <div className="fm-assets-inner">
          <div className="fm-assets-filter-row">
            <div className="fm-assets-tabs" aria-label="????">
              {assetGalleryTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  className={tab === activeAssetTab ? "is-active" : ""}
                  onClick={() => selectAssetTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
            {assetTimeFilterControl}
          </div>
          {assetGalleryCards.length ? (
            <div className="fm-assets-grid">
              {assetGalleryCards.map((card) => {
                const canFavorite = canFavoriteAsset(card);
                return (
                <article
                  className="fm-asset-card"
                  key={card.id}
                  onClick={() => setPreviewAsset(card)}
                >
                  {card.isVideo && card.video ? (
                    <video
                      src={card.video}
                      poster={card.poster || undefined}
                      muted
                      playsInline
                      preload="metadata"
                    />
                  ) : card.src ? (
                    <img src={card.src} alt={card.title} loading="lazy" />
                  ) : (
                    <div className="fm-asset-placeholder">
                      {card.isVideo ? (
                        <Video size={28} />
                      ) : (
                        <Image size={28} />
                      )}
                    </div>
                  )}
                  <span>{card.type}</span>
                  {card.isVideo && (
                    <button type="button" aria-label="播放">
                      <Play size={16} fill="currentColor" />
                    </button>
                  )}
                  <div className="fm-asset-hover-actions">
                    <button
                      type="button"
                      aria-label="删除"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        deleteAsset(card);
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                    {card.video || card.image ? (
                      <a
                        href={card.video || card.image}
                        download
                        aria-label="下载"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <Download size={16} />
                      </a>
                    ) : (
                      <button type="button" aria-label="下载" disabled>
                        <Download size={16} />
                      </button>
                    )}
                    {canFavorite && (
                      <button
                        type="button"
                        aria-label="收藏"
                        className={card.favorite ? "is-favorite" : ""}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          toggleAssetFavorite(card);
                        }}
                      >
                        <Star
                          size={16}
                          fill={card.favorite ? "currentColor" : "none"}
                        />
                      </button>
                    )}
                  </div>
                </article>
                );
              })}
            </div>
          ) : (
            <div className="fm-assets-empty-state">
              <Wallet size={34} />
              <strong>{isLoading ? "正在加载作品" : "暂无作品"}</strong>
              <p>
                {activeAssetTab === "全部"
                  ? "你的生成作品会显示在这里"
                  : `暂无${activeAssetTab}作品`}
              </p>
            </div>
          )}
        </div>
        <FaceminiInspirationModal
          item={previewAsset}
          onClose={() => setPreviewAsset(null)}
          onRemix={remixAsset}
          onReference={referenceAsset}
          onFavorite={
            canFavoriteAsset(previewAsset) ? togglePreviewAssetFavorite : undefined
          }
        />
        {deleteConfirmDialog}
      </section>
    );
  }

  if (effectiveViewMode === "profile") {
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
                  <small>
                    邀请好友注册，双方各得 {inviteRewardPoints} 积分
                  </small>
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
                  onClick={copyInviteLink}
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
                        onClick={goToFavoritesView}
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
                  <button type="button" onClick={() => goToBillingView()}>
                    充值与明细
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAccountSettings(true)}
                  >
                    账号设置
                  </button>
                  <button type="button" onClick={goToGalleryView}>
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
                setShowAccountSettings(false);
              }
            }}
          >
            {accountSettingsToast && (
              <div
                key={accountSettingsToast.id}
                className={`fm-account-toast is-${accountSettingsToast.type}`}
                role="status"
                aria-live="polite"
              >
                {accountSettingsToast.message}
              </div>
            )}
            <div
              className="fm-account-settings-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="fm-account-settings-title"
            >
              <div className="fm-account-settings-head">
                <h2 id="fm-account-settings-title">{getAccountSettingsTitle()}</h2>
                <button
                  type="button"
                  aria-label="关闭账号设置"
                  onClick={() => setShowAccountSettings(false)}
                >
                  <X size={18} />
                </button>
              </div>
              <div className="fm-account-settings-body">
                {renderAccountSettingsContent()}
              </div>
            </div>
          </div>
        )}
      </section>
    );
  }

  if (effectiveViewMode === "favorites") {
    return (
      <section className="assets-view-root fm-assets-gallery-view fm-favorites-view">
        {isGuest ? (
          <div className="assets-login-panel fm-favorites-login-panel">
            <Star size={32} />
            <strong>登录后查看我的收藏</strong>
            <p>登录后可按模块浏览已收藏的作品</p>
            <button type="button" onClick={() => onOpenAuth("login")}>
              登录
            </button>
          </div>
        ) : (
          <div className="fm-assets-inner fm-favorites-inner">
            <div className="fm-assets-filter-row">
              <div className="fm-assets-tabs fm-favorites-tabs" aria-label="我的收藏分类">
                {favoriteModuleTabs.map((tab) => (
                  <button
                    className={tab === favoriteTab ? "is-active" : ""}
                    key={tab}
                    type="button"
                    onClick={() => setFavoriteTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>
              {assetTimeFilterControl}
            </div>
            {visibleFavoriteCards.length ? (
              <div className="fm-assets-grid fm-favorites-grid">
                {visibleFavoriteCards.map((card) => {
                  const canFavorite = canFavoriteAsset(card);
                  return (
                  <article
                    className="fm-asset-card"
                    key={card.id}
                    onClick={() => setPreviewAsset(card)}
                  >
                    {card.isVideo && card.video ? (
                      <video
                        src={card.video}
                        poster={card.poster || undefined}
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : card.src ? (
                      <img src={card.src} alt={card.title} loading="lazy" />
                    ) : (
                      <div className="fm-asset-placeholder">
                        {card.isVideo ? (
                          <Video size={28} />
                        ) : (
                          <Image size={28} />
                        )}
                      </div>
                    )}
                    <span>{card.type}</span>
                    {card.isVideo && (
                      <button type="button" aria-label="播放">
                        <Play size={16} fill="currentColor" />
                      </button>
                    )}
                    <div className="fm-asset-hover-actions">
                      <button
                        type="button"
                        aria-label="删除"
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          deleteAsset(card);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                      {card.video || card.image ? (
                        <a
                          href={card.video || card.image}
                          download
                          aria-label="下载"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <Download size={16} />
                        </a>
                      ) : (
                        <button type="button" aria-label="下载" disabled>
                          <Download size={16} />
                        </button>
                      )}
                      {canFavorite && (
                        <button
                          type="button"
                          aria-label="收藏"
                          className={card.favorite ? "is-favorite" : ""}
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            toggleAssetFavorite(card);
                          }}
                        >
                          <Star
                            size={16}
                            fill={card.favorite ? "currentColor" : "none"}
                          />
                        </button>
                      )}
                    </div>
                  </article>
                  );
                })}
              </div>
            ) : (
              <div className="fm-assets-empty-state fm-favorites-empty-state">
                <Star size={34} />
                <strong>暂无{favoriteTab}收藏</strong>
                <p>在对应模块收藏作品后，会显示在这里</p>
              </div>
            )}
          </div>
        )}
        <FaceminiInspirationModal
          item={previewAsset}
          onClose={() => setPreviewAsset(null)}
          onRemix={remixAsset}
          onReference={referenceAsset}
        />
        {deleteConfirmDialog}
      </section>
    );
  }

  const displayBalance = Number(
    credits?.balance ?? authUser?.credits ?? 0,
  ).toLocaleString("zh-CN");
  const latestTypeInfo = latestTransaction
    ? txTypeMap[latestTransaction.type] || {
        label: latestTransaction.type,
        color: "#64748b",
      }
    : null;
  const latestIsIncome = latestTransaction
    ? Number(latestTransaction.amount || 0) > 0
    : false;
  const latestDescription = latestTransaction
    ? (() => {
        const memo = String(latestTransaction.memo || "").trim();
        const label = latestTypeInfo?.label || "";
        if (memo && label && !memo.includes(label)) {
          return `${label} · ${memo}`;
        }
        return memo || label || "积分变动";
      })()
    : "";
  const latestTimeLabel = latestTransaction
    ? formatBeijingDateTime(latestTransaction.createdAt)
    : "";

  return (
    <section className="assets-view-root fm-profile-billing-view">
      {isGuest ? (
        <div className="assets-login-panel">
          <Wallet size={32} />
          <strong>登录后进行积分充值</strong>
          <p>登录后可查看积分余额、充值记录和消费明细</p>
          <button type="button" onClick={() => onOpenAuth("login")}>
            登录
          </button>
        </div>
      ) : (
        <>
          <div className="assets-balance-hero fm-billing-balance-hero">
            <div className="assets-balance-info">
              <span>可用积分</span>
              <strong>{displayBalance}</strong>
              <small>1 元 = 100 积分</small>
            </div>
            <div className="assets-balance-actions">
              <button
                type="button"
                onClick={() => setShowTransactionsModal(true)}
              >
                <History size={18} />
                积分明细
              </button>
            </div>
          </div>

          <div className="fm-billing-workspace">
            <div
              className="fm-billing-recharge-card"
              id="fm-billing-recharge"
            >
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
              <div className="fm-billing-pay-row">
                <label className="assets-custom-amount fm-billing-custom-field">
                  <span>自定义金额</span>
                  <div className="fm-billing-custom-control">
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={amount}
                      onChange={(event) => updateAmount(event.target.value)}
                    />
                    <em>{points} 积分</em>
                  </div>
                </label>
                <div className="assets-payment-method-row fm-billing-payment-field">
                  <span>支付方式</span>
                  <div
                    className="assets-payment-methods"
                    aria-label="选择支付方式"
                  >
                    {paymentProviderOptions.map((option) => (
                      <button
                        className={
                          paymentProvider === option.value ? "is-active" : ""
                        }
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
            </div>

            <div className="fm-billing-side">
              <div className="fm-billing-side-card fm-billing-records-card">
                <div className="assets-section-title">
                  <History size={18} />
                  <strong>最近支出</strong>
                </div>
                {latestTransaction ? (
                  <button
                    className="fm-billing-latest-tx"
                    type="button"
                    onClick={() => setShowTransactionsModal(true)}
                  >
                    <div className="fm-billing-latest-main">
                      <div className="fm-billing-latest-head">
                        <span
                          className="fm-billing-latest-type"
                          style={{ color: latestTypeInfo?.color }}
                        >
                          {latestTypeInfo?.label}
                        </span>
                        <strong>{latestDescription}</strong>
                      </div>
                      <small>{latestTimeLabel}</small>
                    </div>
                    <em
                      className="fm-billing-latest-amount"
                      style={{
                        color: latestIsIncome ? "#16a34a" : "#dc2626",
                      }}
                    >
                      {latestIsIncome ? "+" : ""}
                      {latestTransaction.amount} 积分
                    </em>
                  </button>
                ) : (
                  <div className="assets-empty-state">暂无积分明细</div>
                )}
                <button
                  className="fm-billing-side-link"
                  type="button"
                  onClick={() => setShowTransactionsModal(true)}
                >
                  查看全部积分明细
                </button>
              </div>

              <div className="fm-billing-side-card fm-billing-orders-card">
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
                          <span>
                            {paymentProviderText(order.provider)} ·{" "}
                            {order.outTradeNo}
                          </span>
                        </div>
                        <div>
                          <strong>{order.points} 积分</strong>
                          <span>{paymentStatusText(order.status)}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="assets-empty-state">
                      近一个月暂无充值订单
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </>
      )}

      {showTransactionsModal && (
        <div
          className="fm-transactions-modal-backdrop"
          role="presentation"
          onClick={() => setShowTransactionsModal(false)}
        >
          <div
            className="fm-transactions-modal"
            role="dialog"
            aria-modal="true"
            aria-label="积分明细"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="fm-transactions-modal-head">
              <div>
                <strong>积分明细</strong>
                <span>积分流水明细</span>
              </div>
              <button
                className="assets-dialog-close"
                type="button"
                onClick={() => setShowTransactionsModal(false)}
                aria-label="关闭"
              >
                <X size={18} />
              </button>
            </div>
            <CreditTransactionsPanel
              transactions={visibleTransactions}
              transactionsPage={transactionsPage}
              transactionsTotalPages={transactionsTotalPages}
              transactionMeta={transactionMeta}
              transactionFilter={transactionFilter}
              isLoading={isLoading}
              onFilterChange={selectTransactionFilter}
              onPageChange={setTransactionsPage}
              timeFilterControl={assetTimeFilterControl}
            />
          </div>
        </div>
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
              <span>
                {paymentProviderText(
                  paymentDialog.order?.provider || paymentDialog.provider,
                )}
              </span>
              <strong>
                {paymentDialog.order?.status === "PAID"
                  ? "充值成功"
                  : paymentProviderOrderTitle(
                      paymentDialog.order?.provider || paymentDialog.provider,
                    )}
              </strong>
            </div>
            <div className="assets-qr-box">
              {paymentDialog.qrCodeDataUrl ? (
                <img
                  src={paymentDialog.qrCodeDataUrl}
                  alt={`${paymentProviderText(paymentDialog.order?.provider || paymentDialog.provider)}充值二维码`}
                />
              ) : (
                <Loader2 size={28} className="is-spinning" />
              )}
            </div>
            <div className="assets-dialog-meta-card">
              <span>订单号</span>
              <strong>{paymentDialog.order?.outTradeNo}</strong>
              <span>支付金额</span>
              <em>
                ¥ {Number(paymentDialog.order?.totalAmount || 0).toFixed(0)}
              </em>
              <span>到账积分</span>
              <strong>
                {Number(paymentDialog.order?.points || 0).toLocaleString("zh-CN")}{" "}
                积分
              </strong>
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
          <div
            className={`assets-payment-result-dialog tone-${paymentResultDialog.tone}`}
          >
            <button
              className="assets-dialog-close"
              type="button"
              onClick={() => setPaymentResultDialog(null)}
              aria-label="关闭"
            >
              <X size={18} />
            </button>
            <div className="assets-payment-dialog-head">
              <span>
                {paymentProviderText(
                  paymentResultDialog.order?.provider || paymentProvider,
                )}
              </span>
              <strong>{paymentResultDialog.title}</strong>
            </div>
            <p className="assets-result-message">{paymentResultDialog.message}</p>
            {paymentResultDialog.order?.outTradeNo && (
              <div className="assets-dialog-meta-card">
                <span>订单号</span>
                <strong>{paymentResultDialog.order.outTradeNo}</strong>
                <span>支付金额</span>
                <em>
                  ¥ {Number(paymentResultDialog.order.totalAmount || 0).toFixed(0)}
                </em>
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
  const displaySrc = isImageGallery ? card.src || card.image : card.image;
  const displayFallback = isImageGallery ? card.fallbackSrc : undefined;
  const isCompleted = card.status === "completed" && Boolean(displaySrc || card.hdSrc);
  const canUseCompletedActions = !isExample && isCompleted;
  const canRetryOrDelete = !isExample && (isCompleted || isFailed);
  const canPreview = Boolean(
    displaySrc && onPreview && !isProcessing && !isFailed,
  );
  const shouldShowPlaceholder = isProcessing || isFailed || !displaySrc;

  return (
    <article
      className={`result-card status-${card.status} ${isExample ? "is-example" : ""} ${isImageGallery ? "is-image-gallery" : ""} ${isSelected ? "is-selected-result" : ""}`}
      data-image-card-id={card.id}
    >
      <div
        className={`result-preview ${card.grid ? "preview-grid" : ""} ${shouldShowPlaceholder ? "is-placeholder-preview" : ""}`}
        role={canPreview && isImageGallery ? "button" : undefined}
        tabIndex={canPreview && isImageGallery ? 0 : undefined}
        onClick={canPreview && isImageGallery ? () => onPreview(card) : undefined}
        onKeyDown={
          canPreview && isImageGallery
            ? (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onPreview(card);
                }
              }
            : undefined
        }
      >
        {isProcessing && <div className="processing-state">生成中...</div>}
        {isFailed && <div className="failed-state">生成失败</div>}
        {!isProcessing && !isFailed && displaySrc ? (
          card.grid ? (
            <>
              <PreloadImage
                src={displaySrc}
                fallbackSrc={displayFallback}
                alt={card.prompt}
              />
              <PreloadImage
                src="/assets/image/gallery-3.jpg"
                alt={card.prompt}
              />
              <PreloadImage
                src="/assets/image/gallery-4.jpg"
                alt={card.prompt}
              />
              <PreloadImage
                src="/assets/image/gallery-5.jpg"
                alt={card.prompt}
              />
            </>
          ) : (
            <PreloadImage
              src={displaySrc}
              fallbackSrc={displayFallback}
              alt={card.prompt}
            />
          )
        ) : null}
        {card.referenceImageUrl && (
          <span className="result-reference-thumb" title="参考图">
            <img src={card.referenceImageUrl} alt="" />
          </span>
        )}
        {!isProcessing && !isFailed && !card.image && (
          <span className="broken-image-mark" aria-hidden="true" />
        )}
      </div>
      {!isImageGallery && (
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
        <>
            <p>{card.error || card.prompt}</p>
            <div className="card-actions">
              <button
                className={`icon-circle ${card.favorite ? "is-favorite" : ""}`}
                type="button"
                onClick={() => onFavorite(card.id)}
                aria-label="收藏"
                disabled={!canUseCompletedActions}
              >
                <Star size={17} fill={card.favorite ? "#f8d545" : "none"} />
              </button>
              {canUseCompletedActions ? (
                <a
                  className="card-action-link"
                  href={card.hdSrc || card.imageUrl || card.image}
                  download
                >
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
                disabled={!canRetryOrDelete}
              >
                <RefreshCcw size={15} />
                再次生成
              </button>
              <button
                type="button"
                onClick={() => onDelete(card.id)}
                disabled={!canRetryOrDelete}
              >
                <Trash2 size={15} />
                删除
              </button>
            </div>
          </>
      </div>
      )}
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

function ReferenceMediaSlot({ image, video, isUploading, onRemoveImage, onRemoveVideo }) {
  const media = image || video;
  const isVideo = Boolean(video);
  if (!media && !isUploading) return null;

  if (isUploading) {
    return (
      <div className="image-reference-slot">
        <div className="image-reference-card is-uploading">
          <span className="image-reference-preview">
            <Loader2 size={16} className="is-spinning" />
          </span>
          <span className="image-reference-meta">
            <strong>参考素材上传中</strong>
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
          {isVideo ? (
            <Film size={16} />
          ) : media?.url ? (
            <img src={media.url} alt="" />
          ) : (
            <Image size={16} />
          )}
        </span>
        <span className="image-reference-meta">
          <strong title={media?.originalName || (isVideo ? "参考视频" : "参考图")}>
            {media?.originalName || (isVideo ? "参考视频" : "参考图")}
          </strong>
          <small>{isVideo ? "视频参考素材" : formatReferenceImageSize(media?.size)}</small>
        </span>
        <button
          type="button"
          onClick={isVideo ? onRemoveVideo : onRemoveImage}
          aria-label={isVideo ? "移除参考视频" : "移除参考图"}
        >
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
  onSeedApplied,
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
  const appliedSeedIdRef = useRef(null);

  function showToast(message) {
    setToastMessage(message);
  }

  useEffect(() => {
    if (!seed) return;
    const seedId = seed.id || "__seed_without_id__";
    if (appliedSeedIdRef.current === seedId) return;
    appliedSeedIdRef.current = seedId;
    setPrompt(seed.prompt || "");
    setReferenceImage(seed.referenceImage?.url ? seed.referenceImage : null);
    if (
      seed.model &&
      options.models.some((item) => item.value === seed.model)
    ) {
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
    if (seed.notice) {
      showToast(seed.notice);
    }
    onSeedApplied?.(seed);
  }, [onSeedApplied, options.models, options.qualities, options.ratios, seed]);

  useEffect(() => {
    if (previousResetSignalRef.current === resetSignal) return;
    previousResetSignalRef.current = resetSignal;
    if (seed?.prompt || seed?.referenceImage?.url) return;
    setPrompt("");
    setReferenceImage(null);
    setToastMessage("");
  }, [resetSignal, seed]);

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
      onPointerDown={onFocus}
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

function ComposerBarPlaceholder({
  placement = "workbench",
  className = "image-composer-shell",
}) {
  return (
    <div
      className={`sowa-composer ${className} image-composer-placeholder is-${placement}`}
      aria-hidden="true"
    >
      <div className="image-composer-placeholder-dialog">
        <span className="image-composer-placeholder-line is-main" />
        <span className="image-composer-placeholder-line" />
      </div>
    </div>
  );
}

function getImageTaskResults(task) {
  if (Array.isArray(task?.images) && task.images.length) {
    return task.images.filter(Boolean);
  }
  const primary = task?.imageUrl || task?.image;
  return primary ? [primary] : [];
}

function ImageWorkbenchRequestBubble({ prompt }) {
  return (
    <div className="image-workbench-prompt">
      <p>{prompt}</p>
    </div>
  );
}

function ImageWorkbenchGeneratingStatus() {
  return (
    <div
      className="image-workbench-generation-status"
      role="status"
      aria-live="polite"
    >
      <ImageGeneratingSpinner size={18} />
      <span>智能创意中...</span>
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
  onSeedApplied,
  onSubmit,
  onSelect,
  onNewContext,
  onPreview,
  onDownload,
  onReference,
  onRegenerate,
}) {
  const contextRef = useRef(null);
  const wasSubmittingRef = useRef(false);
  const contextTask = activeTask || selectedTask;
  const threadTasks = contextTasks?.length
    ? contextTasks
    : contextTask
      ? [contextTask]
      : [];
  const threadSignature = threadTasks
    .map((task) => `${task.id}:${task.status}:${task.image || ""}`)
    .join("|");
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
    const shouldFollowGeneration =
      isSubmitting || submitError || wasSubmittingRef.current;
    if (shouldFollowGeneration) {
      scrollContextToLatest(isSubmitting ? "smooth" : "auto");
    }
    wasSubmittingRef.current = isSubmitting;
  }, [
    isSubmitting,
    scrollContextToLatest,
    submitError,
    threadSignature,
  ]);

  function getImageHistoryTime(task, thread) {
    const rawValue =
      task?.createdAt ||
      task?.created_at ||
      task?.updatedAt ||
      task?.updated_at ||
      thread?.createdAt ||
      thread?.created_at;
    return rawValue ? formatBeijingHistoryTime(rawValue) : task?.time || "";
  }

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
                  <ImageWorkbenchRequestBubble prompt={task.prompt} />
                )}

                {taskProcessing && <ImageWorkbenchGeneratingStatus />}

                {taskFailed && (
                  <div
                    className="image-workbench-status is-failed"
                    role="status"
                  >
                    <CircleAlert size={20} />
                    <strong>生成失败</strong>
                    <p>{task.error || "图片生成遇到问题，请稍后重试。"}</p>
                    <button type="button" onClick={() => onRegenerate(task.id)}>
                      <RefreshCcw size={15} />
                      再次生成
                    </button>
                  </div>
                )}

                {taskCompleted && (
                  <div className="image-workbench-result">
                    <div
                      className={`image-workbench-result-grid ${getImageTaskResults(task).length > 1 ? "is-multi" : ""}`}
                    >
                      {getImageTaskResults(task).map((imageSrc, index) => (
                        <button
                          className="image-workbench-result-image"
                          key={`${task.id}-${index}`}
                          type="button"
                          onClick={() => onPreview(task)}
                          aria-label="查看生成图片"
                        >
                          <img src={imageSrc} alt={task.prompt} />
                          <span className="image-workbench-result-badge">
                            AI生成
                          </span>
                        </button>
                      ))}
                    </div>
                    <div className="image-workbench-actions">
                      <a
                        href={task.imageUrl || task.image}
                        download
                        onClick={() => onDownload?.(task)}
                      >
                        <Download size={15} />
                        下载
                      </a>
                      <button type="button" onClick={() => onReference(task)}>
                        <Copy size={15} />
                        引用
                      </button>
                      <button
                        type="button"
                        onClick={() => onRegenerate(task.id)}
                      >
                        <RefreshCcw size={15} />
                        再次生成
                      </button>
                    </div>
                    <p className="image-workbench-result-note">
                      以上内容由 AI 生成，本次消耗 {task.price || "积分"}
                    </p>
                  </div>
                )}
              </article>
            );
          })}

          {isSubmitting &&
            activePrompt &&
            !threadTasks.some((task) => task.prompt === activePrompt) && (
              <article className="image-workbench-thread-item is-pending">
                <ImageWorkbenchRequestBubble prompt={activePrompt} />
                <ImageWorkbenchGeneratingStatus />
              </article>
            )}

          {submitError && !contextTask && (
            <div className="image-workbench-status is-failed" role="status">
              <CircleAlert size={26} />
              <strong>这次没有生成成功</strong>
              <p>{submitError || "图片生成遇到问题，请稍后重试。"}</p>
            </div>
          )}
        </div>

        {options.models.length > 0 ? (
          <ComposerBar
            key={composerSeed?.id || "image-workbench-composer"}
            options={options}
            onSubmit={onSubmit}
            placement="workbench"
            collapsed={false}
            seed={composerSeed}
            resetSignal={resetSignal}
            onSeedApplied={onSeedApplied}
          />
        ) : (
          <ComposerBarPlaceholder />
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
              const displayTime = getImageHistoryTime(task, thread);
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
                      <ImageGeneratingSpinner size={24} />
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
                            ? `${thread.count} 条上下文 · ${displayTime || "已完成"}`
                            : displayTime || task.ratio || "已完成"}
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

function normalizeImageOptions(value) {
  return {
    ...emptyOptions,
    ...(value && typeof value === "object" && !Array.isArray(value) ? value : {}),
    models: Array.isArray(value?.models) ? value.models : [],
    ratios: Array.isArray(value?.ratios) ? value.ratios : [],
    qualities: Array.isArray(value?.qualities) ? value.qualities : [],
    counts: Array.isArray(value?.counts) ? value.counts : [],
  };
}

function normalizeTaskList(value) {
  if (Array.isArray(value)) return value;
  if (Array.isArray(value?.tasks)) return value.tasks;
  if (Array.isArray(value?.items)) return value.items;
  if (Array.isArray(value?.data)) return value.data;
  return [];
}

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
    const latestTask =
      [...threadTasks]
        .reverse()
        .find((item) => item.image || item.status !== "completed") ||
      threadTasks[threadTasks.length - 1];
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

function ImageGeneratingSpinner({ size = 32, className = "" }) {
  return (
    <img
      className={["image-generating-spinner", className].filter(Boolean).join(" ")}
      src="/assets/svg/脸谱facemini定(1).svg"
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      style={{ width: size, height: size }}
    />
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
              <ImageGeneratingSpinner size={28} />
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
        <ImageGeneratingSpinner size={48} />
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
              <img src={task.imageUrl || task.image} alt={task.prompt} />
            </button>
            <div className="chat-result-actions">
              <a href={task.imageUrl || task.image} download>
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
  const previewUrl = task?.imageUrl || task?.image;
  if (!previewUrl) return null;

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
        <img src={previewUrl} alt={task.prompt} />
      </div>
      <div className="preview-drawer-actions">
        <a href={previewUrl} download>
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
  onFavorite,
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [task?.id]);

  const previewUrl = task?.hdSrc || task?.imageUrl || task?.image;
  const fallbackUrl = task?.hdFallbackSrc;

  useEffect(() => {
    if (!previewUrl) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, previewUrl]);

  if (!previewUrl) return null;

  async function copyPrompt() {
    await onCopyPrompt?.(task);
    setCopied(true);
  }

  return (
    <FaceminiInspirationModal
      item={{
        id: task.id,
        title: task.title || "AI 图片创作",
        category: "图片灵感",
        prompt: task.prompt,
        image: previewUrl,
        imageUrl: previewUrl,
        hdSrc: previewUrl,
        hdFallbackSrc: fallbackUrl,
        ratio: task.ratio,
        model: task.model || task.modelKey || "Kling Image",
        material: "高清原图",
        favorite: Boolean(task.favorite),
      }}
      onClose={onClose}
      onRemix={() => onRemix?.(task)}
      onReference={() => onReference?.(task)}
      onFavorite={onFavorite ? () => onFavorite(task) : undefined}
      onCopyPrompt={copyPrompt}
      copied={copied}
    />
  );
}

function FaceminiInspirationModal({
  item,
  onClose,
  onRemix,
  onReference,
  onFavorite,
  onCopyPrompt,
  copied = false,
}) {
  const [activeSrc, setActiveSrc] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);

  useEffect(() => {
    if (!item) return undefined;
    function handleKeyDown(event) {
      if (event.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [item, onClose]);

  useEffect(() => {
    setActiveSrc(null);
    setIsFavorite(Boolean(item?.favorite) || isInspirationFavorite(item));
  }, [item?.id]);

  if (!item) return null;

  const isVideo = Boolean(
    item.isVideo || item.mediaType === "video" || item.video || item.videoSrc || item.videoUrl,
  );
  const primarySrc =
    item.videoSrc ||
    item.hdSrc ||
    item.imageUrl ||
    item.image ||
    item.poster ||
    item.thumbnail ||
    item.src;
  const fallbackSrc = item.hdFallbackSrc || item.fallbackSrc;
  const imageSrc = activeSrc || primarySrc;
  const videoSrc =
    item.videoSrc || item.video || item.videoUrl || item.preview || item.source;

  return (
    <div
      className="fm-detail-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`${item.title || "灵感详情"}详情`}
    >
      <button
        className="fm-detail-modal-shade"
        type="button"
        onClick={onClose}
        aria-label="关闭详情"
      />
      <section className="fm-detail-modal">
        <div className="fm-detail-media">
          {isVideo && videoSrc ? (
            <video
              src={videoSrc}
              poster={item.poster || imageSrc}
              controls
              playsInline
              autoPlay
              muted
            />
          ) : (
            <img
              src={imageSrc}
              alt={item.title || "灵感图片"}
              onError={() => {
                if (activeSrc !== fallbackSrc && fallbackSrc) {
                  setActiveSrc(fallbackSrc);
                }
              }}
            />
          )}
        </div>
        <aside className="fm-detail-info">
          <button
            className="fm-detail-close"
            type="button"
            onClick={onClose}
            aria-label="关闭详情"
          >
            <X size={20} />
          </button>
          <p className="fm-detail-eyebrow">
            {item.category || item.type || "图片灵感"}
          </p>
          <h2>{item.title || "灵感详情"}</h2>
          <label>提示词</label>
          <p className="fm-detail-prompt">{item.prompt || "暂无提示词"}</p>
          {onCopyPrompt && (
            <button
              className="fm-detail-copy"
              type="button"
              onClick={onCopyPrompt}
            >
              <Copy size={15} />
              {copied ? "已复制" : "复制提示词"}
            </button>
          )}
          <dl>
            <div>
              <dt>比例</dt>
              <dd>{item.ratio || (isVideo ? "16:9" : "4:5")}</dd>
            </div>
            <div>
              <dt>推荐模型</dt>
              <dd>{item.model || (isVideo ? "Kling Video" : "Kling Image")}</dd>
            </div>
            <div>
              <dt>素材</dt>
              <dd>{item.material || (isVideo ? "视频封面" : "高清原图")}</dd>
            </div>
          </dl>
          <div className="fm-detail-actions">
            <button
              className="is-primary"
              type="button"
              onClick={() => onRemix?.(item)}
            >
              <Sparkles size={16} />
              生成同款
            </button>
            <button
              className="is-secondary"
              type="button"
              onClick={() => onReference?.(item)}
            >
              <Image size={16} />
              用作参考
            </button>
            {onFavorite && (
              <button
                className={`is-favorite ${isFavorite ? "is-active" : ""}`}
                type="button"
                onClick={async () => {
                  try {
                    const nextValue = await onFavorite(item);
                    setIsFavorite(Boolean(nextValue));
                  } catch {
                    // Keep the current state when the favorite action fails.
                  }
                }}
                aria-label={isFavorite ? "取消收藏" : "收藏"}
                title={isFavorite ? "取消收藏" : "收藏"}
              >
                <Star size={17} fill={isFavorite ? "currentColor" : "none"} />
              </button>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}

function PreloadImage({ src, fallbackSrc, alt }) {
  const [activeSrc, setActiveSrc] = useState(src);
  const [loadState, setLoadState] = useState(src ? "loading" : "empty");

  useEffect(() => {
    setActiveSrc(src);
    if (!src) {
      setLoadState("empty");
      return undefined;
    }

    let cancelled = false;
    let retryTimer;
    setLoadState("loading");

    const loadImage = (url) => {
      const probe = new window.Image();
      probe.decoding = "async";
      probe.onload = () => {
        if (!cancelled) {
          setActiveSrc(url);
          setLoadState("ready");
        }
      };
      probe.onerror = () => {
        if (cancelled) return;
        if (url === src && fallbackSrc && fallbackSrc !== src) {
          loadImage(fallbackSrc);
        } else {
          setLoadState("loading");
          retryTimer = window.setTimeout(() => loadImage(url), 2500);
        }
      };
      probe.src = url;
    };

    loadImage(src);

    return () => {
      cancelled = true;
      if (retryTimer) window.clearTimeout(retryTimer);
    };
  }, [src, fallbackSrc]);

  if (!activeSrc) return null;

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
        src={activeSrc}
        alt={alt}
        onLoad={() => setLoadState("ready")}
        onError={() => {
          if (activeSrc === src && fallbackSrc && fallbackSrc !== src) {
            setActiveSrc(fallbackSrc);
          } else {
            setLoadState("failed");
          }
        }}
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
          const isCompleted = card.status === "completed" && Boolean(card.image);
          const canUseCompletedActions = isCompleted;
          const canRetryOrDelete = isCompleted || isFailed;

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
                  <span>{formatBeijingDateTime(card.createdAt || card.created_at || card.time) || card.time}</span>
                </div>
                <div className="history-actions">
                  <button
                    type="button"
                    onClick={() => onFavorite(card.id)}
                    aria-label="收藏"
                    disabled={!canUseCompletedActions}
                  >
                    <Star size={15} fill={card.favorite ? "#f8d545" : "none"} />
                  </button>
                  {canUseCompletedActions ? (
                    <a
                      href={card.imageUrl || card.image}
                      download
                      aria-label="下载图片"
                    >
                      <Download size={15} />
                    </a>
                  ) : (
                    <button type="button" aria-label="下载图片" disabled>
                      <Download size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onRegenerate(card.id)}
                    aria-label="再次生成"
                    disabled={!canRetryOrDelete}
                  >
                    <RefreshCcw size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(card.id)}
                    aria-label="删除"
                    disabled={!canRetryOrDelete}
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
  launchSeed = null,
  onLaunchSeedConsumed,
}) {
  const cachedSessionRef = useRef(null);
  if (!cachedSessionRef.current) {
    cachedSessionRef.current = readImageGenerationSession();
  }
  const cachedSession = cachedSessionRef.current;
  const initialPendingImageSeed = peekPendingGenerationSeed("image");
  const [filter, setFilter] = useState(() =>
    initialPendingImageSeed ? "recent" : "inspiration",
  );
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
  const [composerSeed, setComposerSeed] = useState(() =>
    buildImageComposerSeedFromPending(initialPendingImageSeed),
  );
  const [isComposerPastThreshold, setIsComposerPastThreshold] = useState(
    () => window.scrollY > 240,
  );
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [isInspirationGalleryReady, setIsInspirationGalleryReady] =
    useState(false);
  const [imageInspirationCategory, setImageInspirationCategory] =
    useState("all");
  const [favoriteInspirationIds, setFavoriteInspirationIds] = useState(() =>
    readInspirationFavoriteIds(),
  );
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

  const applyComposerSeedApplied = useCallback(() => {
    clearPendingGenerationSeed("image");
    onLaunchSeedConsumed?.();
  }, [onLaunchSeedConsumed]);

  const applyImageComposerSeed = useCallback((rawSeed) => {
    const nextSeed = rawSeed?.id
      ? rawSeed
      : buildImageComposerSeedFromPending(rawSeed);
    if (!nextSeed?.prompt && !nextSeed?.referenceImage?.url) return;
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
    setComposerSeed(nextSeed);
  }, []);

  useEffect(() => {
    if (!isActive) return;
    if (launchSeed) {
      applyImageComposerSeed({
        id: `launch-image-${launchSeed.createdAt || Date.now()}`,
        prompt: launchSeed.prompt || "",
        referenceImage: launchSeed.referenceImage || null,
        model: launchSeed.model || null,
        ratio: launchSeed.ratio || null,
        quality: launchSeed.quality || null,
        notice: launchSeed.notice || "",
      });
      return;
    }
    const pendingSeed = peekPendingGenerationSeed("image");
    if (pendingSeed) applyImageComposerSeed(pendingSeed);
  }, [applyImageComposerSeed, isActive, launchSeed]);

  // 常驻挂载：切换侧栏其它模块时不卸载，避免生成中状态与列表缓存丢失
  useEffect(() => {
    let mounted = true;
    function applyTaskList(value, runningValue = value) {
      if (!mounted) return;
      const tasks = normalizeTaskList(value);
      const runningTasks = normalizeTaskList(runningValue);
      const visibleTasks = tasks.filter((task) => !isArticleImageTask(task));
      const nextSignature = taskStatusSignature(visibleTasks);
      const didStatusChange =
        taskStatusSignatureRef.current &&
        taskStatusSignatureRef.current !== nextSignature;
      taskStatusSignatureRef.current = nextSignature;
      imageApi.setHasRunningTasks(hasRunningTasks(runningTasks));
      setCards(visibleTasks);
      if (didStatusChange) {
        imageApi
          .refreshCredits()
          .then(
            (creditsValue) =>
              mounted && applyCreditsUpdate(setCredits, creditsValue),
          )
          .catch(() => {});
      }
    }
    imageApi
      .getModels()
      .then((value) => mounted && setOptions(normalizeImageOptions(value)))
      .catch(() => mounted && setOptions(emptyOptions));
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
      const next =
        filter === "inspiration" &&
        (isComposerPastThreshold ? window.scrollY > 300 : window.scrollY > 360);
      setIsComposerPastThreshold(next);
      if (next) {
        setIsComposerFocused(false);
      }
    }

    syncComposerThreshold();
    window.addEventListener("scroll", syncComposerThreshold, { passive: true });
    return () => window.removeEventListener("scroll", syncComposerThreshold);
  }, [filter, isComposerPastThreshold]);

  useEffect(() => {
    if (filter !== "inspiration") return;
    setIsComposerFocused(false);
    setIsComposerPastThreshold(false);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0 });
    });
  }, [filter]);

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

  const previousImageResetSignalRef = useRef(resetSignal);
  useEffect(() => {
    if (isActive && !wasActiveRef.current && filter === "recent") {
      if (
        !hasPendingGenerationSeed("image") &&
        !launchSeed?.prompt &&
        !launchSeed?.referenceImage?.url &&
        !composerSeed?.prompt &&
        !composerSeed?.referenceImage?.url
      ) {
        startNewImageContext();
      }
    }
    wasActiveRef.current = isActive;
  }, [composerSeed, filter, isActive, launchSeed]);

  useEffect(() => {
    if (previousImageResetSignalRef.current === resetSignal) return;
    previousImageResetSignalRef.current = resetSignal;
    if (hasPendingGenerationSeed("image")) return;
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
  }, [filter, resetSignal]);

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
  const filteredExampleImages = useMemo(() => {
    if (imageInspirationCategory === "all") return exampleImages;
    return exampleImages.filter(
      (item) => item.categoryId === imageInspirationCategory,
    );
  }, [imageInspirationCategory]);
  const imageExampleCards = useMemo(
    () =>
      filteredExampleImages.map((item, index) => {
        const id = `image-gen-${item.categoryId || "all"}-${item.file || index}`;
        return {
          id,
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
          src: item.src,
          fallbackSrc: item.fallbackSrc,
          hdSrc: item.hdSrc,
          hdFallbackSrc: item.hdFallbackSrc,
          aspect: item.aspect,
          favorite: favoriteInspirationIds.has(id),
        };
      }),
    [favoriteInspirationIds, filteredExampleImages],
  );
  const favoriteImageExampleCards = useMemo(
    () =>
      exampleImages
        .map((item, index) => {
          const id = `image-gen-${item.categoryId || "all"}-${item.file || index}`;
          return {
            id,
            status: "completed",
            model: item.model,
            ratio: item.ratio,
            quality: item.quality,
            count: 1,
            time: "收藏灵感",
            price: item.price,
            title: item.label,
            prompt: item.prompt,
            description: item.description,
            style: item.style,
            mood: item.mood,
            tags: item.tags,
            image: item.src,
            src: item.src,
            fallbackSrc: item.fallbackSrc,
            hdSrc: item.hdSrc,
            hdFallbackSrc: item.hdFallbackSrc,
            aspect: item.aspect,
            favorite: true,
          };
        })
        .filter((card) => favoriteInspirationIds.has(card.id)),
    [favoriteInspirationIds],
  );
  const visibleImageExampleCards = useIncrementalItems(
    imageExampleCards,
    `image-${imageInspirationCategory}-${imageExampleCards.length}`,
    { enabled: filter === "inspiration" },
  );
  const arrangedImageExampleCards = useMemo(
    () => arrangeInspirationCardsByBatch(visibleImageExampleCards.items, 6),
    [visibleImageExampleCards.items],
  );
  const galleryItems = useMemo(() => {
    if (filter === "inspiration") {
      return arrangedImageExampleCards.map((card) => ({
        card,
        isExample: true,
      }));
    }

    if (filter === "favorite") {
      return [
        ...favoriteImageExampleCards.map((card) => ({ card, isExample: true })),
        ...cards.map((card) => ({ card, isExample: false })),
      ];
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
    favoriteImageExampleCards,
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
  }, [
    activePrompt,
    activeThreadId,
    contextTaskIds,
    isSubmitting,
    selectedTaskId,
    submittedTaskId,
  ]);

  useEffect(() => {
    function syncFavoriteIds() {
      setFavoriteInspirationIds(readInspirationFavoriteIds());
    }
    window.addEventListener(inspirationFavoritesChangedEvent, syncFavoriteIds);
    return () =>
      window.removeEventListener(
        inspirationFavoritesChangedEvent,
        syncFavoriteIds,
      );
  }, []);

  useEffect(() => {
    if (!isLoggedInUser(authUser)) return;
    loadInspirationFavoriteIds().then(setFavoriteInspirationIds).catch(() => {});
  }, [authUser?.id]);

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
  const showComposer =
    Array.isArray(options.models) &&
    options.models.length > 0 &&
    filter === "inspiration";
  const isComposerSticky =
    filter === "recent" ||
    (filter === "inspiration" && isComposerPastThreshold);
  const isComposerCollapsed = isComposerSticky && !isComposerFocused;
  const composerPlacement = isComposerSticky ? "sticky" : "inline";
  const canRenderImageGallery =
    filter !== "inspiration" || isInspirationGalleryReady;

  useEffect(() => {
    if (filter !== "inspiration") {
      setIsInspirationGalleryReady(true);
      return undefined;
    }

    setIsInspirationGalleryReady(false);
    let secondFrameId = 0;
    const firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        setIsInspirationGalleryReady(true);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrameId);
      if (secondFrameId) window.cancelAnimationFrame(secondFrameId);
    };
  }, [filter]);

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

  async function performDeleteTask(id) {
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

  const { requestDelete: deleteTask, deleteConfirmDialog } =
    useDeleteConfirmation({
      onConfirm: performDeleteTask,
      title: "删除历史记录？",
      message: "该生成记录会被移除，删除后无法恢复。",
    });

  async function toggleFavorite(id) {
    await imageApi.toggleFavorite(id);
  }

  async function togglePreviewFavorite(task) {
    const id = String(task?.id || "");
    if (id.startsWith("image-gen-")) {
      if (!isLoggedInUser(authUser)) {
        requestLoginForGeneration();
        throw new Error("请先登录");
      }
      const nextValue = await toggleInspirationFavoriteId(id);
      const nextIds = readInspirationFavoriteIds();
      setFavoriteInspirationIds(nextIds);
      setPreviewTask((current) =>
        current && current.id === task.id
          ? { ...current, favorite: nextValue }
          : current,
      );
      return nextValue;
    }

    await toggleFavorite(task.id);
    const nextValue = !task.favorite;
    setPreviewTask((current) =>
      current && current.id === task.id
        ? { ...current, favorite: nextValue }
        : current,
    );
    return nextValue;
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

  const { requestRegenerate, regenerateConfirmDialog } =
    useRegenerateConfirmation({
      onConfirm: regenerateTask,
    });

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
    const nextThreadId =
      task.threadId || activeThreadId || createImageThreadId();
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
        url: task.imageUrl || task.image,
        originalName: "引用结果图",
        size: 0,
        mimeType: "image/png",
      },
      notice: "",
    });
  }

  return (
    <section
      className={`image-gen-view ${filter === "recent" ? "is-generation-workbench" : ""} ${hasCompletedNotice ? "has-completed-notice" : ""}`}
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
      {filter === "inspiration" && (
        <>
          {isComposerSticky && (
            <div
              className="composer-sticky-spacer image-composer-sticky-spacer"
              aria-hidden="true"
            />
          )}
          {!isComposerSticky && (
            <div className="image-composer-heading">哇！大师，来做图啦</div>
          )}
          {showComposer ? (
            <ComposerBar
              key={composerSeed?.id || "image-inspiration-composer"}
              options={options}
              onSubmit={createTask}
              placement={composerPlacement}
              collapsed={isComposerCollapsed}
              shellRef={imageComposerRef}
              onFocus={() => setIsComposerFocused(true)}
              resetSignal={resetSignal}
              seed={composerSeed}
              onSeedApplied={applyComposerSeedApplied}
            />
          ) : (
            <ComposerBarPlaceholder placement={composerPlacement} />
          )}
          <div
            className="image-inspiration-category-tabs"
            role="tablist"
            aria-label="图片灵感分类"
          >
            {imageInspirationCategoryTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                className={
                  imageInspirationCategory === tab.id ? "is-active" : ""
                }
                onClick={() => setImageInspirationCategory(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
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
          onSeedApplied={applyComposerSeedApplied}
          onSelect={(id) => {
            selectImageThread(id);
          }}
          onNewContext={startNewImageContext}
          onPreview={(task) => setPreviewTask(task)}
          onReference={referenceTask}
          onRegenerate={requestRegenerate}
        />
      ) : canRenderImageGallery && galleryItems.length ? (
        <>
          <WaterfallGrid
            className={`image-results-feed ${hasCompletedNotice ? "has-completed-notice" : ""}`}
            gap={6}
            maxColumns={6}
            reductionThreshold={4}
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
                onRegenerate={isExample ? () => {} : requestRegenerate}
              />
            )}
          />
          <IncrementalLoadMoreIndicator
            active={
              filter === "inspiration" &&
              visibleImageExampleCards.isLoadingMore &&
              visibleImageExampleCards.hasMore
            }
          />
        </>
      ) : canRenderImageGallery && !hasActiveGeneration ? (
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
        onFavorite={togglePreviewFavorite}
      />
      {deleteConfirmDialog}
      {regenerateConfirmDialog}
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

const videoInspirationCategoryTabs = [
  { id: "all", label: "全部" },
  { id: "tvc", label: "TVC 广告", folder: "TVC-gg" },
  { id: "live-commerce", label: "AI 真人带货", folder: "AI-zrdh" },
  { id: "live-drama", label: "AI 真人短剧", folder: "AI-zrdj" },
  { id: "comic-drama", label: "AI 漫剧", folder: "AI-mj" },
  { id: "creative", label: "AI 创作视频", folder: "AI-czsp" },
  { id: "promo", label: "宣传类视频", folder: "XCL-sp" },
];

const videoInspirationFolderSlugs = {
  "TVC-gg": [
    "axiom-visual-concept-ad",
    "camera",
    "car-ad",
    "car-visual-concept-ad",
    "chagee-visual-concept-ad",
    "massage-device",
    "medical-ultrasound-device-1",
    "smartphone-4",
  ],
  "AI-zrdh": ["cola", "golden-pomelo-1", "golden-pomelo-2"],
  "AI-zrdj": [
    "boxing-king-returns",
    "costume-drama",
    "fallen-god",
    "former-king",
    "tenth-freezer",
  ],
  "AI-mj": [
    "ai-3d-animation",
    "ai-3d-bleach-vs-naruto",
    "isekai-demon-king",
    "tianmen-weihe",
    "yongyeti",
  ],
  "AI-czsp": [
    "3a-game-style-remake-1",
    "3a-game-style-remake-2",
    "live-action-yuelin-qiji-remake",
    "mecha-transformation-1",
    "mecha-transformation-2",
    "mecha-transformation-3",
    "mecha-transformation-4",
    "yuelin-qiji-3d-remake",
    "zhang-xue-motorcycle-remake",
  ],
  "XCL-sp": ["wuhan-cherry-blossom-season"],
};

const videoInspirationMetadata = [
  [
    "3a-game-style-remake-1",
    "3A 游戏风格重制",
    "电影级游戏镜头，英雄角色穿越废墟战场，镜头低角度推进，粒子火花与体积光交织，动作张力强。",
  ],
  [
    "3a-game-style-remake-2",
    "3A 游戏动作场景",
    "高规格游戏宣传片风格，主角在未来城市中高速奔跑，镜头跟随切换，霓虹灯、烟雾和金属反光细节丰富。",
  ],
  [
    "ai-3d-animation",
    "AI 3D 动画",
    "高质量 3D 动画短片，抽象能量体在深色空间中旋转展开，光线丝带形成流动轨迹，镜头平滑推进。",
  ],
  [
    "ai-3d-bleach-vs-naruto",
    "热血动漫对战",
    "日漫热血战斗风格，两名角色在破碎场景中高速交锋，刀光、冲击波、烟尘和夸张动作定格。",
  ],
  [
    "axiom-visual-concept-ad",
    "科技概念广告",
    "高端科技产品概念广告，黑色背景中产品以金属质感旋转出现，光带扫过边缘，节奏高级克制。",
  ],
  [
    "boxing-king-returns",
    "拳王归来",
    "拳击冠军从阴影中走向擂台，观众欢呼，聚光灯切换，汗水飞溅，慢动作表现力量感。",
  ],
  [
    "camera",
    "相机产品片",
    "专业相机产品广告，镜头结构分层展开，玻璃与金属材质反射清晰，黑金色调，商业质感。",
  ],
  [
    "car-ad",
    "汽车广告",
    "高端汽车在城市夜景道路疾驰，雨后地面反射霓虹，镜头从轮毂推至车身流线，速度感强。",
  ],
  [
    "car-visual-concept-ad",
    "汽车视觉概念片",
    "未来概念车从暗场灯光中驶出，车身线条被光轨勾勒，大片级运镜，科技豪华风。",
  ],
  [
    "chagee-visual-concept-ad",
    "茶饮视觉广告",
    "新中式茶饮广告，茶叶、冰块和液体在空中慢动作飞溅，清透光线，品牌视觉大片。",
  ],
  [
    "cola",
    "可乐广告",
    "冰镇可乐罐从水花与冰块中弹出，红色品牌视觉，气泡喷涌，夏日清爽商业广告。",
  ],
  [
    "costume-drama",
    "古装剧情",
    "古装人物在宫殿与灯火中缓步转身，衣袂飘动，柔和逆光，东方影视剧质感。",
  ],
  [
    "fallen-god",
    "坠落神明",
    "暗黑奇幻场景，神明从破碎天空坠落，羽翼与光尘散开，巨大尺度和史诗氛围。",
  ],
  [
    "former-king",
    "昔日王者",
    "暗黑色调，阴云密布，血色残阳，天地死寂压抑。无数锈剑从地底、古坟、废墟中疯狂破土而出，黑金色剑气撕裂长空，万剑齐鸣如鬼哭。",
  ],
  [
    "golden-pomelo-1",
    "金柚产品片",
    "金色柚子在清澈水花中旋转，果肉晶莹剔透，阳光穿透果粒，清新食品广告风格。",
  ],
  [
    "golden-pomelo-2",
    "金柚饮品广告",
    "柚子切片、气泡与冰块组合成饮品视觉，金黄色调，镜头微距推进，清爽高级。",
  ],
  [
    "isekai-demon-king",
    "异世界魔王",
    "异世界魔王登场，巨大城堡与魔法阵背景，紫黑能量涌动，镜头环绕角色，压迫感强。",
  ],
  [
    "live-action-yuelin-qiji-remake",
    "真人奇迹重制",
    "真人奇幻重制短片，角色站在神秘森林光束中，魔法粒子环绕，镜头缓慢推进。",
  ],
  [
    "massage-device",
    "按摩仪广告",
    "智能按摩设备产品广告，温暖灯光与家居场景，产品细节特写，舒适放松氛围。",
  ],
  [
    "mecha-transformation-1",
    "机甲变形 01",
    "机甲组件高速组装，金属外壳闭合，蓝色能量线点亮，镜头快速切换。",
  ],
  [
    "mecha-transformation-2",
    "机甲变形 02",
    "巨大机甲从地面站起，机械臂展开，城市废墟背景，震撼科幻大片感。",
  ],
  [
    "mecha-transformation-3",
    "机甲变形 03",
    "机甲战士在光雨中变形，装甲片层层覆盖，粒子特效和冲击波同步爆发。",
  ],
  [
    "mecha-transformation-4",
    "机甲变形 04",
    "紧凑机甲变形镜头，机械结构精密咬合，冷色调灯光，工业科幻质感。",
  ],
  [
    "medical-ultrasound-device-1",
    "医疗超声设备",
    "医疗超声设备商业展示，洁净实验室环境，屏幕数据流动，专业可信的科技医疗风。",
  ],
  [
    "smartphone-4",
    "手机产品片",
    "智能手机在黑色背景中旋转，屏幕光效流动，边框高光扫过，科技新品发布片风格。",
  ],
  [
    "tenth-freezer",
    "冰柜产品片",
    "商用冰柜产品广告，冷雾溢出，食品排列整齐，白蓝色调突出制冷能力。",
  ],
  [
    "tianmen-weihe",
    "天门奇景",
    "山河峡谷与云海之间的宏大自然场景，镜头穿越云层俯冲，东方奇观大片感。",
  ],
  [
    "wuhan-cherry-blossom-season",
    "武汉樱花季",
    "春日武汉樱花盛开，花瓣随风飘落，城市建筑与游客穿行其中，温柔浪漫纪录片质感。",
  ],
  [
    "yongyeti",
    "雪域巨兽",
    "雪山深处巨兽苏醒，冰雪飞溅，低角度镜头表现巨大体型，冷色调奇幻冒险风。",
  ],
  [
    "yuelin-qiji-3d-remake",
    "月林奇迹 3D",
    "3D 奇幻森林场景，月光洒落，角色穿过发光植物与薄雾，梦幻探索氛围。",
  ],
  [
    "zhang-xue-motorcycle-remake",
    "摩托车重制",
    "人物骑摩托车穿越雨夜街道，车灯划破水雾，镜头贴地跟拍，速度与孤独感并存。",
  ],
];

const videoInspirationMetadataMap = new Map(
  videoInspirationMetadata.map(([slug, title, prompt]) => [
    slug,
    { title, prompt },
  ]),
);

const videoInspirationItems = videoInspirationCategoryTabs
  .filter((category) => category.id !== "all")
  .flatMap((category) =>
    (videoInspirationFolderSlugs[category.folder] || []).map((slug) => {
      const metadata = videoInspirationMetadataMap.get(slug) || {};
      const title = metadata.title || slug;
      return {
        id: `video-inspiration-${category.id}-${slug}`,
        slug,
        title,
        prompt: metadata.prompt || title,
        model: "Seedance 2.0",
        feature: category.label,
        categoryId: category.id,
        category: category.label,
        folder: category.folder,
        ratio: "16:9",
        duration: 5,
        video: `/assets/videoInspiration/${category.folder}/${slug}.webm?v=20260623`,
        preview: `/assets/videoInspiration/previews/${slug}-preview.webm?v=20260613`,
        poster: `/assets/videoInspiration/posters/${slug}.jpg?v=20260613`,
      };
    }),
  );

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

const defaultVideoModelKey = "seedance_2_0_720p";

function pickDefaultVideoModel(models = []) {
  return (
    models.find((item) => item.value === defaultVideoModelKey)?.value ||
    models[0]?.value ||
    ""
  );
}

function getVideoTaskTimestamp(task) {
  const value =
    task?.createdAt || task?.created_at || task?.updatedAt || task?.updated_at;
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
  const isCompleted = card.status === "completed" && Boolean(card.video);
  const isFailed = card.status === "failed";
  const canUseCompletedActions = !isExample && isCompleted;
  const canRetryOrDelete = !isExample && (isCompleted || isFailed);

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
          <span>{formatBeijingDateTime(card.createdAt || card.created_at || card.time) || card.time}</span>
          <strong>{card.rmb || card.price}</strong>
        </div>
        <p>{card.error || card.prompt}</p>
        <div className="card-actions">
          <button
            className={`icon-circle ${card.favorite ? "is-favorite" : ""}`}
            type="button"
            onClick={() => onFavorite(card.id)}
            aria-label="收藏"
            disabled={!canUseCompletedActions}
          >
            <Star size={17} fill={card.favorite ? "#f8d545" : "none"} />
          </button>
          {canUseCompletedActions ? (
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
            disabled={!canRetryOrDelete}
          >
            <RefreshCcw size={15} />
            再次生成
          </button>
          <button
            type="button"
            onClick={() => onDelete(card.id)}
            disabled={!canRetryOrDelete}
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
        <img
          src={item.poster}
          alt={item.title}
          loading="lazy"
          decoding="async"
        />
        <video
          ref={previewRef}
          src={item.preview}
          muted
          playsInline
          preload="metadata"
        />
      </span>
    </button>
  );
}

function VideoInspirationModal({ item, onClose, onRemix }) {
  if (!item) return null;
  return (
    <FaceminiInspirationModal
      item={{
        ...item,
        mediaType: "video",
        category: "视频灵感",
        image: item.poster,
        material: item.feature || "视频素材",
      }}
      onClose={onClose}
      onRemix={onRemix}
      onReference={(nextItem) => {
        writePendingGenerationSeed({
          target: "image",
          referenceImage: {
            url: nextItem.poster || nextItem.image,
            originalName: `${nextItem.title || "视频封面"}.png`,
            size: 0,
            mimeType: "image/png",
          },
          notice: "已添加视频封面作为参考图",
        });
        onClose?.();
        window.history.pushState(null, "", "#/image");
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      }}
    />
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
  const [model, setModel] = useState(() =>
    pickDefaultVideoModel(options.models),
  );
  const modelOptions = getVideoModelOptions(options, model);
  const [ratio, setRatio] = useState(
    modelOptions.model?.defaultRatio || modelOptions.ratios[0] || "",
  );
  const [duration, setDuration] = useState(
    modelOptions.model?.defaultDuration || modelOptions.durations[0] || "",
  );
  const [referenceImage, setReferenceImage] = useState(null);
  const [referenceVideo, setReferenceVideo] = useState(null);
  const [isUploadingReference, setIsUploadingReference] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const referenceInputRef = useRef(null);

  function showVideoComposerToast(message) {
    if (!message) return;
    setToastMessage(message);
  }

  useEffect(() => {
    const hasSelectedModel = options.models.some((item) => item.value === model);
    if (!model || !hasSelectedModel) {
      const defaultModel = pickDefaultVideoModel(options.models);
      if (defaultModel) setModel(defaultModel);
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
    setReferenceImage(null);
    setReferenceVideo(null);
    setToastMessage("");
  }, [resetSignal]);

  useEffect(() => {
    if (!seed) return;
    setPrompt(seed.prompt || "");
    setReferenceImage(seed.referenceImage || null);
    setReferenceVideo(seed.referenceVideo || null);
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
  const canSubmit = prompt.trim().length > 0 && model && ratio && duration && !isUploadingReference;

  function clearPrompt() {
    setPrompt("");
    setReferenceImage(null);
    setReferenceVideo(null);
    showVideoComposerToast("已清空提示词");
  }

  function fillRandomPrompt() {
    setPrompt(videoApi.getRandomPrompt());
    showVideoComposerToast("已填入随机提示词");
  }

  function handleAddPrompt() {
    referenceInputRef.current?.click();
  }

  async function handleReferenceSelect(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingReference(true);
    try {
      if (String(file.type || "").startsWith("image/")) {
        const uploaded = await videoApi.uploadReferenceImage(file);
        setReferenceImage(uploaded);
        setReferenceVideo(null);
        showVideoComposerToast("参考图片已添加");
      } else if (String(file.type || "").startsWith("video/")) {
        const uploaded = await videoApi.uploadReferenceVideo(file);
        setReferenceVideo(uploaded);
        setReferenceImage(null);
        showVideoComposerToast("参考视频已添加");
      } else {
        showVideoComposerToast("仅支持图片或视频文件");
      }
    } catch (error) {
      showVideoComposerToast(error.message || "素材上传失败，请重试");
    } finally {
      setIsUploadingReference(false);
      event.target.value = "";
    }
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
      referenceImageUrl: referenceImage?.url || null,
      referenceVideoUrl: referenceVideo?.url || null,
    });
    showVideoComposerToast("已创建视频生成任务");
    setPrompt("");
    setReferenceImage(null);
    setReferenceVideo(null);
  }

  return (
    <div
      ref={shellRef}
      className={`sowa-composer video-composer is-${placement} ${collapsed ? "is-collapsed" : ""}`}
      aria-label="视频生成输入框"
      onFocus={onFocus}
      onBlur={onBlur}
    >
      <input
        ref={referenceInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,video/x-msvideo"
        hidden
        onChange={handleReferenceSelect}
      />
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
        referenceSlot={
          <ReferenceMediaSlot
            image={referenceImage}
            video={referenceVideo}
            isUploading={isUploadingReference}
            onRemoveImage={() => {
              setReferenceImage(null);
              showVideoComposerToast("已移除参考图片");
            }}
            onRemoveVideo={() => {
              setReferenceVideo(null);
              showVideoComposerToast("已移除参考视频");
            }}
          />
        }
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

function VideoGenerationView({
  authUser,
  onOpenAuth,
  resetSignal = 0,
  isActive = true,
}) {
  const [filter, setFilter] = useState("inspiration");
  const [cards, setCards] = useState([]);
  const [options, setOptions] = useState(emptyVideoOptions);
  const [credits, setCredits] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [pageToastMessage, setPageToastMessage] = useState("");
  const [playingTask, setPlayingTask] = useState(null);
  const [selectedInspiration, setSelectedInspiration] = useState(null);
  const [videoInspirationCategory, setVideoInspirationCategory] =
    useState("all");
  const [composerSeed, setComposerSeed] = useState(null);
  const [isComposerPastThreshold, setIsComposerPastThreshold] = useState(
    () => window.scrollY > 240,
  );
  const [isComposerFocused, setIsComposerFocused] = useState(false);
  const [isVideoInspirationGridReady, setIsVideoInspirationGridReady] =
    useState(false);
  const videoComposerRef = useRef(null);
  const taskStatusSignatureRef = useRef("");
  const previousVideoResetSignalRef = useRef(resetSignal);
  const isGuest = Boolean(authUser?.isGuest);

  const videoGen = useVideoGenStateMachine({
    onFailed: (message) => {
      showVideoPageToast(message || "视频生成失败");
      setIsSubmitting(false);
    },
    onReturnToList: (task) => {
      if (task?.video) {
        setPlayingTask(task);
      } else {
        setFilter("recent");
      }
      setIsSubmitting(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
  });

  function showVideoPageToast(message) {
    if (!message) return;
    setPageToastMessage(message);
  }

  useEffect(() => {
    if (!pageToastMessage) return undefined;
    const timer = window.setTimeout(() => setPageToastMessage(""), 2000);
    return () => window.clearTimeout(timer);
  }, [pageToastMessage]);

  useEffect(() => {
    if (previousVideoResetSignalRef.current === resetSignal) return;
    previousVideoResetSignalRef.current = resetSignal;
    setPlayingTask(null);
    setFilter("inspiration");
    setIsSubmitting(false);
    videoGen.resetToIdle();
  }, [resetSignal]);

  useEffect(() => {
    if (!isActive) return;
    const pendingSeed = takePendingGenerationSeed("video");
    if (!pendingSeed) return;
    setSelectedInspiration(null);
    setFilter("inspiration");
    setComposerSeed({
      id: `pending-video-${Date.now()}`,
      prompt: pendingSeed.prompt || "",
      notice: pendingSeed.notice || "",
    });
  }, [isActive]);

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
          .then(
            (creditsValue) =>
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
      const next =
        filter === "inspiration" &&
        (isComposerPastThreshold ? window.scrollY > 300 : window.scrollY > 360);
      setIsComposerPastThreshold(next);
      if (next) setIsComposerFocused(false);
    }

    syncComposerThreshold();
    window.addEventListener("scroll", syncComposerThreshold, { passive: true });
    return () => window.removeEventListener("scroll", syncComposerThreshold);
  }, [filter, isComposerPastThreshold]);

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
    setPlayingTask(null);
    videoGen.startGeneration({
      prompt: payload.prompt,
      duration: payload.duration,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });

    try {
      const task = await videoApi.createTask(payload);
      videoGen.attachTaskId(task.id);
      videoApi
        .refreshCredits()
        .then((value) => applyCreditsUpdate(setCredits, value))
        .catch(() => {});
    } catch (error) {
      videoGen.failGeneration(error.message || "创建视频生成任务失败");
      setSubmitError("");
      showVideoPageToast(error.message || "创建视频生成任务失败");
    }
  }

  async function performDeleteTask(id) {
    await videoApi.deleteTask(id);
  }

  const { requestDelete: deleteTask, deleteConfirmDialog } =
    useDeleteConfirmation({
      onConfirm: performDeleteTask,
      title: "删除视频记录？",
      message: "该视频生成记录会被移除，删除后无法恢复。",
    });

  async function toggleFavorite(id) {
    const updated = await videoApi.toggleFavorite(id);
    setCards((current) =>
      current.map((item) => (item.id === id ? updated : item)),
    );
    setPlayingTask((current) => (current?.id === id ? updated : current));
  }

  async function regenerateTask(id) {
    if (isGuest) {
      requestLoginForGeneration();
      return;
    }
    setSubmitError("");
    setIsSubmitting(true);
    const sourceTask =
      playingTask?.id === id
        ? playingTask
        : cards.find((item) => item.id === id);
    setPlayingTask(null);
    videoGen.startGeneration({
      prompt: sourceTask?.prompt || "",
      duration: sourceTask?.duration || 5,
    });
    try {
      const task = await videoApi.regenerateTask(id);
      videoGen.attachTaskId(task.id);
      videoApi
        .refreshCredits()
        .then((value) => applyCreditsUpdate(setCredits, value))
        .catch(() => {});
    } catch (error) {
      videoGen.failGeneration(
        error.message || "创建视频生成任务失败",
      );
      setSubmitError("");
      showVideoPageToast(error.message || "创建视频生成任务失败");
    }
  }

  const { requestRegenerate, regenerateConfirmDialog } =
    useRegenerateConfirmation({
      onConfirm: regenerateTask,
    });

  const sortedCards = useMemo(() => sortVideoTasksByNewest(cards), [cards]);
  const filteredVideoInspirationItems = useMemo(
    () =>
      videoInspirationCategory === "all"
        ? videoInspirationItems
        : videoInspirationItems.filter(
            (item) => item.categoryId === videoInspirationCategory,
          ),
    [videoInspirationCategory],
  );
  const visibleVideoInspirationItems = useIncrementalItems(
    filteredVideoInspirationItems,
    `video-${videoInspirationCategory}-${filteredVideoInspirationItems.length}`,
    { enabled: filter === "inspiration" },
  );
  const isComposerSticky = filter === "inspiration" && isComposerPastThreshold;
  const isComposerCollapsed = isComposerSticky && !isComposerFocused;
  const showVideoComposer = options.models.length > 0 && filter === "inspiration";
  const canRenderVideoInspirationGrid =
    filter !== "inspiration" || isVideoInspirationGridReady;

  useEffect(() => {
    if (filter !== "inspiration") {
      setIsVideoInspirationGridReady(true);
      return undefined;
    }

    setIsVideoInspirationGridReady(false);
    let secondFrameId = 0;
    const firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        setIsVideoInspirationGridReady(true);
      });
    });

    return () => {
      window.cancelAnimationFrame(firstFrameId);
      if (secondFrameId) window.cancelAnimationFrame(secondFrameId);
    };
  }, [filter]);

  function openVideoInspiration() {
    setPlayingTask(null);
    setFilter("inspiration");
    setIsComposerFocused(false);
    setIsComposerPastThreshold(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function selectVideoInspirationCategory(categoryId) {
    setVideoInspirationCategory(categoryId);
    setSelectedInspiration(null);
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

  if (videoGen.isGenStageActive && videoGen.derivedState) {
    return <VideoGenStage derivedState={videoGen.derivedState} />;
  }

  if (playingTask?.video) {
    return (
      <section className="video-gen-view video-gen-view-root is-immersive">
        <div className="video-gen-immersive-shell">
          <VideoGenerationResultPlayer
            task={playingTask}
            onBack={openVideoInspiration}
            onFavorite={() => toggleFavorite(playingTask.id)}
            onRegenerate={() => requestRegenerate(playingTask.id)}
          />
        </div>
        {regenerateConfirmDialog}
      </section>
    );
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
          历史记录
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
      {filter === "inspiration" && (
        <>
          {isComposerSticky && (
            <div
              className="composer-sticky-spacer video-composer-sticky-spacer"
              aria-hidden="true"
            />
          )}
          {!isComposerSticky && (
            <div className="video-composer-heading">视频生成</div>
          )}
          {showVideoComposer ? (
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
          ) : (
            <ComposerBarPlaceholder
              placement={isComposerSticky ? "sticky" : "inline"}
              className="video-composer"
            />
          )}
        </>
      )}
      {filter === "inspiration" && canRenderVideoInspirationGrid ? (
        <>
          <div className="video-inspiration-category-tabs" aria-label="视频分类">
            {videoInspirationCategoryTabs.map((category) => (
              <button
                key={category.id}
                type="button"
                className={
                  videoInspirationCategory === category.id ? "is-active" : ""
                }
                onClick={() => selectVideoInspirationCategory(category.id)}
              >
                {category.label}
              </button>
            ))}
          </div>
          <WaterfallGrid
            className="video-inspiration-grid"
            gap={12}
            maxColumns={4}
            items={visibleVideoInspirationItems.items}
            renderItem={(item) => (
              <VideoInspirationCard item={item} onOpen={setSelectedInspiration} />
            )}
          />
          <IncrementalLoadMoreIndicator
            active={
              visibleVideoInspirationItems.isLoadingMore &&
              visibleVideoInspirationItems.hasMore
            }
          />
        </>
      ) : filter !== "inspiration" ? (
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
                onRegenerate={requestRegenerate}
              />
            ))
          ) : (
            <div className="video-dub-recent-empty video-empty-results">
              <Film size={28} />
              <strong>暂无视频结果</strong>
              <p>生成完成的视频会保存在这里。</p>
            </div>
          )}
        </div>
      ) : null}
      <VideoInspirationModal
        item={selectedInspiration}
        onClose={() => setSelectedInspiration(null)}
        onRemix={useVideoInspiration}
      />
      {deleteConfirmDialog}
      {regenerateConfirmDialog}
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

function ChatMarkdown({ content }) {
  return (
    <div className="chat-markdown">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noreferrer" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

function markdownToPlainText(markdown = "") {
  return String(markdown || "")
    .replace(/```[\s\S]*?```/g, (block) =>
      block.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, ""),
    )
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[*_~]{1,3}/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function ChatCopyActions({ content }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copiedMode, setCopiedMode] = useState("");
  const wrapRef = useRef(null);
  const plainText = useMemo(() => markdownToPlainText(content), [content]);

  useEffect(() => {
    if (!isMenuOpen) return undefined;

    function handlePointerDown(event) {
      if (!wrapRef.current?.contains(event.target)) {
        setIsMenuOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") setIsMenuOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMenuOpen]);

  async function copyContent(mode = "plain") {
    const copied = await writeClipboardText(
      mode === "markdown" ? content : plainText,
    );
    if (!copied) return;
    setCopiedMode(mode);
    setIsMenuOpen(false);
    window.setTimeout(() => {
      setCopiedMode((current) => (current === mode ? "" : current));
    }, 1600);
  }

  return (
    <div
      className={`chat-copy-actions ${isMenuOpen ? "is-menu-open" : ""}`}
      ref={wrapRef}
    >
      <button
        className={`chat-copy-icon ${copiedMode ? "is-copied" : ""}`}
        type="button"
        onClick={() => copyContent("plain")}
        aria-label={copiedMode ? "已复制回复内容" : "复制回复内容"}
        title={copiedMode ? "已复制" : "复制"}
      >
        {copiedMode ? <CheckCircle2 size={15} /> : <Copy size={15} />}
      </button>
      <button
        className={`chat-copy-chevron ${isMenuOpen ? "is-open" : ""}`}
        type="button"
        onClick={() => setIsMenuOpen((value) => !value)}
        aria-label="展开复制选项"
        aria-expanded={isMenuOpen}
      >
        <ChevronDown size={14} />
      </button>
      {isMenuOpen && (
        <div className="chat-copy-menu" role="menu">
          <button
            type="button"
            role="menuitem"
            onClick={() => copyContent("markdown")}
          >
            复制为Markdown
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => copyContent("plain")}
          >
            复制
          </button>
        </div>
      )}
    </div>
  );
}

function ChatCanvas({ messages, isSubmitting, error }) {
  const scrollContainerRef = useRef(null);
  const scrollSignature = messages
    .map(
      (message) =>
        `${message.id}:${message.status}:${message.content?.length || 0}:${
          message.attachments?.length || 0
        }`,
    )
    .join("|");
  const hasStreamingMessage = messages.some(
    (message) => message.status === "streaming",
  );

  useEffect(() => {
    if (!messages.length && !isSubmitting && !error) return undefined;

    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return undefined;

    const scrollToBottom = () => {
      scrollContainer.scrollTo({
        top: scrollContainer.scrollHeight,
        behavior: "auto",
      });
    };

    scrollToBottom();
    const frameId = window.requestAnimationFrame(scrollToBottom);
    const timeoutId = window.setTimeout(scrollToBottom, 60);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(timeoutId);
    };
  }, [error, isSubmitting, messages.length, scrollSignature]);

  if (!messages.length && !isSubmitting && !error) {
    return (
      <div className="chat-main-canvas">
        <div className="chat-empty-state llm-empty-state">
          <h1>Hi，我是 Facemini，你的 AI 创作助手</h1>
        </div>
      </div>
    );
  }

  return (
    <div
      className="chat-main-canvas"
      ref={scrollContainerRef}
      aria-live="polite"
    >
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
                  {message.role === "assistant" && message.content ? (
                    <ChatMarkdown content={message.content} />
                  ) : (
                    message.content ||
                    (message.status === "streaming" ? "正在思考..." : "")
                  )}
                  <ChatAttachmentList
                    attachments={message.attachments || []}
                    isStatic
                  />
                  {message.points > 0 && (
                    <small className="chat-message-cost">
                      {message.price || `${message.points} 积分`}
                    </small>
                  )}
                  {message.role === "assistant" &&
                    message.status === "completed" &&
                    message.content?.trim() && (
                      <ChatCopyActions content={message.content} />
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
  conversationRound = 1,
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
  const isInputLocked = !isReady || isSubmitting || isUploadingAttachment;
  const canSubmit =
    isReady &&
    (prompt.trim().length > 0 || attachments.length > 0) &&
    model &&
    !isSubmitting &&
    !isUploadingAttachment;
  const modelLabel = isReady
    ? selectedModel?.label || "DeepSeek V4 Pro"
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
        disabled={isInputLocked}
        onChange={(event) => {
          setPrompt(event.target.value);
          if (notice) setNotice("");
        }}
        onKeyDown={(event) => {
          if (isInputLocked) return;
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submitPrompt();
          }
        }}
        placeholder={
          !isReady
            ? "正在加载对话模型..."
            : isSubmitting
              ? "AI 正在思考中..."
              : "输入你的创作需求，AI 帮你写文案、做脚本、生成内容灵感......"
        }
      />
      <div className="llm-composer-footer">
        <div className="llm-toolbar">
          <div className="llm-left">
            <button
              className="llm-square"
              type="button"
              disabled={isInputLocked || attachments.length >= 5}
              onClick={() => attachmentInputRef.current?.click()}
              aria-label="上传附件"
              title="上传附件"
            >
              {isUploadingAttachment ? (
                <Loader2 size={16} />
              ) : (
                <Plus size={16} />
              )}
            </button>
            <ChatAttachmentList
              attachments={attachments}
              onRemove={removeAttachment}
            />
            <div
              ref={modelMenuRef}
              className={`llm-select-wrap ${openMenu === "model" ? "is-open" : ""}`}
            >
              <button
                className="llm-select"
                type="button"
                disabled={isInputLocked}
                onClick={() =>
                  setOpenMenu((current) =>
                    current === "model" ? null : "model",
                  )
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
                disabled={isInputLocked}
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
              {isSubmitting ? <Loader2 size={18} /> : <Zap size={18} />}
              <BillingPoints
                feature="chat"
                payload={{ outputChars: 1000, conversationRound }}
                fallbackPoints={1}
              />
            </button>
          </div>
        </div>
      </div>
      {notice && <div className="composer-notice warning">{notice}</div>}
    </div>
  );
}

function ChatHistoryRail({ conversations, activeConversationId, onSelect }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="chat-history-dropdown">
      <button
        className={`history-toggle chat-history-toggle ${isOpen ? "is-open" : ""}`}
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((value) => !value)}
      >
        <History size={16} />
        <span>历史记录</span>
        <b>{conversations.length}</b>
        <ChevronDown size={16} />
      </button>
      {isOpen && (
        <aside className="history-rail chat-history-rail" aria-label="AI 对话历史">
          <div className="history-rail-header">
            <span>历史对话</span>
            <strong>{conversations.length}</strong>
          </div>
          <div className="history-list chat-history-list">
            {conversations.length === 0 ? (
              <p className="chat-history-empty">暂无历史对话</p>
            ) : (
              conversations.map((conversation) => (
                <button
                  className={`chat-history-item ${activeConversationId === conversation.id ? "is-selected" : ""}`}
                  key={conversation.id}
                  type="button"
                  onClick={() => onSelect(conversation.id)}
                >
                  <span>{conversation.title || "未命名对话"}</span>
                  <small>
                    {formatBeijingDateTime(conversation.createdAt || conversation.created_at || conversation.time) ||
                      conversation.time ||
                      ""}
                  </small>
                </button>
              ))
            )}
          </div>
        </aside>
      )}
    </div>
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [modelSwitchNotice, setModelSwitchNotice] = useState("");
  const isGuest = !isLoggedInUser(authUser);

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
    setModelSwitchNotice("");
  }

  async function selectConversation(id) {
    setSubmitError("");
    setConversationId(id);
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
      conversationRound={Math.max(1, Math.ceil(messages.length / 2) + 1)}
    />
  );

  return (
    <section className={`chat-view-root ${isIntroState ? "is-intro" : ""}`}>
      <div className="chat-topbar">
        <h1>大模型</h1>
        {isLoggedInUser(authUser) && credits && (
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
          <button
            className="chat-new-conversation-button"
            type="button"
            onClick={startNewConversation}
            disabled={isSubmitting}
          >
            <Plus size={16} />
            新建对话
          </button>
          <ChatHistoryRail
            conversations={conversations}
            activeConversationId={conversationId}
            onSelect={selectConversation}
          />
        </aside>
      </div>
    </section>
  );
}

function formatProviderLabel(value, fallback = "视频合成") {
  const text = String(value || "").trim();
  if (!text || /\bkie\b/i.test(text)) {
    return fallback;
  }
  return text;
}

function cleanDisplayName(value, fallback = "素材文件") {
  const text = String(value || "").trim();
  if (!text) return fallback;
  const suspiciousCount = (text.match(/[\uFFFD\u951F]/g) || []).length;
  if (suspiciousCount >= 2 || /[\u00E3\u00C2]/.test(text)) return fallback;
  return text;
}

function applyCreditsUpdate(setCredits, credits) {
  if (!credits) return;
  setCredits(credits);
  emitCreditsUpdated(credits);
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
    { value: "image", label: "图片朝向", maxSeconds: 15 },
    { value: "video", label: "视频朝向", maxSeconds: 15 },
  ],
  limits: {
    maxImageBytes: 10 * 1024 * 1024,
    maxVideoBytes: 100 * 1024 * 1024,
    recommendedVideoSeconds: 15,
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
  processingDescription: "正在上传人脸图片和目标视频。完成后会自动回填到这里。",
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
  emptyDescription:
    "上传人物正面图，配置脚本与音色，快速生成口型自然的视频内容",
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

  async createTask(payload) {
    const task = await imageDigitalHumanApi.createTask(payload);
    return mapImageDigitalHumanMotionTask(task);
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
  const isCompleted = task.status === "completed" && Boolean(task.resultUrl);
  const canUseCompletedActions = isCompleted;
  const canRetryOrDelete = isCompleted || isFailed;
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
        <div className="time-row">
          <span>{formatBeijingDateTime(task.createdAt || task.created_at || task.time) || task.time}</span>
          <strong>{task.price}</strong>
        </div>
        <div className="card-actions motion-card-actions">
          <button
            className={`icon-circle ${task.favorite ? "is-favorite" : ""}`}
            type="button"
            onClick={() => onFavorite(task.id)}
            disabled={!canUseCompletedActions}
            aria-label="收藏"
          >
            <Star size={17} fill={task.favorite ? "#f8d545" : "none"} />
          </button>
          {canUseCompletedActions ? (
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
          <button type="button" onClick={() => onRepeat(task)} disabled={!canRetryOrDelete}>
            <RefreshCcw size={15} />
            再次生成
          </button>
          <button type="button" onClick={() => onDelete(task.id)} disabled={!canRetryOrDelete}>
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
          {cleanDisplayName(
            asset.fileName,
            kind === "image" ? "图片素材" : "视频素材",
          )} · {formatBytes(asset.sizeBytes)}
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

function MotionValidationDialog({ message, onClose }) {
  if (!message) return null;

  return (
    <div className="face-swap-workbench__dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="face-swap-workbench__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="motion-validation-title"
        aria-describedby="motion-validation-desc"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <button className="face-swap-workbench__dialog-close" type="button" aria-label="关闭提示" onClick={onClose}>
          <X size={18} />
        </button>
        <div className="face-swap-workbench__dialog-icon">
          <CircleAlert size={24} />
        </div>
        <div className="face-swap-workbench__dialog-copy">
          <h2 id="motion-validation-title">素材还未上传完整</h2>
          <p id="motion-validation-desc">{message}</p>
          <span>请先补充必需素材，再开始生成。</span>
        </div>
      </section>
    </div>
  );
}

function MotionTransferComposer({
  options,
  onSubmit,
  isSubmitting,
  api = motionTransferApi,
  copy = motionTransferCopy,
  isActive = true,
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
  const activeRef = useRef(isActive);
  const noticeTimerRef = useRef(null);

  function showTemporaryNotice(message) {
    setNotice(message);
    if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
    noticeTimerRef.current = window.setTimeout(() => {
      setNotice("");
      noticeTimerRef.current = null;
    }, 2000);
  }

  useEffect(() => {
    activeRef.current = isActive;
    if (isActive) return;
    setImageAsset(null);
    setVideoAsset(null);
    if (imagePreview) window.URL.revokeObjectURL(imagePreview);
    if (videoPreview) window.URL.revokeObjectURL(videoPreview);
    setImagePreview("");
    setVideoPreview("");
    setNotice("");
    setUploading("");
  }, [isActive, imagePreview, videoPreview]);

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
      if (noticeTimerRef.current) window.clearTimeout(noticeTimerRef.current);
      if (imagePreview) window.URL.revokeObjectURL(imagePreview);
      if (videoPreview) window.URL.revokeObjectURL(videoPreview);
    };
  }, [imagePreview, videoPreview]);

  const selectedModel =
    options.models.find((item) => item.value === model) || options.models[0];
  const price = selectedModel?.basePoints || 0;
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
      const uploadedAsset = await api.uploadImage(file);
      if (!activeRef.current) return;
      setImageAsset({ ...uploadedAsset, fileName: file.name || uploadedAsset.fileName });
    } catch (error) {
      if (!activeRef.current) return;
      setImagePreview("");
      setNotice(error.message || "图片上传失败");
    } finally {
      if (activeRef.current) setUploading("");
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
      const uploadedAsset = await api.uploadVideo(file);
      if (!activeRef.current) return;
      setVideoAsset({ ...uploadedAsset, fileName: file.name || uploadedAsset.fileName });
    } catch (error) {
      if (!activeRef.current) return;
      setVideoPreview("");
      setNotice(error.message || "视频上传失败");
    } finally {
      if (activeRef.current) setUploading("");
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
      showTemporaryNotice(copy.imageRequired);
      return;
    }
    if (!videoAsset) {
      showTemporaryNotice(copy.videoRequired);
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
          hint={`建议 ${options.limits?.recommendedVideoSeconds || 15} 秒内`}
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
        <span className="price-pill">
          <BillingPoints points={price} />
        </span>
        <button
          className="send-button"
          type="button"
          onClick={submit}
          disabled={Boolean(uploading) || isSubmitting}
          aria-label={copy.submitLabel}
        >
          {isSubmitting ? <Loader2 size={18} /> : <Zap size={18} />}
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
  isActive = true,
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
        const [modelData, taskData, runningTaskData, creditData] =
          await Promise.all([
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
          ? api.getTasks({ filter: taskFilter }).then((value) => [value, value])
          : Promise.all([
              api.getTasks({ filter: taskFilter }),
              api.getTasks({ filter: "all" }),
            ]);
      taskRequest
        .then(
          ([value, runningValue]) =>
            mounted && applyTaskData(value, runningValue),
        )
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
  const useSplitWorkbench = splitResults;
  const useWorkbenchView =
    isFaceSwapView || navId === "motion" || navId === "image-digital-human";
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

  async function performDeleteTask(id) {
    await api.deleteTask(id);
    setTasks((current) => current.filter((task) => task.id !== id));
    setSubmittedTaskId((current) => {
      if (String(current) !== String(id)) return current;
      writeMotionActiveTaskId(navId, null);
      return null;
    });
  }

  const { requestDelete: deleteTask, deleteConfirmDialog } =
    useDeleteConfirmation({
      onConfirm: performDeleteTask,
      title: "删除历史记录？",
      message: "该处理记录会被移除，删除后无法恢复。",
    });

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

  const { requestRegenerate: requestRepeat, regenerateConfirmDialog } =
    useRegenerateConfirmation({
      onConfirm: repeatTask,
    });

  return (
    <section
      className={`motion-view-root ${splitResults ? "face-swap-view-root" : ""} ${navId === "image-digital-human" ? "image-digital-human-view-root" : ""}`}
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
              历史记录
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
          (!showCenterState || useSplitWorkbench) && (
            <WorkbenchComponent
              options={options}
              onSubmit={createTask}
              isSubmitting={isSubmitting}
              api={api}
              copy={copy}
              heading={
                heading || (navId === "motion" ? "AI 动作迁移" : "AI 换脸工具")
              }
              privacyText={
                privacyText ||
                (navId === "motion"
                  ? "您上传的内容仅用于动作迁移处理，不会被用于其他用途。"
                  : "您上传的内容仅用于换脸处理，不会被用于其他用途。")
              }
              onViewHistory={
                isFaceSwapView
                  ? () => {
                      setViewTab("recent");
                      setSubmittedTaskId(null);
                      writeMotionActiveTaskId(navId, null);
                    }
                  : undefined
              }
              isActive={isActive}
              resultVideoUrl={
                useSplitWorkbench && submittedTask?.status === "completed"
                  ? submittedTask.resultUrl || ""
                  : ""
              }
              taskStatus={
                useSplitWorkbench
                  ? submittedTask?.status || (isSubmitting ? "processing" : "idle")
                  : "idle"
              }
              taskError={
                useSplitWorkbench ? submitError || submittedTask?.error || "" : ""
              }
              taskProgress={useSplitWorkbench ? submittedTask?.progress || 0 : 0}
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
        {showCenterState && !(useSplitWorkbench && viewTab === "home") && (
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
                onRepeat={requestRepeat}
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
          isActive={isActive}
        />
      )}
      {deleteConfirmDialog}
      {regenerateConfirmDialog}
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

function WatermarkCenterState({
  task,
  isSubmitting,
  error,
  onReset,
  onRepeat,
  onDismiss,
  onRecharge,
}) {
  if (task?.status === "completed") {
    const isVideo = task.mediaType === "video";
    return (
      <section className="watermark-center-state marketing-result-card is-completed">
        <header className="marketing-result-head">
          <span>
            <CheckCircle2 size={18} />
            处理完成
          </span>
          <p>对比效果如下，可下载或继续处理</p>
        </header>
        <div className="marketing-result-compare">
          <figure>
            <figcaption>原图</figcaption>
            {isVideo ? (
              <video
                src={task.sourceUrl}
                controls
                playsInline
                poster={task.thumbnailUrl || task.sourceUrl}
              />
            ) : (
              <img
                src={task.sourceUrl || task.resultUrl}
                alt={task.sourceFileName || "原图"}
              />
            )}
          </figure>
          <figure>
            <figcaption>处理后</figcaption>
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
          </figure>
        </div>
        <footer className="marketing-result-footer">
          <p>已完成本次处理，可下载结果、再次处理当前素材，或上传新素材继续</p>
          <div className="marketing-result-actions">
            <button type="button" onClick={onReset}>
              处理新素材
            </button>
            <a href={task.resultUrl} download>
              <Download size={15} />
              下载结果
            </a>
            <button
              type="button"
              className="is-primary"
              onClick={() => onRepeat?.(task)}
            >
              <Zap size={15} />
              再次处理
            </button>
          </div>
        </footer>
      </section>
    );
  }

  if (error || task?.status === "failed") {
    const message =
      error ||
      task?.error ||
      "处理服务返回了错误，积分会按任务状态自动处理。";
    return (
      <div
        className="remove-bg-alert-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="remove-bg-alert-title"
      >
        <button
          className="remove-bg-alert-backdrop"
          type="button"
          aria-label="关闭提醒"
          onClick={onDismiss}
        />
        <section className="remove-bg-alert-dialog">
          <button
            className="remove-bg-alert-close"
            type="button"
            aria-label="关闭提醒"
            onClick={onDismiss}
          >
            <X size={18} />
          </button>
          <span className="remove-bg-alert-icon" aria-hidden="true">
            <Layers size={28} />
          </span>
          <div className="remove-bg-alert-copy">
            <strong id="remove-bg-alert-title">这次没有抠图成功</strong>
            <p>{message}</p>
          </div>
          <div className="remove-bg-alert-actions">
            <button type="button" onClick={onDismiss}>
              关闭
            </button>
            <button type="button" className="is-primary" onClick={onRecharge}>
              去充值
            </button>
          </div>
        </section>
      </div>
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
  const isCompleted = task.status === "completed" && Boolean(task.resultUrl);
  const canUseCompletedActions = isCompleted;
  const canRetryOrDelete = isCompleted || isFailed;
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
        <div className="time-row">
          <span>{formatBeijingDateTime(task.createdAt || task.created_at || task.time) || task.time}</span>
          <strong>{task.price}</strong>
        </div>
        <div className="card-actions watermark-card-actions">
          <button
            className={`icon-circle ${task.favorite ? "is-favorite" : ""}`}
            type="button"
            onClick={() => onFavorite(task.id)}
            disabled={!canUseCompletedActions}
            aria-label="收藏"
          >
            <Star size={17} fill={task.favorite ? "#f8d545" : "none"} />
          </button>
          {canUseCompletedActions ? (
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
          <button type="button" onClick={() => onRepeat(task)} disabled={!canRetryOrDelete}>
            <RefreshCcw size={15} />
            再次生成
          </button>
          <button type="button" onClick={() => onDelete(task.id)} disabled={!canRetryOrDelete}>
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
  disabled = false,
  onSelect,
  onClear,
  onRequireAuth,
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
      onClick={() => {
        if (disabled) {
          onRequireAuth?.();
          return;
        }
        inputRef.current?.click();
      }}
      disabled={disabled}
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
          <span className="marketing-upload-icon" aria-hidden="true">
            <img src="/assets/marketing/upload.svg" alt="" />
          </span>
          <strong>{isVideo ? "上传视频文件" : "上传图片文件"}</strong>
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
          {cleanDisplayName(sourceAsset.fileName, isVideo ? "视频素材" : "图片素材")} · {formatBytes(sourceAsset.sizeBytes)}
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

function WatermarkComposer({
  options,
  onSubmit,
  isSubmitting,
  authUser,
  onOpenAuth,
  isActive = true,
}) {
  const [mode, setMode] = useState("image");
  const [sourceAsset, setSourceAsset] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);
  const activeRef = useRef(isActive);
  const isGuest = Boolean(authUser?.isGuest);

  useEffect(() => {
    activeRef.current = isActive;
    if (isActive) return;
    setSourceAsset(null);
    if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    setPreviewUrl("");
    setNotice("");
    setUploading(false);
  }, [isActive, previewUrl]);

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
  const price = selectedModel?.basePoints || 0;
  const canSubmit = Boolean(
    !isGuest && sourceAsset && !uploading && !isSubmitting,
  );

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
    if (isGuest) {
      setNotice("请先登录");
      onOpenAuth?.("login");
      return;
    }
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
      const uploaded = await watermarkApi.uploadSource(file);
      if (!activeRef.current) return;
      setSourceAsset(uploaded);
      setNotice("素材上传完成");
    } catch (error) {
      if (!activeRef.current) return;
      setPreviewUrl("");
      setNotice(error.message || "素材上传失败");
    } finally {
      if (activeRef.current) setUploading(false);
    }
  }

  function submit() {
    if (isGuest) {
      setNotice("请先登录");
      onOpenAuth?.("login");
      return;
    }
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
        disabled={isGuest}
        onSelect={selectSource}
        onClear={clearSource}
        onRequireAuth={() => {
          setNotice("请先登录");
          onOpenAuth?.("login");
        }}
      />
      <div className="watermark-composer-footer">
        <span>
          {notice ||
            (mode === "video"
              ? "视频会保留原音频并尝试自然修复水印区域"
              : "图片会自动修复水印区域并保持主体内容")}
        </span>
        <strong><BillingPoints points={price} /></strong>
        <button
          className="send-button"
          type="button"
          onClick={submit}
          disabled={!canSubmit}
          aria-label="开始去水印"
        >
          {isSubmitting ? <Loader2 size={18} /> : <Zap size={18} />}
        </button>
      </div>
    </div>
  );
}

function WatermarkRemovalView({
  authUser,
  onOpenAuth,
  onOpenFeature,
  isActive = true,
}) {
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
          .then(
            (creditsValue) =>
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

  async function performDeleteTask(id) {
    await watermarkApi.deleteTask(id);
    setTasks((current) => current.filter((task) => task.id !== id));
    setSubmittedTaskId((current) =>
      String(current) === String(id) ? null : current,
    );
  }

  const { requestDelete: deleteTask, deleteConfirmDialog } =
    useDeleteConfirmation({
      onConfirm: performDeleteTask,
      title: "删除历史记录？",
      message: "该去水印记录会被移除，删除后无法恢复。",
    });

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

  const { requestRegenerate: requestRepeat, regenerateConfirmDialog } =
    useRegenerateConfirmation({
      onConfirm: repeatTask,
    });

  function dismissCenterState() {
    setSubmitError("");
    setSubmittedTaskId(null);
  }

  function goToRecharge() {
    dismissCenterState();
    onOpenFeature?.("billing");
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
          历史记录
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
            onReset={() => {
              setSubmittedTaskId(null);
            }}
            onRepeat={requestRepeat}
            onDismiss={dismissCenterState}
            onRecharge={goToRecharge}
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
              onRepeat={requestRepeat}
            />
          ))}
        </div>
      </div>
      {viewTab === "home" && !showCenterState && options.models.length > 0 && (
        <WatermarkComposer
          options={options}
          onSubmit={createTask}
          isSubmitting={isSubmitting}
          authUser={authUser}
          onOpenAuth={onOpenAuth}
          isActive={isActive}
        />
      )}
      {deleteConfirmDialog}
      {regenerateConfirmDialog}
    </section>
  );
}

/** Feature modules unmount when inactive so re-entering a page starts fresh. */
function FeatureModuleKeepAlive({ id, activeNav, visitedIds, children }) {
  const isActive = activeNav === id;
  if (!isActive || !visitedIds.has(id)) return null;
  return (
    <div
      className="feature-module-keepalive"
      style={{ display: "contents" }}
      aria-hidden="false"
      data-feature-module={id}
      data-feature-active="true"
    >
      {children}
    </div>
  );
}

function clearStaleGlobalScrollLocks() {
  document.body.classList.remove("studio-landing-active");
  document.documentElement.classList.remove("studio-landing-active");

  const root = document.getElementById("root");
  if (document.body.style.overflow === "hidden") {
    document.body.style.overflow = "";
  }
  if (document.documentElement.style.overflow === "hidden") {
    document.documentElement.style.overflow = "";
  }
  if (root?.style.overflow === "hidden") {
    root.style.overflow = "";
  }
}

function InviteGiftDialog({ authUser, onClose, onOpenAuth }) {
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
    const ok = await writeClipboardText(inviteLink);
    setCopied(ok);
    if (!ok) {
      setInviteError("复制失败，请重试");
      return;
    }
    if (ok) {
      invitationApi.track(
        "invite.copy_success",
        inviteProfile?.inviteCode || authUser?.inviteCode,
        {
          source: "topbar_dialog",
        },
      );
    }
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
            title={
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
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
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
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
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

function WorkbenchTopbar({
  activeNav,
  authUser,
  onNavChange,
  onLogout,
  onOpenAuth,
  onOpenInvite,
  onOpenLibrary,
  articleMode = "home",
  onArticleModeChange,
}) {
  const current = navItems.find((item) => item.id === activeNav);
  const title = current?.label || "Facemini";
  const isLoggedIn = isLoggedInUser(authUser);
  const credits = isLoggedIn ? authUser.credits : null;
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [displayCredits, setDisplayCredits] = useState(credits);
  const [creditDelta, setCreditDelta] = useState(null);
  const profileMenuRef = useRef(null);
  const showDigitalHumanTabs = activeNav === "digital-human";
  const showArticleTabs = activeNav === "article";

  useEffect(() => {
    setShowProfileMenu(false);
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
    setDisplayCredits((current) => {
      if (typeof current === "number" && credits > current) {
        flashCreditDelta(credits - current);
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
        className={`fm-workbench-topbar ${showDigitalHumanTabs || showArticleTabs ? "has-digital-tabs" : ""}`}
      >
        <div className="fm-topbar-title-row">
          {!showArticleTabs && (
            <h1>
              {activeNav === "music" ? (
                <button
                  type="button"
                  className="fm-topbar-title-home"
                  onClick={() => window.dispatchEvent(new Event("facemini:music-home"))}
                  aria-label="返回 AI 音乐首页"
                >
                  {title}
                </button>
              ) : title}
            </h1>
          )}
          {showDigitalHumanTabs && (
            <div className="fm-digital-tabs" aria-label="数字人类型">
              <button
                type="button"
                className={activeNav === "digital-human" ? "is-active" : ""}
                onClick={() => onNavChange("digital-human")}
              >
                数字人形象
              </button>
            </div>
          )}
          {showArticleTabs && (
            <div
              className="fm-digital-tabs fm-article-top-tabs"
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
          <button className="fm-top-bell" type="button" aria-label="通知">
            <Bell size={21} />
          </button>
          {isLoggedIn ? (
            <div className="fm-profile-menu-wrap" ref={profileMenuRef}>
              <button
                className="fm-top-avatar-button"
                type="button"
                aria-label="打开个人菜单"
                aria-expanded={showProfileMenu}
                onClick={() => setShowProfileMenu((value) => !value)}
              >
                <img
                  className="fm-top-avatar"
                  src={authUser?.avatarUrl || defaultUserAvatarSrc}
                  alt={`${authUser?.displayName || authUser?.username || "用户"}头像`}
                />
              </button>
              {showProfileMenu && (
                <div className="fm-profile-dropdown" role="menu">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => openProfileCenter()}
                  >
                    个人中心
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => openAssets("全部")}
                  >
                    我的资产
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => openBillingCenter()}
                  >
                    充值与明细
                  </button>
                  <span aria-hidden="true" />
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setShowProfileMenu(false);
                      onLogout?.();
                    }}
                  >
                    退出登录
                  </button>
                </div>
              )}
            </div>
          ) : (
            <button
              className="fm-login-entry"
              type="button"
              onClick={() => onOpenAuth?.("login")}
            >
              <LogIn size={16} />
              登录
            </button>
          )}
        </div>
      </header>
    </>
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
  const isGuest = !isLoggedInUser(authUser);
  const [activeNav, setActiveNav] = useState(firstNav);
  const [articleMode, setArticleMode] = useState("home");
  const [visitedIds, setVisitedIds] = useState(() => new Set([firstNav]));
  const [showInvite, setShowInvite] = useState(false);
  const [showInspirationLibrary, setShowInspirationLibrary] = useState(false);
  const [inspirationLibraryTab, setInspirationLibraryTab] = useState(
    fmInspirationLibraryDefaultTab,
  );
  const [composerResetSignals, setComposerResetSignals] = useState({
    image: 0,
    video: 0,
  });
  const [audioResetSignals, setAudioResetSignals] = useState({
    voice: 0,
    music: 0,
    "voice-convert": 0,
    transcribe: 0,
    "video-voice": 0,
  });
  const [imageLaunchSeed, setImageLaunchSeed] = useState(null);

  useEffect(() => {
    if (showInvite) return;
    clearStaleGlobalScrollLocks();
  }, [activeNav, showInvite]);

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
        window.history.pushState(null, "", "/");
        onOpenHome();
        return;
      }
      const nextId = id;
      if (
        activeNav !== nextId &&
        (nextId === "image" || nextId === "video") &&
        !hasPendingGenerationSeed(nextId)
      ) {
        setComposerResetSignals((signals) => ({
          ...signals,
          [nextId]: signals[nextId] + 1,
        }));
      }
      if (featureNavIdSet.has(nextId)) {
        window.history.pushState(null, "", `#/${nextId}`);
        setVisitedIds((prev) => new Set(prev).add(nextId));
      }
      setActiveNav((current) => {
        if (current !== nextId && Object.prototype.hasOwnProperty.call(audioResetSignals, current)) {
          setAudioResetSignals((signals) => ({
            ...signals,
            [current]: signals[current] + 1,
          }));
        }
        return current === nextId ? current : nextId;
      });
    },
    [activeNav, audioResetSignals, onOpenHome],
  );

  const handleOpenFeature = useCallback(
    (id, launchSeed) => {
      if (id === "image") {
        const payload = buildImageLaunchSeedPayload(
          launchSeed || peekPendingGenerationSeed("image") || {},
        );
        if (payload.prompt || payload.referenceImage?.url) {
          writePendingGenerationSeed({ target: "image", ...payload });
          setImageLaunchSeed(payload);
        } else {
          setImageLaunchSeed(null);
        }
      }
      if (id === "video") {
        const payload = launchSeed || peekPendingGenerationSeed("video") || {};
        const prompt = String(payload.prompt || "").trim();
        if (prompt) {
          writePendingGenerationSeed({
            target: "video",
            prompt,
            notice: payload.notice || "",
          });
        }
      }
      handleNavChange(id);
    },
    [handleNavChange],
  );

  const openInviteDialog = useCallback(() => {
    invitationApi.track(
      "invite.entry_click",
      authUser?.inviteCode || getPendingInviteCode(),
      {
        activeNav,
        loggedIn: Boolean(authUser && !authUser.isGuest),
      },
    );
    setShowInvite(true);
  }, [activeNav, authUser]);

  const openInspirationLibrary = useCallback(
    (tab = fmInspirationLibraryDefaultTab) => {
      setInspirationLibraryTab(
        fmInspirationLibraryTabs.includes(tab)
          ? tab
          : fmInspirationLibraryDefaultTab,
      );
      setShowInspirationLibrary(true);
    },
    [],
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
        <WorkbenchTopbar
          activeNav={activeNav}
          authUser={authUser}
          onNavChange={handleNavChange}
          onLogout={onLogout}
          onOpenAuth={onOpenAuth}
          onOpenInvite={openInviteDialog}
          onOpenLibrary={openInspirationLibrary}
          articleMode={articleMode}
          onArticleModeChange={setArticleMode}
        />
        <FeatureModuleKeepAlive
          id="creation"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <CreationCenterView
            onOpenFeature={handleOpenFeature}
            onOpenInvite={openInviteDialog}
            onOpenLibrary={openInspirationLibrary}
            authUser={authUser}
            onOpenAuth={onOpenAuth}
          />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="assets"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <AssetsPage
            authUser={authUser}
            onOpenAuth={onOpenAuth}
            onOpenFeature={handleNavChange}
            onOpenInvite={openInviteDialog}
          />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="profile"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <AssetsPage
            authUser={authUser}
            onOpenAuth={onOpenAuth}
            onOpenFeature={handleNavChange}
            onOpenInvite={openInviteDialog}
            pageMode="profile"
          />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="favorites"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <AssetsPage
            authUser={authUser}
            onOpenAuth={onOpenAuth}
            onOpenFeature={handleNavChange}
            onOpenInvite={openInviteDialog}
            pageMode="favorites"
          />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="billing"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <AssetsPage
            authUser={authUser}
            onOpenAuth={onOpenAuth}
            onOpenFeature={handleNavChange}
            onOpenInvite={openInviteDialog}
            pageMode="billing"
          />
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
            launchSeed={imageLaunchSeed}
            onLaunchSeedConsumed={() => setImageLaunchSeed(null)}
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
            isActive={activeNav === "video"}
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
          <DigitalHumanHubView
            isActive={activeNav === "digital-human"}
            onOpenFeature={handleNavChange}
          />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="motion"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <MotionTransferView splitResults isActive={activeNav === "motion"} />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="watermark"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <WatermarkRemovalView
            authUser={authUser}
            onOpenAuth={onOpenAuth}
            onOpenFeature={handleNavChange}
            isActive={activeNav === "watermark"}
          />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="voice"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <VoiceSynthesisView
            authUser={authUser}
            onOpenAuth={onOpenAuth}
            onOpenFeature={handleNavChange}
            resetSignal={audioResetSignals.voice}
          />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="voice-convert"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <VoiceConvertView
            onOpenFeature={handleNavChange}
            resetSignal={audioResetSignals["voice-convert"]}
          />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="transcribe"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <TranscribeView
            authUser={authUser}
            onOpenFeature={handleNavChange}
            resetSignal={audioResetSignals.transcribe}
          />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="article"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <ArticleGenerationView
            authUser={authUser}
            onOpenAuth={onOpenAuth}
            mode={articleMode}
            onModeChange={setArticleMode}
            isActive={activeNav === "article"}
            ShowcaseCardComponent={ViralGraphicGeneratorShowcaseCard}
          />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="music"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <MusicGenerationView
            onOpenFeature={handleNavChange}
            resetSignal={audioResetSignals.music}
          />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="replicate"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <ReplicateView authUser={authUser} onOpenFeature={handleOpenFeature} />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="enhance"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <EnhanceView onOpenFeature={handleNavChange} />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="remove-bg"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <RemoveBgView onOpenFeature={handleNavChange} />
        </FeatureModuleKeepAlive>
        <FeatureModuleKeepAlive
          id="video-voice"
          activeNav={activeNav}
          visitedIds={visitedIds}
        >
          <VideoDubbingView
            authUser={authUser}
            onOpenFeature={handleNavChange}
            resetSignal={audioResetSignals["video-voice"]}
          />
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
            isActive={activeNav === "face-swap"}
          />
        </FeatureModuleKeepAlive>
        {![
          "creation",
          "assets",
          "profile",
          "favorites",
          "billing",
          "image",
          "video",
          "chat",
          "digital-human",
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
      <InspirationLibraryDrawer
        open={showInspirationLibrary}
        activeTab={inspirationLibraryTab}
        onTabChange={setInspirationLibraryTab}
        onClose={() => setShowInspirationLibrary(false)}
        onOpenFeature={handleNavChange}
      />
      {showInvite && (
        <InviteGiftDialog
          authUser={authUser}
          onClose={() => setShowInvite(false)}
          onOpenAuth={onOpenAuth}
        />
      )}
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
    captureInviteCodeForCurrentLocation();
  }, []);

  useEffect(() => {
    const onLocationChange = () => {
      captureInviteCodeForCurrentLocation();
      setView(getRouteView());
    };
    window.addEventListener("hashchange", onLocationChange);
    window.addEventListener("popstate", onLocationChange);
    return () => {
      window.removeEventListener("hashchange", onLocationChange);
      window.removeEventListener("popstate", onLocationChange);
    };
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

  useEffect(() => {
    function handleAuthUserUpdated(event) {
      const user = event.detail?.user;
      if (!user) return;
      setAuthUser(user);
    }
    window.addEventListener("facemini-auth-user-updated", handleAuthUserUpdated);
    return () => {
      window.removeEventListener(
        "facemini-auth-user-updated",
        handleAuthUserUpdated,
      );
    };
  }, []);

  useEffect(() => {
    if (!authUser || authUser.isGuest) return undefined;
    let alive = true;
    const refreshCredits = () => {
      paymentApi
        .getCredits()
        .then((credits) => {
          if (alive) emitCreditsUpdated(credits);
        })
        .catch(() => {});
    };
    const onFocus = () => refreshCredits();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refreshCredits();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [authUser?.id, authUser?.isGuest]);

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
    setView("home");
  }, []);

  const enterAppHome = useCallback(() => {
    window.sessionStorage.setItem(appEntryStorageKey, "1");
    window.history.pushState(null, "", "/");
    setView("home");
  }, []);

  const enterCreationCenter = useCallback(() => {
    window.sessionStorage.setItem(appEntryStorageKey, "1");
    window.history.pushState(null, "", "#/creation");
    setView("creation");
  }, []);

  const finishAuth = useCallback((user) => {
    const hadInviteCode = Boolean(getPendingInviteCode());
    const returnedCredits = Number(user?.credits || 0);
    if (
      hadInviteCode &&
      returnedCredits >= registerGrantPoints + inviteRewardPoints
    ) {
      try {
        window.sessionStorage.setItem(
          pendingInviteBonusStorageKey,
          String(inviteRewardPoints),
        );
      } catch {
        // Session storage can be unavailable in restricted browser contexts.
      }
    }
    clearPendingInviteCode();
    emitCreditsUpdated({ userId: user?.id, balance: user?.credits });
    setAuthUser(user);
    setAuthDrawerMode(null);
    window.sessionStorage.setItem(appEntryStorageKey, "1");
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
    if (String(view).startsWith("legal:")) {
      return (
        <LegalDocumentPage
          documentKey={String(view).slice("legal:".length)}
          onOpenHome={openLanding}
        />
      );
    }

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
      <StudioLanding
        onOpenAuth={setAuthDrawerMode}
        onEnterApp={enterAppHome}
        onEnterCreation={enterCreationCenter}
      />
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
    <ConfigProvider>
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);
