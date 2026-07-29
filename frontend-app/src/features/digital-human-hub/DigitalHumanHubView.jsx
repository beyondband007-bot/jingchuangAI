import React, { useState } from "react";
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
  onViewModeChange,
  viewMode = TAB_KEYS.avatar,
}) {
  const activeTab = viewMode === TAB_KEYS.history ? TAB_KEYS.history : TAB_KEYS.avatar;
  const [resumeTask, setResumeTask] = useState(null);

  function handleOpenAssets() {
    openAssetsGallery({ tab: "全部", onNavigate: onOpenFeature });
  }

  function handleResumeTask(task) {
    setResumeTask({
      ...task,
      resumeToken: `${task.id}-${Date.now()}`,
    });
    onViewModeChange?.(TAB_KEYS.avatar);
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
            resumeTask={resumeTask}
            onResumeTaskHandled={(resumeToken) => {
              setResumeTask((current) =>
                current?.resumeToken === resumeToken ? null : current,
              );
            }}
          />
        </div>
        <div
          className={`dh-hub__view${activeTab === TAB_KEYS.history ? " is-active" : ""}`}
          hidden={activeTab !== TAB_KEYS.history}
        >
          <DigitalHumanHistoryView
            isActive={isActive && activeTab === TAB_KEYS.history}
            onResumeTask={handleResumeTask}
          />
        </div>
      </div>
    </section>
  );
}
