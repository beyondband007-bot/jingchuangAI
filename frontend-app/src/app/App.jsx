import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { authApi } from "../api/authApi";
import { paymentApi } from "../api/paymentApi";
import {
  emitCreditsUpdated,
  subscribeCreditsUpdated,
} from "../api/creditsEvents";
import {
  appEntryStorageKey,
  getInitialView,
  getRouteView,
} from "./routing";
import { featureNavIdSet } from "../layouts/navigation";
import {
  captureInviteCodeForCurrentLocation,
  clearPendingInviteCode,
  getPendingInviteCode,
  inviteRewardPoints,
  pendingInviteBonusStorageKey,
  registerGrantPoints,
} from "../features/invite/inviteUtils";

const AuthDrawer = lazy(() =>
  import("../features/auth/AuthDrawer").then((module) => ({
    default: module.AuthDrawer,
  })),
);
const ImageFeaturePage = lazy(() =>
  import("./ImageFeaturePage").then((module) => ({
    default: module.ImageFeaturePage,
  })),
);
const LogoutConfirmDialog = lazy(() =>
  import("../components/LogoutConfirmDialog").then((module) => ({
    default: module.LogoutConfirmDialog,
  })),
);
const StudioLanding = lazy(() =>
  import("../StudioLanding").then((module) => ({
    default: module.StudioLanding,
  })),
);
const AppHome = lazy(() =>
  import("../features/home/HomeViews").then((module) => ({
    default: module.AppHome,
  })),
);
const LegalDocumentPage = lazy(() =>
  import("../features/legal/LegalDocumentPage").then((module) => ({
    default: module.LegalDocumentPage,
  })),
);

function RouteLoadingFallback() {
  return (
    <main className="app-route-loading" aria-live="polite">
      正在加载…
    </main>
  );
}

export function App() {
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
        <Suspense fallback={<RouteLoadingFallback />}>
          <LegalDocumentPage
            documentKey={String(view).slice("legal:".length)}
            onOpenHome={openLanding}
          />
        </Suspense>
      );
    }

    if (view === "home") {
      return (
        <Suspense fallback={<RouteLoadingFallback />}>
          <AppHome
            onOpenFeature={openFeature}
            onOpenLanding={openLanding}
            authUser={authUser}
            onOpenAuth={setAuthDrawerMode}
            onLogout={requestLogout}
          />
        </Suspense>
      );
    }

    if (featureNavIdSet.has(view)) {
      return (
        <Suspense fallback={<RouteLoadingFallback />}>
          <ImageFeaturePage
            initialNav={view}
            onOpenHome={openHome}
            onOpenLanding={openLanding}
            authUser={authUser}
            onOpenAuth={setAuthDrawerMode}
            onLogout={requestLogout}
          />
        </Suspense>
      );
    }

    return (
      <Suspense fallback={<RouteLoadingFallback />}>
        <StudioLanding
          onOpenAuth={setAuthDrawerMode}
          onEnterApp={enterAppHome}
          onEnterCreation={enterCreationCenter}
        />
      </Suspense>
    );
  })();

  return (
    <>
      {page}
      {authDrawerMode && (
        <Suspense fallback={null}>
          <AuthDrawer
            mode={authDrawerMode}
            onClose={() => setAuthDrawerMode(null)}
            onModeChange={setAuthDrawerMode}
            onSuccess={finishAuth}
            getInviteCode={getPendingInviteCode}
          />
        </Suspense>
      )}
      {isLogoutConfirmOpen && (
        <Suspense fallback={null}>
          <LogoutConfirmDialog
            isSubmitting={isLoggingOut}
            onCancel={cancelLogout}
            onConfirm={confirmLogout}
          />
        </Suspense>
      )}
    </>
  );
}
