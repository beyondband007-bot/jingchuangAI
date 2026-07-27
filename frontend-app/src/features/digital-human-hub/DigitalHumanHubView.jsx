import React from "react";
import { DigitalHumanV2View } from "../digital-human-v2/DigitalHumanV2View";
import { DigitalHumanHistoryView } from "./DigitalHumanHistoryView";
import { openAssetsGallery } from "../../utils/openAssetsGallery";
import "./digitalHumanHub.css";

const TAB_KEYS = {
  avatar: "avatar",
  history: "history",
};

export function DigitalHumanHubView({
  isActive = true,
  onOpenFeature,
  viewMode = TAB_KEYS.avatar,
}) {
  const activeTab = viewMode === TAB_KEYS.history ? TAB_KEYS.history : TAB_KEYS.avatar;

  function handleOpenAssets() {
    openAssetsGallery({ tab: "全部", onNavigate: onOpenFeature });
  }

  return (
    <section className="dh-hub" aria-label="数字人创作">
      <div className="dh-hub__panel">
        <div
          className={`dh-hub__view${activeTab === TAB_KEYS.avatar ? " is-active" : ""}`}
          hidden={activeTab !== TAB_KEYS.avatar}
        >
          <DigitalHumanV2View
            isActive={isActive && activeTab === TAB_KEYS.avatar}
            embedded
            onOpenAssets={handleOpenAssets}
          />
        </div>
        <div
          className={`dh-hub__view${activeTab === TAB_KEYS.history ? " is-active" : ""}`}
          hidden={activeTab !== TAB_KEYS.history}
        >
          <DigitalHumanHistoryView
            isActive={isActive && activeTab === TAB_KEYS.history}
          />
        </div>
      </div>
    </section>
  );
}
