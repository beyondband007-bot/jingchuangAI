import { expect, test } from "@playwright/test";

const authenticatedUser = {
  id: "canvas-style-user",
  username: "canvas-style-user",
  displayName: "画布样式验证用户",
  credits: 10000,
  isGuest: false,
};

function projectPayload(id = "canvas-style-project") {
  return {
    id,
    name: "样式回归项目",
    revision: 1,
    thumbnailUrl: "",
    createdAt: "2026-07-27T00:00:00.000Z",
    updatedAt: "2026-07-27T00:00:00.000Z",
    graph: { nodes: [], edges: [] },
    viewport: { x: 0, y: 0, zoom: 1 },
  };
}

async function mockCanvasWorkspace(page) {
  const projects = [];

  await page.route("**/api/auth/me", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ user: authenticatedUser }) }),
  );
  await page.route("**/api/me/credits", (route) =>
    route.fulfill({ contentType: "application/json", body: JSON.stringify({ balance: 10000 }) }),
  );
  await page.route("**/api/canvas/projects**", async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() === "GET" && path === "/api/canvas/projects") {
      return route.fulfill({ contentType: "application/json", body: JSON.stringify(projects) });
    }
    if (request.method() === "POST" && path === "/api/canvas/projects") {
      const project = projectPayload();
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
  const composerPrompt = canvasFrame.locator(".canvas-composer textarea");
  const composerSend = canvasFrame.locator(".canvas-composer__send-button");
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
  await expect(toolbar.locator("[data-tooltip--left]")).toHaveCount(8);

  const body = canvasFrame.locator(".canvas-workbench");
  const hasHorizontalOverflow = await body.evaluate((element) => element.scrollWidth > element.clientWidth);
  expect(hasHorizontalOverflow).toBe(false);
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
