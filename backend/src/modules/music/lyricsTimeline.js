const SECTION_TAG_PATTERN = /^(\[[^\]]+\]|verse\d*|chorus\d*|bridge\d*)$/i;
const SECTION_LABELS = new Set([
  "\u4e3b\u6b4c",
  "\u526f\u6b4c",
  "\u6865\u6bb5",
  "\u524d\u594f",
  "\u95f4\u594f",
  "\u5c3e\u594f",
  "\u5c3e\u58f0"
]);

function isSectionLine(text) {
  const label = String(text || "").trim().replace(/\d+/g, "");
  return SECTION_TAG_PATTERN.test(label) || SECTION_LABELS.has(label);
}

export function parseLyricLines(lyrics) {
  let originalIndex = -1;

  return String(lyrics || "")
    .split(/\r?\n/)
    .map((text) => {
      originalIndex += 1;
      return {
        originalIndex,
        text: text.trim()
      };
    })
    .filter((line) => line.text)
    .filter((line) => !isSectionLine(line.text))
    .map((line, index) => ({
      lineIndex: line.originalIndex,
      order: index,
      text: line.text,
      normalized: normalizeLyricText(line.text)
    }))
    .filter((line) => line.normalized);
}

export function normalizeLyricText(text) {
  return String(text || "")
    .replace(/\[[^\]]+\]/g, "")
    .replace(/[\p{P}\p{S}\s]+/gu, "")
    .replace(/[\u554a\u5440\u5450\u5566]/g, "")
    .trim()
    .toLowerCase();
}

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

function normalizeAsrTimeToMs(value) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return 0;
  return number > 0 && number < 1000 && !Number.isInteger(number)
    ? Math.round(number * 1000)
    : Math.round(number);
}

function readSegmentStartMs(segment) {
  return normalizeAsrTimeToMs(
    segment.StartMs ??
    segment.StartTime ??
    segment.start_ms ??
    segment.start_time ??
    0
  );
}

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
    const segmentStartMs = readSegmentStartMs(segment);
    const wordList =
      segment.Words ||
      segment.WordList ||
      segment.words ||
      segment.word_list ||
      [];

    for (const word of wordList) {
      const text = String(word.Word || word.Text || word.word || word.text || "").trim();
      if (!normalizeLyricText(text)) continue;

      const hasOffsetStart = word.OffsetStartMs != null || word.offset_start_ms != null;
      const hasOffsetEnd = word.OffsetEndMs != null || word.offset_end_ms != null;
      const rawStart = Number(
        word.OffsetStartMs ??
        word.StartTime ??
        word.StartMs ??
        word.offset_start_ms ??
        word.start_time ??
        word.startMs ??
        0
      );
      const rawEnd = Number(
        word.OffsetEndMs ??
        word.EndTime ??
        word.EndMs ??
        word.offset_end_ms ??
        word.end_time ??
        word.endMs ??
        rawStart
      );

      words.push({
        text,
        startMs: normalizeAsrTimeToMs(rawStart) + (hasOffsetStart ? segmentStartMs : 0),
        endMs: normalizeAsrTimeToMs(rawEnd) + (hasOffsetEnd ? segmentStartMs : 0)
      });
    }
  }

  return words
    .filter((word) => word.text && word.endMs >= word.startMs)
    .sort((a, b) => a.startMs - b.startMs);
}

export function buildLyricsTimeline({ lyricLines, words, durationMs = 0 }) {
  if (!lyricLines.length) return [];
  if (!words.length) return buildEvenTimeline(lyricLines, durationMs);

  const timeline = [];
  let searchStart = 0;

  for (const line of lyricLines) {
    const best = findBestWordWindow({
      line,
      words,
      searchStart
    });

    if (best && best.score >= 0.48) {
      timeline.push({
        lineIndex: line.lineIndex,
        text: line.text,
        startMs: words[best.start].startMs,
        endMs: words[best.end].endMs,
        confidence: Number(best.score.toFixed(3)),
        source: "tencent-asr"
      });
      searchStart = Math.max(searchStart, best.end + 1);
    } else {
      timeline.push({
        lineIndex: line.lineIndex,
        text: line.text,
        startMs: null,
        endMs: null,
        confidence: 0,
        source: "fallback"
      });
    }
  }

  return fillMissingTimeline(timeline, durationMs);
}

function findBestWordWindow({ line, words, searchStart }) {
  let best = null;
  const maxWindowWords = 18;
  const maxExtraChars = 8;

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

    if (best?.score >= 0.92) break;
  }

  return best;
}

function fillMissingTimeline(timeline, durationMs = 0) {
  const result = timeline.map((line) => ({ ...line }));
  const hasTimedLine = result.some((line) => Number.isFinite(line.startMs) && Number.isFinite(line.endMs));

  if (!hasTimedLine) {
    return buildEvenTimeline(result, durationMs);
  }

  let index = 0;
  while (index < result.length) {
    if (Number.isFinite(result[index].startMs) && Number.isFinite(result[index].endMs)) {
      index += 1;
      continue;
    }

    const startIndex = index;
    while (
      index < result.length &&
      (!Number.isFinite(result[index].startMs) || !Number.isFinite(result[index].endMs))
    ) {
      index += 1;
    }

    const endIndex = index - 1;
    const count = endIndex - startIndex + 1;
    const prev = startIndex > 0 ? result[startIndex - 1] : null;
    const next = index < result.length ? result[index] : null;
    const rangeStart = Number.isFinite(prev?.endMs) ? prev.endMs : 0;
    const rangeEnd = Number.isFinite(next?.startMs)
      ? next.startMs
      : Math.max(rangeStart + count * 6000, Number(durationMs || 0));
    const range = Math.max(count * 1500, rangeEnd - rangeStart);
    const segment = Math.max(1500, Math.floor(range / count));

    for (let offset = 0; offset < count; offset += 1) {
      const line = result[startIndex + offset];
      line.startMs = rangeStart + segment * offset;
      line.endMs = offset === count - 1 && next
        ? Math.min(rangeEnd, line.startMs + segment)
        : line.startMs + segment;
    }
  }

  return result.map((line, index) => {
    const startMs = Math.max(0, Math.round(Number(line.startMs || 0)));
    const next = result[index + 1];
    const fallbackEnd = next?.startMs ? next.startMs : startMs + 6000;
    const endMs = Math.max(startMs + 500, Math.round(Number(line.endMs || fallbackEnd)));

    return {
      ...line,
      startMs,
      endMs
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
    source: "estimated"
  }));
}

export function getAverageConfidence(timeline) {
  const matched = (timeline || []).filter((line) => line.source === "tencent-asr");
  if (!matched.length) return 0;
  return matched.reduce((sum, line) => sum + Number(line.confidence || 0), 0) / matched.length;
}
