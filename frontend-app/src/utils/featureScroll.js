export function getFeatureScrollContainer() {
  return document.querySelector(".app-shell__content.feature-main");
}

export function getFeatureScrollTop() {
  return getFeatureScrollContainer()?.scrollTop || window.scrollY || 0;
}

export function scrollFeatureTo(top, options = {}) {
  const scrollContainer = getFeatureScrollContainer();
  if (scrollContainer) {
    scrollContainer.scrollTo({ top, left: 0, ...options });
    return;
  }
  window.scrollTo({ top, left: 0, ...options });
}
