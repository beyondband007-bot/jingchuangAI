export function normalizeProviderTaskStatus(status) {
  return status === "pending" ? "processing" : status;
}

export function getProviderTaskProgress({ status, providerTaskId }) {
  if (status === "completed") return 100;
  if (status === "failed") return 0;
  return providerTaskId ? 68 : 24;
}
