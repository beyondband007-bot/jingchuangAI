import React, { useState } from "react";
import { Tabs } from "@arco-design/web-react";
import { DigitalHumanV2View } from "../digital-human-v2/DigitalHumanV2View";
import { PhotoDigitalHumanView } from "../photo-digital-human-v2/PhotoDigitalHumanView";
import { DigitalHumanHistoryView } from "./DigitalHumanHistoryView";
import { openAssetsGallery } from "../../utils/openAssetsGallery";
import "./digitalHumanHub.scss";
import "./digitalHumanHistory.scss";

const TAB_KEYS = {
  avatar: "avatar",
  photo: "photo",
  history: "history",
};

export function DigitalHumanHubView({ isActive = true, onOpenFeature }) {
  const [activeTab, setActiveTab] = useState(TAB_KEYS.avatar);

  function handleOpenAssets() {
    openAssetsGallery({ tab: "全部", onNavigate: onOpenFeature });
  }

  return (
    <section className="dh-hub" aria-label="数字人创作">
      <Tabs
        className="dh-hub__tabs"
        activeTab={activeTab}
        onChange={setActiveTab}
        type="line"
      >
        <Tabs.TabPane key={TAB_KEYS.avatar} title="数字人形象" />
        <Tabs.TabPane key={TAB_KEYS.history} title="历史记录" />
      </Tabs>

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
          className={`dh-hub__view${activeTab === TAB_KEYS.photo ? " is-active" : ""}`}
          hidden={activeTab !== TAB_KEYS.photo}
        >
          <PhotoDigitalHumanView
            isActive={isActive && activeTab === TAB_KEYS.photo}
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
