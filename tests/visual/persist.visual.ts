import { expect, test } from "@playwright/test";

test("stamps and cumulative count survive reload, then clear", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("spring-post-office:guide-done", "true"),
  );
  await page.goto("http://127.0.0.1:5173/");
  await expect(page.locator(".loader")).toHaveCount(0);
  await page.getByRole("button", { name: "寄一封春天" }).click();
  await page
    .getByRole("textbox", { name: "想随春风寄出的话" })
    .fill("只在内存里的问候");
  await page.getByRole("button", { name: /让心意随风出发/ }).click();
  await expect(page.getByText(/累计 1 封/).first()).toBeVisible();
  const stored = await page.evaluate(() =>
    localStorage.getItem("spring-post-office:v1:collection"),
  );
  expect(stored).toContain("sakura");
  expect(stored).not.toContain("只在内存里的问候");
  await page.reload();
  await expect(page.locator(".loader")).toHaveCount(0);
  await expect(page.getByText(/本次已放飞 00 封 · 累计 1 封/)).toBeVisible();
  await page.getByRole("button", { name: /信箱与集章/ }).click();
  await expect(page.locator(".stamp-slot.earned")).toContainText("樱花邮戳");
  await page.getByRole("button", { name: "清空收藏" }).click();
  await page.getByRole("button", { name: "确认清空收藏" }).click();
  await expect(page.locator(".stamp-slot.earned")).toHaveCount(0);
  await expect(page.getByText("累计放飞 0 封心意")).toBeVisible();
});
