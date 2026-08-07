import { config } from "../../config/index.js";
import { KNOWN_GENERATION_UNREAD_SOURCE_TYPES } from "../../config/generationUnread.js";

const requiredAdapterFunctions = [
  "validateResourceKey",
  "buildUnreadCountFragment",
  "listReadableResourceKeys",
  "findOwnedReadableResource",
];
const knownSourceTypes = new Set(KNOWN_GENERATION_UNREAD_SOURCE_TYPES);

function validateAdapter(adapter, sourceTypes) {
  if (!adapter || typeof adapter !== "object") {
    throw new TypeError("Generation result source adapter must be an object");
  }
  if (typeof adapter.sourceType !== "string" || !adapter.sourceType) {
    throw new TypeError("Generation result source adapter requires sourceType");
  }
  if (!knownSourceTypes.has(adapter.sourceType)) {
    throw new Error(`Unknown generation result source adapter: ${adapter.sourceType}`);
  }
  if (sourceTypes.has(adapter.sourceType)) {
    throw new Error(`Duplicate generation result source adapter: ${adapter.sourceType}`);
  }
  if (typeof adapter.navId !== "string" || !adapter.navId) {
    throw new TypeError(`Generation result source adapter ${adapter.sourceType} requires navId`);
  }
  requiredAdapterFunctions.forEach((functionName) => {
    if (typeof adapter[functionName] !== "function") {
      throw new TypeError(`Generation result source adapter ${adapter.sourceType} requires ${functionName}`);
    }
  });
}

export function createGenerationResultSourceRegistry(
  adapters = [],
  unreadConfig = config.generationUnread,
) {
  const adapterBySource = new Map();
  adapters.forEach((adapter) => {
    validateAdapter(adapter, adapterBySource);
    adapterBySource.set(adapter.sourceType, Object.freeze({ ...adapter }));
  });

  function getEnabledAdapter(sourceType) {
    if (!unreadConfig.enabledSources.has(sourceType)) return null;
    if (!unreadConfig.sourceEnabledAt.has(sourceType)) return null;
    return adapterBySource.get(sourceType) || null;
  }

  return Object.freeze({
    get(sourceType) {
      return adapterBySource.get(sourceType) || null;
    },
    getEnabledAdapter,
    getSourceEnabledAt(sourceType) {
      return getEnabledAdapter(sourceType) ? unreadConfig.sourceEnabledAt.get(sourceType) : null;
    },
    getHistoryWindowSize() {
      return unreadConfig.historyWindowSize;
    },
    listEnabledAdapters() {
      return [...adapterBySource.values()].filter((adapter) => getEnabledAdapter(adapter.sourceType));
    },
  });
}

// Business source adapters are added to this explicit array in their own rollout stages.
// Keeping it empty makes the common backend safe to deploy before any source is enabled.
const generationResultSourceAdapters = Object.freeze([]);

export const generationResultSourceRegistry = createGenerationResultSourceRegistry(
  generationResultSourceAdapters,
);
