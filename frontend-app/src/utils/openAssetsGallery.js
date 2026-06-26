export const ASSETS_VIEW_MODE_STORAGE_KEY = "facemini:assets-view-mode";
export const ASSET_GALLERY_TAB_STORAGE_KEY = "facemini:asset-gallery-tab";

export function openAssetsGallery({ tab = "全部", subTab = "", onNavigate } = {}) {
  try {
    window.sessionStorage.setItem(ASSETS_VIEW_MODE_STORAGE_KEY, "gallery");
    window.sessionStorage.setItem(ASSET_GALLERY_TAB_STORAGE_KEY, tab);
    if (subTab) {
      window.sessionStorage.setItem("facemini:assets-subtab", subTab);
    }
  } catch {
    // Session storage can be unavailable in restricted browser contexts.
  }

  window.dispatchEvent(
    new CustomEvent("facemini-assets-tab-change", {
      detail: { tab, subTab, viewMode: "gallery" },
    }),
  );

  onNavigate?.("assets");
}
