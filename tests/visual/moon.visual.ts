import { expect, test } from "@playwright/test";

test.use({ timezoneId: "Asia/Shanghai" });

test("moon shader tracks the date and festival forces full moon", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-09-11T23:00:00+08:00"));
  await page.addInitScript(() =>
    localStorage.setItem("spring-post-office:guide-done", "true"),
  );
  await page.goto("/?debug=1&hour=23");
  await expect(page.locator(".loader")).toHaveCount(0);
  const phase = () =>
    page
      .locator("canvas")
      .evaluate(
        (el) => JSON.parse(el.dataset.diagnostics ?? "{}").moonPhase as number,
      );
  await expect.poll(phase).toBeLessThan(0.04);
  await page.clock.setFixedTime(new Date("2026-09-25T23:00:00+08:00"));
  await page.reload();
  await expect(page.locator(".loader")).toHaveCount(0);
  await expect.poll(phase).toBe(0.5);
  await page.goto("/?classic=1&debug=1&hour=23");
  await expect(page.locator(".loader")).toHaveCount(0);
  await expect.poll(phase).toBe(0.5);
});
