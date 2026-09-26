import { expect, test, type Page } from "@playwright/test";
const data = (page: Page) =>
  page
    .locator("#world")
    .evaluate((el) =>
      JSON.parse((el as HTMLCanvasElement).dataset.diagnostics ?? "{}"),
    );
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("spring-post-office:guide-done", "true");
    localStorage.setItem("spring-post-office:sound-asked", "true");
  });
});
test("rabbit walk moves, collides, shares, stops on panel/blur and returns to orbit", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/?hour=12&debug=1");
  await expect.poll(async () => (await data(page)).ready).toBe(true);
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await page.getByRole("button", { name: "操作指南", exact: true }).click();
  await page.getByRole("button", { name: "开始岛上散步", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect.poll(async () => (await data(page)).walkView?.z).toBe(1.65);
  await page.locator("#world").focus();
  await page.keyboard.down("w");
  await page.waitForTimeout(500);
  await page.keyboard.up("w");
  await page.waitForTimeout(400);
  await expect
    .poll(async () => (await data(page)).walkView.z)
    .toBeLessThan(1.3);
  const d = await data(page);
  expect(d.camera[1]).toBeGreaterThan(1.65);
  expect(d.camera[1]).toBeLessThan(2.1);
  expect(d.autoOrbit).toBe(false);
  await page.getByRole("button", { name: "复制此刻链接", exact: true }).click();
  const url = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URL(url).searchParams.has("walk")).toBe(true);
  const sharedZ = Number(new URL(url).searchParams.get("walk")!.split(",")[1]);
  await page.goto(url + "&debug=1");
  await expect
    .poll(async () => (await data(page)).walkView?.z)
    .toBeCloseTo(sharedZ, 3);
  await page.locator("#world").focus();
  await page.keyboard.down("d");
  await page.waitForTimeout(100);
  await page.evaluate(() => dispatchEvent(new Event("blur")));
  await page.keyboard.up("d");
  await page.waitForTimeout(400);
  const blurred = (await data(page)).walkView;
  await page.waitForTimeout(400);
  expect((await data(page)).walkView).toEqual(blurred);
  await page.getByRole("button", { name: "操作指南", exact: true }).click();
  const blocked = (await data(page)).walkView;
  await page
    .locator("#world")
    .dispatchEvent("keydown", { code: "KeyW", key: "w" });
  await page.waitForTimeout(500);
  expect((await data(page)).walkView).toEqual(blocked);
  await page.getByRole("button", { name: "关闭操作指南", exact: true }).focus();
  await page.keyboard.press("Escape");
  await expect(page.locator(".help")).toHaveCount(0);
  const yaw = (await data(page)).walkView.yaw;
  await page.mouse.move(500, 280);
  await page.mouse.down();
  await page.mouse.move(700, 320, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () => (await data(page)).walkView.yaw)
    .toBeLessThan(yaw);
  await page.screenshot({ path: "docs/screenshots/rabbit-walk.png" });
  await page.getByRole("button", { name: "结束散步", exact: true }).click();
  await expect.poll(async () => (await data(page)).walkView).toBeNull();
  await page.locator("#world").focus();
  await page.keyboard.press("r");
  await expect.poll(async () => (await data(page)).cameraPreset).toBe("reset");
});
test("touch direction buttons cancel cleanly and invalid solid-ground coordinates fall back safely", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?walk=1.2,0.15,0,0&hour=12&debug=1");
  await expect.poll(async () => (await data(page)).walkView?.z).toBe(1.65);
  const button = page.getByRole("button", { name: "向左走", exact: true });
  expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
  const touch = await page.context().newCDPSession(page);
  const bounds = (await button.boundingBox())!;
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [
      { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
    ],
  });
  await page.waitForTimeout(400);
  await touch.send("Input.dispatchTouchEvent", {
    type: "touchCancel",
    touchPoints: [],
  });
  await touch.detach();
  await page.waitForTimeout(400);
  await expect.poll(async () => (await data(page)).walkView.x).toBeLessThan(0);
  const stopped = (await data(page)).walkView;
  await page.waitForTimeout(500);
  expect((await data(page)).walkView).toEqual(stopped);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({ path: "docs/screenshots/rabbit-walk-mobile.png" });
  await page.getByRole("button", { name: "结束散步", exact: true }).click();
  await expect.poll(async () => (await data(page)).walkView).toBeNull();
});
