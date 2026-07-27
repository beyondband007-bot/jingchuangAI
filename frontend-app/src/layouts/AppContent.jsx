import { Suspense } from "react";

function FeatureLoadingFallback() {
  return <div className="feature-loading-fallback" aria-live="polite">加载中...</div>;
}

export function AppContent({
  activeNav,
  FeatureModule,
  visitedIds,
  viewRegistry,
  fallback = null,
}) {
  const activeView = viewRegistry.find((view) => view.id === activeNav);

  if (!activeView) return fallback;

  return (
    <FeatureModule
      id={activeView.id}
      activeNav={activeNav}
      visitedIds={visitedIds}
    >
      <Suspense fallback={<FeatureLoadingFallback />}>
        {activeView.render()}
      </Suspense>
    </FeatureModule>
  );
}
