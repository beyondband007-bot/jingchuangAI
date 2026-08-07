import { createHttpError } from "../../shared/http.js";
import { insertReadReceipt } from "./generationResultRead.repository.js";
import { generationResultSourceRegistry } from "./generationResultSources.js";

const sourceTypePattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const resourceKeyPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/;
const allowedInputFields = new Set(["sourceType", "resourceKey"]);

export function normalizeGenerationResultReadInput(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw createHttpError("Invalid read receipt input", 400);
  }
  if (Object.keys(input).some((key) => !allowedInputFields.has(key))) {
    throw createHttpError("Invalid read receipt input", 400);
  }

  const sourceType = typeof input.sourceType === "string" ? input.sourceType.trim() : "";
  const resourceKey = typeof input.resourceKey === "string" ? input.resourceKey.trim() : "";
  if (!sourceType || sourceType.length > 40 || !sourceTypePattern.test(sourceType)) {
    throw createHttpError("Invalid sourceType", 400);
  }
  if (!resourceKey || resourceKey.length > 191 || !resourceKeyPattern.test(resourceKey)) {
    throw createHttpError("Invalid resourceKey", 400);
  }
  return { sourceType, resourceKey };
}

export function createGenerationResultReadService({
  registry = generationResultSourceRegistry,
  readRepository = { insertReadReceipt },
} = {}) {
  return Object.freeze({
    async markResultRead({ userId, input }) {
      const { sourceType, resourceKey } = normalizeGenerationResultReadInput(input);
      const registeredAdapter = registry.get(sourceType);
      if (!registeredAdapter) {
        throw createHttpError("Invalid sourceType", 400);
      }
      const adapter = registry.getEnabledAdapter(sourceType);
      if (!adapter) return false;
      if (!adapter.validateResourceKey(resourceKey)) {
        throw createHttpError("Invalid resourceKey", 400);
      }

      const readableResource = await adapter.findOwnedReadableResource({
        userId,
        resourceKey,
        sourceEnabledAt: registry.getSourceEnabledAt(sourceType),
        windowSize: registry.getHistoryWindowSize(),
      });
      if (!readableResource) return false;

      await readRepository.insertReadReceipt({ userId, sourceType, resourceKey });
      return true;
    },
  });
}

const generationResultReadService = createGenerationResultReadService();

export async function markGenerationResultRead(input) {
  return generationResultReadService.markResultRead(input);
}
