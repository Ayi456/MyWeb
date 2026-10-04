import { expect, test } from "@playwright/test";

for (const shot of [
  "writer",
  "writer-side",
  "courier",
  "courier-side",
  "office",
  "office-front",
]) {
  test(`model detail · ${shot}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`/tests/sceneDetails.html?shot=${shot}`);
    await expect(page.locator("canvas")).toHaveAttribute("data-ready", "true");
    const info = await page.evaluate(async () => {
      const url = "/tests/sceneDetails.ts";
      const scene: typeof import("../sceneDetails") = await import(url);
      return scene.inspect();
    });
    expect(info.startClear).toBe(true);
    expect(info.pathClear).toEqual([true, true, true]);
    expect(Math.max(...info.gripErrors)).toBeLessThan(0.04);
    // The larger sanctuary, five residents and bridge network add a dozen
    // shared batches. Keep their bounded cost in the close-up render budget.
    expect(info.calls).toBeLessThan(365);
    await expect(page).toHaveScreenshot(`${shot}.png`);
    expect(errors).toEqual([]);
  });
}

test("courier holds the handle through both turns; repeated poses and reduced motion stay stable", async ({
  page,
}) => {
  await page.goto("/tests/sceneDetails.html?shot=courier-side");
  await expect(page.locator("canvas")).toHaveAttribute("data-ready", "true");
  const frames = await page.evaluate(async () => {
    const url = "/tests/sceneDetails.ts";
    const scene: typeof import("../sceneDetails") = await import(url);
    return [0, 2.5, 5, 6, 7, 9.5, 12, 13, 14].map((time) =>
      scene.renderAt(time),
    );
  });
  for (const frame of frames)
    expect(Math.max(...frame.gripErrors)).toBeLessThan(0.04);
  const poses = await page.evaluate(async () => {
    const url = "/tests/sceneDetails.ts";
    const scene: typeof import("../sceneDetails") = await import(url);
    const first = scene.renderAt(4.22);
    const repeated = scene.renderAt(4.22);
    const reduced = [0, 4.22, 14, 29].map((time) => scene.renderAt(time, true));
    scene.tapWriter(4.22);
    const tapped = scene.renderAt(4.22);
    const tappedAgain = scene.renderAt(4.22);
    return { first, repeated, reduced, tapped, tappedAgain };
  });
  expect(poses.first.writer).toEqual(poses.repeated.writer);
  expect(poses.first.courier).toEqual(poses.repeated.courier);
  expect(poses.first.writer.eyes).toBeCloseTo(0.08);
  expect(poses.tapped.writer).toEqual(poses.tappedAgain.writer);
  expect(poses.tapped.writer.head).not.toEqual(poses.first.writer.head);
  for (const frame of poses.reduced) {
    expect(frame.courier).toEqual(poses.reduced[0].courier);
    // Euler expressions can produce -0; it is the same rendered pose as +0.
    expect(JSON.stringify(frame.writer)).toBe(
      JSON.stringify(poses.reduced[0].writer),
    );
    expect(frame.wheels).toEqual(poses.reduced[0].wheels);
  }
});

for (const season of [0, 1, 2, 3]) {
  test(`office seasonal detail · ${season}`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(
      `/tests/sceneDetails.html?shot=office&season=${season}&hour=${season === 3 ? 23 : 12}`,
    );
    await expect(page.locator("canvas")).toHaveAttribute("data-ready", "true");
    await expect(page).toHaveScreenshot(`office-season-${season}.png`);
    expect(errors).toEqual([]);
  });
}

for (const width of [320, 375, 414, 768]) {
  test(`scene controls and letter remain usable at ${width}px`, async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.setViewportSize({ width, height: 844 });
    await page.addInitScript(() => {
      localStorage.setItem("spring-post-office:guide-done", "true");
      localStorage.setItem("spring-post-office:sound-asked", "true");
    });
    await page.goto("/?hour=12");
    await expect(page.locator(".loader")).toHaveCount(0);
    await expect(page.locator(".overlay")).not.toHaveClass(/arriving/);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(width);
    const send = page.getByRole("button", { name: "寄一封春天", exact: true });
    await expect(send).toBeInViewport();
    await page.screenshot({
      path: `docs/scene-detail-polish/mobile-${width}.png`,
    });
    await send.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
