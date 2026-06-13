import { config } from "../../config/index.js";
import { requestArkOpenApi } from "./openapi.js";

function withProjectName(body = {}) {
  return {
    ...body,
    ProjectName: body.ProjectName || config.ark.projectName
  };
}

export async function createArkAssetGroup({ name, description = "", projectName } = {}) {
  return requestArkOpenApi(
    "CreateAssetGroup",
    withProjectName({
      ...(projectName ? { ProjectName: projectName } : {}),
      Name: name,
      Description: description,
      GroupType: "AIGC"
    })
  );
}

export async function listArkAssetGroups({ name, pageNumber = 1, pageSize = 10, projectName } = {}) {
  const filter = { GroupType: "AIGC" };
  if (name) filter.Name = name;
  return requestArkOpenApi(
    "ListAssetGroups",
    withProjectName({
      ...(projectName ? { ProjectName: projectName } : {}),
      Filter: filter,
      PageNumber: pageNumber,
      PageSize: pageSize
    })
  );
}

export async function createArkAsset({ groupId, url, assetType, name = "", projectName }) {
  return requestArkOpenApi(
    "CreateAsset",
    withProjectName({
      ...(projectName ? { ProjectName: projectName } : {}),
      GroupId: groupId,
      URL: url,
      AssetType: assetType,
      Name: name
    })
  );
}

export async function getArkAsset({ assetId, projectName }) {
  return requestArkOpenApi(
    "GetAsset",
    withProjectName({
      ...(projectName ? { ProjectName: projectName } : {}),
      Id: assetId
    })
  );
}

export async function listArkAssets({ groupIds = [], statuses = ["Active", "Processing", "Failed"], pageNumber = 1, pageSize = 10, projectName } = {}) {
  return requestArkOpenApi(
    "ListAssets",
    withProjectName({
      ...(projectName ? { ProjectName: projectName } : {}),
      Filter: {
        GroupType: "AIGC",
        ...(groupIds.length ? { GroupIds: groupIds } : {}),
        Statuses: statuses
      },
      PageNumber: pageNumber,
      PageSize: pageSize
    })
  );
}

export function mapArkAssetStatus(status = "") {
  if (status === "Active") return "active";
  if (status === "Failed") return "failed";
  return "processing";
}

export function getArkAssetError(asset = {}) {
  return asset?.Error?.Message || asset?.Error?.Code || asset?.error?.message || asset?.error?.code || "";
}
