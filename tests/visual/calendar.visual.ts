import { expect, test } from "@playwright/test";

test.use({ timezoneId: "Asia/Shanghai" });

test("solar term and return visit appear on desktop and mobile", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-09-23T10:00:00+08:00"));
  await page.addInitScript(() =>
    localStorage.setItem("spring-post-office:guide-done", "true"),
  );
  await page.goto("http://127.0.0.1:5173/");
  await expect(page.locator(".loader")).toHaveCount(0);
  await expect(page.locator(".almanac-line")).toContainText("秋分");
  await page.reload();
  await expect(page.locator(".loader")).toHaveCount(0);
  await expect(page.locator(".returning-line")).toContainText("第 2 次");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.locator(".mobile-journey")).toContainText("秋分");
});
