import { expect, test } from "@playwright/test";

test("installed shell reopens offline while the radio waits for the network", async ({
  page,
  context,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem("spring-post-office:guide-done", "true"),
  );
  await page.goto("http://127.0.0.1:4174/?hour=12");
  await expect(page.locator(".loader")).toHaveCount(0);
  const manifest = await page.request.get(
    "http://127.0.0.1:4174/manifest.webmanifest",
  );
  expect((await manifest.json()).icons).toHaveLength(3);
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, {
          once: true,
        }),
      );
  });

  await context.setOffline(true);
  await page.reload();
  await expect(page.locator(".loader")).toHaveCount(0);
  await expect(page.locator("#world")).toBeVisible();
  await page.getByRole("button", { name: "寄一封春天" }).click();
  await page
    .getByRole("textbox", { name: "想随春风寄出的话" })
    .fill("离线也能寄");
  await page.getByRole("button", { name: /让心意随风出发/ }).click();
  await expect(page.getByText(/本次已放飞 01 封/)).toBeVisible();
  await page.getByRole("button", { name: /云上电台/ }).click();
  await expect(page.locator(".radio-status")).toContainText("离线中");

  await context.setOffline(false);
  await expect(page.locator(".radio-status")).not.toContainText("离线中", {
    timeout: 20_000,
  });
});
