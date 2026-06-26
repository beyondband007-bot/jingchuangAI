import React from "react";
import { faceSwapApi } from "../../api/faceSwapApi";
import { VideoGenerationWorkflow } from "../video-workflow/VideoGenerationWorkflow";

const emptyOptions = {
  models: [],
  defaults: { model: "", resolution: "720p" },
  limits: {
    maxImageBytes: 10 * 1024 * 1024,
    maxVideoBytes: 200 * 1024 * 1024,
  },
};

export function FaceSwapWorkflowView({ isActive = true }) {
  return (
    <VideoGenerationWorkflow
      isActive={isActive}
      api={faceSwapApi}
      activeTaskKey="jingchuang-ai:face-swap:active-task-id"
      moduleId="face-swap"
      emptyOptions={emptyOptions}
      header={{
        title: "视频换脸生成",
        description: "上传人脸与目标视频，AI 将身份自然融合到每一帧画面",
      }}
      privacyText="您上传的内容仅用于换脸处理，不会被用于其他用途"
      historyEmptyHint="完成的换脸视频会显示在这里"
      subjectSlot={{
        title: "人脸照片",
        hint: "正脸清晰，光线自然",
        fileFallback: "人脸图片",
        requiredMessage: "请先上传人脸图片",
      }}
      driverSlot={{
        title: "目标视频",
        hint: "≤15 秒，主体清晰",
        fileFallback: "目标视频",
        requiredMessage: "请先上传目标视频",
      }}
      compareLabels={["原视频", "换脸后"]}
      buildCreatePayload={(input) => ({
        imageAssetId: input.imageAsset.id,
        videoAssetId: input.videoAsset.id,
        model: input.model,
        resolution: input.resolution,
      })}
    />
  );
}
