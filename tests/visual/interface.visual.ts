import { expect, test } from "@playwright/test";

test("opening, sound invitation and captions", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".loader")).toHaveCount(0);
  await expect(page.locator(".overlay")).not.toHaveClass(/arriving/);

  const sound = page.getByRole("button", { name: "打开环境音效" });
  await expect(sound).toBeVisible();
  await page.locator("#world").click({ position: { x: 500, y: 350 } });
  await expect(page.getByText("这座岛有风声和虫鸣，要打开吗？")).toBeVisible();
  await page.keyboard.press("m");
  await expect(
    page.getByRole("button", { name: "关闭环境音效" }),
  ).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "操作指南" }).click();
  await page.getByRole("checkbox", { name: /音效字幕/ }).check();
  await page
    .locator(".hotspot-keys button")
    .filter({ hasText: "门铃" })
    .click();
  await expect(page.locator(".notice-sound")).toContainText("邮局的门铃");
});
