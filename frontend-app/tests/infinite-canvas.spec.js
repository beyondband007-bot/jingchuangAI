import { expect, test } from "@playwright/test";

const authenticatedUser = {
  id: "canvas-style-user",
  username: "canvas-style-user",
  displayName: "画布样式验证用户",
  credits: 10000,
  isGuest: false,
};

function projectPayload(id = "canvas-style-project", graph = { nodes: [], edges: [] }) {
  return {
    id,
    name: "样式回归项目",
    revision: 1,
    thumbnailUrl: "",
    createdAt: "2026-07-27T00:00:00.000Z",
    updatedAt: "2026-07-27T00:00:00.000Z",
    graph,
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

async function mockCanvasWorkspace(page, initialProjects = [], createdProjectGraph = null) {
  const projects = [...initialProjects];

  await page.route("**/api/auth/me", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ user: authenticatedUser }) }),
  );
  await page.route("**/api/me/credits", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ balance: 10000 }) }),
  );
  await page.route("**/api/canvas/uploads/media", (route) =>
    route.fulfill({
      status: 201,
      contentType: "application/json",
      body: JSON.stringify({
        url: "/media/canvas/uploads/test-voice.mp3",
        kind: "audio",
        originalName: "test-voice.mp3",
        mimeType: "audio/mpeg",
        size: 12,
      }),
    }),
  );
  await page.route("**/api/canvas/projects**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "GET" && path === "/api/canvas/projects") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify(projects) });
    }
    if (request.method() === "POST" && path === "/api/canvas/projects") {
      const project = projectPayload(
        "canvas-style-project",
        createdProjectGraph || { nodes: [], edges: [] },
      );
      projects.push(project);
      return route.fulfill({ contentType: "application/json", body: JSON.stringify(project) });
    }
    const projectId = path.split("/")[4];
    const project = projects.find((item) => item.id === projectId) || projectPayload(projectId);
    return route.fulfill({ contentType: "application/json", body: JSON.stringify(project) });
  });
}

test("authenticated infinite canvas keeps the unified workbench shell", async ({ page }) => {
  await mockCanvasWorkspace(page);
  await page.goto("/#/infinite-canvas");

  await expect(page.locator(".app-shell__header")).toHaveCount(0);

  const canvasFrame = page.frameLocator('iframe[title="Facemini 无限画布"]');
  const createProject = canvasFrame.getByTestId("canvas-create-project");
  await expect(createProject).toBeVisible();
  const homePrompt = canvasFrame.locator(".canvas-home__composer textarea");
  const homeSend = canvasFrame.locator(".canvas-home__send-button");
  const suggestionTags = canvasFrame.locator(".canvas-home__composer > div:last-child button:not([data-testid])");
  await expect(suggestionTags).toHaveCount(4);
  const firstSuggestionBatch = (await suggestionTags.allTextContents()).join("|");
  await canvasFrame.getByTestId("canvas-refresh-suggestions").click();
  expect((await suggestionTags.allTextContents()).join("|")).not.toBe(firstSuggestionBatch);
  await expect(homeSend).toBeDisabled();
  await homePrompt.fill("创建一段画布故事");
  await expect(homeSend).toBeEnabled();
  await createProject.click();

  const workbench = canvasFrame.locator(".canvas-workbench");
  await expect(workbench).toBeVisible();
  await expect(canvasFrame.locator(".canvas-toolbar")).toBeVisible();
  await expect(canvasFrame.locator(".canvas-composer__surface")).toBeVisible();
  await expect(canvasFrame.locator("[role=status]")).toBeVisible();
  await expect(canvasFrame.locator(".canvas-workbench__header")).toBeVisible();
  const backButton = canvasFrame.getByRole("button", { name: "返回项目列表" });
  const backButtonLayout = await backButton.evaluate((element) => {
    const style = getComputedStyle(element);
    const tooltipStyle = getComputedStyle(element, "::before");
    return {
      alignItems: style.alignItems,
      justifyContent: style.justifyContent,
      tooltipTop: tooltipStyle.top,
    };
  });
  expect(backButtonLayout.alignItems).toBe("center");
  expect(backButtonLayout.justifyContent).toBe("center");
  expect(Number.parseFloat(backButtonLayout.tooltipTop)).toBeGreaterThan(0);
  const composerPrompt = canvasFrame.locator(".canvas-composer textarea");
  const composerSend = canvasFrame.locator(".canvas-composer__send-button");
  const canvasSuggestions = canvasFrame.locator(".canvas-composer > div:last-child button:not([data-testid])");
  const canvasSuggestionRefresh = canvasFrame.getByTestId("canvas-refresh-canvas-suggestions");
  await expect(canvasSuggestions).toHaveCount(4);
  const firstCanvasSuggestionBatch = (await canvasSuggestions.allTextContents()).join("|");
  await canvasSuggestionRefresh.click();
  expect((await canvasSuggestions.allTextContents()).join("|")).not.toBe(firstCanvasSuggestionBatch);
  const iconButtonLayout = await canvasSuggestionRefresh.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      alignItems: style.alignItems,
      justifyContent: style.justifyContent,
      transitionProperty: style.transitionProperty,
    };
  });
  expect(iconButtonLayout.alignItems).toBe("center");
  expect(iconButtonLayout.justifyContent).toBe("center");
  expect(iconButtonLayout.transitionProperty).not.toContain("transform");
  await expect(composerSend).toBeDisabled();
  await composerPrompt.fill("生成一个画布节点");
  await expect(composerSend).toBeEnabled();
  const focusStyle = await composerPrompt.evaluate((element) => {
    element.focus();
    const style = getComputedStyle(element);
    return { border: style.borderTopWidth, outline: style.outlineStyle, shadow: style.boxShadow };
  });
  expect(focusStyle).toEqual({ border: "0px", outline: "none", shadow: "none" });

  const toolbar = canvasFrame.locator(".canvas-toolbar");
  await expect(toolbar.locator("[title]")).toHaveCount(0);
  await expect(toolbar.locator("[data-tooltip--left]")).toHaveCount(9);
  await canvasFrame.getByRole("button", { name: "音频", exact: true }).click();
  const audioNode = canvasFrame.locator(".audio-node").first();
  await expect(audioNode).toBeVisible();
  await expect(audioNode.getByText("音频1", { exact: true })).toBeVisible();
  await audioNode.locator('input[type="file"]').setInputFiles({ name: "test-voice.mp3", mimeType: "audio/mpeg", buffer: Buffer.from("mock-audio") });
  await expect(audioNode.locator("audio")).toHaveAttribute("src", "/media/canvas/uploads/test-voice.mp3");
  await expect(audioNode.getByText("音频1", { exact: true })).toBeVisible();
  await canvasFrame.getByRole("button", { name: "音频", exact: true }).click();
  await expect(canvasFrame.locator(".audio-node")).toHaveCount(2);
  await expect(canvasFrame.locator(".audio-node").nth(1).getByText("音频2", { exact: true })).toBeVisible();

  await canvasFrame.getByRole("button", { name: "图片", exact: true }).click();
  await canvasFrame.getByRole("button", { name: "图片", exact: true }).click();
  await expect(canvasFrame.locator(".image-node")).toHaveCount(2);
  await expect(canvasFrame.locator(".image-node").nth(0).getByText("图片1", { exact: true })).toBeVisible();
  await expect(canvasFrame.locator(".image-node").nth(1).getByText("图片2", { exact: true })).toBeVisible();

  await canvasFrame.getByRole("button", { name: "添加节点", exact: true }).click();
  await canvasFrame.getByRole("button", { name: "视频节点", exact: true }).click();
  await canvasFrame.getByRole("button", { name: "添加节点", exact: true }).click();
  await canvasFrame.getByRole("button", { name: "视频节点", exact: true }).click();
  await expect(canvasFrame.locator(".video-node")).toHaveCount(2);
  await expect(canvasFrame.locator(".video-node").nth(0).getByText("视频1", { exact: true })).toBeVisible();
  await expect(canvasFrame.locator(".video-node").nth(1).getByText("视频2", { exact: true })).toBeVisible();

  const body = canvasFrame.locator(".canvas-workbench");
  const hasHorizontalOverflow = await body.evaluate((element) => element.scrollWidth > element.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
});

test("legacy media nodes receive stable project-scoped numbering", async ({ page }) => {
  const mediaTypes = ["image", "video", "audio", "image", "video", "audio"];
  const graph = {
    nodes: mediaTypes.map((type, index) => ({
      id: `node_${index}`,
      type,
      position: { x: 80 + index * 45, y: 100 + index * 35 },
      data: { url: "", label: `旧名称${index + 1}` },
    })),
    edges: [],
  };
  await mockCanvasWorkspace(page, [], graph);
  await page.goto("/#/infinite-canvas");

  const canvasFrame = page.frameLocator('iframe[title="Facemini 无限画布"]');
  await canvasFrame.getByTestId("canvas-create-project").click();
  await expect(canvasFrame.locator(".canvas-workbench")).toBeVisible();
  const canvasPage = page.frames().find((frame) => frame !== page.mainFrame());
  await expect.poll(() => canvasPage.evaluate(() =>
    window.__faceminiCanvasProjects.projects.value[0].canvasData.nodes.map((node) => node.data.label),
  )).toEqual(["图片1", "视频1", "音频1", "图片2", "视频2", "音频2"]);
});

test("infinite canvas tool controls remain usable at the mobile breakpoint", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await mockCanvasWorkspace(page);
  await page.goto("/#/infinite-canvas");

  await expect(page.locator(".app-shell__header")).toHaveCount(0);

  const canvasFrame = page.frameLocator('iframe[title="Facemini 无限画布"]');
  await canvasFrame.getByTestId("canvas-create-project").click();

  const toolbar = canvasFrame.locator(".canvas-toolbar");
  await expect(toolbar).toBeVisible();
  await expect(canvasFrame.getByRole("button", { name: "添加节点", exact: true })).toBeVisible();
  const workbench = canvasFrame.locator(".canvas-workbench");
  const hasHorizontalOverflow = await workbench.evaluate((element) => element.scrollWidth > element.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
});
