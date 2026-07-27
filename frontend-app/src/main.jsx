import React, { Component, lazy, Suspense } from "react";
import { createRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/base.css";
import "./styles/components.css";
import "./styles/componentsAdvanced.css";

const moduleRecoveryKey = "facemini:module-recovery-path";

function isDynamicModuleLoadError(error) {
  const message = String(error?.message || error || "");
  return /failed to fetch dynamically imported module|err_cache_read_failure|vite:preloaderror/i.test(
    message,
  );
}

function recoverFromModuleLoadError(error) {
  if (!isDynamicModuleLoadError(error)) return;
  const currentPath = `${window.location.pathname}${window.location.search}`;
  if (window.sessionStorage.getItem(moduleRecoveryKey) === currentPath) return;
  window.sessionStorage.setItem(moduleRecoveryKey, currentPath);
  window.location.reload();
}

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  recoverFromModuleLoadError(event.payload);
});
window.addEventListener("unhandledrejection", (event) => {
  if (!isDynamicModuleLoadError(event.reason)) return;
  event.preventDefault();
  recoverFromModuleLoadError(event.reason);
});

const AppBootstrap = lazy(() =>
  import("./app/AppBootstrap").then((module) => ({
    default: module.AppBootstrap,
  })),
);

function AppLoadingFallback() {
  return (
    <main className="app-route-loading" aria-live="polite">
      正在加载…
    </main>
  );
}

class AppErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    recoverFromModuleLoadError(error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <main className="app-route-loading" role="alert">
        <p>页面模块加载失败，请刷新后重试。</p>
        <button type="button" onClick={() => window.location.reload()}>
          重新加载
        </button>
      </main>
    );
  }
}

const originalFetch = window.fetch.bind(window);
window.fetch = (input, init = {}) =>
  originalFetch(input, { credentials: "include", ...init });

const rootElement = document.getElementById("root");
const appRoot =
  rootElement.__faceminiReactRoot ||
  (rootElement.__faceminiReactRoot = createRoot(rootElement));

appRoot.render(
  <React.StrictMode>
    <AppErrorBoundary>
      <Suspense fallback={<AppLoadingFallback />}>
        <AppBootstrap />
      </Suspense>
    </AppErrorBoundary>
  </React.StrictMode>,
);
