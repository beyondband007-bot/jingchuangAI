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
    const segmentEndMs = normalizeAsrTimeToMs(
      segment.EndMs ??
      segment.EndTime ??
      segment.end_ms ??
      segment.end_time ??
      0
    );
    const wordList =
      segment.Words ||
      segment.WordList ||
      segment.words ||
      segment.word_list ||
      [];

    if (!wordList.length) {
      const sentence = String(
        segment.FinalSentence ||
        segment.Content ||
        segment.Text ||
        segment.text ||
        ""
      ).trim();
      if (normalizeLyricText(sentence)) {
        const endMs = segmentEndMs > segmentStartMs
          ? segmentEndMs
          : segmentStartMs + Math.max(500, sentence.length * 180);
        words.push({
          text: sentence,
          startMs: segmentStartMs,
          endMs: endMs
        });
      }
      continue;
    }

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
      const wordStartMs = normalizeAsrTimeToMs(rawStart);
      const wordEndMs = normalizeAsrTimeToMs(rawEnd);
      const absoluteStart = hasOffsetStart ? segmentStartMs + wordStartMs : wordStartMs;
      const absoluteEnd = hasOffsetEnd
        ? segmentStartMs + wordEndMs
        : (wordEndMs > wordStartMs ? wordEndMs : absoluteStart + 300);

      words.push({
        text,
        startMs: absoluteStart,
        endMs: absoluteEnd
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
  let lastMatchedEndMs = 0;

  for (const line of lyricLines) {
    const best = findBestWordWindow({
      line,
      words,
      searchStart,
      maxStartMs: lastMatchedEndMs > 0 ? lastMatchedEndMs + 18000 : 0
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
      lastMatchedEndMs = words[best.end].endMs;
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

  return anchorTimelineToStart(
    fillMissingTimeline(
      demoteMatchesWithoutRoom(demoteSuspiciousFirstMatch(timeline)),
      durationMs
    ),
    durationMs
  );
}

function demoteSuspiciousFirstMatch(timeline) {
  if (timeline.length < 2) return timeline;
  const first = timeline[0];
  const second = timeline[1];
  const firstStart = Number(first.startMs || 0);
  const secondStart = Number(second.startMs || 0);

  if (
    first.source === "tencent-asr" &&
    firstStart > 15000 &&
    (secondStart <= 12000 || secondStart - firstStart > 20000)
  ) {
    return [
      {
        ...first,
        startMs: null,
        endMs: null,
        confidence: 0,
        source: "fallback"
      },
      ...timeline.slice(1)
    ];
  }

  return timeline;
}

function demoteMatchesWithoutRoom(timeline) {
  let lastMatchedEndMs = 0;
  let missingCount = 0;

  return timeline.map((line) => {
    const startMs = Number(line.startMs || 0);
    const endMs = Number(line.endMs || 0);
    const isMatched = line.source === "tencent-asr" && endMs > startMs;

    if (!isMatched) {
      missingCount += 1;
      return line;
    }

    // Do not keep a later lyric match when there is not enough real time to
    // place all unmatched lines before it. Keeping it made fillMissingTimeline
    // create estimated lines past this match, then append an earlier timestamp.
    const availableMs = startMs - lastMatchedEndMs;
    const requiredMs = missingCount * 1500;
    if (missingCount > 0 && availableMs < requiredMs) {
      missingCount += 1;
      return {
        ...line,
        startMs: null,
        endMs: null,
        confidence: 0,
        source: "fallback"
      };
    }

    lastMatchedEndMs = endMs;
    missingCount = 0;
    return line;
  });
}

function anchorTimelineToStart(timeline, durationMs = 0) {
  if (!timeline.length) return timeline;

  const result = timeline.map((line) => ({ ...line }));
  const anchorIndex = result.findIndex(
    (line) => line.source === "tencent-asr" && Number(line.confidence || 0) >= 0.48
  );

  if (anchorIndex > 0) {
    const anchorStart = Number(result[anchorIndex].startMs || 0);
    const leadInMs = Math.min(Math.max(anchorStart - 500, 1500), 4000);
    const segment = Math.max(1200, Math.floor(leadInMs / anchorIndex));

    for (let index = 0; index < anchorIndex; index += 1) {
      const startMs = segment * index;
      const endMs = index === anchorIndex - 1
        ? Math.max(startMs + 800, anchorStart - 200)
        : segment * (index + 1);
      result[index].startMs = startMs;
      result[index].endMs = Math.max(startMs + 500, endMs);
      if (result[index].source === "fallback") {
        result[index].source = "estimated";
      }
    }
  }

  return result;
}

function findBestWordWindow({ line, words, searchStart, maxStartMs = 0 }) {
  let best = null;
  const maxWindowWords = 18;
  const maxExtraChars = 8;

  for (let start = searchStart; start < words.length; start += 1) {
    if (maxStartMs > 0 && words[start].startMs > maxStartMs) break;
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
    const minimumSegmentMs = 500;
    const configuredDurationMs = Number(durationMs || 0);
    const rangeEnd = Number.isFinite(next?.startMs)
      ? next.startMs
      : (configuredDurationMs > rangeStart
        ? configuredDurationMs
        : rangeStart + count * minimumSegmentMs);
    const range = Math.max(count * minimumSegmentMs, rangeEnd - rangeStart);
    const segment = Math.max(minimumSegmentMs, Math.floor(range / count));

    for (let offset = 0; offset < count; offset += 1) {
      const line = result[startIndex + offset];
      line.startMs = rangeStart + segment * offset;
      line.endMs = Math.min(rangeEnd, line.startMs + segment);
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
