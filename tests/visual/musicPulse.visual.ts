import { expect, test, type Page } from "@playwright/test";
const data = (page: Page) =>
  page
    .locator("#world")
    .evaluate((el) =>
      JSON.parse((el as HTMLCanvasElement).dataset.diagnostics ?? "{}"),
    );
function wave() {
  const rate = 44100,
    samples = rate * 12,
    buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(buffer.length - 8, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(rate, 24);
  buffer.writeUInt32LE(rate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) {
    const t = i / rate,
      envelope = 0.02 + 0.5 * (0.5 + 0.5 * Math.sin(t * Math.PI * 4)) ** 3;
    buffer.writeInt16LE(
      Math.round(Math.sin(t * Math.PI * 280) * envelope * 32767),
      44 + i * 2,
    );
  }
  return buffer;
}
const music = wave();
async function setup(
  page: Page,
  getCors = true,
  second = false,
  enabled = true,
) {
  await page.addInitScript(() => {
    localStorage.setItem("spring-post-office:guide-done", "true");
    localStorage.setItem("spring-post-office:sound-asked", "true");
  });
  await page.route("**/api/music*", (route) =>
    route.fulfill({
      json:
        new URL(route.request().url()).searchParams.get("action") === "play"
          ? {
              id: new URL(route.request().url()).searchParams.get("id"),
              url: `https://m701.music.126.net/pulse-${new URL(route.request().url()).searchParams.get("id")}.wav`,
              trial: false,
            }
          : {
              name: "律动验证",
              sourceUrl: "https://music.163.com/#/playlist?id=1",
              tracks: [
                {
                  id: "1",
                  name: "真实测试音频",
                  artist: "音频分析验证",
                  duration: 12,
                },
                ...(second
                  ? [
                      {
                        id: "2",
                        name: "普通播放验证",
                        artist: "音频分析验证",
                        duration: 12,
                      },
                    ]
                  : []),
              ],
            },
    }),
  );
  await page.route("https://m701.music.126.net/pulse-*.wav", (route) => {
    const cors =
      !route.request().url().includes("pulse-2") &&
      (route.request().method() === "HEAD" || getCors);
    const head = route.request().method() === "HEAD";
    const range = route
      .request()
      .headers()
      .range?.match(/^bytes=(\d+)-(\d*)$/);
    const start = range ? Number(range[1]) : 0;
    const end = range?.[2]
      ? Math.min(Number(range[2]), music.length - 1)
      : music.length - 1;
    const body = head ? "" : music.subarray(start, end + 1);
    return route.fulfill({
      status: !head && range ? 206 : 200,
      headers: {
        "access-control-allow-origin": cors ? "*" : "https://blocked.invalid",
        "accept-ranges": "bytes",
        "content-length": String(head ? music.length : end - start + 1),
        ...(!head && range
          ? { "content-range": `bytes ${start}-${end}/${music.length}` }
          : {}),
      },
      contentType: "audio/wav",
      body,
    });
  });
  await page.goto("http://127.0.0.1:5173/?preset=tree&hour=23&debug=1");
  await expect.poll(async () => (await data(page)).ready).toBe(true);
  await page.getByRole("button", { name: "云上电台", exact: false }).click();
  await expect(
    page.getByRole("button", { name: "播放音乐", exact: true }),
  ).toBeVisible();
  if (enabled)
    await page.getByRole("checkbox", { name: "音乐律动", exact: true }).check();
  await page.getByRole("button", { name: "播放音乐", exact: true }).click();
}
test("real decoded audio drives lanterns and propeller; pause/reduced motion stop response, non-CORS next track plays normally", async ({
  page,
}) => {
  await setup(page, true, true);
  await expect
    .poll(async () => (await data(page)).musicPulse)
    .toBeGreaterThan(0.1);
  const levels: number[] = [];
  for (let i = 0; i < 8; i++) {
    levels.push((await data(page)).musicPulse);
    await page.waitForTimeout(150);
  }
  expect(Math.max(...levels) - Math.min(...levels)).toBeGreaterThan(0.02);
  const active = await data(page);
  expect(active.lanternBrightness).toBeGreaterThan(2.4);
  expect(active.lanternBrightness).toBeLessThan(2.95);
  expect(active.musicPropeller).toBeGreaterThan(0);
  expect(
    await page
      .locator("audio")
      .evaluate((el) => (el as HTMLAudioElement).currentTime),
  ).toBeGreaterThan(0.5);
  await page.screenshot({ path: "docs/screenshots/music-pulse.png" });
  await page.getByRole("button", { name: "暂停", exact: true }).click();
  await page.waitForTimeout(400);
  const paused = await data(page);
  await page.waitForTimeout(400);
  expect((await data(page)).musicPulse).toBe(paused.musicPulse);
  expect((await data(page)).musicPropeller).toBe(paused.musicPropeller);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect.poll(async () => (await data(page)).musicPulse).toBe(0);
  await page.getByRole("button", { name: "时间倍率 1", exact: true }).click();
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.getByRole("checkbox", { name: "音乐律动", exact: true }).uncheck();
  await expect
    .poll(async () => (await data(page)).musicPulse)
    .toBeLessThan(0.005);
  await page.getByRole("checkbox", { name: "音乐律动", exact: true }).check();
  await page.getByRole("button", { name: "下一首", exact: true }).click();
  await expect(
    page.getByText("本曲暂不支持律动，音乐照常播放。", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () =>
      page
        .locator("audio")
        .evaluate(
          (el) =>
            !(el as HTMLAudioElement).paused &&
            (el as HTMLAudioElement).currentTime > 0.2,
        ),
    )
    .toBe(true);
  expect(await page.locator("audio").getAttribute("crossorigin")).toBeNull();
  await expect
    .poll(async () => (await data(page)).musicPulse)
    .toBeLessThan(0.005);
});
test("enabling during playback preserves progress, mute stops energy and sources are reused", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const Native = window.AudioContext;
    const state = { sources: 0 };
    (window as unknown as { meterTest: typeof state }).meterTest = state;
    window.AudioContext = class extends Native {
      createMediaElementSource(element: HTMLMediaElement) {
        state.sources++;
        return super.createMediaElementSource(element);
      }
    };
  });
  await setup(page, true, false, false);
  await expect
    .poll(async () =>
      page
        .locator("audio")
        .evaluate((el) => (el as HTMLAudioElement).currentTime),
    )
    .toBeGreaterThan(0.7);
  const before = await page
    .locator("audio")
    .evaluate((el) => (el as HTMLAudioElement).currentTime);
  expect((await data(page)).musicPulse).toBe(0);
  await page.getByRole("checkbox", { name: "音乐律动", exact: true }).check();
  await expect
    .poll(async () => (await data(page)).musicPulse)
    .toBeGreaterThan(0.1);
  expect(
    await page
      .locator("audio")
      .evaluate((el) => (el as HTMLAudioElement).currentTime),
  ).toBeGreaterThan(before - 0.1);
  await page.getByRole("slider", { name: "音乐音量", exact: true }).focus();
  await page.keyboard.press("Home");
  await expect
    .poll(async () =>
      page.locator("audio").evaluate((el) => (el as HTMLAudioElement).volume),
    )
    .toBe(0);
  await expect
    .poll(async () => (await data(page)).musicPulse)
    .toBeLessThan(0.005);
  await page.getByRole("checkbox", { name: "音乐律动", exact: true }).uncheck();
  await page.getByRole("checkbox", { name: "音乐律动", exact: true }).check();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { meterTest: { sources: number } }).meterTest
          .sources,
    ),
  ).toBe(1);
  await page.reload();
  await expect.poll(async () => (await data(page)).ready).toBe(true);
  expect(await page.locator("audio").getAttribute("src")).toBeNull();
  await page.getByRole("button", { name: "云上电台", exact: false }).click();
  await expect(
    page.getByRole("checkbox", { name: "音乐律动", exact: true }),
  ).toBeChecked();
});
test("a successful HEAD followed by blocked CORS playback falls back to a fresh native audio element", async ({
  page,
}) => {
  await setup(page, false);
  await expect(
    page.getByText("本曲暂不支持律动，音乐照常播放。", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () =>
      page
        .locator("audio")
        .evaluate(
          (el) =>
            !(el as HTMLAudioElement).paused &&
            (el as HTMLAudioElement).currentTime > 0.2,
        ),
    )
    .toBe(true);
  expect(await page.locator("audio").getAttribute("crossorigin")).toBeNull();
  await expect
    .poll(async () => (await data(page)).musicPulse)
    .toBeLessThan(0.005);
});
test("unavailable WebAudio preserves normal decoded playback", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "AudioContext", {
      value: undefined,
      configurable: true,
    });
  });
  await setup(page);
  await expect(
    page.getByText("本曲暂不支持律动，音乐照常播放。", { exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () =>
      page
        .locator("audio")
        .evaluate(
          (el) =>
            !(el as HTMLAudioElement).paused &&
            (el as HTMLAudioElement).currentTime > 0.2,
        ),
    )
    .toBe(true);
  expect((await data(page)).musicPulse).toBe(0);
});
