import { expect, test } from "@playwright/test";

test.use({ timezoneId: "Asia/Shanghai" });

test("reality follow is optional, persisted, paused and exits on manual season", async ({
  page,
}) => {
  await page.clock.setFixedTime(new Date("2026-09-24T21:30:00+08:00"));
  await page.addInitScript(() =>
    localStorage.setItem("spring-post-office:guide-done", "true"),
  );
  await page.goto("/?debug=1");
  await expect(page.locator(".loader")).toHaveCount(0);
  const diagnostic = () =>
    page
      .locator("canvas")
      .evaluate((el) => JSON.parse(el.dataset.diagnostics ?? "{}"));
  expect((await diagnostic()).realTime).toBe(false);
  await page.getByRole("checkbox", { name: "跟随现实时间与季节" }).check();
  await expect.poll(async () => (await diagnostic()).realTime).toBe(true);
  await expect.poll(async () => (await diagnostic()).season).toBe("autumn");
  await expect.poll(async () => (await diagnostic()).hour).toBe(21.5);
  await page.getByRole("button", { name: "暂停" }).click();
  const paused = await diagnostic();
  await page.waitForTimeout(300);
  expect((await diagnostic()).hour).toBe(paused.hour);
  await page.reload();
  await expect(page.locator(".loader")).toHaveCount(0);
  await expect.poll(async () => (await diagnostic()).realTime).toBe(true);
  await page.getByRole("button", { name: "切换到夏天" }).click();
  await expect.poll(async () => (await diagnostic()).realTime).toBe(false);
  await expect.poll(async () => (await diagnostic()).season).toBe("summer");
  expect(
    await page.evaluate(() =>
      localStorage.getItem("spring-post-office:v1:real-time"),
    ),
  ).toBe("false");
  await page.goto("/?debug=1&hour=6.5&season=2");
  await expect(page.locator(".loader")).toHaveCount(0);
  await expect.poll(async () => (await diagnostic()).season).toBe("autumn");
  await expect
    .poll(async () => Math.abs((await diagnostic()).hour - 6.5))
    .toBeLessThan(0.2);
  expect((await diagnostic()).realTime).toBe(false);
  await page.getByRole("checkbox", { name: "跟随现实时间与季节" }).check();
  await expect.poll(async () => (await diagnostic()).realTime).toBe(true);
  await page.getByRole("slider", { name: "一天中的时间" }).focus();
  await page.keyboard.press("ArrowLeft");
  await expect.poll(async () => (await diagnostic()).realTime).toBe(false);
});
