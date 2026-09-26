import { expect, test } from "@playwright/test";

test.use({ timezoneId: "Asia/Shanghai" });

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date("2026-09-23T10:00:00+08:00"));
  await page.addInitScript(() =>
    localStorage.setItem("spring-post-office:guide-done", "true"),
  );
});

test("weekly hunt follows ordered clues, resumes, rewards and clears", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.locator(".loader")).toHaveCount(0);
  await page.getByRole("button", { name: "操作指南", exact: true }).click();
  const hunt = page.getByRole("region", { name: "本周群岛寻宝" });
  const hotspots = page.getByRole("group", { name: "点一点岛上的角落" });
  await hotspots.getByRole("button", { name: /灯塔/ }).click();
  await expect(
    hunt.getByRole("button", { name: "开始本周寻宝" }),
  ).toBeVisible();
  await hunt.getByRole("button", { name: "开始本周寻宝" }).click();
  await hotspots.getByRole("button", { name: /风车/ }).click();
  await expect(hunt).toContainText("已找到 0 / 4 处");
  await hotspots.getByRole("button", { name: /灯塔/ }).click();
  await hotspots.getByRole("button", { name: /灯塔/ }).click();
  await expect(hunt).toContainText("已找到 1 / 4 处");
  await page.reload();
  await expect(page.locator(".loader")).toHaveCount(0);
  await page.getByRole("button", { name: "操作指南", exact: true }).click();
  await expect(hunt).toContainText("已找到 1 / 4 处");
  await hunt.getByRole("button", { name: "带我去线索附近" }).click();
  await expect(hunt).toHaveCount(0);
  // The view hint only moves the camera; keyboard interaction finds the clue.
  await page.keyboard.press("Digit5");
  await page.getByRole("button", { name: "操作指南", exact: true }).click();
  await expect(hunt).toContainText("已找到 2 / 4 处");
  await hotspots.getByRole("button", { name: /温泉村/ }).focus();
  await page.keyboard.press("Enter");
  await hotspots.getByRole("button", { name: /茶山/ }).click();
  await expect(hunt).toContainText("本周线索已找齐");
  await page.getByRole("button", { name: "关闭操作指南" }).click();
  await page.getByRole("button", { name: /信箱与集章/ }).click();
  await expect(page.getByRole("listitem", { name: "寻宝邮戳" })).toHaveClass(
    /earned/,
  );
  await page.reload();
  await expect(page.locator(".loader")).toHaveCount(0);
  await page.getByRole("button", { name: /信箱与集章/ }).click();
  await expect(page.getByRole("listitem", { name: "寻宝邮戳" })).toHaveClass(
    /earned/,
  );
  await page.getByRole("button", { name: "清空收藏" }).click();
  await page.getByRole("button", { name: "确认清空收藏" }).click();
  await expect(page.locator(".stamp-slot.earned")).toHaveCount(0);
  await page.getByRole("button", { name: "关闭信箱" }).click();
  await page.getByRole("button", { name: "操作指南", exact: true }).click();
  await expect(
    hunt.getByRole("button", { name: "开始本周寻宝" }),
  ).toBeVisible();
});

test("new local week resets clues while retaining the stamp on a narrow viewport", async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem("spring-post-office:v1:treasure")) {
      localStorage.setItem(
        "spring-post-office:v1:treasure",
        JSON.stringify({ week: "2026-09-21", started: true, found: 4 }),
      );
      localStorage.setItem(
        "spring-post-office:v1:collection",
        JSON.stringify({ stamps: ["treasure"], replies: [], totalSent: 0 }),
      );
    }
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.locator(".loader")).toHaveCount(0);
  await page.getByRole("button", { name: "操作指南", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "本周群岛寻宝" }),
  ).toContainText("本周线索已找齐");
  await page.clock.setFixedTime(new Date("2026-09-28T00:01:00+08:00"));
  await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  const hunt = page.getByRole("region", { name: "本周群岛寻宝" });
  await expect(hunt).toContainText("2026-09-28");
  await hunt.getByRole("button", { name: "开始本周寻宝" }).click();
  await expect(hunt).toContainText("已找到 0 / 4 处");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await hunt
    .getByRole("button", { name: "带我去线索附近" })
    .scrollIntoViewIfNeeded();
  await expect(page.locator(".notice-stack .notice")).toHaveCount(0, {
    timeout: 10000,
  });
  await page.screenshot({ path: "docs/screenshots/treasure-hunt.png" });
  await page.getByRole("button", { name: "关闭操作指南" }).click();
  await page.getByRole("button", { name: /信箱与集章/ }).click();
  await expect(page.getByRole("listitem", { name: "寻宝邮戳" })).toHaveClass(
    /earned/,
  );
});

test("a hunt can finish when local storage is unavailable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new Error("blocked");
    };
    Storage.prototype.setItem = () => {
      throw new Error("blocked");
    };
  });
  await page.goto("/");
  await expect(page.locator(".loader")).toHaveCount(0);
  await page.getByRole("button", { name: "操作指南", exact: true }).click();
  const hunt = page.getByRole("region", { name: "本周群岛寻宝" });
  await hunt.getByRole("button", { name: "开始本周寻宝" }).click();
  for (const name of ["灯塔", "风车", "温泉村", "茶山"]) {
    await page
      .getByRole("group", { name: "点一点岛上的角落" })
      .getByRole("button", { name: new RegExp(name) })
      .click();
  }
  await expect(hunt).toContainText("本周线索已找齐");
  await page.getByRole("button", { name: "关闭操作指南" }).click();
  await page.getByRole("button", { name: /信箱与集章/ }).click();
  await expect(page.getByRole("listitem", { name: "寻宝邮戳" })).toHaveClass(
    /earned/,
  );
});
