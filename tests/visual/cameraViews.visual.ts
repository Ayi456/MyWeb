import { expect, test } from "@playwright/test";

test("island views are keyboard reachable and their copied links replay", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() =>
    localStorage.setItem("spring-post-office:guide-done", "true"),
  );
  await page.goto("http://127.0.0.1:5173/?debug=1&hour=12");
  await expect(page.locator(".loader")).toHaveCount(0);
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  const diagnostics = () =>
    page
      .locator("canvas")
      .evaluate((el) => JSON.parse(el.dataset.diagnostics ?? "{}"));
  for (const [label, preset] of [
    ["花园岛", "garden"],
    ["灯塔", "lighthouse"],
    ["茶山", "teahouse"],
    ["温泉村", "village"],
  ]) {
    await page.getByRole("button", { name: "操作指南" }).click();
    const button = page.getByRole("button", {
      name: `去看${label}`,
      exact: true,
    });
    await button.focus();
    await page.keyboard.press("Enter");
    await expect
      .poll(async () => (await diagnostics()).cameraPreset)
      .toBe(preset);
    await page.waitForTimeout(2300);
    await page.screenshot({ path: `docs/screenshots/view-${preset}.png` });
  }
  await page.getByRole("button", { name: "复制此刻链接" }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(new URL(link).searchParams.get("preset")).toBe("village");
  await page.goto(link + "&debug=1");
  await expect(page.locator(".loader")).toHaveCount(0);
  await expect
    .poll(async () => (await diagnostics()).cameraPreset)
    .toBe("village");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "操作指南" }).click();
  await page.getByRole("button", { name: "去看茶山", exact: true }).click();
  await expect
    .poll(async () => (await diagnostics()).cameraPreset)
    .toBe("teahouse");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
});

test("double clicking a hotspot glides towards its landmark", async ({
  page,
}) => {
  await page.goto(
    "http://127.0.0.1:5173/tests/browser.html?mode=visual&hour=12",
  );
  const diagnostics = () =>
    page
      .locator("canvas")
      .evaluate((el) => JSON.parse(el.dataset.diagnostics ?? "{}"));
  await expect.poll(async () => (await diagnostics()).ready).toBe(true);
  await page.locator("canvas").dblclick({ position: { x: 520, y: 220 } });
  await expect
    .poll(async () => (await diagnostics()).cameraPreset)
    .toBe("tree");
  await expect
    .poll(async () => (await diagnostics()).cameraView.distance)
    .toBe(17);
  await expect
    .poll(async () => {
      const d = await diagnostics();
      return Math.hypot(
        ...d.camera.map((v: number, i: number) => v - d.cameraView.focus[i]),
      );
    })
    .toBeCloseTo(17, 0);
});

test("idle touring stops for pause, panels and reduced motion", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("spring-post-office:guide-done", "true"),
  );
  await page.goto("http://127.0.0.1:5173/?debug=1&hour=12");
  await expect(page.locator(".loader")).toHaveCount(0);
  const diagnostics = () =>
    page
      .locator("canvas")
      .evaluate((el) => JSON.parse(el.dataset.diagnostics ?? "{}"));
  await expect
    .poll(async () => (await diagnostics()).autoOrbit, { timeout: 14000 })
    .toBe(true);
  const first = (await diagnostics()).cameraView.focus;
  await page.waitForTimeout(1200);
  expect((await diagnostics()).cameraView.focus).not.toEqual(first);
  await page.getByRole("button", { name: "打开环境音效", exact: true }).click();
  await expect.poll(async () => (await diagnostics()).autoOrbit).toBe(false);
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await expect.poll(async () => (await diagnostics()).autoOrbit).toBe(false);
  const paused = (await diagnostics()).cameraView;
  await page.waitForTimeout(700);
  expect((await diagnostics()).cameraView).toEqual(paused);
  await page.getByRole("button", { name: "时间倍率 1", exact: true }).click();
  await page.getByRole("button", { name: "操作指南" }).click();
  await page.waitForTimeout(9000);
  expect((await diagnostics()).autoOrbit).toBe(false);
  await page.getByRole("button", { name: "关闭操作指南" }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(9000);
  expect((await diagnostics()).autoOrbit).toBe(false);
});
