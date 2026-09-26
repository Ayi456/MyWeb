import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

test("exports a real PNG and includes letter text only on this export's checked consent", async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem("spring-post-office:guide-done", "true");
    const tracked = window as Window & {
      exportTexts?: string[];
      exportBlob?: Blob;
    };
    tracked.exportTexts = [];
    const fillText = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (
      text,
      x,
      y,
      maxWidth,
    ) {
      tracked.exportTexts?.push(String(text));
      fillText.call(this, text, x, y, maxWidth);
    };
    const create = URL.createObjectURL;
    URL.createObjectURL = (object) => {
      if (object instanceof Blob) tracked.exportBlob = object;
      return create.call(URL, object);
    };
  });
  await page.goto("/");
  await expect(page.locator(".loader")).toHaveCount(0);
  await page.getByRole("button", { name: "寄一封春天" }).click();
  await page
    .getByRole("textbox", { name: "想随春风寄出的话" })
    .fill("今晚的心意");
  await page.getByRole("button", { name: /让心意随风出发/ }).click();
  await page.getByRole("button", { name: "拍照明信片" }).click();
  const optIn = page.getByRole("checkbox", {
    name: "在图片中加入最近一封信的文字",
  });
  await expect(optIn).not.toBeChecked();
  const first = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 PNG / 分享" }).click();
  const download = await first;
  expect(download.suggestedFilename()).toMatch(
    /^spring-post-office-\d{4}-\d\d-\d\d\.png$/,
  );
  const bytes = await readFile(await download.path());
  expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(bytes.length).toBeGreaterThan(10_000);
  expect(
    await page.evaluate(() =>
      (window as Window & { exportTexts?: string[] }).exportTexts?.includes(
        "今晚的心意",
      ),
    ),
  ).toBe(false);
  const distinct = await page.evaluate(async () => {
    const blob = (window as Window & { exportBlob?: Blob }).exportBlob!;
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(bitmap, 0, 0);
    const margin = ctx.getImageData(
      1,
      Math.floor(bitmap.height / 3),
      1,
      1,
    ).data;
    const scene = ctx.getImageData(
      Math.floor(bitmap.width / 2),
      Math.floor(bitmap.height / 3),
      1,
      1,
    ).data;
    bitmap.close();
    return (
      Array.from(margin).join() !== Array.from(scene).join() && scene[3] === 255
    );
  });
  expect(distinct).toBe(true);

  await page.getByRole("button", { name: "拍照明信片" }).click();
  await expect(optIn).not.toBeChecked();
  await optIn.check();
  const second = page.waitForEvent("download");
  await page.getByRole("button", { name: "导出 PNG / 分享" }).click();
  await second;
  expect(
    await page.evaluate(() =>
      (window as Window & { exportTexts?: string[] }).exportTexts?.includes(
        "今晚的心意",
      ),
    ),
  ).toBe(true);
  expect(
    await page.evaluate(() =>
      localStorage.getItem("spring-post-office:v1:collection"),
    ),
  ).not.toContain("今晚的心意");
});

test("camera and guide remain clickable beside controls on desktop and phones", async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("spring-post-office:guide-done", "true"),
  );
  await page.goto("/");
  await expect(page.locator(".loader")).toHaveCount(0);
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.getByRole("button", { name: "拍照明信片" }).click();
    await expect(
      page.getByRole("dialog", { name: "拍下此刻的邮局" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "关闭拍照窗口" }).click();
    await page.getByRole("button", { name: "操作指南" }).click();
    await expect(
      page.getByRole("complementary", { name: "操作指南" }),
    ).toBeVisible();
    await page.getByRole("button", { name: "关闭操作指南" }).click();
  }
});
