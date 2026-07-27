import {
  Bot,
  Box,
  Copy,
  Eraser,
  FileText,
  Home,
  Image,
  Layers,
  Mic,
  Music,
  PlaySquare,
  Scissors,
  Send,
  Sparkles,
  Star,
  UserRound,
  Video,
  Wallet,
  Wand2,
} from "lucide-react";

export const navItems = [
  { id: "home", label: "首页", icon: Home },
  { id: "creation", label: "创作中心", icon: Sparkles },
  { id: "assets", label: "我的资产", icon: Wallet },
  { id: "profile", label: "个人中心", icon: UserRound },
  { id: "favorites", label: "我的收藏", icon: Star },
  { id: "billing", label: "积分充值", icon: Wallet },
  { id: "image", label: "图片生成", icon: Image },
  { id: "video", label: "视频生成", icon: Video },
  { id: "chat", label: "大模型", icon: Bot },
  { id: "infinite-canvas", label: "无限画布", icon: Layers },
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

export const navSections = [
  { type: "item", id: "creation" },
  { type: "item", id: "chat" },
  { type: "item", id: "infinite-canvas" },
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

export const homeFeatureRoutes = [
  "image",
  "video",
  "chat",
  "infinite-canvas",
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

export const featureNavIds = navItems
  .map((item) => item.id)
  .filter((id) => id !== "home");
export const featureNavIdSet = new Set(featureNavIds);
export const appNavIdSet = new Set(navItems.map((item) => item.id));
