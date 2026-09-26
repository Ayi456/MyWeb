import { expect, test, type Page } from "@playwright/test";
import * as T from "three";
import { GARDEN_ISLAND } from "../../src/scene/worldLayout";

const playlist = {
  name: "测试春日歌单",
  sourceUrl: "https://music.163.com/#/playlist?id=1",
  tracks: [{ id: "1", name: "测试春日", artist: "花园邮差", duration: 120 }],
};
const playback = {
  id: "1",
  url: "https://m701.music.126.net/test.mp3",
  trial: false,
};
const diagnostics = (page: Page) =>
  page
    .locator("#world")
    .evaluate((el) =>
      JSON.parse((el as HTMLCanvasElement).dataset.diagnostics ?? "{}"),
    );

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("spring-post-office:guide-done", "true");
    localStorage.setItem("spring-post-office:sound-asked", "true");
  });
});

async function fakeMedia(page: Page) {
  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function () {
      this.dispatchEvent(new Event("playing"));
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function () {
      this.dispatchEvent(new Event("pause"));
    };
    HTMLMediaElement.prototype.load = () => {};
  });
}

async function pokeGramophone(page: Page) {
  await page.getByRole("button", { name: "操作指南", exact: true }).click();
  await page
    .getByRole("group", { name: "点一点岛上的角落" })
    .getByRole("button", { name: "花园留声机" })
    .click();
}

test("a real garden click controls the radio, keyboard resumes and the record follows playback", async ({
  page,
}) => {
  await fakeMedia(page);
  let requests = 0;
  await page.route("**/api/music*", (route) => {
    requests++;
    return route.fulfill({
      json:
        new URL(route.request().url()).searchParams.get("action") === "play"
          ? playback
          : playlist,
    });
  });
  await page.goto("/?preset=garden&hour=12&debug=1");
  await expect(page.locator(".loader")).toHaveCount(0);
  await page.waitForTimeout(2200);
  expect(requests).toBe(0);
  const d = await diagnostics(page);
  const camera = new T.PerspectiveCamera(37, 1280 / 720, 0.1, 150);
  camera.position.fromArray(d.camera);
  camera.lookAt(new T.Vector3(...d.cameraView.focus));
  camera.updateMatrixWorld();
  const point = new T.Vector3(
    GARDEN_ISLAND.center[0] + 0.83,
    GARDEN_ISLAND.center[1] + 0.72,
    GARDEN_ISLAND.center[2] + 0.57,
  ).project(camera);
  const position = { x: (point.x + 1) * 640, y: (1 - point.y) * 360 };
  await page.locator("#world").click({ position });
  await expect(
    page.getByRole("button", { name: "暂停音乐", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => (await diagnostics(page)).gramophonePlaying)
    .toBe(true);
  const before = (await diagnostics(page)).gramophoneRotation;
  await expect
    .poll(async () => (await diagnostics(page)).gramophoneRotation)
    .not.toBe(before);
  await page
    .locator("audio")
    .evaluate((el) => el.dispatchEvent(new Event("waiting")));
  await expect
    .poll(async () => (await diagnostics(page)).gramophonePlaying)
    .toBe(false);
  await expect(
    page.getByRole("button", { name: "暂停音乐", exact: true }),
  ).toBeVisible();
  await page
    .locator("audio")
    .evaluate((el) => el.dispatchEvent(new Event("playing")));
  await expect
    .poll(async () => (await diagnostics(page)).gramophonePlaying)
    .toBe(true);
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await page.waitForTimeout(350);
  const stopped = (await diagnostics(page)).gramophoneRotation;
  await page.waitForTimeout(450);
  expect((await diagnostics(page)).gramophoneRotation).toBe(stopped);
  await page.locator("#world").click({ position });
  await expect(
    page.getByRole("button", { name: "播放音乐", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => (await diagnostics(page)).gramophonePlaying)
    .toBe(false);
  await page.getByRole("button", { name: "操作指南", exact: true }).click();
  await page.getByRole("button", { name: "花园留声机", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "暂停音乐", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "时间倍率 1", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.waitForTimeout(350);
  const reduced = (await diagnostics(page)).gramophoneRotation;
  await page.waitForTimeout(500);
  expect((await diagnostics(page)).gramophoneRotation).toBe(reduced);
  await expect(page.locator(".notice-stack .notice")).toHaveCount(0, {
    timeout: 10000,
  });
  await page.screenshot({ path: "docs/screenshots/garden-gramophone.png" });
  await page.reload();
  await expect(page.locator(".loader")).toHaveCount(0);
  await expect
    .poll(async () => (await diagnostics(page)).gramophonePlaying)
    .toBe(false);
  await expect(page.locator(".radio-panel")).toHaveCount(0);
});

test("a second gramophone tap cancels pending autoplay while its playlist loads", async ({
  page,
}) => {
  await fakeMedia(page);
  let playRequests = 0;
  await page.route("**/api/music*", async (route) => {
    if (new URL(route.request().url()).searchParams.get("action") === "play") {
      playRequests++;
      return route.fulfill({ json: playback });
    }
    await new Promise((resolve) => setTimeout(resolve, 1800));
    return route.fulfill({ json: playlist });
  });
  await page.goto("/?hour=12&debug=1");
  await expect(page.locator(".loader")).toHaveCount(0);
  await pokeGramophone(page);
  await expect(page.locator(".radio-status")).toContainText("正在接收公开歌单");
  await pokeGramophone(page);
  await expect(
    page.getByRole("button", { name: "播放音乐", exact: true }),
  ).toBeVisible();
  expect(playRequests).toBe(0);
  expect((await diagnostics(page)).gramophonePlaying).toBe(false);
});

test("failed and offline gramophone requests stay retryable on a narrow viewport", async ({
  page,
  context,
}) => {
  await fakeMedia(page);
  let attempts = 0;
  await page.route("**/api/music*", (route) => {
    if (new URL(route.request().url()).searchParams.get("action") === "play")
      return route.fulfill({ json: playback });
    attempts++;
    return attempts === 1
      ? route.fulfill({ status: 503, json: { error: "暂时接不上" } })
      : route.fulfill({ json: playlist });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/?hour=12&debug=1");
  await expect(page.locator(".loader")).toHaveCount(0);
  await pokeGramophone(page);
  await expect(page.locator(".radio-status")).toContainText("暂时连接不上");
  await pokeGramophone(page);
  await expect(
    page.getByRole("button", { name: "暂停音乐", exact: true }),
  ).toBeVisible();
  expect(attempts).toBe(2);
  await pokeGramophone(page);
  await context.setOffline(true);
  await pokeGramophone(page);
  await expect(page.locator(".radio-status")).toContainText("离线中");
  await expect
    .poll(async () => (await diagnostics(page)).gramophonePlaying)
    .toBe(false);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("autoplay denial leaves a loaded song ready for another explicit gramophone tap", async ({
  page,
}) => {
  await fakeMedia(page);
  await page.addInitScript(() => {
    let attempts = 0;
    HTMLMediaElement.prototype.play = function () {
      if (++attempts === 1)
        return Promise.reject(
          new DOMException("Needs a gesture", "NotAllowedError"),
        );
      this.dispatchEvent(new Event("playing"));
      return Promise.resolve();
    };
  });
  let playbackRequests = 0;
  await page.route("**/api/music*", (route) => {
    const isPlayback =
      new URL(route.request().url()).searchParams.get("action") === "play";
    if (isPlayback) playbackRequests++;
    return route.fulfill({ json: isPlayback ? playback : playlist });
  });
  await page.goto("/?hour=12&debug=1");
  await expect(page.locator(".loader")).toHaveCount(0);
  await pokeGramophone(page);
  await expect(page.locator(".radio-status")).toContainText("再点一次播放");
  await expect
    .poll(async () => (await diagnostics(page)).gramophonePlaying)
    .toBe(false);
  await pokeGramophone(page);
  await expect(
    page.getByRole("button", { name: "暂停音乐", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => (await diagnostics(page)).gramophonePlaying)
    .toBe(true);
  expect(playbackRequests).toBe(1);
});

test("night foghorn schedules WebAudio notes, captions while muted and freezes on pause", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const notes: number[] = [];
    (window as unknown as { hornNotes: number[] }).hornNotes = notes;
    const make = AudioContext.prototype.createOscillator;
    AudioContext.prototype.createOscillator = function () {
      const osc = make.call(this),
        start = osc.start.bind(osc);
      osc.start = (when = 0) => {
        notes.push(osc.frequency.value);
        start(when);
      };
      return osc;
    };
  });
  await page.goto("/?hour=23&season=3&debug=1");
  await expect(page.locator(".loader")).toHaveCount(0);
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await page.getByRole("button", { name: "操作指南", exact: true }).click();
  await page.getByRole("checkbox", { name: /音效字幕/ }).check();
  await page.getByRole("button", { name: "关闭操作指南" }).click();
  await page.getByRole("button", { name: "时间倍率 12", exact: true }).click();
  await expect(page.locator(".notice-stack")).toContainText("灯塔在夜雾中低鸣");
  expect(
    await page.evaluate(
      () => (window as unknown as { hornNotes: number[] }).hornNotes,
    ),
  ).toEqual([]);
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  const paused = (await diagnostics(page)).foghornCount;
  await page.waitForTimeout(800);
  expect((await diagnostics(page)).foghornCount).toBe(paused);
  await page.getByRole("button", { name: "打开环境音效", exact: true }).click();
  await page.getByRole("button", { name: "时间倍率 12", exact: true }).click();
  await expect
    .poll(async () => (await diagnostics(page)).foghornCount)
    .toBeGreaterThan(paused);
  const notes = await page.evaluate(
    () => (window as unknown as { hornNotes: number[] }).hornNotes,
  );
  expect(notes).toEqual(expect.arrayContaining([98, 147, 196]));
  await page.getByRole("button", { name: "切换到春天", exact: true }).click();
  await expect
    .poll(async () => (await diagnostics(page)).foghornRemaining)
    .toBe(6);
  const clear = (await diagnostics(page)).foghornCount;
  await page.waitForTimeout(900);
  expect((await diagnostics(page)).foghornCount).toBe(clear);
});
