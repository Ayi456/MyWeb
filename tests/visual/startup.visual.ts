import { expect, test, type Page } from "@playwright/test";
import { HalfFloatType } from "three";
import type { SceneController } from "../../src/scene/types";

interface StartupProbe {
  real: boolean;
  prepareCalls: number;
  prepareFinished: number;
  renderCalls: number;
  disposeCalls: number;
  ready: boolean;
  readyEmissions: number;
  drawCalls: number;
  preparedPrograms: number;
  compileTargets: (number | null)[];
  errors: string[];
  frames: Map<number, FrameRequestCallback>;
  gate: Promise<void>;
  release(): void;
  setHidden(hidden: boolean): void;
  flushFrame(): Promise<void>;
  controller?: SceneController;
}

declare global {
  interface Window {
    __startup: StartupProbe;
  }
}

/** Hold shader readiness independently of the actual browser/GPU speed. */
async function start(page: Page, real = false, initiallyHidden = false) {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.route("**/tests/startup-harness.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<!doctype html><canvas id="world" style="width:360px;height:240px"></canvas>',
    }),
  );
  await page.route("**/src/scene/createScene.ts*", async (route) => {
    const response = await route.fetch();
    const source = await response.text();
    expect(source).toContain("/src/scene/core/renderer.ts");
    await route.fulfill({
      response,
      body: source.replace(
        /\/src\/scene\/core\/renderer\.ts(?:\?[^"']*)?/g,
        "/tests/startup-renderer.js",
      ),
    });
  });
  await page.route("**/tests/startup-renderer.js", (route) =>
    route.fulfill({
      contentType: "text/javascript",
      body: `
        import { createRenderer as createRealRenderer } from "/src/scene/core/renderer.ts";
        export function createRenderer(canvas) {
          const probe = window.__startup;
          const pipeline = createRealRenderer(canvas);
          const compile = pipeline.renderer.compileAsync.bind(pipeline.renderer);
          pipeline.renderer.compileAsync = (...args) => {
            const target = pipeline.renderer.getRenderTarget();
            probe.compileTargets.push(target ? target.texture.type : null);
            return compile(...args);
          };
          const prepare = pipeline.prepare.bind(pipeline);
          pipeline.prepare = async (...args) => {
            probe.prepareCalls++;
            await probe.gate;
            if (probe.real) await prepare(...args);
            probe.preparedPrograms = pipeline.renderer.info.programs.length;
            probe.prepareFinished++;
          };
          const render = pipeline.render.bind(pipeline);
          pipeline.render = (...args) => {
            probe.renderCalls++;
            if (probe.real) {
              render(...args);
              probe.drawCalls = pipeline.renderer.info.render.calls;
            }
          };
          const dispose = pipeline.dispose.bind(pipeline);
          pipeline.dispose = () => {
            probe.disposeCalls++;
            dispose();
          };
          return pipeline;
        }
      `,
    }),
  );
  await page.goto("/tests/startup-harness.html");
  await page.evaluate(
    async ({ real, initiallyHidden }) => {
      let hidden = initiallyHidden;
      let nextFrame = 0;
      let release = () => {};
      const gate = new Promise<void>((resolve) => {
        release = resolve;
      });
      const frames = new Map<number, FrameRequestCallback>();
      Object.defineProperty(document, "hidden", { get: () => hidden });
      window.requestAnimationFrame = (callback) => {
        const id = ++nextFrame;
        frames.set(id, callback);
        return id;
      };
      window.cancelAnimationFrame = (id) => {
        frames.delete(id);
      };
      const probe: StartupProbe = (window.__startup = {
        real,
        prepareCalls: 0,
        prepareFinished: 0,
        renderCalls: 0,
        disposeCalls: 0,
        ready: false,
        readyEmissions: 0,
        drawCalls: 0,
        preparedPrograms: 0,
        compileTargets: [],
        errors: [],
        frames,
        gate,
        release,
        setHidden(value) {
          hidden = value;
          document.dispatchEvent(new Event("visibilitychange"));
        },
        async flushFrame() {
          const callbacks = [...frames.values()];
          frames.clear();
          for (const callback of callbacks) callback(performance.now());
          await Promise.resolve();
          await Promise.resolve();
        },
      });
      // @ts-expect-error Vite serves the actual scene module in the browser.
      const { createScene } = await import("/src/scene/createScene.ts");
      probe.controller = createScene(document.querySelector("canvas")!, {
        skipArrival: true,
        onMailbox() {},
        onError(message: string) {
          probe.errors.push(message);
        },
      });
      probe.controller!.setSpeed(0);
      probe.controller!.subscribe((snapshot) => {
        probe.ready = snapshot.ready;
        if (snapshot.ready) probe.readyEmissions++;
      });
    },
    { real, initiallyHidden },
  );
  return pageErrors;
}

async function status(page: Page) {
  return page.evaluate(() => {
    const p = window.__startup;
    return {
      prepareCalls: p.prepareCalls,
      prepareFinished: p.prepareFinished,
      renderCalls: p.renderCalls,
      disposeCalls: p.disposeCalls,
      ready: p.ready,
      readyEmissions: p.readyEmissions,
      pendingFrames: p.frames.size,
      drawCalls: p.drawCalls,
      preparedPrograms: p.preparedPrograms,
      compileTargets: p.compileTargets,
      errors: p.errors,
    };
  });
}

test("disposal before the preparation frame cancels startup permanently", async ({
  page,
}) => {
  const errors = await start(page);
  await page.evaluate(async () => {
    const p = window.__startup;
    p.controller!.dispose();
    p.controller!.dispose();
    p.release();
    p.setHidden(true);
    p.setHidden(false);
    await p.flushFrame();
  });
  expect(await status(page)).toMatchObject({
    prepareCalls: 0,
    renderCalls: 0,
    disposeCalls: 1,
    ready: false,
    readyEmissions: 0,
    pendingFrames: 0,
    errors: [],
  });
  expect(errors).toEqual([]);
});

test("a pending preparation cannot restart a disposed scene", async ({
  page,
}) => {
  const errors = await start(page);
  await page.evaluate(() => window.__startup.flushFrame());
  expect(await status(page)).toMatchObject({
    prepareCalls: 1,
    prepareFinished: 0,
    renderCalls: 0,
  });
  await page.evaluate(async () => {
    const p = window.__startup;
    p.controller!.dispose();
    p.release();
    await p.flushFrame();
    p.setHidden(true);
    p.setHidden(false);
    await p.flushFrame();
  });
  expect(await status(page)).toMatchObject({
    prepareCalls: 1,
    prepareFinished: 1,
    renderCalls: 0,
    disposeCalls: 1,
    ready: false,
    readyEmissions: 0,
    pendingFrames: 0,
    errors: [],
  });
  expect(errors).toEqual([]);
});

for (const initiallyHidden of [false, true]) {
  test(`startup survives visibility changes ${initiallyHidden ? "from a hidden page" : "before and during real shader preparation"}`, async ({
    page,
  }) => {
    test.setTimeout(120000);
    const real = !initiallyHidden;
    const errors = await start(page, real, initiallyHidden);
    // Reproduce the race where visibility changes cancel the startup RAF.
    await page.evaluate(async () => {
      const p = window.__startup;
      p.setHidden(true);
      await p.flushFrame();
      p.setHidden(false);
      await p.flushFrame();
    });
    expect(await status(page)).toMatchObject({
      prepareCalls: 1,
      prepareFinished: 0,
      renderCalls: 0,
      ready: false,
    });
    await page.evaluate(async () => {
      const p = window.__startup;
      p.setHidden(true);
      p.setHidden(false);
      await p.flushFrame();
      p.setHidden(true);
      p.release();
    });
    await expect
      .poll(async () => (await status(page)).prepareFinished, {
        timeout: 90000,
      })
      .toBe(1);
    expect(await status(page)).toMatchObject({
      prepareCalls: 1,
      renderCalls: 0,
      pendingFrames: 0,
      ready: false,
    });
    await page.evaluate(async () => {
      const p = window.__startup;
      p.setHidden(false);
      await p.flushFrame();
    });
    const rendered = await status(page);
    expect(rendered).toMatchObject({
      prepareCalls: 1,
      prepareFinished: 1,
      renderCalls: 1,
      ready: true,
      pendingFrames: 1,
      errors: [],
    });
    if (real) {
      // Warm both material variants before the first draw, without a timing
      // threshold that would vary with the browser's GPU or shader cache.
      expect(rendered.compileTargets).toEqual([HalfFloatType, null]);
      expect(rendered.preparedPrograms).toBeGreaterThan(0);
      expect(rendered.drawCalls).toBeGreaterThan(1);
    }
    await page.evaluate(async () => {
      const p = window.__startup;
      p.controller!.dispose();
      await p.flushFrame();
    });
    expect((await status(page)).pendingFrames).toBe(0);
    expect(errors).toEqual([]);
  });
}
