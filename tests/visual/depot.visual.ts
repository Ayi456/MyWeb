import { expect, test, type Page } from "@playwright/test";
const data = (page: Page) =>
  page
    .locator("#world")
    .evaluate((el) =>
      JSON.parse((el as HTMLCanvasElement).dataset.diagnostics ?? "{}"),
    );
test("depot is keyboard reachable and shareable; cablecar freezes for pause and reduced motion", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("spring-post-office:guide-done", "true");
    localStorage.setItem("spring-post-office:sound-asked", "true");
  });
  await page.goto("/?preset=depot&hour=12&debug=1");
  await expect(page.locator(".loader")).toHaveCount(0);
  await expect.poll(async () => (await data(page)).cameraPreset).toBe("depot");
  await page.getByRole("button", { name: "操作指南", exact: true }).click();
  await page.getByRole("button", { name: "群岛驿站", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByText(/驿站/).first()).toBeVisible();
  await page.getByRole("button", { name: "关闭操作指南", exact: true }).click();
  await expect
    .poll(async () => (await data(page)).ropewayTime)
    .toBeGreaterThan(6.5);
  const moving = (await data(page)).cablecar;
  await page.waitForTimeout(500);
  expect((await data(page)).cablecar).not.toEqual(moving);
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await expect.poll(async () => (await data(page)).speed).toBe(0);
  const paused = (await data(page)).cablecar;
  await page.waitForTimeout(700);
  expect((await data(page)).cablecar).toEqual(paused);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "时间倍率 1", exact: true }).click();
  await expect.poll(async () => (await data(page)).speed).toBe(1);
  await page.waitForTimeout(700);
  expect((await data(page)).cablecar).toEqual(paused);
  await page.screenshot({ path: "docs/screenshots/depot-ropeway.png" });
});
