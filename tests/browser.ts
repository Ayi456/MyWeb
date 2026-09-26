/** Browser-only integration harness; Vite does not include it in dist. */
import { createScene } from "../src/scene/createScene";
import { REVISION } from "three";
export * as THREE from "three";
import { EVENT_KINDS, type SceneEventKind } from "../src/scene/systems/events";
import { CAMERA_PRESETS } from "../src/scene/core/cameraViews";
import type { CameraPreset } from "../src/scene/types";
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
  controller = createScene(canvas, {
    onMailbox: () => {},
    onError,
    skipArrival: true,
    initial:
      params.get("mode") === "visual"
        ? {
            year: params.has("season")
              ? Number(params.get("season")) + 0.08
              : undefined,
            cameraPreset: CAMERA_PRESETS.includes(
              params.get("preset") as CameraPreset,
            )
              ? (params.get("preset") as CameraPreset)
              : "reset",
          }
        : undefined,
  });
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
  const event = params.get("event");
  if (EVENT_KINDS.includes(event as SceneEventKind))
    controller!.triggerEvent(event as SceneEventKind);
  // Let visitors and camera settle by running the simulation for N sim-seconds.
  if (params.has("settle")) {
    const target = Number(params.get("settle"));
    // Short targets use ×1 so the 300 ms snapshot cadence cannot overshoot much.
    controller!.setSpeed(target < 6 ? 1 : 12);
    const tick = () => {
      if ((snapshot?.simTime ?? 0) >= target) controller!.setSpeed(0);
      else setTimeout(tick, 30);
    };
    tick();
  }
} else {
  log(`Three.js revision: ${REVISION}`);
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
        // New systems: seasons, taps, events, ride and replies.
        controller!.setSpeed(0);
        controller!.setSeason(3);
        await delay(350);
        assert(
          snapshot!.season === "winter",
          "season jumps to winter on request",
        );
        const winterData = JSON.parse(canvas.dataset.diagnostics!);
        assert(
          winterData.snowParticles > 0 && winterData.petalParticles === 0,
          "winter uses full-view snowfall instead of island-local petals",
        );
        controller!.setQuality("low");
        await delay(350);
        const lowSnow = JSON.parse(canvas.dataset.diagnostics!);
        assert(
          lowSnow.snowParticles > 0 &&
            lowSnow.snowParticles < winterData.snowParticles,
          "low quality reduces snow count while keeping snowfall active",
        );
        assert(
          lowSnow.snowTime === winterData.snowTime,
          "snowfall motion freezes with the paused simulation",
        );
        controller!.setQuality("high");
        controller!.setSeason(0);
        await delay(350);
        const springData = JSON.parse(canvas.dataset.diagnostics!);
        assert(
          springData.snowParticles === 0 && springData.petalParticles > 0,
          "spring restores petals and hides winter snowfall",
        );
        let notices = 0;
        const stopNotices = controller!.onNotice(() => notices++);
        controller!.poke("tree");
        controller!.poke("bell");
        await delay(100);
        assert(notices >= 2, "taps raise scene notices");
        controller!.triggerEvent("shower");
        controller!.setSpeed(12);
        await until(() => snapshot!.rain > 0.3, 8000);
        assert(
          snapshot!.event === "shower",
          "a forced shower becomes the active event",
        );
        controller!.setCameraPreset("ride");
        await delay(400);
        assert(snapshot!.riding, "camera follows the airship on request");
        controller!.setCameraPreset("reset");
        await delay(400);
        assert(!snapshot!.riding, "reset leaves the ride");
        controller!.sendLetter("Reply test");
        await until(() => snapshot!.deliveredCount >= 2);
        await until(() => snapshot!.repliesWaiting === 0, 60000);
        assert(
          notices > 2 && snapshot!.stamps.includes("beacon"),
          "a reply lands in the mailbox after the ship returns",
        );
        stopNotices();
        controller!.setSpeed(1);
      }
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
        assert(
          snapshot!.lettersInFlight === 12,
          "all 12 resource-test letters are accepted",
        );
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
