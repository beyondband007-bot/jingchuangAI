import { listReadResourceKeys } from "./generationResultRead.repository.js";
import { generationResultSourceRegistry } from "./generationResultSources.js";

function defaultGetResourceKey(item) {
  return item?.resourceKey;
}

function withUnreadFields(item, sourceType, resourceKey, isUnread) {
  return { ...item, sourceType, resourceKey, isUnread };
}

export async function decorateGenerationResults({
  userId,
  sourceType,
  items,
  getResourceKey = defaultGetResourceKey,
  registry = generationResultSourceRegistry,
  readRepository = { listReadResourceKeys },
  logError = console.error,
}) {
  const sourceItems = Array.isArray(items) ? items : [];
  const identities = sourceItems.map((item) => {
    try {
      const value = getResourceKey(item);
      return value === undefined || value === null ? "" : String(value);
    } catch (error) {
      logError("[generation-unread] resource identity unavailable", {
        sourceType,
        error: error?.message || String(error),
      });
      return "";
    }
  });

  try {
    const adapter = registry.getEnabledAdapter(sourceType);
    if (!adapter) {
      return sourceItems.map((item, index) => withUnreadFields(item, sourceType, identities[index], false));
    }

    const resourceKeys = [...new Set(identities.filter((key) => adapter.validateResourceKey(key)))];
    if (resourceKeys.length === 0) {
      return sourceItems.map((item, index) => withUnreadFields(item, sourceType, identities[index], false));
    }

    const readableResourceKeys = await adapter.listReadableResourceKeys({
      userId,
      resourceKeys,
      sourceEnabledAt: registry.getSourceEnabledAt(sourceType),
      windowSize: registry.getHistoryWindowSize(),
    });
    const readableKeys = readableResourceKeys instanceof Set
      ? readableResourceKeys
      : new Set(readableResourceKeys || []);
    const readKeys = readableKeys.size > 0
      ? await readRepository.listReadResourceKeys({
        userId,
        sourceType,
        resourceKeys: [...readableKeys],
      })
      : new Set();

    return sourceItems.map((item, index) => {
      const resourceKey = identities[index];
      const isUnread = readableKeys.has(resourceKey) && !readKeys.has(resourceKey);
      return withUnreadFields(item, sourceType, resourceKey, isUnread);
    });
  } catch (error) {
    logError("[generation-unread] history decoration unavailable", {
      sourceType,
      error: error?.message || String(error),
    });
    return sourceItems.map((item, index) => withUnreadFields(item, sourceType, identities[index], false));
  }
}
