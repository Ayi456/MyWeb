import { expect, test } from "@playwright/test";

test("hotspots react to night, winter and a sent letter", async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem("spring-post-office:guide-done", "true"),
  );
  await page.goto("http://127.0.0.1:5173/?debug=1&hour=23");
  await expect(page.locator(".loader")).toHaveCount(0);
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await page.locator("#world").focus();
  await page.keyboard.press("3");
  await expect(page.locator(".notice-stack")).toContainText("借着灯笼的光");
  await page.getByRole("button", { name: "切换到冬天" }).click();
  await page.locator("#world").focus();
  await page.keyboard.press("1");
  await expect(page.locator(".notice-stack")).toContainText("等开春");
  await page.getByRole("button", { name: "寄一封春天" }).click();
  await expect(page.locator("#letter-description")).toContainText("晚安");
  await page
    .getByRole("textbox", { name: "想随春风寄出的话" })
    .fill("只留在内存的雪夜问候");
  await page.getByRole("button", { name: /让心意随风出发/ }).click();
  await page.locator("#world").focus();
  await page.keyboard.press("3");
  await expect(page.locator(".notice-stack")).toContainText(
    /贴好了邮票|你的问候已经在路上/,
  );
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain(
    "只留在内存的雪夜问候",
  );
});

test("a reply remembers the cloud whale and persists as a fixed line", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("spring-post-office:guide-done", "true"),
  );
  await page.goto(
    "http://127.0.0.1:5173/?debug=1&hour=12&season=2&event=whale",
  );
  await expect(page.locator(".loader")).toHaveCount(0);
  await page.getByRole("button", { name: "时间倍率 12", exact: true }).click();
  await page.getByRole("button", { name: "寄一封春天" }).click();
  await page
    .getByRole("textbox", { name: "想随春风寄出的话" })
    .fill("不保存的远方问候");
  await page.getByRole("button", { name: /让心意随风出发/ }).click();
  await expect(page.locator(".notice-reply")).toContainText("云鲸", {
    timeout: 20000,
  });
  const saved = await page.evaluate(() =>
    localStorage.getItem("spring-post-office:v1:collection"),
  );
  expect(saved).not.toContain("不保存的远方问候");
  expect(JSON.parse(saved!).replies.at(-1).index).toBeGreaterThanOrEqual(5);
  await page.reload();
  await expect(page.locator(".loader")).toHaveCount(0);
  await page.getByRole("button", { name: /信箱与集章/ }).click();
  await expect(page.getByRole("dialog", { name: "信箱与集章" })).toContainText(
    "云鲸",
  );
});

test("season changes create a particle burst that freezes on pause", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("spring-post-office:guide-done", "true"),
  );
  await page.goto("http://127.0.0.1:5173/?debug=1&hour=12");
  await expect(page.locator(".loader")).toHaveCount(0);
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await page.getByRole("button", { name: "切换到秋天" }).click();
  const burst = () =>
    page
      .locator("canvas")
      .evaluate((el) => JSON.parse(el.dataset.diagnostics ?? "{}").treeBurst);
  await expect.poll(burst).toBeGreaterThan(1);
  const before = await burst();
  await page.waitForTimeout(600);
  expect(await burst()).toBe(before);
  await page.getByRole("button", { name: "时间倍率 12", exact: true }).click();
  await expect.poll(burst).toBe(0);
});
