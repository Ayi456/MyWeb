import { expect, test } from "@playwright/test";

const SHOTS = [
  { name: "dusk", query: "hour=16.33" },
  { name: "day-tree", query: "hour=12&preset=tree" },
  { name: "night", query: "hour=23" },
  { name: "winter", query: "hour=16.33&season=3" },
];

for (const { name, query } of SHOTS) {
  test(`main island · ${name}`, async ({ page }) => {
    await page.goto(`/tests/browser.html?mode=visual&${query}`);
    // The harness pauses the clock; give the camera damping time to settle.
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `docs/screenshots/three-r186-${name}.png` });
    await expect(page).toHaveScreenshot(`${name}.png`);
  });
}
