import { expect, test } from "@playwright/test";

async function mockDigitalHumanWorkspace(page, { onTasks } = {}) {
  await page.route("**/api/digital-human/**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path.endsWith("/models")) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          models: [{ value: "digital-human-test", label: "Test model" }],
          defaults: { model: "digital-human-test", driveMode: "text" },
        }),
      });
    }
      if (path.endsWith("/avatars")) {
        return route.fulfill({ contentType: "application/json", body: JSON.stringify({ public: [], mine: [] }) });
      }
      if (path.endsWith("/voices/preview")) {
        return route.fulfill({
          contentType: "application/json",
          body: JSON.stringify({
            audioFileId: "digital-human-preview-audio",
            audioUrl: "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=",
            durationMs: 1,
          }),
        });
      }
      if (path.endsWith("/voices")) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ voices: [{ id: "female-shaonv", name: "Test voice", status: "enabled" }] }),
      });
    }
    if (path.endsWith("/tasks")) {
      return onTasks ? onTasks(route) : route.fulfill({ contentType: "application/json", body: "[]" });
    }
    return route.fulfill({ contentType: "application/json", body: "{}" });
  });
  await page.route("**/api/image-digital-human/tasks", (route) =>
    route.fulfill({ contentType: "application/json", body: "[]" }),
  );
  await page.route("**/api/me/credits", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ balance: 10000 }) }),
  );
}

async function mockImageGenerationWorkspace(page, { tasks = [] } = {}) {
  await page.route("**/api/image/models", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        models: [{ value: "gpt_image_2", label: "Test model" }],
        ratios: [{ value: "1:1", label: "1:1" }],
        qualities: [{ value: "standard", label: "Standard" }],
        counts: [{ value: 1, label: "1" }],
      }),
    }),
  );
  await page.route("**/api/image/tasks?*", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify(tasks) }),
  );
  await page.route("**/api/me/credits", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ balance: 10000 }) }),
  );
}

async function mockArticleWorkspace(page, { tasks = [] } = {}) {
  await page.route("**/api/article/models", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ models: [], ratios: [], qualities: [], counts: [] }),
    }),
    );
    await page.route("**/api/article/tasks?*", (route) =>
      route.fulfill({ contentType: "application/json", body: JSON.stringify(tasks) }),
  );
  await page.route("**/api/me/credits", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ balance: 10000 }) }),
  );
}

async function mockVideoGenerationWorkspace(page, { tasks = [] } = {}) {
  await page.route("**/api/video/models", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        models: [{ value: "seedance_2_0_720p", label: "Test model", basePoints: 1, priceUnit: "per_task" }],
        ratios: [{ value: "16:9", label: "16:9" }],
        durations: [{ value: 5, label: "5s" }],
      }),
    }),
  );
  await page.route("**/api/video/tasks?*", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(tasks),
    }),
  );
  await page.route("**/api/me/credits", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ balance: 10000 }) }),
  );
}

async function mockVideoWorkflowWorkspace(page, modulePath, { tasks = [] } = {}) {
  await page.route(`**/api/${modulePath}/**`, (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith("/models")) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          models: [{ value: `${modulePath}-test`, label: "Test model", resolution: "720p" }],
          defaults: { model: `${modulePath}-test`, resolution: "720p" },
          limits: { maxImageBytes: 10485760, maxVideoBytes: 104857600 },
        }),
      });
    }
    if (path.endsWith("/tasks")) {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(tasks),
      });
    }
    return route.fulfill({ contentType: "application/json", body: "{}" });
  });
  await page.route("**/api/me/credits", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ balance: 10000 }) }),
  );
}

async function mockMarketingToolWorkspace(page, modulePath, { tasks = [] } = {}) {
  await page.route(`**/api/${modulePath}/models`, (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ models: [], defaults: {}, limits: {} }),
    }),
  );
  await page.route(`**/api/${modulePath}/tasks?*`, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify(tasks) }),
  );
  await page.route("**/api/me/credits", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ balance: 10000 }) }),
  );
}

async function mockVideoDubbingWorkspace(page, { tasks = [] } = {}) {
  await page.route("**/api/video-dub/config", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({}) }),
  );
  await page.route("**/api/video-dub/tasks", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ tasks }) }),
  );
  await page.route("**/api/me/credits", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ balance: 10000 }) }),
  );
}

async function mockAudioHistoryWorkspace(page, apiPath, { tasks = [] } = {}) {
  await page.route(`**/api/${apiPath}/tasks`, (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify(tasks) }),
  );
  if (apiPath === "voice") {
    await page.route("**/api/voice/voices", (route) =>
      route.fulfill({ contentType: "application/json", body: "[]" }),
    );
  }
}

async function mockChatWorkspace(page) {
  await page.route("**/api/chat/models", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        models: [{ value: "deepseek-v4-pro", label: "Test chat model" }],
        reasoningEfforts: [],
      }),
    }),
  );
  await page.route("**/api/chat/conversations", (route) =>
    route.fulfill({ contentType: "application/json", body: "[]" }),
  );
  await page.route("**/api/me/credits", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ balance: 10000 }) }),
  );
}

for (const [route, heading] of [["home", "千面创想 一面即达"], ["image", "图片生成"], ["video", "视频生成"], ["voice", "语音合成"], ["chat", "大模型"], ["music", "创建你的音乐"]]) {
  test(`${route} route renders`, async ({ page }) => {
    await page.goto(`/#/${route}`);
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  });
}

test("watermark route renders its default workspace", async ({ page }) => {
  await mockMarketingToolWorkspace(page, "watermark");
  await page.goto("/#/watermark");
  await expect(page.locator(".watermark-view-root")).toBeVisible();
  await expect(page.locator(".watermark-hero-empty")).toBeVisible();
});

test("digital human route mounts its workspace", async ({ page }) => {
  await mockDigitalHumanWorkspace(page);
  await page.goto("/#/digital-human");
  await expect(page.locator(".dhv2-root")).toBeVisible();
  await expect(page.locator(".fm-workbench-topbar h1")).toHaveCount(0);
  await expect(page.locator(".dhv2-root")).toHaveScreenshot(
    "digital-human-avatar-library.png",
    { maxDiffPixelRatio: 0.01 },
  );
});

test("digital human mine libraries keep their creation entry without redundant empty states", async ({ page }) => {
  await mockDigitalHumanWorkspace(page);
  await page.goto("/#/digital-human");

  await page.getByRole("tab", { name: "我的形象", exact: true }).click();
  await expect(page.locator(".dhv2-create-card--mine")).toBeVisible();
  await expect(page.getByText("暂无我的形象", { exact: true })).toHaveCount(0);

  await page.getByRole("tab", { name: "我的音色", exact: true }).click();
  await expect(page.locator(".dhv2-audio-create-card")).toBeVisible();
  await expect(page.getByText("暂无我的音色", { exact: true })).toHaveCount(0);
});

test("digital human preview stays inside the workspace after selecting an avatar", async ({ page }) => {
  await mockDigitalHumanWorkspace(page);
  await page.goto("/#/digital-human");
  await page.locator(".dhv2-avatar-card__cover").first().click();
  await expect(page.locator(".dhv2-avatar-confirm-backdrop")).toBeVisible();
  await page.locator(".dhv2-avatar-confirm__primary").click();

  const preview = page.locator(".dhv2-preview");
  const media = preview.locator(".dhv2-preview__media");
  await expect(preview).toBeVisible();

  const [root, mediaBox] = await Promise.all([
    page.locator(".dhv2-root").boundingBox(),
    media.boundingBox(),
  ]);
  expect(root).not.toBeNull();
  expect(mediaBox).not.toBeNull();
  expect(mediaBox.y).toBeGreaterThanOrEqual(root.y);
  expect(mediaBox.y + mediaBox.height).toBeLessThanOrEqual(root.y + root.height);

  await expect(preview).toHaveScreenshot("digital-human-preview.png", {
    maxDiffPixelRatio: 0.01,
  });

  const hasNoVerticalOverflow = await page
    .locator(".dhv2-root")
    .evaluate((element) => element.scrollHeight <= element.clientHeight);
  expect(hasNoVerticalOverflow).toBe(true);
});

test("digital human exposes a stable processing preview", async ({ page }) => {
  await mockDigitalHumanWorkspace(page, { onTasks: (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          id: "digital-human-processing-snapshot",
          status: "processing",
          progress: 30,
        }),
      });
    }
    return route.fulfill({ contentType: "application/json", body: "[]" });
  }});

  await page.goto("/#/digital-human");
  await page.locator(".dhv2-avatar-card__cover").first().click();
  await page.locator(".dhv2-avatar-confirm__primary").click();
  await page.locator("textarea").fill("这是数字人处理状态的视觉回归脚本。");
  const generateButton = page.locator(".dhv2-generate-button");
  await generateButton.click();
  await expect(generateButton).toContainText(/确认/);
  await generateButton.click();
  await expect(generateButton).toContainText(/生成/);
  await generateButton.click();

  const preview = page.locator(".dhv2-preview");
  await expect(preview).toBeVisible();
  await expect(preview).toHaveScreenshot("digital-human-processing.png", {
    maxDiffPixelRatio: 0.01,
  });
});

test("digital human exposes completed result actions", async ({ page }) => {
  await mockDigitalHumanWorkspace(page, { onTasks: (route) => {
    if (route.request().method() === "POST") {
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          id: "digital-human-completed-snapshot",
          status: "completed",
          progress: 100,
          text: "Completed result visual regression script.",
          resultUrl: "/assets/digital-human/主播对话.mp4",
        }),
      });
    }
    return route.fulfill({ contentType: "application/json", body: "[]" });
  }});

  await page.goto("/#/digital-human");
  await page.locator(".dhv2-avatar-card__cover").first().click();
  await page.locator(".dhv2-avatar-confirm__primary").click();
  await page.locator("textarea").fill("Completed result visual regression script.");
  const generateButton = page.locator(".dhv2-generate-button");
  await generateButton.click();
  await expect(generateButton).toContainText(/确认/);
  await generateButton.click();
  await expect(generateButton).toContainText(/生成/);
  await generateButton.click();

  const preview = page.locator(".dhv2-preview");
  await expect(preview.locator(".dhv2-preview__actions")).toBeVisible();
  await expect(preview.locator("video")).toHaveAttribute(
    "src",
    /主播对话\.mp4$/,
  );
  await expect(preview).toHaveScreenshot("digital-human-completed.png", {
    maxDiffPixelRatio: 0.01,
  });
});

test("digital human exposes a failed task state", async ({ page }) => {
  let taskCreated = false;
  await mockDigitalHumanWorkspace(page, { onTasks: (route) => {
    if (route.request().method() === "POST") {
      taskCreated = true;
      return route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({
          id: "digital-human-failed-snapshot",
          status: "processing",
          progress: 20,
          text: "Failed result visual regression script.",
        }),
      });
    }
    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(taskCreated ? [{
        id: "digital-human-failed-snapshot",
        status: "failed",
        text: "Failed result visual regression script.",
        error: "Test task failure",
      }] : []),
    });
  }});

  await page.goto("/#/digital-human");
  await page.locator(".dhv2-avatar-card__cover").first().click();
  await page.locator(".dhv2-avatar-confirm__primary").click();
  await page.locator("textarea").fill("Failed result visual regression script.");
  const generateButton = page.locator(".dhv2-generate-button");
  await generateButton.click();
  await expect(generateButton).toContainText(/确认/);
  await generateButton.click();
  await expect(generateButton).toContainText(/生成/);
  await generateButton.click();

  const preview = page.locator(".dhv2-preview");
  await expect(preview.locator(".dhv2-preview__empty .ui-empty__title")).toHaveText("生成失败");
  await expect(preview.locator(".dhv2-preview__actions")).toHaveCount(0);
  await expect(preview).toHaveScreenshot("digital-human-failed.png", {
    maxDiffPixelRatio: 0.01,
  });
});

test("image route keeps its disabled default state visually stable", async ({ page }) => {
  await mockImageGenerationWorkspace(page);
  await page.goto("/#/image");
  await page.locator(".image-filter-tabs button").nth(1).click();
  await expect(page.locator('button[aria-label="生成"]:disabled')).toHaveCount(2);
  await expect(page.locator(".image-gen-view")).toHaveScreenshot(
    "image-generation-empty.png",
  );
});

test("image favorite gallery keeps its completed preview visually stable", async ({ page }) => {
  await mockImageGenerationWorkspace(page, {
    tasks: [{
      id: "image-gallery-completed-snapshot",
      status: "completed",
      prompt: "用于视觉回归的图片结果",
      model: "gpt_image_2",
      ratio: "1:1",
      quality: "standard",
      count: 1,
      image: "/assets/imgInspiration/img-sheying/ig_0dc22d0dacb7119f016a38e7d1b158819183ceb9c05a436ea4.webp",
      createdAt: "2026-01-01 12:00:00",
    }],
  });
  await page.goto("/#/image");
  await page.locator(".image-filter-tabs button").nth(2).click();

  const card = page.locator('.image-results-feed [data-image-card-id="image-gallery-completed-snapshot"]');
  await expect(card).toBeVisible();
  await expect
    .poll(() => card.locator(".result-preview img").evaluate((image) => image.naturalWidth))
    .toBeGreaterThan(0);
  await expect(card.locator(".result-preview")).toHaveScreenshot(
    "image-generation-completed-preview.png",
  );
});

test("image workbench renders processing and failed task states", async ({ page }) => {
  await mockImageGenerationWorkspace(page, {
    tasks: [
      {
        id: "image-workbench-processing-snapshot",
        status: "processing",
        prompt: "Processing image workbench visual regression task",
        model: "gpt_image_2",
        ratio: "1:1",
        createdAt: "2026-01-02 12:00:00",
      },
      {
        id: "image-workbench-failed-snapshot",
        status: "failed",
        prompt: "Failed image workbench visual regression task",
        model: "gpt_image_2",
        ratio: "1:1",
        error: "Test image generation failure",
        createdAt: "2026-01-01 12:00:00",
      },
    ],
  });
  await page.goto("/#/image");
  await page.locator(".image-filter-tabs button").nth(1).click();

  const workbench = page.locator(".image-workbench-layout");
  const history = workbench.locator(".image-workbench-history-item");
  await expect(history).toHaveCount(2);
  await history.nth(0).click();
  await expect(workbench.locator(".image-workbench-generation-status")).toBeVisible();
  await expect(workbench).toHaveScreenshot("image-workbench-processing.png", {
    maxDiffPixelRatio: 0.01,
  });

  await history.nth(1).click();
  const failedState = workbench.locator(".image-workbench-status.is-failed");
  await expect(failedState).toBeVisible();
  await expect(failedState.locator("button")).toHaveCount(1);
  await expect(workbench).toHaveScreenshot("image-workbench-failed.png", {
    maxDiffPixelRatio: 0.01,
  });
});

for (const route of ["face-swap", "motion"]) {
  test(`${route} history keeps its empty state centered`, async ({ page }) => {
    await page.goto(`/#/${route}`);
    await expect(page.locator(".vgw-root")).toBeVisible();
    await page.getByRole("button", { name: "历史记录", exact: true }).click();

    const historyPage = page.locator(".vgw-history-page");
    const emptyState = historyPage.locator(".vgw-history__empty");
    await expect(historyPage).toBeVisible();
    await expect(emptyState.locator(".ui-empty__illustration")).toBeVisible();
    await expect(emptyState.locator(".ui-empty__title")).toHaveText("暂无历史记录");
    await expect(emptyState.locator(".ui-empty__description")).toHaveCount(0);

    const [card, empty] = await Promise.all([
      historyPage.locator(".vgw-history-page__card").boundingBox(),
      emptyState.boundingBox(),
    ]);
    expect(card).not.toBeNull();
    expect(empty).not.toBeNull();

    const cardCenter = card.y + card.height / 2;
    const emptyCenter = empty.y + empty.height / 2;
    expect(Math.abs(cardCenter - emptyCenter)).toBeLessThan(2);

    const hasNoVerticalOverflow = await page
      .locator(".feature-main")
      .evaluate((element) => element.scrollHeight <= element.clientHeight);
    expect(hasNoVerticalOverflow).toBe(true);
  });
}

for (const [route, modulePath] of [["face-swap", "face-swap"], ["motion", "motion-transfer"]]) {
  test(`${route} history renders processing, completed and failed tasks`, async ({ page }) => {
    const preview = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
    await mockVideoWorkflowWorkspace(page, modulePath, {
      tasks: [
        {
          id: `${route}-processing-snapshot`,
          status: "processing",
          progress: 42,
          price: "1",
          createdAt: "2026-01-03 12:00:00",
        },
        {
          id: `${route}-completed-snapshot`,
          status: "completed",
          price: "1",
          resultUrl: preview,
          createdAt: "2026-01-02 12:00:00",
        },
        {
          id: `${route}-failed-snapshot`,
          status: "failed",
          price: "1",
          error: "测试失败原因",
          createdAt: "2026-01-01 12:00:00",
        },
      ],
    });
    const tasksLoaded = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === `/api/${modulePath}/tasks` && response.ok();
    });
    await page.goto(`/#/${route}`);
    await tasksLoaded;
    await page.getByRole("button", { name: "历史记录", exact: true }).click();

    const history = page.locator(".vgw-history-page");
    await expect(history.locator(".vgw-history__item")).toHaveCount(3);
    await expect(history.locator(".status-processing")).toBeVisible();
    await expect(history.locator(".status-completed")).toBeVisible();
    await expect(history.locator(".status-failed")).toBeVisible();
    await expect(history).toHaveScreenshot(`${route}-history-task-states.png`);
  });
}

for (const viewport of [375, 768, 1024, 1440, 1920]) {
  test(`video workflows avoid horizontal overflow at ${viewport}px`, async ({ page }) => {
    await page.setViewportSize({ width: viewport, height: 900 });

    for (const route of ["face-swap", "motion"]) {
      await page.goto(`/#/${route}`);
      await expect(page.locator(".vgw-root")).toBeVisible();
      const hasNoHorizontalOverflow = await page
        .locator(".feature-main")
        .evaluate((element) => element.scrollWidth <= element.clientWidth);
      expect(hasNoHorizontalOverflow, `${route} overflowed at ${viewport}px`).toBe(true);
    }
  });
}

for (const viewport of [375, 768, 1024, 1440, 1920]) {
  test(`core workbenches avoid horizontal overflow at ${viewport}px`, async ({ page }) => {
    await page.setViewportSize({ width: viewport, height: 900 });

    for (const route of [
      "image",
      "video",
      "face-swap",
      "motion",
      "digital-human",
      "music",
      "article",
      "chat",
      "assets",
    ]) {
      await page.goto(`/#/${route}`);
      await expect(page.locator(".feature-main")).toBeVisible();
      const hasNoHorizontalOverflow = await page.locator(".feature-main").evaluate(
        (element) => element.scrollWidth <= element.clientWidth,
      );
      expect(hasNoHorizontalOverflow, `${route} overflowed at ${viewport}px`).toBe(true);
    }
  });
}

test("music route keeps its default workbench visually stable", async ({ page }) => {
  await page.goto("/#/music");
  await expect(page.locator(".music-canvas")).toBeVisible();
  await expect(page.locator(".ai-music-workbench__title-input input")).toHaveAttribute("maxlength", "20");
  await expect(page.locator(".ai-music-workbench__generate")).toBeDisabled();
  await expect(page.locator(".music-canvas")).toHaveScreenshot(
    "music-generation-empty.png",
  );
});

test("music exposes a stable generating state", async ({ page }) => {
  await page.route("**/api/music/tasks", (route) => route.fulfill({
    contentType: "application/json",
    body: "[]",
  }));
  await page.route("**/api/music/generate", async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ id: "music-snapshot", status: "processing" }),
    });
  });
  await page.route("**/api/music/tasks/music-snapshot", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ id: "music-snapshot", status: "processing" }),
  }));

  await page.goto("/#/music");
  const inputs = page.locator(".ai-music-workbench textarea");
  await inputs.nth(0).fill("温暖的流行音乐");
  await inputs.nth(1).fill("这是用于视觉回归的歌词");
  await page.locator(".ai-music-workbench__title-input input").fill("视觉回归音乐");
  await page.locator(".ai-music-workbench__generate").click();
  await expect(page.locator(".music-gen-waiting-layout")).toBeVisible();
  await expect(page.locator(".music-gen-waiting-card")).toHaveScreenshot(
    "music-generation-loading.png",
    { mask: [page.locator(".music-gen-waiting-wave")] },
  );
});

test("music generating waveform respects reduced-motion preferences", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.route("**/api/music/tasks", (route) => route.fulfill({
    contentType: "application/json",
    body: "[]",
  }));
  await page.route("**/api/music/generate", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ id: "music-reduced-motion", status: "processing" }),
  }));
  await page.route("**/api/music/tasks/music-reduced-motion", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ id: "music-reduced-motion", status: "processing" }),
  }));

  await page.goto("/#/music");
  const inputs = page.locator(".ai-music-workbench textarea");
  await inputs.nth(0).fill("减少动态效果验证");
  await inputs.nth(1).fill("用于验证静态波形的歌词");
  await page.locator(".ai-music-workbench__title-input input").fill("减少动态效果");
  await page.locator(".ai-music-workbench__generate").click();
  await expect(page.locator(".music-gen-waiting-layout")).toBeVisible();
  await expect(page.locator(".music-gen-waiting-wave span").first()).toHaveAttribute(
    "style",
    "height: 31px;",
  );
});

test("music opens a completed result in the full player", async ({ page }) => {
  await page.route("**/api/music/tasks", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify([{
      id: "music-completed-snapshot",
      prompt: "温暖的流行音乐",
      title: "视觉回归示例",
      lyrics: "第一句歌词",
      status: "completed",
      audioUrl: "data:audio/mpeg;base64,",
      durationMs: 180000,
      createdAt: "2026-01-01 12:00:00",
    }]),
  }));

  await page.goto("/#/music");
  await page.locator(".music-ref-recent-card").first().click();
  const player = page.locator(".music-full-player");
  await expect(player).toBeVisible();
  await expect(player).toHaveScreenshot("music-generation-result.png");

  await player.getByRole("button", { name: "返回创作" }).click();
  await page.getByRole("button", { name: "历史记录" }).click();
  await page.locator(".music-ref-recent-card").click();
  await page.getByRole("button", { name: "返回", exact: true }).click();
  await expect(player).toBeHidden();
  await expect(page.locator(".music-ref-recent-card")).toBeVisible();
});

test("music card can rename a completed song", async ({ page }) => {
  const task = {
    id: "music-rename",
    prompt: "温暖的流行音乐",
    title: "原歌曲名称",
    lyrics: "第一句歌词",
    status: "completed",
    audioUrl: "data:audio/mpeg;base64,",
    durationMs: 180000,
    createdAt: "2026-01-01 12:00:00",
  };
  let submittedTitle = "";

  await page.route("**/api/music/tasks", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify([task]),
  }));
  await page.route("**/api/music/tasks/music-rename/title", async (route) => {
    const payload = route.request().postDataJSON();
    submittedTitle = payload.title;
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ ...task, title: payload.title }),
    });
  });

  await page.goto("/#/music");
  await page.locator(".music-ref-recent-more").click();
  await page.getByRole("menuitem", { name: "修改名称" }).click();

  const dialog = page.getByRole("dialog", { name: "修改歌曲名称" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("歌曲名称").fill("新的歌曲名称");
  await dialog.getByRole("button", { name: "保存" }).click();

  await expect(dialog).toBeHidden();
  await expect(page.locator(".music-ref-recent-main strong")).toHaveText("新的歌曲名称");
  expect(submittedTitle).toBe("新的歌曲名称");
});

test("music renders failed tasks without a misleading play action", async ({ page }) => {
  await page.route("**/api/music/tasks", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify([{
      id: "music-failed-snapshot",
      prompt: "失败状态验证",
      title: "失败的音乐任务",
      status: "failed",
      error: "服务暂时不可用，请稍后重试",
      createdAt: "2026-01-01 12:00:00",
    }]),
  }));

  await page.goto("/#/music");
  const card = page.locator(".music-ref-recent-card.is-failed");
  await expect(card).toBeVisible();
  await expect(card.locator(".music-ref-recent-failed-status")).toContainText("服务暂时不可用");
  await expect(card.locator(".music-ref-recent-play")).toHaveCount(0);
  await expect(card.locator(".music-ref-recent-cover")).toBeDisabled();
  await card.locator(".music-ref-recent-retry").click();
  await expect(page.locator(".ai-music-workbench textarea").first()).toHaveValue("失败状态验证");
  await expect(page.locator(".ai-music-workbench input").first()).toHaveValue("失败的音乐任务");
});

test("replicate route mounts its upload workspace", async ({ page }) => {
  await page.goto("/#/replicate");
  await expect(page.locator(".replicate-view")).toBeVisible();
  await expect(page.locator(".replicate-upload-slot")).toBeVisible();
  await expect(page.locator(".replicate-view")).toHaveScreenshot(
    "replicate-workbench-empty.png",
  );
});

test("replicate history keeps its empty state visually stable", async ({ page }) => {
  await page.route("**/api/replicate/tasks", (route) =>
    route.fulfill({ contentType: "application/json", body: "[]" }),
  );
  const tasksLoaded = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/replicate/tasks" && response.ok();
  });
  await page.goto("/#/replicate");
  await tasksLoaded;
  await page.getByRole("button", { name: "历史记录", exact: true }).click();

  const canvas = page.locator(".replicate-canvas");
  await expect(canvas.locator(".ui-empty__illustration")).toBeVisible();
  await expect(canvas.locator(".ui-empty__description")).toHaveCount(0);
  await expect(canvas).toHaveScreenshot("replicate-history-empty.png");
});

test("replicate history renders a completed result", async ({ page }) => {
  await page.route("**/api/replicate/tasks", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify([
        {
          id: "replicate-completed-snapshot",
          source: "image",
          description: "A cinematic portrait with warm sunset lighting",
          prompt: "Cinematic portrait, warm sunset lighting, shallow depth of field",
          createdAt: "2026-01-03 12:00:00",
        },
      ]),
    }),
  );
  const tasksLoaded = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/replicate/tasks" && response.ok();
  });
  await page.goto("/#/replicate");
  await tasksLoaded;
  await page.locator(".feature-view-tabs button").nth(1).click();

  const canvas = page.locator(".replicate-canvas");
  await expect(canvas.locator(".replicate-recent-card")).toHaveCount(1);
  await expect(canvas).toHaveScreenshot("replicate-history-completed.png");
});

test("video dubbing history keeps its empty state visually stable", async ({ page }) => {
  await mockVideoDubbingWorkspace(page);
  const tasksLoaded = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/video-dub/tasks" && response.ok();
  });
  await page.goto("/#/video-voice");
  await tasksLoaded;
  await page.getByRole("button", { name: "历史记录", exact: true }).click();

  const canvas = page.locator(".video-dub-canvas");
  await expect(canvas.locator(".ui-empty__illustration")).toBeVisible();
  await expect(canvas.locator(".ui-empty__description")).toHaveCount(0);
  await expect(canvas).toHaveScreenshot("video-dubbing-history-empty.png");
});

test("video dubbing history renders processing, completed and failed tasks", async ({ page }) => {
  const videoUrl = "data:video/mp4;base64,";
  await mockVideoDubbingWorkspace(page, {
    tasks: [
      {
        id: "video-dub-processing-snapshot",
        status: "processing",
        stage: "generating_voice",
        progress: 42,
        sourceFileName: "处理中测试视频.mp4",
        createdAt: "2026-01-03 12:00:00",
      },
      {
        id: "video-dub-completed-snapshot",
        status: "completed",
        sourceFileName: "成功测试视频.mp4",
        result: { videoUrl },
        createdAt: "2026-01-02 12:00:00",
      },
      {
        id: "video-dub-failed-snapshot",
        status: "failed",
        sourceFileName: "失败测试视频.mp4",
        error: "测试失败原因",
        createdAt: "2026-01-01 12:00:00",
      },
    ],
  });
  const tasksLoaded = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/video-dub/tasks" && response.ok();
  });
  await page.goto("/#/video-voice");
  await tasksLoaded;
  await page.getByRole("button", { name: "历史记录", exact: true }).click();

  const canvas = page.locator(".video-dub-canvas");
  await expect(canvas.locator(".video-dub-recent-card")).toHaveCount(3);
  await expect(canvas.locator(".status-processing")).toBeVisible();
  await expect(canvas.locator(".status-completed")).toBeVisible();
  await expect(canvas.locator(".status-failed")).toBeVisible();
  await expect(canvas).toHaveScreenshot("video-dubbing-history-task-states.png");
});

for (const [route, apiPath, title] of [
  ["voice", "voice", "暂无生成记录"],
  ["voice-convert", "voice-convert", "暂无转换记录"],
  ["transcribe", "transcribe", "暂无转录记录"],
]) {
  test(`${route} history keeps its empty state visually stable`, async ({ page }) => {
    await mockAudioHistoryWorkspace(page, apiPath);
    const tasksLoaded = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === `/api/${apiPath}/tasks` && response.ok();
    });
    await page.goto(`/#/${route}`);
    await tasksLoaded;
    await page.getByRole("button", { name: "历史记录", exact: true }).click();

    const history = page.locator(".voice-recent-panel");
    await expect(history.locator(".ui-empty__illustration")).toBeVisible();
    await expect(history.locator(".ui-empty__title")).toHaveText(title);
    await expect(history.locator(".ui-empty__description")).toHaveCount(0);
    await expect(history).toHaveScreenshot(`${route}-history-empty.png`);
  });
}

for (const [route, apiPath, task] of [
  ["voice", "voice", {
    id: "voice-completed-snapshot",
    title: "语音合成结果",
    voiceName: "测试音色",
    durationMs: 12000,
    audioUrl: "data:audio/mpeg;base64,",
    createdAt: "2026-01-01 12:00:00",
  }],
  ["voice-convert", "voice-convert", {
    id: "voice-convert-completed-snapshot",
    title: "音色转换结果",
    voiceName: "测试音色",
    durationMs: 12000,
    audioUrl: "data:audio/mpeg;base64,",
    createdAt: "2026-01-01 12:00:00",
  }],
  ["transcribe", "transcribe", {
    id: "transcribe-completed-snapshot",
    title: "语音转文字结果",
    durationMs: 12000,
    text: "这是用于视觉回归的转录文本。",
    createdAt: "2026-01-01 12:00:00",
  }],
]) {
  test(`${route} history renders a completed result`, async ({ page }) => {
    await mockAudioHistoryWorkspace(page, apiPath, { tasks: [task] });
    const tasksLoaded = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === `/api/${apiPath}/tasks` && response.ok();
    });
    await page.goto(`/#/${route}`);
    await tasksLoaded;
    await page.getByRole("button", { name: "历史记录", exact: true }).click();

    const history = page.locator(".voice-recent-panel");
    await expect(history.locator(".voice-recent-card")).toHaveCount(1);
    await expect(history).toHaveScreenshot(`${route}-history-completed.png`);
  });
}

test("watermark history keeps its empty state visually stable", async ({ page }) => {
  await mockMarketingToolWorkspace(page, "watermark");
  const tasksLoaded = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/watermark/tasks" && response.ok();
  });
  await page.goto("/#/watermark");
  await tasksLoaded;
  await page.getByRole("button", { name: "历史记录", exact: true }).click();

  const canvas = page.locator(".marketing-canvas");
  await expect(canvas.locator(".ui-empty__illustration")).toBeVisible();
  await expect(canvas.locator(".ui-empty__title")).toHaveText("暂无历史记录");
  await expect(canvas.locator(".ui-empty__description")).toHaveCount(0);
  await expect(canvas).toHaveScreenshot("watermark-history-empty.png");
});

for (const [status, snapshot] of [
  ["processing", "watermark-processing.png"],
  ["completed", "watermark-completed.png"],
  ["failed", "watermark-failed.png"],
]) {
  test(`watermark history renders a stable ${status} state`, async ({ page }) => {
    await mockMarketingToolWorkspace(page, "watermark", {
      tasks: [{
        id: `watermark-${status}-snapshot`,
        status,
        progress: status === "processing" ? 42 : 100,
        mediaType: "image",
        price: "1",
        error: status === "failed" ? "测试失败原因" : "",
        createdAt: "2026-01-01 12:00:00",
        resultUrl: status === "completed" ? "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==" : "",
      }],
    });
    const tasksLoaded = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === "/api/watermark/tasks" && response.ok();
    });

    await page.goto("/#/watermark");
    await tasksLoaded;
    await page.getByRole("button", { name: "历史记录", exact: true }).click();
    const card = page.locator(".watermark-task-card");
    await expect(card).toBeVisible();
    await expect(page.locator(".marketing-canvas")).toHaveScreenshot(snapshot);
  });
}

test("watermark processing respects reduced-motion preferences", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await mockMarketingToolWorkspace(page, "watermark", {
    tasks: [{
      id: "watermark-reduced-motion",
      status: "processing",
      progress: 42,
      mediaType: "image",
      price: "1",
      createdAt: "2026-01-01 12:00:00",
    }],
  });
  const tasksLoaded = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/watermark/tasks" && response.ok();
  });

  await page.goto("/#/watermark");
  await tasksLoaded;
  await page.getByRole("button", { name: "历史记录", exact: true }).click();

  await expect(
    page.locator(".watermark-task-card.status-processing .watermark-task-placeholder svg"),
  ).toHaveCSS("animation-name", "none");
});

for (const [route, modulePath] of [["remove-bg", "remove-bg"], ["enhance", "enhance"]]) {
  test(`${route} history uses the shared empty state`, async ({ page }) => {
    await mockMarketingToolWorkspace(page, modulePath);
    const tasksLoaded = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === `/api/${modulePath}/tasks` && response.ok();
    });
    await page.goto(`/#/${route}`);
    await tasksLoaded;
    await page.getByRole("button", { name: "历史记录", exact: true }).click();

    const canvas = page.locator(".marketing-canvas");
    await expect(canvas.locator(".ui-empty__illustration")).toBeVisible();
    await expect(canvas.locator(".ui-empty__title")).toHaveText("暂无历史记录");
    await expect(canvas.locator(".ui-empty__description")).toHaveCount(0);
    await expect(canvas).toHaveScreenshot(`${route}-history-empty.png`);
  });

  test(`${route} history renders processing, completed and failed tasks`, async ({ page }) => {
    const resultUrl = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
    await mockMarketingToolWorkspace(page, modulePath, {
      tasks: [
        {
          id: `${route}-processing-snapshot`,
          status: "processing",
          progress: 42,
          price: "1",
          createdAt: "2026-01-03 12:00:00",
        },
        {
          id: `${route}-completed-snapshot`,
          status: "completed",
          price: "1",
          resultUrl,
          sourceFileName: "测试结果.png",
          createdAt: "2026-01-02 12:00:00",
        },
        {
          id: `${route}-failed-snapshot`,
          status: "failed",
          price: "1",
          error: "测试失败原因",
          createdAt: "2026-01-01 12:00:00",
        },
      ],
    });
    const tasksLoaded = page.waitForResponse((response) => {
      const url = new URL(response.url());
      return url.pathname === `/api/${modulePath}/tasks` && response.ok();
    });
    await page.goto(`/#/${route}`);
    await tasksLoaded;
    await page.getByRole("button", { name: "历史记录", exact: true }).click();

    const canvas = page.locator(".marketing-canvas");
    await expect(canvas.locator(".watermark-task-card")).toHaveCount(3);
    await expect(canvas.locator(".status-processing")).toBeVisible();
    await expect(canvas.locator(".status-completed")).toBeVisible();
    await expect(canvas.locator(".status-failed")).toBeVisible();
    await expect(canvas).toHaveScreenshot(`${route}-history-task-states.png`);
  });
}

test("article route mounts its workbench", async ({ page }) => {
  await mockArticleWorkspace(page);
  await page.goto("/#/article");
  await expect(page.locator(".article-view-root")).toBeVisible();
  await expect(page.locator(".article-workspace")).toBeVisible();
  await expect(page.locator(".article-workspace")).toHaveScreenshot(
    "article-workbench-empty.png",
  );
});

test("article workbench submits a copy draft with its extracted configuration", async ({ page }) => {
  await mockArticleWorkspace(page);
  await page.route("**/api/auth/me", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ user: { id: "article-test-user", username: "article-test-user" } }),
    }),
  );
  await page.route("**/api/article/copy-draft", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        copy: {
          title: "提取配置后的文案草稿",
          body: "用于验证平台、类型和版式配置都可正常提交。",
          tags: ["测试"],
        },
        imagePromptPlan: { contentType: "xiaohongshu-cover", layoutStyle: "balanced" },
      }),
    }),
  );

  await page.goto("/#/article");
  await page.locator(".fm-popular-template-trigger").click();
  await page.locator(".fm-popular-template-menu button").first().click();
  await page.locator(".article-topic-field textarea").fill("提取配置后的真实提交流程");
  await page.locator(".article-generate-fab").click();

  await expect(page.locator(".article-copy-result label").first().locator("input")).toHaveValue("提取配置后的文案草稿");
});

test("article history mode mounts after switching tabs", async ({ page }) => {
  await mockArticleWorkspace(page);
  await page.goto("/#/article");
  await page.getByRole("button", { name: "历史图文", exact: true }).click();
  await expect(page.locator(".article-view-root.article-history-mode")).toBeVisible();
  await expect(page.locator(".article-history-page")).toBeVisible();
  await expect(page.locator(".article-history-page")).toHaveScreenshot(
    "article-history-empty.png",
  );
});

test("article history renders processing, completed and failed tasks", async ({ page }) => {
  await mockArticleWorkspace(page, {
    tasks: [
      {
        id: "article-processing-snapshot",
        status: "processing",
        title: "Processing article task",
        ratio: "3:4",
        quality: "standard",
        createdAt: "2026-01-03 12:00:00",
      },
      {
        id: "article-completed-snapshot",
        status: "completed",
        title: "Completed article task",
        ratio: "3:4",
        quality: "standard",
        image: "/assets/imgInspiration/img-sheying/ig_0dc22d0dacb7119f016a38e7d1b158819183ceb9c05a436ea4.webp",
        createdAt: "2026-01-02 12:00:00",
      },
      {
        id: "article-failed-snapshot",
        status: "failed",
        title: "Failed article task",
        ratio: "3:4",
        quality: "standard",
        error: "Test article generation failure",
        createdAt: "2026-01-01 12:00:00",
      },
    ],
  });
  await page.goto("/#/article");
  await page.getByRole("button", { name: "历史图文", exact: true }).click();

  const history = page.locator(".article-history-page");
  await expect(history.locator(".article-history-card")).toHaveCount(3);
  await expect(history.locator(".status-processing")).toBeVisible();
  await expect(history.locator(".status-completed")).toBeVisible();
  await expect(history.locator(".status-failed")).toBeVisible();
  await expect(history).toHaveScreenshot("article-history-task-states.png");
});

test("article quick template opens its preview", async ({ page }) => {
  await mockArticleWorkspace(page);
  await page.goto("/#/article");
  await page.locator(".article-quick-rail button").first().click();
  await expect(page.locator(".article-quick-template-preview-dialog")).toBeVisible();
  await expect(page.locator(".article-quick-template-preview-dialog")).toHaveScreenshot(
    "article-quick-template-preview.png",
  );
});

test("assets route mounts its gallery", async ({ page }) => {
  await page.goto("/#/assets");
  const gallery = page.locator(".fm-assets-gallery-view");
  await expect(gallery).toBeVisible();
  await expect(gallery).toHaveScreenshot("assets-gallery-empty.png");
});

test("generation actions are disabled until required input is provided", async ({ page }) => {
  await mockImageGenerationWorkspace(page);
  await page.goto("/#/image");
  await page.locator(".image-filter-tabs button").nth(1).click();
  await expect(page.locator('button[aria-label="生成"]:disabled')).toHaveCount(2);

  await mockVideoGenerationWorkspace(page);
  await page.goto("/#/video");
  await expect(page.locator('button[aria-label="生成"]:disabled')).toHaveCount(1);
});

test("video generation history keeps its empty state visually stable", async ({ page }) => {
  await mockVideoGenerationWorkspace(page);
  await page.goto("/#/video");
  await page.locator(".image-filter-tabs button").nth(1).click();

  const history = page.locator(".video-gen-view");
  await expect(history.locator(".ui-empty")).toBeVisible();
  await expect(history.locator(".ui-empty__description")).toHaveCount(0);
  await expect(history).toHaveScreenshot("video-history-empty.png");
});

test("video generation history renders processing, completed and failed tasks", async ({ page }) => {
  const preview = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==";
  await mockVideoGenerationWorkspace(page, {
    tasks: [
      {
        id: "video-processing-snapshot",
        status: "processing",
        model: "Test model",
        ratio: "16:9",
        duration: 5,
        prompt: "正在生成的测试视频",
        createdAt: "2026-01-03 12:00:00",
      },
      {
        id: "video-completed-snapshot",
        status: "completed",
        model: "Test model",
        ratio: "16:9",
        duration: 5,
        prompt: "生成成功的测试视频",
        video: preview,
        poster: preview,
        createdAt: "2026-01-02 12:00:00",
      },
      {
        id: "video-failed-snapshot",
        status: "failed",
        model: "Test model",
        ratio: "16:9",
        duration: 5,
        prompt: "生成失败的测试视频",
        error: "测试失败原因",
        createdAt: "2026-01-01 12:00:00",
      },
    ],
  });
  await page.goto("/#/video");
  await page.locator(".image-filter-tabs button").nth(1).click();

  const history = page.locator(".video-gen-view");
  await expect(history.locator(".video-result-card")).toHaveCount(3);
  await expect(history.locator(".status-processing")).toBeVisible();
  await expect(history.locator(".status-completed")).toBeVisible();
  await expect(history.locator(".status-failed")).toBeVisible();
  await expect(history).toHaveScreenshot("video-history-task-states.png");
});

test("chat starts in its empty state", async ({ page }) => {
  await mockChatWorkspace(page);
  await page.goto("/#/chat");
  await expect(page.locator(".chat-empty-state")).toBeVisible();
  await expect(page.locator(".chat-history-empty .ui-empty__illustration")).toBeVisible();
  await expect(page.locator(".chat-history-empty .ui-empty__description")).toHaveCount(0);
  await expect(page.locator(".chat-view-root")).toHaveScreenshot("chat-empty.png");
});

test("chat exposes its loading control while a response is streaming", async ({ page }) => {
  await mockChatWorkspace(page);
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "playwright-user", username: "Playwright", credits: 100 }
      })
    });
  });
  await page.route("**/api/chat/messages/stream", async (route) => {
    // Keep the stream open long enough for the loading-state snapshot to be deterministic.
    await new Promise((resolve) => setTimeout(resolve, 1500));
    await route.fulfill({
      contentType: "text/event-stream",
      body: "event: done\ndata: {\"conversationId\":\"playwright-conversation\",\"message\":{\"id\":\"assistant-loading\",\"role\":\"assistant\",\"content\":\"流式响应完成\",\"status\":\"completed\"}}"
    });
  });

  await page.goto("/#/chat");
  await page.locator("textarea").fill("验证加载状态");
  await page.getByRole("button", { name: "发送", exact: true }).click();
  await expect(page.locator(".fm-prompt-submit.is-stop")).toBeVisible();
  await expect(page.locator(".chat-view-root")).toHaveScreenshot("chat-loading.png");
  await expect(page.getByRole("button", { name: "发送", exact: true })).toBeVisible();
});

test("chat renders a completed streamed response", async ({ page }) => {
  await mockChatWorkspace(page);
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "playwright-user", username: "Playwright", credits: 100 }
      })
    });
  });
  await page.route("**/api/chat/messages/stream", async (route) => {
    await route.fulfill({
      contentType: "text/event-stream",
      body: [
        "event: started\ndata: {\"conversationId\":\"playwright-conversation\"}",
        "event: delta\ndata: {\"delta\":\"已完成回复\"}",
        "event: done\ndata: {\"conversationId\":\"playwright-conversation\",\"message\":{\"id\":\"assistant-1\",\"role\":\"assistant\",\"content\":\"已完成回复\",\"status\":\"completed\"}}"
      ].join("\n\n")
    });
  });

  await page.goto("/#/chat");
  await page.locator("textarea").fill("验证完成状态");
  await page.getByRole("button", { name: "发送", exact: true }).click();
  await expect(
    page.locator(".chat-message-bubble", { hasText: "已完成回复" }),
  ).toBeVisible();
  await expect(page.locator(".chat-view-root")).toHaveScreenshot("chat-completed.png");
});

test("chat exposes a visible error when message delivery fails", async ({ page }) => {
  await mockChatWorkspace(page);
  await page.route("**/api/auth/me", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        user: { id: "playwright-user", username: "Playwright", credits: 100 }
      })
    });
  });
  await page.route("**/api/chat/messages/stream", async (route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "测试消息发送失败" })
    });
  });

  await page.goto("/#/chat");
  await page.locator("textarea").fill("验证失败提示");
  await page.getByRole("button", { name: "发送", exact: true }).click();
  await expect(page.locator(".chat-inline-error")).toContainText("测试消息发送失败");
});
