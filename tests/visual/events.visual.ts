import { expect, test, type Page } from "@playwright/test";

const diagnostics = (page: Page) =>
  page
    .locator("canvas")
    .evaluate((el) => JSON.parse(el.dataset.diagnostics ?? "{}"));

async function settle(page: Page, query: string, simTime: number) {
  await page.goto(
    `http://127.0.0.1:5173/tests/browser.html?mode=visual&${query}&settle=${simTime}`,
  );
  await expect
    .poll(async () => (await diagnostics(page)).simTime ?? 0)
    .toBeGreaterThanOrEqual(simTime);
  // Snapshots refresh every 300 ms; let the paused frame publish.
  await page.waitForTimeout(400);
  return diagnostics(page);
}

test("morning mist lifts the cloud sea and thickens the fog", async ({
  page,
}) => {
  const d = await settle(page, "hour=6&event=seaMist", 25);
  expect(d.event).toBe("seaMist");
  expect(d.tide).toBeGreaterThan(0.8);
  await page.screenshot({ path: "docs/screenshots/event-sea-mist.png" });
});

test("sky lanterns rise over the village at night", async ({ page }) => {
  const d = await settle(page, "hour=23&event=skyLanterns", 20);
  expect(d.event).toBe("skyLanterns");
  expect(d.lanterns).toBeGreaterThan(0.9);
  await page.screenshot({ path: "docs/screenshots/event-sky-lanterns.png" });
});

test("a summer night storm brings heavy rain", async ({ page }) => {
  const d = await settle(page, "hour=23&season=1&event=thunderstorm", 18);
  expect(d.event).toBe("thunderstorm");
  expect(d.rain).toBeGreaterThan(0.8);
  expect(d.heavyRain).toBeGreaterThan(0.8);
  await page.screenshot({ path: "docs/screenshots/event-thunderstorm.png" });
});

test("a shared link replays one of the new events", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("spring-post-office:guide-done", "true"),
  );
  await page.goto("http://127.0.0.1:5173/?debug=1&hour=6&event=seaMist");
  await expect(page.locator(".loader")).toHaveCount(0);
  await expect
    .poll(async () => (await diagnostics(page)).event)
    .toBe("seaMist");
  await expect
    .poll(async () => (await diagnostics(page)).tide)
    .toBeGreaterThan(0.1);
});
