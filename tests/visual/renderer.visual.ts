import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

test("r186 renders, owns resources across three lifecycles and recovers after context loss", async ({
  page,
}) => {
  test.setTimeout(180000);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/tests/browser.html?debug=1");
  await expect(page.locator("#report")).toHaveAttribute(
    "data-result",
    /passed|failed/,
    { timeout: 160000 },
  );
  const report = await page.locator("#report").innerText();
  await writeFile("docs/browser-r186-results.txt", report + "\n", "utf8");
  expect(report).toContain("ALL BROWSER ENGINE CHECKS PASSED");
  expect(report).toContain("Three.js revision: 186");
  expect(report).toContain("GPU geometry/texture counts return to baseline");
  expect(report).toContain("dispose is idempotent");
  expect(errors).toEqual([]);
});
test("production runtime reports r186 and WebGL 2 unavailable gives an explicit error", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4174/?debug=1&classic=1");
  await expect
    .poll(async () =>
      page
        .locator("#world")
        .evaluate(
          (el) =>
            JSON.parse((el as HTMLCanvasElement).dataset.diagnostics ?? "{}")
              .threeRevision,
        ),
    )
    .toBe("186");
  await page.goto("/tests/browser.html?mode=visual");
  await expect
    .poll(async () =>
      page
        .locator("#world")
        .evaluate(
          (el) =>
            JSON.parse((el as HTMLCanvasElement).dataset.diagnostics ?? "{}")
              .threeRevision,
        ),
    )
    .toBe("186");
  const result = await page.evaluate(async () => {
    // @ts-expect-error Vite serves this TypeScript module in the browser.
    const { createRenderer } = await import("/src/scene/core/renderer.ts");
    const canvas = document.createElement("canvas");
    const requests: string[] = [];
    Object.defineProperty(canvas, "getContext", {
      value: (type: string) => {
        requests.push(type);
        return null;
      },
    });
    try {
      createRenderer(canvas);
      return { message: "", requests };
    } catch (error) {
      return { message: (error as Error).message, requests };
    }
  });
  expect(result.message).toContain("WebGL 2");
  expect(result.requests).not.toContain("webgl");
});
