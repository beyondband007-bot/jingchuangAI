import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { ConfigProvider } from "@arco-design/web-react";
import "../styles/arco-components.css";
import "./imageFeaturePage.css";
import "../layouts/appShell.css";
import "../layouts/appShellFeature.css";
import "../layouts/appShellResponsive.css";
import "./imageFeatureSharedUi.css";
import "../styles/workbenchComposer.css";
import { Sparkles } from "lucide-react";
import {
  INSPIRATION_LIBRARY_DEFAULT_TAB,
  INSPIRATION_LIBRARY_TABS,
} from "../components/inspirationLibraryConfig";
import { writeClipboardText } from "../features/image/imageSharedUi";
import {
  buildImageLaunchSeedPayload,
  hasPendingGenerationSeed,
  peekPendingGenerationSeed,
  writePendingGenerationSeed,
} from "../features/generation/generationState";
import {
  ArticleGenerationView,
  ChatGenerationView,
  DigitalHumanHubView,
  EnhanceView,
  FaceSwapWorkflowView,
  InfiniteCanvasHost,
  MotionTransferWorkflowView,
  MusicGenerationView,
  RemoveBgView,
  ReplicateView,
  TranscribeView,
  VideoDubbingView,
  VoiceConvertView,
  VoiceSynthesisView,
  WatermarkRemovalView,
  AssetsPage,
  CreationCenterView,
  ImageGenerationView,
  VideoGenerationView,
  preloadFeatureView,
} from "./lazyFeatureViews";
import { AppShell } from "../layouts/AppShell";
import { AppSidebar } from "../layouts/AppSidebar";
import { AppHeader } from "../layouts/AppHeader";
import { AppContent } from "../layouts/AppContent";
import {
  clearStaleGlobalScrollLocks,
  FeatureModuleKeepAlive,
} from "../layouts/FeatureModuleShell";
import { WorkbenchTopbar } from "../layouts/WorkbenchTopbar";
import { createViewRegistry } from "../layouts/viewRegistry";
import {
  featureNavIdSet,
  navItems,
  navSections,
} from "../layouts/navigation";
import {
  getPendingInviteCode,
  isLoggedInUser,
} from "../features/invite/inviteUtils";
import { ViralGraphicGeneratorShowcaseCard } from "../features/viral-graphic-generator-ui/ViralGraphicGeneratorShowcaseCard";
import { invitationApi } from "../api/invitationApi";
import { useGenerationNotifications } from "../features/generation-notifications/useGenerationNotifications";

const InspirationLibraryDrawer = lazy(() =>
  import("../components/InspirationLibraryDrawer.jsx").then((module) => ({
    default: module.InspirationLibraryDrawer,
  })),
);
const InviteGiftDialog = lazy(() =>
  import("../features/invite/InviteGiftDialog").then((module) => ({
    default: module.InviteGiftDialog,
  })),
);

const defaultUserAvatarSrc = "/assets/avatars/1.jpg";
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

function ImageFeaturePageContent({
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
  const [digitalHumanMode, setDigitalHumanMode] = useState("avatar");
  const [visitedIds, setVisitedIds] = useState(() => new Set([firstNav]));
  const [showInvite, setShowInvite] = useState(false);
  const [showInspirationLibrary, setShowInspirationLibrary] = useState(false);
  const [inspirationLibraryTab, setInspirationLibraryTab] = useState(
    INSPIRATION_LIBRARY_DEFAULT_TAB,
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
  const { summary: notificationSummary } = useGenerationNotifications(authUser);

  useEffect(() => {
    if (showInvite) return;
    clearStaleGlobalScrollLocks();
  }, [activeNav, showInvite]);

  useEffect(() => {
    const resetFeatureScroll = () => {
      window.scrollTo({ top: 0, left: 0 });
      document
        .querySelector(".app-shell__content.feature-main")
        ?.scrollTo({ top: 0, left: 0 });
    };

    resetFeatureScroll();
    const frameId = window.requestAnimationFrame(resetFeatureScroll);
    return () => window.cancelAnimationFrame(frameId);
  }, [activeNav]);

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
        if (
          prompt ||
          payload.referenceImage?.url ||
          payload.referenceVideo?.url
        ) {
          writePendingGenerationSeed({
            target: "video",
            prompt,
            referenceImage: payload.referenceImage || null,
            referenceVideo: payload.referenceVideo || null,
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
    (tab = INSPIRATION_LIBRARY_DEFAULT_TAB) => {
      setInspirationLibraryTab(
        INSPIRATION_LIBRARY_TABS.includes(tab)
          ? tab
          : INSPIRATION_LIBRARY_DEFAULT_TAB,
      );
      setShowInspirationLibrary(true);
    },
    [],
  );

  const viewRegistry = createViewRegistry({
    creation: () => (
      <CreationCenterView
        onOpenFeature={handleOpenFeature}
        onOpenInvite={openInviteDialog}
        onOpenLibrary={openInspirationLibrary}
        authUser={authUser}
        onOpenAuth={onOpenAuth}
      />
    ),
    assets: () => (
      <AssetsPage
        authUser={authUser}
        onOpenAuth={onOpenAuth}
        onOpenFeature={handleNavChange}
        onOpenInvite={openInviteDialog}
      />
    ),
    profile: () => (
      <AssetsPage
        authUser={authUser}
        onOpenAuth={onOpenAuth}
        onOpenFeature={handleNavChange}
        onOpenInvite={openInviteDialog}
        pageMode="profile"
      />
    ),
    favorites: () => (
      <AssetsPage
        authUser={authUser}
        onOpenAuth={onOpenAuth}
        onOpenFeature={handleNavChange}
        onOpenInvite={openInviteDialog}
        pageMode="favorites"
      />
    ),
    billing: () => (
      <AssetsPage
        authUser={authUser}
        onOpenAuth={onOpenAuth}
        onOpenFeature={handleNavChange}
        onOpenInvite={openInviteDialog}
        pageMode="billing"
      />
    ),
    image: () => (
      <ImageGenerationView
        authUser={authUser}
        isActive={activeNav === "image"}
        onOpenAuth={onOpenAuth}
        resetSignal={composerResetSignals.image}
        launchSeed={imageLaunchSeed}
        onLaunchSeedConsumed={() => setImageLaunchSeed(null)}
      />
    ),
    video: () => (
      <VideoGenerationView
        authUser={authUser}
        onOpenAuth={onOpenAuth}
        resetSignal={composerResetSignals.video}
        isActive={activeNav === "video"}
      />
    ),
    chat: () => (
      <ChatGenerationView authUser={authUser} onOpenAuth={onOpenAuth} />
    ),
    "infinite-canvas": () => (
      <InfiniteCanvasHost
        authUser={authUser}
        onOpenAuth={onOpenAuth}
        onOpenFeature={handleNavChange}
      />
    ),
    "digital-human": () => (
      <DigitalHumanHubView
        isActive={activeNav === "digital-human"}
        onOpenFeature={handleNavChange}
        viewMode={digitalHumanMode}
      />
    ),
    motion: () => (
      <MotionTransferWorkflowView isActive={activeNav === "motion"} />
    ),
    "face-swap": () => (
      <FaceSwapWorkflowView isActive={activeNav === "face-swap"} />
    ),
    watermark: () => (
      <WatermarkRemovalView
        authUser={authUser}
        onOpenAuth={onOpenAuth}
        onOpenFeature={handleNavChange}
        isActive={activeNav === "watermark"}
      />
    ),
    voice: () => (
      <VoiceSynthesisView
        authUser={authUser}
        onOpenAuth={onOpenAuth}
        onOpenFeature={handleNavChange}
        resetSignal={audioResetSignals.voice}
      />
    ),
    "voice-convert": () => (
      <VoiceConvertView
        onOpenFeature={handleNavChange}
        resetSignal={audioResetSignals["voice-convert"]}
      />
    ),
    transcribe: () => (
      <TranscribeView
        authUser={authUser}
        onOpenFeature={handleNavChange}
        resetSignal={audioResetSignals.transcribe}
      />
    ),
    article: () => (
      <ArticleGenerationView
        authUser={authUser}
        onOpenAuth={onOpenAuth}
        mode={articleMode}
        onModeChange={setArticleMode}
        isActive={activeNav === "article"}
        ShowcaseCardComponent={ViralGraphicGeneratorShowcaseCard}
      />
    ),
    music: () => (
      <MusicGenerationView
        onOpenFeature={handleNavChange}
        resetSignal={audioResetSignals.music}
      />
    ),
    replicate: () => (
      <ReplicateView authUser={authUser} onOpenFeature={handleOpenFeature} />
    ),
    enhance: () => <EnhanceView onOpenFeature={handleNavChange} />,
    "remove-bg": () => <RemoveBgView onOpenFeature={handleNavChange} />,
    "video-voice": () => (
      <VideoDubbingView
        authUser={authUser}
        onOpenFeature={handleNavChange}
        resetSignal={audioResetSignals["video-voice"]}
      />
    ),
  });

  return (
    <>
      <AppShell
        activeNav={activeNav}
        isGuest={isGuest}
        sidebar={
          <AppSidebar
            activeNav={activeNav}
            navItems={navItems}
            navSections={navSections}
            onNavChange={handleNavChange}
            onPrefetchNav={preloadFeatureView}
            onOpenLanding={onOpenLanding}
            notificationSummary={notificationSummary}
          />
        }
        header={activeNav === "infinite-canvas" ? null : (
          <AppHeader>
            <WorkbenchTopbar
              activeNav={activeNav}
              authUser={authUser}
              defaultUserAvatarSrc={defaultUserAvatarSrc}
              onNavChange={handleNavChange}
              onLogout={onLogout}
              onOpenAuth={onOpenAuth}
              onOpenInvite={openInviteDialog}
              onOpenLibrary={openInspirationLibrary}
              articleMode={articleMode}
              onArticleModeChange={setArticleMode}
              digitalHumanMode={digitalHumanMode}
              onDigitalHumanModeChange={setDigitalHumanMode}
              notificationSummary={notificationSummary}
            />
          </AppHeader>
        )}
      >
        <AppContent
          activeNav={activeNav}
          FeatureModule={FeatureModuleKeepAlive}
          visitedIds={visitedIds}
          viewRegistry={viewRegistry}
          fallback={<ComingSoon activeNav={activeNav} />}
        />
      </AppShell>
      {showInspirationLibrary && (
        <Suspense fallback={null}>
          <InspirationLibraryDrawer
            open
            activeTab={inspirationLibraryTab}
            onTabChange={setInspirationLibraryTab}
            onClose={() => setShowInspirationLibrary(false)}
            onOpenFeature={handleNavChange}
          />
        </Suspense>
      )}
      {showInvite && (
        <Suspense fallback={null}>
          <InviteGiftDialog
            authUser={authUser}
            onClose={() => setShowInvite(false)}
            onOpenAuth={onOpenAuth}
            onCopyText={writeClipboardText}
          />
        </Suspense>
      )}
    </>
  );
}

export function ImageFeaturePage(props) {
  return (
    <ConfigProvider>
      <ImageFeaturePageContent {...props} />
    </ConfigProvider>
  );
}
