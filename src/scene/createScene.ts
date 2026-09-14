import * as T from "three";
import { CONFIG, QUALITY } from "./config";
import type { SceneController, SceneOptions, SceneSnapshot } from "./types";
import { createContext } from "./core/context";
import { createRenderer } from "./core/renderer";
import { createCamera } from "./core/camera";
import { ResourceTracker } from "./core/resourceTracker";
import { SimulationClock } from "./core/simulationClock";
import { createWorld } from "./objects/createWorld";
import { updateAmbient } from "./systems/ambient";
import { createDayNight } from "./systems/dayNight";
import { AirshipFlight } from "./systems/airshipFlight";
import { createLetterDelivery } from "./systems/letterDelivery";
import { WindSystem } from "./systems/wind";
import { QualityController } from "./systems/quality";

export function createScene(
  canvas: HTMLCanvasElement,
  options: SceneOptions,
): SceneController {
  const ctx = createContext(),
    tracker = new ResourceTracker();
  tracker.trackGeometry(ctx.cube);
  const cleanups: (() => void)[] = [];
  let disposed = false,
    failed = false,
    frameID = 0;
  let render: ReturnType<typeof createRenderer> | undefined;
  const listeners = new Set<(snapshot: SceneSnapshot) => void>();
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frameID);
    for (const cleanup of cleanups.reverse()) cleanup();
    tracker.track(ctx.scene);
    tracker.trackMaterial(ctx.matte);
    tracker.trackMaterial(ctx.rockMat);
    tracker.trackMaterial(ctx.lampMat);
    tracker.dispose();
    ctx.scene.clear();
    listeners.clear();
    render?.dispose();
    delete canvas.dataset.diagnostics;
  }
  try {
    const pipeline = createRenderer(canvas);
    render = pipeline; // Created first so unavailable WebGL fails quickly.
    // Geometry ownership stays at the scene level until all systems are detached.
    const objects = createWorld(ctx),
      camera = createCamera(canvas, objects.mailHit, options.onMailbox);
    cleanups.push(() => camera.dispose());
    const clock = new SimulationClock(),
      windSystem = new WindSystem(),
      flight = new AirshipFlight();
    const delivery = createLetterDelivery(ctx, () => flight.depart());
    cleanups.push(() => delivery.dispose());
    const dayNight = createDayNight(ctx, objects);
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = media.matches;
    const quality = new QualityController(
      matchMedia("(pointer: coarse)").matches,
    );
    const events = new AbortController();
    cleanups.push(() => events.abort());
    media.addEventListener(
      "change",
      () => {
        reducedMotion = media.matches;
        camera.interact();
      },
      { signal: events.signal },
    );
    let snapshot: SceneSnapshot = {
      ready: false,
      hour: clock.hour,
      speed: 1,
      night: 0,
      wind: 0,
      journey: "飞艇正在等一封信。",
      sentCount: 0,
      deliveredCount: 0,
      lettersInFlight: 0,
      quality: "auto",
      actualQuality: quality.level,
      fps: 0,
      drawCalls: 0,
      instances: 0,
      resolution: "",
      simTime: 0,
      geometries: 0,
      textures: 0,
      autoOrbit: false,
    };
    let baseInstances = 0;
    ctx.scene.traverse((o) => {
      if (o instanceof T.InstancedMesh) baseInstances += o.count;
    });
    function emit() {
      snapshot = {
        ...snapshot,
        hour: clock.hour,
        speed: clock.speed,
        wind: windSystem.value,
        simTime: clock.time,
        sentCount: delivery.sentCount,
        deliveredCount: delivery.deliveredCount,
        lettersInFlight: delivery.count,
        quality: quality.mode,
        actualQuality: quality.level,
        autoOrbit: camera.autoOrbit,
      };
      listeners.forEach((listener) => listener(snapshot));
      // Non-sensitive diagnostics only. Never include letters or personal text here.
      if (
        import.meta.env.DEV ||
        new URLSearchParams(location.search).get("debug") === "1"
      )
        canvas.dataset.diagnostics = JSON.stringify({
          ...snapshot,
          three: T.REVISION,
          seed: CONFIG.seed,
          flightTime: flight.time,
          camera: camera.camera.position.toArray(),
        });
    }
    function resize() {
      pipeline.resize(camera.camera, quality.level);
      snapshot.resolution = pipeline.resolution;
    }
    function applyQuality() {
      const profile = QUALITY[quality.level];
      objects.petals.count = profile.petals;
      objects.sunLight.shadow.mapSize.set(profile.shadows, profile.shadows);
      objects.sunLight.shadow.map?.dispose();
      objects.sunLight.shadow.map = null;
      resize();
    }
    applyQuality();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    cleanups.push(() => observer.disconnect());
    let last = performance.now(),
      statsAt = last,
      uiAt = last,
      frames = 0,
      petalTime = 0;
    function fail(error: unknown) {
      if (failed || disposed) return;
      failed = true;
      cancelAnimationFrame(frameID);
      options.onError(
        error instanceof Error
          ? error.message
          : "画面暂时未能启程，请重新试一次。",
      );
    }
    function animate(now: number) {
      if (disposed || failed || document.hidden) return;
      try {
        const realDt = Math.min(Math.max((now - last) / 1000, 0), 0.05);
        last = now;
        const dt = clock.advance(realDt),
          wind = windSystem.update(dt);
        const motionWind = reducedMotion ? wind * 0.35 : wind;
        petalTime += dt * (1 + motionWind * 0.62);
        ctx.U.uTime.value = clock.time;
        ctx.U.uWind.value = motionWind;
        ctx.U.uPetalTime.value = petalTime;
        snapshot.night = dayNight(clock.hour);
        const route = flight.update(objects, dt, clock.time, motionWind);
        snapshot.journey = route.journey;
        ctx.U.uShip.value.copy(objects.airship.position);
        updateAmbient(objects, clock.time, motionWind, route.phase);
        delivery.update(dt, objects.airship);
        camera.update(realDt, now, clock.speed !== 0, reducedMotion);
        // Portrait framing pulls the camera back: keep sky coverage and atmospheric contrast.
        const portrait = camera.camera.aspect < 1;
        objects.sky.position
          .copy(camera.camera.position)
          .multiplyScalar(portrait ? 1 : 0);
        if (ctx.scene.fog instanceof T.FogExp2)
          ctx.scene.fog.density =
            CONFIG.fogDensity / Math.max(1, 1.3 / camera.camera.aspect);
        pipeline.render(ctx.scene, camera.camera);
        frames++;
        if (!snapshot.ready) {
          snapshot.ready = true;
          emit();
        }
        if (now - statsAt >= CONFIG.statsInterval) {
          const seconds = (now - statsAt) / 1000;
          const info = pipeline.renderer.info;
          snapshot = {
            ...snapshot,
            fps: Math.round(frames / seconds),
            drawCalls: info.render.calls,
            instances:
              baseInstances -
              CONFIG.petals +
              objects.petals.count +
              delivery.count * 4,
            geometries: info.memory.geometries,
            textures: info.memory.textures,
            resolution: pipeline.resolution,
          };
          if (quality.sample(snapshot.fps, seconds)) applyQuality();
          frames = 0;
          statsAt = now;
        }
        if (now - uiAt >= CONFIG.uiInterval) {
          emit();
          uiAt = now;
        }
        frameID = requestAnimationFrame(animate);
      } catch (error) {
        fail(error);
      }
    }
    document.addEventListener(
      "visibilitychange",
      () => {
        cancelAnimationFrame(frameID);
        camera.resetInput();
        windSystem.active = false;
        if (!document.hidden && !disposed && !failed) {
          last = statsAt = uiAt = performance.now();
          frames = 0;
          frameID = requestAnimationFrame(animate);
        }
      },
      { signal: events.signal },
    );
    canvas.addEventListener(
      "webglcontextlost",
      (event) => {
        event.preventDefault();
        fail(
          new Error("WebGL 画面连接已中断。请点击「重新启程」重新创建场景。"),
        );
      },
      { signal: events.signal },
    );
    frameID = requestAnimationFrame(animate);
    return {
      setSpeed(speed) {
        if (![0, 1, 4, 12].includes(speed)) return;
        clock.speed = speed;
        camera.interact();
        emit();
      },
      setTimeOfDay(hour) {
        clock.setHour(hour);
        snapshot.night = dayNight(clock.hour);
        camera.interact();
        emit();
      },
      setWind(active) {
        windSystem.active = active;
        camera.interact();
      },
      setCameraPreset(preset) {
        camera.preset(preset);
      },
      setInteractionBlocked(blocked) {
        camera.setBlocked(blocked);
        if (blocked) windSystem.active = false;
      },
      setQuality(mode) {
        quality.select(mode);
        applyQuality();
        camera.interact();
        emit();
      },
      sendLetter(message) {
        const sent = delivery.send(message);
        emit();
        return sent;
      },
      subscribe(listener) {
        listeners.add(listener);
        listener(snapshot);
        return () => listeners.delete(listener);
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
