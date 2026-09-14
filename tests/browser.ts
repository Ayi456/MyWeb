/** Browser-only integration harness; Vite does not include it in dist. */
import { createScene } from "../src/scene/createScene";
import type { SceneController, SceneSnapshot } from "../src/scene/types";
const report = document.querySelector<HTMLPreElement>("#report")!;
const params = new URLSearchParams(location.search);
let canvas = document.querySelector<HTMLCanvasElement>("canvas")!;
let controller: SceneController | undefined;
const results: string[] = [];
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
function log(message: string) {
  results.push(message);
  report.textContent = results.join("\n");
}
function assert(value: unknown, message: string) {
  if (!value) throw new Error(message);
  log(`PASS ${message}`);
}
async function until(predicate: () => boolean, timeout = 10000) {
  const start = performance.now();
  while (!predicate()) {
    if (performance.now() - start > timeout)
      throw new Error("等待场景状态超时");
    await delay(50);
  }
}
let snapshot: SceneSnapshot | undefined;
function fresh() {
  canvas.remove();
  canvas = document.createElement("canvas");
  canvas.id = "world";
  document.body.prepend(canvas);
}
function start(
  onError: (m: string) => void = (m) => {
    throw new Error(m);
  },
) {
  snapshot = undefined;
  const began = performance.now();
  controller = createScene(canvas, { onMailbox: () => {}, onError });
  controller.subscribe((s) => {
    snapshot = s;
  });
  return began;
}
if (params.get("mode") === "visual") {
  report.hidden = true;
  start();
  controller!.setSpeed(0);
  controller!.setTimeOfDay(Number(params.get("hour") ?? 16.33));
  controller!.setQuality("high");
  controller!.setCameraPreset(
    params.get("preset") === "tree" ? "tree" : "reset",
  );
} else {
  const originalRAF = window.requestAnimationFrame.bind(window),
    originalCancel = window.cancelAnimationFrame.bind(window);
  const pending = new Set<number>();
  window.requestAnimationFrame = (callback) => {
    const id = originalRAF((time) => {
      pending.delete(id);
      callback(time);
    });
    pending.add(id);
    return id;
  };
  window.cancelAnimationFrame = (id) => {
    pending.delete(id);
    originalCancel(id);
  };
  try {
    for (let cycle = 0; cycle < 3; cycle++) {
      const startAt = start();
      await until(() => !!snapshot?.ready);
      log(
        `mount ${cycle + 1}: first frame ${Math.round(performance.now() - startAt)} ms`,
      );
      assert(
        document.querySelectorAll("canvas").length === 1,
        "one visible canvas",
      );
      assert(pending.size === 1, "one pending animation frame");
      controller!.setSpeed(0);
      const paused = snapshot!.simTime;
      controller!.setTimeOfDay(23);
      controller!.setWind(true);
      assert(
        controller!.sendLetter("Browser test"),
        "accept an in-memory letter",
      );
      await delay(400);
      assert(
        snapshot!.simTime === paused &&
          snapshot!.wind === 0 &&
          snapshot!.lettersInFlight === 1,
        "all simulation is paused while slider and letter UI work",
      );
      controller!.setSpeed(12);
      await until(() => snapshot!.deliveredCount === 1);
      assert(
        snapshot!.lettersInFlight === 0,
        "letter reaches moving ship and is removed",
      );
      controller!.setWind(false);
      await until(() => snapshot!.wind < 0.001);
      assert(snapshot!.wind < 0.001, "wind returns smoothly to calm");
      if (cycle === 0) {
        controller!.setSpeed(1);
        controller!.setQuality("high");
        await delay(1500);
        const baseline = {
          geometries: snapshot!.geometries,
          textures: snapshot!.textures,
        };
        for (let i = 0; i < 12; i++)
          controller!.sendLetter("Resource lifetime test");
        controller!.setSpeed(12);
        await until(() => snapshot!.lettersInFlight === 0);
        await delay(1300);
        assert(
          snapshot!.geometries === baseline.geometries &&
            snapshot!.textures === baseline.textures,
          "GPU geometry/texture counts return to baseline after 12 deliveries",
        );
        controller!.setSpeed(1);
        const samples: number[] = [];
        for (let i = 0; i < 10; i++) {
          await delay(1000);
          samples.push(snapshot!.fps);
        }
        log(
          `steady FPS: ${samples.join(", ")}; ${snapshot!.drawCalls} calls; ${snapshot!.instances} instances; ${snapshot!.resolution}`,
        );
        log(
          `GPU resources: ${snapshot!.geometries} geometries, ${snapshot!.textures} textures`,
        );
        const gl = canvas.getContext("webgl2");
        const ext = gl?.getExtension("WEBGL_debug_renderer_info");
        log(
          `GPU: ${ext ? gl!.getParameter(ext.UNMASKED_RENDERER_WEBGL) : "not exposed"}`,
        );
        log(`Browser: ${navigator.userAgent}`);
      }
      let emissions = 0;
      const un = controller!.subscribe(() => emissions++);
      controller!.dispose();
      controller!.dispose();
      const stopped = emissions;
      await delay(150);
      assert(
        pending.size === 0 && emissions === stopped,
        "dispose is idempotent and cancels RAF and subscriptions",
      );
      un();
      fresh();
    }
    const unavailable = document.createElement("canvas");
    Object.defineProperty(unavailable, "getContext", { value: () => null });
    let unsupported = false;
    try {
      createScene(unavailable, { onMailbox: () => {}, onError: () => {} });
    } catch {
      unsupported = true;
    }
    assert(unsupported, "WebGL unavailable fails explicitly");
    let lostMessage = "";
    start((message) => {
      lostMessage = message;
    });
    await until(() => !!snapshot?.ready);
    const lose = canvas
      .getContext("webgl2")
      ?.getExtension("WEBGL_lose_context");
    if (lose) {
      lose.loseContext();
      await until(() => !!lostMessage);
      assert(
        pending.size === 0,
        "context loss stops the loop and raises an actionable error",
      );
    } else log("SKIP context loss extension unavailable");
    controller!.dispose();
    fresh();
    start();
    await until(() => !!snapshot?.ready);
    assert(snapshot?.ready, "a new scene renders after context loss");
    controller!.dispose();
    log("ALL BROWSER ENGINE CHECKS PASSED");
    report.dataset.result = "passed";
  } catch (error) {
    log(`FAIL ${error instanceof Error ? error.message : String(error)}`);
    report.dataset.result = "failed";
    controller?.dispose();
  } finally {
    window.requestAnimationFrame = originalRAF;
    window.cancelAnimationFrame = originalCancel;
  }
}
window.addEventListener("pagehide", () => controller?.dispose());
