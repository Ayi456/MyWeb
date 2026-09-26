import { expect, test } from "@playwright/test";

test("first-visit guide advances through a real orbit and a sent letter", async ({
  page,
}) => {
  await page.goto("/");
  const guide = page.locator(".guide");
  await expect(guide).toContainText("点一点樱花树", { timeout: 12_000 });
  await page.keyboard.press("1");
  await expect(guide).toContainText("拖一拖");
  await expect(guide).not.toContainText("寄一封春天");
  await page.locator("#world").focus();
  await page.keyboard.press("ArrowRight");
  await expect(guide).toContainText("寄一封春天");
  await guide.getByRole("button", { name: "去写信" }).click();
  await page.getByRole("textbox", { name: "想随春风寄出的话" }).fill("春天好");
  await page.getByRole("button", { name: /让心意随风出发/ }).click();
  await expect(guide).toHaveCount(0);
  await page.reload();
  await expect(page.locator(".loader")).toHaveCount(0);
  await page.waitForTimeout(4500);
  await expect(guide).toHaveCount(0);
  await page.getByRole("button", { name: "操作指南" }).click();
  await page.getByRole("button", { name: "重看三步引导" }).click();
  await expect(guide).toContainText("点一点樱花树");
});
