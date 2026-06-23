# AI 音乐歌词同步技术方案：腾讯云 ASR 词级时间戳

## 1. 背景

当前 AI 音乐生成后，系统可以拿到两类数据：

- 生成后的音频文件
- 用户输入的原始歌词

目标是在历史记录中播放音乐时，让歌词能按音频进度高亮滚动。

普通播放器插件只能解决展示和滚动问题，不能自动判断“哪句歌词在第几秒唱”。因此需要引入歌词时间轴。

本方案使用腾讯云录音文件识别获取词级时间戳，再将识别结果和用户原始歌词做匹配，最终生成可播放的 LRC/JSON 时间轴。

## 2. 方案目标

实现：

1. 对指定音乐任务发起歌词同步。
2. 调用腾讯云录音文件识别，获取词级时间戳。
3. 将 ASR 文本与用户原始歌词匹配。
4. 生成 `lyrics_timeline`。
5. 前端播放音乐时按时间轴高亮歌词。
6. 匹配失败时不影响音乐播放，可提示用户重试或后续手动校准。

不做：

1. 不直接展示腾讯云识别文本。
2. 不覆盖用户原始歌词。
3. 不强制所有历史记录自动同步。
4. 第一版不做人声分离。
5. 第一版不做复杂波形编辑器。

## 3. 推荐技术路线

```text
AI 音乐音频 + 用户原始歌词
        |
        v
腾讯云录音文件识别 ResTextFormat = 3
        |
        v
词级时间戳 ASR 结果
        |
        v
ASR 文本与原始歌词逐行匹配
        |
        v
lyrics_timeline JSON
        |
        v
前端播放时高亮歌词
```

核心原则：

- 使用 ASR 的时间戳。
- 使用用户原始歌词作为最终展示文本。
- ASR 文本只用于对齐，不直接上屏。

## 4. 腾讯云文档

重点文档：

- 录音文件识别请求 API  
  https://cloud.tencent.com/document/product/1093/37823

- 录音文件识别结果查询 API  
  https://cloud.tencent.com/document/product/1093/37822

- 语音识别计费概述  
  https://cloud.tencent.com/document/product/1093/35686

- 腾讯云 SDK 中心  
  https://cloud.tencent.com/document/sdk

- Node.js SDK GitHub  
  https://github.com/TencentCloud/tencentcloud-sdk-nodejs

关键参数：

```text
ResTextFormat = 3
```

含义：返回词级时间戳，并按标点符号分段，适合字幕场景。

## 5. 依赖

在 `backend` 目录安装：

```bash
npm install tencentcloud-sdk-nodejs
```

## 6. 环境变量

在项目 `.env` 中增加：

```env
TENCENTCLOUD_SECRET_ID=
TENCENTCLOUD_SECRET_KEY=
TENCENTCLOUD_ASR_REGION=ap-guangzhou
TENCENTCLOUD_ASR_ENGINE=16k_zh
TENCENTCLOUD_ASR_RES_TEXT_FORMAT=3
TENCENTCLOUD_ASR_POLL_INTERVAL_MS=3000
TENCENTCLOUD_ASR_MAX_ATTEMPTS=80
PUBLIC_BASE_URL=
```

说明：

- `PUBLIC_BASE_URL` 用于把本地 `/media/...` 转成腾讯云可访问的公网 URL。
- 腾讯云不能访问 `localhost`。
- 生产环境应配置为正式域名，例如：

```env
PUBLIC_BASE_URL=https://jc.getrueai.com
```

## 7. 配置文件

修改：

```text
backend/src/config/index.js
```

增加：

```js
tencentCloud: {
  secretId: process.env.TENCENTCLOUD_SECRET_ID || "",
  secretKey: process.env.TENCENTCLOUD_SECRET_KEY || "",
  asrRegion: process.env.TENCENTCLOUD_ASR_REGION || "ap-guangzhou",
  asrEngine: process.env.TENCENTCLOUD_ASR_ENGINE || "16k_zh",
  asrResTextFormat: Number(process.env.TENCENTCLOUD_ASR_RES_TEXT_FORMAT || 3),
  asrPollIntervalMs: Number(process.env.TENCENTCLOUD_ASR_POLL_INTERVAL_MS || 3000),
  asrMaxAttempts: Number(process.env.TENCENTCLOUD_ASR_MAX_ATTEMPTS || 80),
},
publicBaseUrl: process.env.PUBLIC_BASE_URL || "",
```

如果项目已有类似 `media.publicBaseUrl` 配置，优先复用现有配置，不要重复造字段。

## 8. 数据库设计

给 `music_tasks` 增加字段。

推荐 SQL：

```sql
ALTER TABLE music_tasks
ADD COLUMN lyrics_timeline JSON NULL AFTER lyrics,
ADD COLUMN lyrics_sync_status ENUM('none','processing','completed','failed') NOT NULL DEFAULT 'none' AFTER lyrics_timeline,
ADD COLUMN lyrics_sync_error TEXT NULL AFTER lyrics_sync_status;
```

在数据库初始化脚本中也同步增加：

```text
backend/src/scripts/initDb.js
```

如果项目维护了 SQL dump，也同步修改：

```text
jingchuang_ai.sql
```

### 8.1 lyrics_timeline 格式

```json
[
  {
    "lineIndex": 0,
    "text": "风吹过操场边的白杨树",
    "startMs": 0,
    "endMs": 8430,
    "confidence": 0.82,
    "source": "tencent-asr"
  }
]
```

字段说明：

| 字段 | 说明 |
| --- | --- |
| `lineIndex` | 原始歌词行号 |
| `text` | 用户原始歌词行文本 |
| `startMs` | 开始时间，毫秒 |
| `endMs` | 结束时间，毫秒 |
| `confidence` | 匹配置信度，0-1 |
| `source` | 时间轴来源 |

## 9. 后端 Provider：腾讯云 ASR

新增文件：

```text
backend/src/providers/tencent/asr.js
```

职责：

1. 创建腾讯云 ASR Client。
2. 提交录音文件识别任务。
3. 查询任务状态。
4. 轮询直到完成。

示例代码：

```js
import tencentcloud from "tencentcloud-sdk-nodejs";
import { config } from "../../config/index.js";

const AsrClient = tencentcloud.asr.v20190614.Client;

function assertTencentAsrConfigured() {
  if (!config.tencentCloud?.secretId || !config.tencentCloud?.secretKey) {
    const error = new Error("Tencent Cloud ASR is not configured");
    error.status = 500;
    throw error;
  }
}

function createAsrClient() {
  assertTencentAsrConfigured();

  return new AsrClient({
    credential: {
      secretId: config.tencentCloud.secretId,
      secretKey: config.tencentCloud.secretKey,
    },
    region: config.tencentCloud.asrRegion || "ap-guangzhou",
    profile: {
      httpProfile: {
        endpoint: "asr.tencentcloudapi.com",
      },
    },
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function createTencentAsrTask({ audioUrl }) {
  const client = createAsrClient();

  return client.CreateRecTask({
    EngineModelType: config.tencentCloud.asrEngine || "16k_zh",
    ChannelNum: 1,
    ResTextFormat: Number(config.tencentCloud.asrResTextFormat || 3),
    SourceType: 0,
    Url: audioUrl,
  });
}

export async function getTencentAsrTaskStatus(taskId) {
  const client = createAsrClient();
  return client.DescribeTaskStatus({
    TaskId: Number(taskId),
  });
}

export async function waitForTencentAsrTask(taskId, options = {}) {
  const intervalMs = Number(options.intervalMs || config.tencentCloud.asrPollIntervalMs || 3000);
  const maxAttempts = Number(options.maxAttempts || config.tencentCloud.asrMaxAttempts || 80);

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const result = await getTencentAsrTaskStatus(taskId);
    const status = Number(result?.Data?.Status ?? result?.Status ?? -1);

    // 腾讯云状态以实际文档为准：
    // 常见含义：0 等待，1 执行中，2 成功，3 失败
    if (status === 2) return result;
    if (status === 3) {
      const error = new Error(result?.Data?.ErrorMsg || "Tencent ASR task failed");
      error.body = result;
      throw error;
    }

    await sleep(intervalMs);
  }

  const error = new Error("Tencent ASR task timed out");
  error.status = 504;
  throw error;
}
```

注意：

- 任务状态字段以腾讯云实际返回为准，Cursor 需要根据 SDK 返回对象微调。
- 所有异常要保留 `error.body`，便于排查。

## 10. 音频 URL 处理

新增工具函数，例如放在：

```text
backend/src/shared/url.js
```

或音乐模块内部。

```js
export function toPublicUrl(url, baseUrl) {
  const value = String(url || "").trim();
  if (!value) return "";
  if (/^https?:\/\//i.test(value)) return value;

  const base = String(baseUrl || "").replace(/\/$/, "");
  if (!base) {
    const error = new Error("PUBLIC_BASE_URL is required for relative media URL");
    error.status = 500;
    throw error;
  }

  return `${base}${value.startsWith("/") ? "" : "/"}${value}`;
}
```

## 11. Repository 修改

修改：

```text
backend/src/modules/music/music.repository.js
```

增加更新方法：

```js
export async function updateMusicLyricsSyncStatus(id, { status, errorMessage = "" }) {
  await getPool().query(
    `UPDATE music_tasks
     SET lyrics_sync_status = ?, lyrics_sync_error = ?
     WHERE id = ?`,
    [status, errorMessage || null, id]
  );
}

export async function saveMusicLyricsTimeline(id, timeline) {
  await getPool().query(
    `UPDATE music_tasks
     SET lyrics_timeline = ?,
         lyrics_sync_status = 'completed',
         lyrics_sync_error = NULL
     WHERE id = ?`,
    [JSON.stringify(timeline || []), id]
  );
}
```

读取任务时会自动 `SELECT *`，如果已有 `findMusicTaskRow` 不需要额外改 SQL。

## 12. Service 返回字段

修改：

```text
backend/src/modules/music/music.service.js
```

在 `mapMusicTask(row)` 中解析：

```js
function safeJson(value, fallback = null) {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
```

返回：

```js
lyricsTimeline: safeJson(row.lyrics_timeline, []),
lyricsSyncStatus: row.lyrics_sync_status || "none",
lyricsSyncError: row.lyrics_sync_error || "",
```

## 13. 歌词同步 Service

新增：

```text
backend/src/modules/music/lyricsSync.service.js
```

职责：

1. 根据音乐任务 ID 找到任务。
2. 检查用户权限。
3. 转换公网音频 URL。
4. 设置同步状态为 `processing`。
5. 提交腾讯云 ASR。
6. 轮询结果。
7. 提取词级时间戳。
8. 与原始歌词匹配。
9. 保存时间轴。
10. 失败时保存错误。

示例结构：

```js
import {
  findMusicTaskRow,
  saveMusicLyricsTimeline,
  updateMusicLyricsSyncStatus,
} from "./music.repository.js";
import {
  createTencentAsrTask,
  waitForTencentAsrTask,
} from "../../providers/tencent/asr.js";
import { config } from "../../config/index.js";
import { createHttpError } from "../../shared/http.js";

export async function syncMusicLyrics(taskId, userId) {
  const row = await findMusicTaskRow({ id: taskId, userId });
  if (!row) throw createHttpError("music task not found", 404);
  if (!row.audio_url) throw createHttpError("music audio is missing", 400);
  if (!String(row.lyrics || "").trim()) throw createHttpError("lyrics is missing", 400);

  await updateMusicLyricsSyncStatus(taskId, { status: "processing" });

  try {
    const audioUrl = toPublicUrl(row.audio_url, config.publicBaseUrl);
    const created = await createTencentAsrTask({ audioUrl });
    const asrTaskId = created?.Data?.TaskId || created?.TaskId;
    if (!asrTaskId) throw new Error("Tencent ASR response missing TaskId");

    const result = await waitForTencentAsrTask(asrTaskId);
    const words = extractTencentWords(result);
    const lyricLines = parseLyricLines(row.lyrics);
    const timeline = buildLyricsTimeline({ lyricLines, words, durationMs: row.duration_ms || 0 });

    await saveMusicLyricsTimeline(taskId, timeline);
    return timeline;
  } catch (error) {
    await updateMusicLyricsSyncStatus(taskId, {
      status: "failed",
      errorMessage: error.message || "lyrics sync failed",
    });
    throw error;
  }
}
```

## 14. 腾讯云结果解析

腾讯云 SDK 返回结构可能存在大小写差异。实现要宽容。

```js
export function extractTencentWords(asrResult) {
  const data = asrResult?.Data || asrResult?.data || asrResult || {};
  const details =
    data.ResultDetail ||
    data.result_detail ||
    data.ResultDetailList ||
    data.SentenceList ||
    [];

  const list = Array.isArray(details) ? details : [];
  const words = [];

  for (const segment of list) {
    const wordList =
      segment.Words ||
      segment.WordList ||
      segment.words ||
      segment.word_list ||
      [];

    for (const word of wordList) {
      const text = String(word.Word || word.Text || word.word || word.text || "").trim();
      const start = Number(
        word.StartTime ??
        word.StartMs ??
        word.start_time ??
        word.startMs ??
        0
      );
      const end = Number(
        word.EndTime ??
        word.EndMs ??
        word.end_time ??
        word.endMs ??
        start
      );

      if (!text) continue;

      words.push({
        text,
        startMs: normalizeAsrTimeToMs(start),
        endMs: normalizeAsrTimeToMs(end),
      });
    }
  }

  return words
    .filter((word) => word.text && word.endMs >= word.startMs)
    .sort((a, b) => a.startMs - b.startMs);
}

function normalizeAsrTimeToMs(value) {
  const number = Number(value || 0);
  // 如果返回值小于 10000，可能是秒；如果已经是毫秒，保留。
  // Cursor 实现时应根据腾讯云实际返回确认。
  return number > 0 && number < 10000 ? Math.round(number * 1000) : Math.round(number);
}
```

如果腾讯云实际返回已经是毫秒，删除秒转毫秒逻辑，避免时间放大。

## 15. 原始歌词解析

```js
const SECTION_TAG_PATTERN = /^\[[^\]]+\]$/;

export function parseLyricLines(lyrics) {
  let originalIndex = -1;

  return String(lyrics || "")
    .split(/\r?\n/)
    .map((text) => {
      originalIndex += 1;
      return {
        originalIndex,
        text: text.trim(),
      };
    })
    .filter((line) => line.text)
    .filter((line) => !SECTION_TAG_PATTERN.test(line.text))
    .map((line, index) => ({
      lineIndex: line.originalIndex,
      order: index,
      text: line.text,
      normalized: normalizeLyricText(line.text),
    }))
    .filter((line) => line.normalized);
}

export function normalizeLyricText(text) {
  return String(text || "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/[，。！？、,.!?：:；;“”"'\s\-—~～…]/g, "")
    .trim()
    .toLowerCase();
}
```

## 16. 文本相似度

MVP 使用 LCS 相似度：

```js
export function similarity(a, b) {
  const left = normalizeLyricText(a);
  const right = normalizeLyricText(b);
  if (!left || !right) return 0;
  const lcs = longestCommonSubsequenceLength(left, right);
  return (2 * lcs) / (left.length + right.length);
}

function longestCommonSubsequenceLength(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }

  return dp[a.length][b.length];
}
```

## 17. 时间轴匹配算法

```js
export function buildLyricsTimeline({ lyricLines, words, durationMs = 0 }) {
  if (!lyricLines.length) return [];
  if (!words.length) return buildEvenTimeline(lyricLines, durationMs);

  const timeline = [];
  let searchStart = 0;

  for (const line of lyricLines) {
    const best = findBestWordWindow({
      line,
      words,
      searchStart,
    });

    if (best && best.score >= 0.55) {
      timeline.push({
        lineIndex: line.lineIndex,
        text: line.text,
        startMs: words[best.start].startMs,
        endMs: words[best.end].endMs,
        confidence: Number(best.score.toFixed(3)),
        source: "tencent-asr",
      });
      searchStart = Math.max(searchStart, best.end + 1);
    } else {
      timeline.push({
        lineIndex: line.lineIndex,
        text: line.text,
        startMs: null,
        endMs: null,
        confidence: 0,
        source: "fallback",
      });
    }
  }

  return fillMissingTimeline(timeline, durationMs);
}

function findBestWordWindow({ line, words, searchStart }) {
  let best = null;
  const maxWindowWords = 32;
  const maxExtraChars = 10;

  for (let start = searchStart; start < words.length; start += 1) {
    let text = "";

    for (let end = start; end < Math.min(words.length, start + maxWindowWords); end += 1) {
      text += normalizeLyricText(words[end].text);
      const score = similarity(line.normalized, text);

      if (!best || score > best.score) {
        best = { start, end, score };
      }

      if (text.length > line.normalized.length + maxExtraChars) break;
    }
  }

  return best;
}
```

## 18. 兜底补齐时间

```js
function fillMissingTimeline(timeline, durationMs = 0) {
  const result = timeline.map((line) => ({ ...line }));

  for (let index = 0; index < result.length; index += 1) {
    const line = result[index];
    if (Number.isFinite(line.startMs) && Number.isFinite(line.endMs)) continue;

    const prev = [...result.slice(0, index)].reverse().find((item) => Number.isFinite(item.endMs));
    const next = result.slice(index + 1).find((item) => Number.isFinite(item.startMs));

    if (prev && next) {
      const gap = Math.max(0, next.startMs - prev.endMs);
      const missingCount = result
        .slice(index, result.indexOf(next))
        .filter((item) => !Number.isFinite(item.startMs)).length;
      const segment = Math.max(1500, Math.floor(gap / Math.max(1, missingCount + 1)));
      line.startMs = prev.endMs + segment * 0;
      line.endMs = Math.min(next.startMs, line.startMs + segment);
      continue;
    }

    if (prev) {
      line.startMs = prev.endMs;
      line.endMs = line.startMs + 6000;
      continue;
    }

    if (next) {
      line.endMs = next.startMs;
      line.startMs = Math.max(0, line.endMs - 6000);
      continue;
    }
  }

  if (result.every((line) => !Number.isFinite(line.startMs))) {
    return buildEvenTimeline(result, durationMs);
  }

  return result.map((line, index) => {
    const startMs = Math.max(0, Math.round(Number(line.startMs || 0)));
    const next = result[index + 1];
    const fallbackEnd = next?.startMs ? next.startMs : startMs + 6000;
    const endMs = Math.max(startMs + 500, Math.round(Number(line.endMs || fallbackEnd)));

    return {
      ...line,
      startMs,
      endMs,
    };
  });
}

function buildEvenTimeline(lines, durationMs = 0) {
  const total = Math.max(Number(durationMs || 0), lines.length * 6000);
  const segment = Math.max(3000, Math.floor(total / Math.max(1, lines.length)));

  return lines.map((line, index) => ({
    lineIndex: line.lineIndex ?? index,
    text: line.text,
    startMs: index * segment,
    endMs: Math.min(total, (index + 1) * segment),
    confidence: 0,
    source: "estimated",
  }));
}
```

Cursor 可优化这段逻辑，重点是保证：

- 不出现负数时间。
- `endMs > startMs`。
- 时间轴顺序递增。
- 失败也能返回可播放的估算时间轴。

## 19. Controller 和路由

修改：

```text
backend/src/modules/music/music.controller.js
backend/src/modules/music/music.routes.js
```

新增 Controller：

```js
import { syncMusicLyrics } from "./lyricsSync.service.js";

export async function syncLyrics(req, res, next) {
  try {
    const taskId = req.params.id;
    const userId = req.user.id;
    const timeline = await syncMusicLyrics(taskId, userId);
    res.json({ lyricsTimeline: timeline, lyricsSyncStatus: "completed" });
  } catch (error) {
    next(error);
  }
}
```

新增路由：

```js
musicRouter.post("/tasks/:id/sync-lyrics", requireAuth, syncLyrics);
```

如果项目已有认证中间件命名不同，使用现有写法。

## 20. 是否异步执行

第一版建议同步 HTTP 等待，原因：

- 音乐一般 2-3 分钟，腾讯云识别时间可接受。
- 实现简单，便于验证效果。

但要设置合理超时：

- 前端请求超时可设为 5 分钟。
- 后端轮询最多 80 次，每 3 秒一次。

第二版再改成后台任务：

```text
POST /sync-lyrics
=> 立即返回 processing
=> 后端后台跑
=> 前端轮询 GET /tasks/:id
```

## 21. 前端 API

修改：

```text
frontend-app/src/features/music/musicApi.js
```

新增：

```js
async syncLyrics(id) {
  return request(`/api/music/tasks/${encodeURIComponent(id)}/sync-lyrics`, {
    method: "POST",
  });
}
```

确保 `getTasks()` 和 `getTask()` 保留并透传：

```js
lyricsTimeline
lyricsSyncStatus
lyricsSyncError
```

## 22. 前端展示建议

第一版不要引入复杂 UI。

历史记录卡片中：

- 有歌词但没有时间轴：显示“同步歌词”按钮。
- 同步中：显示“同步中...”。
- 同步失败：显示“同步失败，重试”。
- 有时间轴：播放时高亮当前句。

### 22.1 时间轴查找

```js
function getActiveLyricIndex(timeline, currentTimeSec) {
  const currentMs = currentTimeSec * 1000;
  for (let index = timeline.length - 1; index >= 0; index -= 1) {
    if (currentMs >= timeline[index].startMs) return index;
  }
  return -1;
}
```

### 22.2 播放器进度

如果当前 `VoiceRecentPlayer` 没有进度回调，需要加：

```js
onProgressChange?.({
  currentTime,
  duration,
});
```

注意：

- 这属于通用播放器增强，要确保不破坏语音合成、音色转换等页面。
- 如果担心影响其它页面，可以只在音乐模块内部使用本地 audio 控件封装。

## 23. LRC 转换

```js
function formatLrcTime(ms) {
  const totalCentiseconds = Math.max(0, Math.floor(ms / 10));
  const minutes = Math.floor(totalCentiseconds / 6000);
  const seconds = Math.floor((totalCentiseconds % 6000) / 100);
  const centiseconds = totalCentiseconds % 100;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}

function timelineToLrc(timeline) {
  return timeline
    .filter((line) => Number.isFinite(line.startMs))
    .map((line) => `[${formatLrcTime(line.startMs)}]${line.text}`)
    .join("\n");
}
```

可以先不用 `react-lrc`，自研列表更可控。后续如要换组件，直接把 `timelineToLrc()` 喂给 LRC 组件。

## 24. UI 文案

按钮：

```text
同步歌词
同步中...
重新同步
同步失败
歌词时间轴置信度较低
```

提示：

```text
歌词同步会分析音频并生成时间轴，通常需要几十秒。
```

失败提示：

```text
歌词同步失败，不影响音乐播放。请稍后重试。
```

低置信度提示：

```text
部分歌词可能未精确匹配，可稍后手动校准。
```

## 25. 置信度策略

计算平均置信度：

```js
function getAverageConfidence(timeline) {
  const matched = timeline.filter((line) => line.source === "tencent-asr");
  if (!matched.length) return 0;
  return matched.reduce((sum, line) => sum + Number(line.confidence || 0), 0) / matched.length;
}
```

建议：

- `>= 0.75`：正常展示
- `0.55 - 0.75`：展示低置信度提示
- `< 0.55`：提示建议重试或后续手动校准

## 26. 人声分离增强方案

如果直接识别完整歌曲效果不好，第二阶段加入：

```text
原始音频
  |
  v
Demucs 分离 vocals
  |
  v
腾讯云 ASR 识别人声
  |
  v
原歌词匹配
```

可选实现：

- 服务器 Python + Demucs
- 本地助手调用用户显卡
- Replicate/Hugging Face Space 云端跑 Demucs

第一版先不做，避免复杂度过高。

## 27. 手动校准增强方案

后续可以加：

```text
wavesurfer.js + Regions
```

功能：

- 显示波形
- 每句歌词一个 region
- 用户拖拽开始/结束时间
- 保存覆盖 `lyrics_timeline`

这能解决所有自动对齐不准的问题。

## 28. 错误处理

必须处理：

1. 腾讯云密钥未配置。
2. 音频 URL 非公网。
3. 腾讯云任务提交失败。
4. 腾讯云任务超时。
5. 腾讯云返回无词级结果。
6. 原歌词为空。
7. 音频为空。
8. 匹配置信度过低。

失败时：

```js
lyrics_sync_status = 'failed'
lyrics_sync_error = error.message
```

不要影响：

- 音乐播放
- 历史记录展示
- 下载音频

## 29. 安全注意

1. 腾讯云 Secret 只能放后端。
2. 不要把 Secret 返回给前端。
3. 音频公网 URL 如果带签名，注意有效期要覆盖识别时间。
4. 限制同步接口频率，避免用户重复点击刷费用。
5. 同一任务已完成同步时，默认不要重复计费，除非用户点击“重新同步”。

## 30. 防重复调用

后端规则：

```js
if (row.lyrics_sync_status === "processing") {
  return current task status;
}

if (row.lyrics_sync_status === "completed" && row.lyrics_timeline && !force) {
  return existing timeline;
}
```

如需强制重跑：

```http
POST /api/music/tasks/:id/sync-lyrics?force=1
```

## 31. 测试用例

### 31.1 正常中文歌

输入：

```text
风吹过操场边的白杨树
吹散了夏天没说完的话
那时候我们骑着旧单车
```

预期：

- 生成 3 行 timeline。
- 每行 `startMs` 递增。
- 前端播放时能高亮。

### 31.2 有段落标签

输入：

```text
[主歌]
风吹过操场边的白杨树
吹散了夏天没说完的话
[副歌]
一路奔跑别回头
```

预期：

- `[主歌]`、`[副歌]` 不进入 timeline。
- 只同步真实歌词。

### 31.3 ASR 识别错字

预期：

- 使用相似度仍能匹配。
- 置信度可能低，但能生成时间轴。

### 31.4 ASR 无结果

预期：

- 状态为 `failed` 或返回估算 timeline。
- 不影响音频播放。

### 31.5 重复副歌

输入歌词重复出现：

```text
一路奔跑别回头
一路奔跑别回头
```

预期：

- 匹配搜索游标递增，不应全部匹配到第一次出现。

## 32. 验收标准

必须满足：

1. `npm run build` 通过。
2. 后端启动不报错。
3. 未配置腾讯云时，音乐功能仍可正常使用。
4. 同步歌词接口在未配置时返回明确错误。
5. 同步成功后数据库写入 `lyrics_timeline`。
6. 前端历史记录能展示同步状态。
7. 播放音频时歌词能按时间轴高亮。
8. 老历史数据不受影响。

## 33. 回滚方案

如需回滚：

1. 移除前端同步按钮和 timeline 展示。
2. 保留数据库字段不影响旧逻辑。
3. 后端不再调用腾讯云接口。
4. 如必须删除字段：

```sql
ALTER TABLE music_tasks
DROP COLUMN lyrics_timeline,
DROP COLUMN lyrics_sync_status,
DROP COLUMN lyrics_sync_error;
```

谨慎删除字段，避免丢失已同步数据。

## 34. Cursor 执行顺序

建议 Cursor 按以下顺序执行：

1. 安装后端依赖。
2. 增加 config。
3. 增加数据库字段和 initDb 迁移。
4. 新增 Tencent ASR provider。
5. 新增 lyricsSync.service。
6. 修改 music.repository。
7. 修改 music.service 返回字段。
8. 增加 controller 和 route。
9. 修改前端 musicApi。
10. 前端历史卡片增加同步按钮和状态。
11. 前端播放时按 `lyricsTimeline` 高亮。
12. 跑构建和接口测试。

## 35. 最小可用版本范围

MVP 必须包含：

- 腾讯云 ASR provider
- `/api/music/tasks/:id/sync-lyrics`
- 数据库保存 `lyrics_timeline`
- 前端同步按钮
- 播放时高亮歌词

MVP 可以暂不包含：

- Demucs 人声分离
- wavesurfer 手动校准
- 自动生成后同步
- react-lrc 插件

## 36. 最终建议

第一版先用腾讯云录音文件识别验证效果。  
如果唱歌识别准确率可接受，就继续优化匹配算法。  
如果识别不稳定，再增加 Demucs 人声分离。  
如果仍有错位，加入 wavesurfer 手动校准作为最终兜底。

