/** Feature modules unmount when inactive so re-entering a page starts fresh. */
export function FeatureModuleKeepAlive({ id, activeNav, visitedIds, children }) {
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

export function clearStaleGlobalScrollLocks() {
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
