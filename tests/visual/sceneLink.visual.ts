import { expect, test } from "@playwright/test";

test("copy link reproduces season, hour, preset and active event", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() =>
    localStorage.setItem("spring-post-office:guide-done", "true"),
  );
  await page.goto("/?debug=1&hour=23&season=3&preset=tree&event=whale");
  await expect(page.locator(".loader")).toHaveCount(0);
  const diagnostics = () =>
    page
      .locator("canvas")
      .evaluate((el) => JSON.parse(el.dataset.diagnostics ?? "{}"));
  await expect.poll(async () => (await diagnostics()).event).toBe("whale");
  await page.getByRole("button", { name: "复制此刻链接" }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  const url = new URL(link);
  expect(url.searchParams.get("season")).toBe("3");
  expect(url.searchParams.get("preset")).toBe("tree");
  expect(url.searchParams.get("event")).toBe("whale");
  expect(Number(url.searchParams.get("hour"))).toBeGreaterThanOrEqual(23);
  await page.goto(link);
  await expect(page.locator(".loader")).toHaveCount(0);
  await expect.poll(async () => (await diagnostics()).season).toBe("winter");
  await expect
    .poll(async () => (await diagnostics()).cameraPreset)
    .toBe("tree");
  await expect.poll(async () => (await diagnostics()).event).toBe("whale");
});

test("custom orbit survives a copied link without leaking a letter", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() =>
    localStorage.setItem("spring-post-office:guide-done", "true"),
  );
  await page.goto("/?debug=1");
  await expect(page.locator(".loader")).toHaveCount(0);
  await page.getByRole("button", { name: "寄一封春天" }).click();
  await page
    .getByRole("textbox", { name: "想随春风寄出的话" })
    .fill("只有我知道的春天");
  await page.getByRole("button", { name: /让心意随风出发/ }).click();
  const box = await page.locator("#world").boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    box!.x + box!.width / 2 + 75,
    box!.y + box!.height / 2 + 20,
    { steps: 5 },
  );
  await page.mouse.up();
  const diagnostics = () =>
    page
      .locator("canvas")
      .evaluate((el) => JSON.parse(el.dataset.diagnostics ?? "{}"));
  await expect.poll(async () => (await diagnostics()).cameraPreset).toBeNull();
  const before = (await diagnostics()).cameraView;
  await page.getByRole("button", { name: "复制此刻链接" }).click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).not.toContain("只有我知道的春天");
  expect(new URL(link).searchParams.get("cam")).toBeTruthy();
  await page.goto(link + "&debug=1");
  await expect(page.locator(".loader")).toHaveCount(0);
  await expect.poll(async () => (await diagnostics()).cameraPreset).toBeNull();
  const after = (await diagnostics()).cameraView;
  expect(after.azimuth).toBeCloseTo(before.azimuth, 2);
  expect(after.elevation).toBeCloseTo(before.elevation, 2);
  expect(after.distance).toBeCloseTo(before.distance, 2);
});
