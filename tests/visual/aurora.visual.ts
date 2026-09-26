import { expect, test } from "@playwright/test";

test("winter aurora renders, freezes on pause and stills with reduced motion", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(
    "/tests/browser.html?mode=visual&hour=23&season=3&event=aurora&settle=20",
  );
  const diagnostics = () =>
    page
      .locator("canvas")
      .evaluate((el) => JSON.parse(el.dataset.diagnostics ?? "{}"));
  await expect
    .poll(async () => (await diagnostics()).aurora)
    .toBeGreaterThan(0.9);
  await expect.poll(async () => (await diagnostics()).speed).toBe(0);
  const before = await diagnostics();
  expect(before.auroraMotion).toBe(0);
  await page.waitForTimeout(600);
  expect((await diagnostics()).simTime).toBe(before.simTime);
  await page.screenshot({ path: "docs/screenshots/event-aurora.png" });
  expect(errors).toEqual([]);
});
