import React from "react";
import { motionTransferApi } from "../../api/motionTransferApi";
import { VideoGenerationWorkflow } from "../video-workflow/VideoGenerationWorkflow";

const emptyOptions = {
  models: [],
  defaults: {
    model: "",
    resolution: "720p",
    characterOrientation: "image",
  },
  characterOrientations: [],
  modes: [
    { value: "720p", label: "720p" },
    { value: "1080p", label: "1080p" },
  ],
  limits: {
    maxImageBytes: 10 * 1024 * 1024,
    maxVideoBytes: 100 * 1024 * 1024,
  },
};

export function MotionTransferWorkflowView({ isActive = true }) {
  return (
    <VideoGenerationWorkflow
      isActive={isActive}
      api={motionTransferApi}
      activeTaskKey="jingchuang-ai:motion:active-task-id"
      moduleId="motion"
      emptyOptions={emptyOptions}
      hideCharacterOrientation
      header={{
        title: "动作迁移生成",
        description: "上传人物图与动作参考视频，让静态角色自然完成同款动作",
      }}
      privacyText="您上传的内容仅用于动作迁移处理，不会被用于其他用途"
      subjectSlot={{
        title: "人物照片",
        hint: "单人主体，姿态清晰",
        fileFallback: "人物图片",
        requiredMessage: "请先上传人物图片",
      }}
      driverSlot={{
        title: "动作视频",
        hint: "≤15 秒，动作连贯",
        fileFallback: "动作视频",
        requiredMessage: "请先上传动作视频",
      }}
      compareLabels={["参考视频", "迁移结果"]}
      buildCreatePayload={(input) => ({
        imageAssetId: input.imageAsset.id,
        videoAssetId: input.videoAsset.id,
        model: input.model,
        resolution: input.resolution,
        characterOrientation: "image",
      })}
    />
  );
}
