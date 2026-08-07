import assert from "node:assert/strict";
import test from "node:test";
import {
  parseGenerationUnreadConfig,
  UNREAD_HISTORY_WINDOW_SIZE,
} from "./generationUnread.js";

test("generation unread config safely disables missing and invalid values", () => {
  const missing = parseGenerationUnreadConfig({});
  assert.deepEqual([...missing.enabledSources], []);
  assert.deepEqual([...missing.sourceEnabledAt], []);

  const invalid = parseGenerationUnreadConfig({
    GENERATION_UNREAD_SOURCES: "image,unknown-source,video",
    GENERATION_UNREAD_SOURCE_ENABLED_AT_JSON: "not-json",
  });
  assert.deepEqual([...invalid.enabledSources], []);
  assert.equal(invalid.historyWindowSize, UNREAD_HISTORY_WINDOW_SIZE);
});

test("generation unread config keeps independent UTC activation times", () => {
  const parsed = parseGenerationUnreadConfig({
    GENERATION_UNREAD_SOURCES: " image,video,image,unknown-source ",
    GENERATION_UNREAD_SOURCE_ENABLED_AT_JSON: JSON.stringify({
      image: "2026-08-08T00:00:00.000Z",
      video: "2026-08-09T00:00:00Z",
      "unknown-source": "2026-08-10T00:00:00.000Z",
    }),
  });

  assert.deepEqual([...parsed.enabledSources], ["image", "video"]);
  assert.equal(parsed.sourceEnabledAt.get("image").toISOString(), "2026-08-08T00:00:00.000Z");
  assert.equal(parsed.sourceEnabledAt.get("video").toISOString(), "2026-08-09T00:00:00.000Z");
  assert.equal(parsed.sourceEnabledAt.has("unknown-source"), false);
});

test("generation unread config rejects non-UTC and missing source timestamps", () => {
  const parsed = parseGenerationUnreadConfig({
    GENERATION_UNREAD_SOURCES: "image,video,article",
    GENERATION_UNREAD_SOURCE_ENABLED_AT_JSON: JSON.stringify({
      image: "2026-08-08 00:00:00",
      video: "2026-08-08T08:00:00+08:00",
    }),
  });

  assert.deepEqual([...parsed.enabledSources], []);
  assert.deepEqual([...parsed.sourceEnabledAt], []);
});

test("generation unread config rejects normalized calendar dates", () => {
  const parsed = parseGenerationUnreadConfig({
    GENERATION_UNREAD_SOURCES: "image,video",
    GENERATION_UNREAD_SOURCE_ENABLED_AT_JSON: JSON.stringify({
      image: "2026-02-31T00:00:00Z",
      video: "2026-04-31T00:00:00.1Z",
    }),
  });

  assert.deepEqual([...parsed.enabledSources], []);
  assert.deepEqual([...parsed.sourceEnabledAt], []);
});

test("generation unread config accepts a real leap day and fractional seconds", () => {
  const parsed = parseGenerationUnreadConfig({
    GENERATION_UNREAD_SOURCES: "image",
    GENERATION_UNREAD_SOURCE_ENABLED_AT_JSON: JSON.stringify({
      image: "2028-02-29T12:34:56.1Z",
    }),
  });

  assert.equal(parsed.sourceEnabledAt.get("image").toISOString(), "2028-02-29T12:34:56.100Z");
});
