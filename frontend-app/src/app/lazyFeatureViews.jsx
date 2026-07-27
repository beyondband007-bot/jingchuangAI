import { lazy } from "react";

const featureLoaders = {
  assets: () => import("../features/assets/AssetsPage"),
  creation: () => import("../features/creation/CreationCenterView"),
  image: () => import("../features/image/ImageGenerationView"),
  video: () => import("../features/video/VideoGenerationView"),
  chat: () => import("../features/chat/ChatGenerationView"),
  "infinite-canvas": () => import("../features/infinite-canvas/InfiniteCanvasHost"),
  "digital-human": () => import("../features/digital-human-hub/DigitalHumanHubView"),
  motion: () => import("../features/motion-transfer/MotionTransferWorkflowView"),
  "face-swap": () => import("../features/face-swap/FaceSwapWorkflowView"),
  watermark: () => import("../features/watermark/WatermarkRemovalView.jsx"),
  voice: () => import("../features/voice-synthesis-ui/VoiceSynthesisView"),
  "voice-convert": () => import("../features/voice-convert/VoiceConvertView"),
  transcribe: () => import("../features/transcribe/TranscribeView"),
  article: () => import("../features/article/ArticleGenerationView"),
  music: () => import("../features/music/MusicGenerationView"),
  replicate: () => import("../features/replicate/ReplicateView"),
  enhance: () => import("../features/enhance/EnhanceView"),
  "remove-bg": () => import("../features/remove-bg/RemoveBgView"),
  "video-voice": () => import("../features/video-dubbing/VideoDubbingView"),
};

function lazyFeature(featureId, exportName) {
  return lazy(() =>
    featureLoaders[featureId]().then((module) => ({
      default: module[exportName],
    })),
  );
}

/** Starts a chunk download only after explicit pointer or keyboard intent. */
export function preloadFeatureView(featureId) {
  featureLoaders[featureId]?.();
}

export const AssetsPage = lazyFeature("assets", "AssetsPage");
export const CreationCenterView = lazyFeature("creation", "CreationCenterView");
export const ImageGenerationView = lazyFeature("image", "ImageGenerationView");
export const VideoGenerationView = lazyFeature("video", "VideoGenerationView");
export const ChatGenerationView = lazyFeature("chat", "ChatGenerationView");
export const InfiniteCanvasHost = lazyFeature(
  "infinite-canvas",
  "InfiniteCanvasHost",
);
export const DigitalHumanHubView = lazyFeature(
  "digital-human",
  "DigitalHumanHubView",
);
export const MotionTransferWorkflowView = lazyFeature(
  "motion",
  "MotionTransferWorkflowView",
);
export const FaceSwapWorkflowView = lazyFeature(
  "face-swap",
  "FaceSwapWorkflowView",
);
export const WatermarkRemovalView = lazyFeature(
  "watermark",
  "WatermarkRemovalView",
);
export const VoiceSynthesisView = lazyFeature("voice", "VoiceSynthesisView");
export const VoiceConvertView = lazyFeature("voice-convert", "VoiceConvertView");
export const TranscribeView = lazyFeature("transcribe", "TranscribeView");
export const ArticleGenerationView = lazyFeature("article", "ArticleGenerationView");
export const MusicGenerationView = lazyFeature("music", "MusicGenerationView");
export const ReplicateView = lazyFeature("replicate", "ReplicateView");
export const EnhanceView = lazyFeature("enhance", "EnhanceView");
export const RemoveBgView = lazyFeature("remove-bg", "RemoveBgView");
export const VideoDubbingView = lazyFeature("video-voice", "VideoDubbingView");
