import { expect, test } from "@playwright/test";

test.use({ timezoneId: "Asia/Shanghai" });

test("mid-autumn decorations and limited stamp persist, while classic disables calendar", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-09-25T20:00:00+08:00"));
  await page.addInitScript(() =>
    localStorage.setItem("spring-post-office:guide-done", "true"),
  );
  await page.goto("/?debug=1");
  await expect(page.locator(".loader")).toHaveCount(0);
  await expect
    .poll(async () =>
      page
        .locator("canvas")
        .evaluate((el) => JSON.parse(el.dataset.diagnostics ?? "{}").festival),
    )
    .toBe("midAutumn");
  await page.getByRole("button", { name: "寄一封春天" }).click();
  await page
    .getByRole("textbox", { name: "想随春风寄出的话" })
    .fill("今晚的问候");
  await page.getByRole("button", { name: /让心意随风出发/ }).click();
  await expect
    .poll(async () =>
      page.evaluate(() =>
        localStorage.getItem("spring-post-office:v1:collection"),
      ),
    )
    .toContain("moon");
  await page.getByRole("button", { name: /信箱与集章/ }).click();
  await expect(
    page.getByRole("list", { name: "限时邮戳" }).locator(".stamp-slot.earned"),
  ).toContainText("望月邮戳");
  await page.goto("/?classic=1&debug=1");
  await expect(page.locator(".loader")).toHaveCount(0);
  await expect
    .poll(async () =>
      page
        .locator("canvas")
        .evaluate((el) => JSON.parse(el.dataset.diagnostics ?? "{}").festival),
    )
    .toBeNull();
  await expect(page.locator(".almanac-line")).toHaveCount(0);
});
