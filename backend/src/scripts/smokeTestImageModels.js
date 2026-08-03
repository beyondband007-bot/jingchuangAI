import { getPool } from "../db/pool.js";
import { getKieTask, requestKie } from "../providers/kie/client.js";
import { createTask, getCredits, getTask } from "../modules/image/image.service.js";

const runId = process.env.IMAGE_SMOKE_RUN_ID || `codex-image-model-smoke-${Date.now()}`;
const userId = Number(process.env.IMAGE_SMOKE_USER_ID || 1);
const timeoutMs = Number(process.env.IMAGE_SMOKE_TIMEOUT_MS || 5 * 60 * 1000);
const pollIntervalMs = Number(process.env.IMAGE_SMOKE_POLL_INTERVAL_MS || 5000);
const prompt =
  process.env.IMAGE_SMOKE_PROMPT ||
  "A minimalist studio photograph of a small red paper boat on calm blue water, soft daylight, clean background, no text";
const supportedModelKeys = new Set(["flux_2_pro", "seedream_4_5"]);
const modelKeys = String(
  process.env.IMAGE_SMOKE_MODELS || "flux_2_pro,seedream_4_5",
)
  .split(",")
  .map((value) => value.trim())
  .filter((value) => supportedModelKeys.has(value));
const terminalStatuses = new Set(["completed", "failed"]);

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseJson(value, fallback = []) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

async function getProviderCredits() {
  const response = await requestKie("/api/v1/chat/credit", { method: "GET" });
  return Number(response.data);
}

async function run() {
  if (!modelKeys.length) {
    throw new Error("IMAGE_SMOKE_MODELS does not contain a supported model key");
  }
  console.log(`[${runId}] starting real image model smoke test for ${modelKeys.join(", ")}`);
  const [appCreditsBefore, providerCreditsBefore] = await Promise.all([
    getCredits(userId),
    getProviderCredits(),
  ]);

  const tasks = [];
  for (const model of modelKeys) {
    const task = await createTask(
      {
        model,
        prompt,
        ratio: "1:1",
        quality: "1K",
        count: 1,
        source: "codex-smoke-test",
        threadId: runId,
      },
      userId,
    );
    tasks.push(task);
    console.log(
      `[${runId}] submitted ${model}: localTaskId=${task.id}, providerTaskId=${task.providerTaskId || "none"}, status=${task.status}`,
    );
  }

  const deadline = Date.now() + timeoutMs;
  let current = tasks;
  while (current.some((task) => !terminalStatuses.has(task.status)) && Date.now() < deadline) {
    await wait(pollIntervalMs);
    current = await Promise.all(current.map((task) => getTask(task.id, userId)));
    console.log(
      `[${runId}] poll ${current.map((task) => `${task.modelKey}:${task.status}`).join(", ")}`,
    );
  }

  const taskIds = current.map((task) => task.id);
  const placeholders = taskIds.map(() => "?").join(",");
  const [rows] = await getPool().query(
    `SELECT id, model_key, provider_task_id, status, cost_points, refunded,
            result_urls, provider_result_urls, error_message
     FROM image_generation_tasks
     WHERE id IN (${placeholders})
     ORDER BY id ASC`,
    taskIds,
  );
  const providerRecords = await Promise.all(
    rows.map(async (row) => {
      if (!row.provider_task_id) return null;
      const record = await getKieTask(row.provider_task_id);
      return {
        taskId: row.provider_task_id,
        model: record.data?.model || null,
        state: record.data?.state || null,
        creditsConsumed: Number(record.data?.creditsConsumed || 0),
        failCode: record.data?.failCode || null,
        failMsg: record.data?.failMsg || null,
        costTime: Number(record.data?.costTime || 0),
      };
    }),
  );
  const [appCreditsAfter, providerCreditsAfter] = await Promise.all([
    getCredits(userId),
    getProviderCredits(),
  ]);

  const report = {
    runId,
    userId,
    prompt,
    startedWith: {
      appCredits: Number(appCreditsBefore.balance),
      providerCredits: providerCreditsBefore,
    },
    endedWith: {
      appCredits: Number(appCreditsAfter.balance),
      providerCredits: providerCreditsAfter,
    },
    deltas: {
      appCredits: Number(appCreditsAfter.balance) - Number(appCreditsBefore.balance),
      providerCredits: providerCreditsAfter - providerCreditsBefore,
    },
    tasks: rows.map((row, index) => ({
      localTaskId: row.id,
      modelKey: row.model_key,
      providerTaskId: row.provider_task_id,
      status: row.status,
      costPoints: Number(row.cost_points),
      refunded: Boolean(row.refunded),
      localResultUrls: parseJson(row.result_urls),
      providerResultUrls: parseJson(row.provider_result_urls),
      error: row.error_message || null,
      provider: providerRecords[index],
    })),
  };

  console.log(`IMAGE_SMOKE_REPORT=${JSON.stringify(report)}`);
  if (report.tasks.some((task) => task.status !== "completed")) {
    process.exitCode = 1;
  }
}

run()
  .catch((error) => {
    console.error(`[${runId}] smoke test failed:`, error.message, error.body || "");
    process.exitCode = 1;
  })
  .finally(async () => {
    await getPool().end();
  });
