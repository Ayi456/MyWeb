import * as T from "three";
import { CONFIG } from "../config";
import type {
  CameraPreset,
  CameraView,
  WalkView,
  WalkDirection,
} from "../types";
import type { IslandWalker } from "../systems/walking";
import { HIT_LAYER } from "../systems/interactions";
import { CAMERA_VIEWS, sampleTour, nearestTourTime } from "./cameraViews";

export interface HitTarget<Id extends string = string> {
  object: T.Object3D;
  id: Id;
}
export function createCamera<Id extends string>(
  canvas: HTMLCanvasElement,
  hits: HitTarget<Id>[],
  onTap: (id: Id) => void,
  onHover: (id: Id) => void = () => {},
  onVisit: (id: Id) => void = () => {},
  walker?: IslandWalker,
) {
  const camera = new T.PerspectiveCamera(37, 1, 0.1, 150);
  const abort = new AbortController();
  const opts = { signal: abort.signal };
  let az: number = CONFIG.camera.azimuth,
    el: number = CONFIG.camera.elevation,
    distance: number = CONFIG.camera.distance;
  let targetAz = az,
    targetEl = el,
    targetDistance = distance;
  const focus = new T.Vector3(...CONFIG.camera.focus),
    targetFocus = focus.clone();
  let lastInput = performance.now(),
    pinchDist = 0,
    blocked = false,
    autoOrbit = false;
  // Follow mode keeps the focus on the airship; drag adjusts an offset around it.
  let followTarget: T.Object3D | null = null,
    followOffset = 0.55,
    followTime = 0;
  let presetName: CameraPreset | null = "reset";
  let walking = false;
  let beforeWalk: CameraView | null = null;
  const directions: Record<string, WalkDirection> = {
    KeyW: "forward",
    ArrowUp: "forward",
    KeyS: "back",
    ArrowDown: "back",
    KeyA: "left",
    ArrowLeft: "left",
    KeyD: "right",
    ArrowRight: "right",
  };
  const forward = new T.Vector3();
  function leaveWalking() {
    walking = false;
    walker?.clear();
    camera.fov = 37;
    camera.near = 0.1;
    camera.updateProjectionMatrix();
  }
  let tourTime = 0;
  let tourEntry: { from: CameraView; age: number } | null = null;
  let flight: { from: CameraView; to: CameraView; age: number } | null = null;
  const pointers = new Map<number, { x: number; y: number }>();
  let pointerStart: { x: number; y: number; moved: boolean } | null = null;
  const raycaster = new T.Raycaster(),
    mouse = new T.Vector2();
  raycaster.layers.set(HIT_LAYER);
  const limits = CONFIG.cameraLimits;
  // Hover position projected onto a plane through the blossom canopy.
  const hoverPlane = new T.Plane(new T.Vector3(0, 1, 0), -2.6),
    pointerWorld = new T.Vector3(),
    hoverPoint = new T.Vector3();
  let pointerActive = false;
  let orbited = false;
  // Opening shot: a timed ease layered on top of the damped values, since the
  // damping alone settles within a second and would hide behind the loader.
  let arrival: { t: number; duration: number } | null = null;
  // Hover is tracked per id: the two lantern boxes share one.
  let hoverId: Id | null = null;
  function setHover(id: Id | null) {
    if (id === hoverId) return;
    hoverId = id;
    // Inline cursor would override #world:active grabbing, so clear it on drag.
    canvas.style.cursor = id ? "pointer" : "";
    if (id) onHover(id);
  }
  function pick(): Id | null {
    const visible = (object: T.Object3D): boolean => {
      for (let node: T.Object3D | null = object; node; node = node.parent)
        if (!node.visible) return false;
      return true;
    };
    const found = raycaster.intersectObjects(
      hits.filter((h) => visible(h.object)).map((h) => h.object),
      false,
    );
    return found.length
      ? (hits.find((h) => h.object === found[0].object)?.id ?? null)
      : null;
  }
  const interact = () => {
    lastInput = performance.now();
    autoOrbit = false;
    tourTime = 0;
  };
  // Direct camera input (not API calls like setWind) also ends the opening glide.
  const takeOver = () => {
    arrival = null;
    flight = null;
    interact();
  };
  function resetInput() {
    walker?.clear();
    pointers.clear();
    pointerStart = null;
    pointerActive = false;
    interact();
  }
  function preset(value: CameraPreset, instant = false) {
    if (value === "ride") return;
    leaveWalking();
    const view = CAMERA_VIEWS[value];
    if (!view) return;
    const from: CameraView = {
      azimuth: az,
      elevation: el,
      distance,
      focus: [focus.x, focus.y, focus.z],
    };
    takeOver();
    followTarget = null;
    presetName = value;
    targetAz = shortest(az, view.azimuth);
    targetEl = view.elevation;
    targetDistance = view.distance;
    targetFocus.fromArray(view.focus);
    if (instant) {
      az = targetAz;
      el = targetEl;
      distance = targetDistance;
      focus.copy(targetFocus);
    } else flight = { from, to: { ...view, azimuth: targetAz }, age: 0 };
  }
  function setShareView(value: CameraView) {
    leaveWalking();
    followTarget = null;
    presetName = null;
    az = targetAz = value.azimuth;
    el = targetEl = value.elevation;
    distance = targetDistance = value.distance;
    focus.fromArray(value.focus);
    targetFocus.copy(focus);
    takeOver();
  }
  function screenToRay(e: { clientX: number; clientY: number }) {
    const b = canvas.getBoundingClientRect();
    mouse.set(
      ((e.clientX - b.left) / b.width) * 2 - 1,
      (-(e.clientY - b.top) / b.height) * 2 + 1,
    );
    raycaster.setFromCamera(mouse, camera);
  }
  canvas.addEventListener(
    "dblclick",
    (e) => {
      if (blocked) return;
      e.preventDefault();
      screenToRay(e);
      const id = pick();
      if (id) onVisit(id);
    },
    opts,
  );
  canvas.addEventListener(
    "pointerdown",
    (e) => {
      if (blocked) return;
      if (!followTarget) presetName = null;
      canvas.focus({ preventScroll: true });
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      pointerStart = { x: e.clientX, y: e.clientY, moved: false };
      setHover(null);
      takeOver();
      if (pointers.size === 2) {
        const p = [...pointers.values()];
        pinchDist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        pointerStart.moved = true;
      }
    },
    opts,
  );
  canvas.addEventListener(
    "pointermove",
    (e) => {
      if (!blocked && e.pointerType !== "touch") {
        screenToRay(e);
        pointerActive = !!raycaster.ray.intersectPlane(hoverPlane, hoverPoint);
        if (pointerActive) pointerWorld.copy(hoverPoint);
        setHover(pointers.size ? null : pick());
      }
      const previous = pointers.get(e.pointerId);
      if (!previous || blocked) return;
      if (e.clientX !== previous.x || e.clientY !== previous.y) orbited = true;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (
        pointerStart &&
        Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 5
      )
        pointerStart.moved = true;
      if (walking) {
        if (pointers.size === 1)
          walker?.look(e.clientX - previous.x, e.clientY - previous.y);
      } else if (pointers.size === 2) {
        const p = [...pointers.values()],
          d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        targetDistance = T.MathUtils.clamp(
          (targetDistance * pinchDist) / Math.max(d, 1),
          limits.minDistance,
          limits.maxDistance,
        );
        pinchDist = d;
      } else {
        const dAz = (e.clientX - previous.x) * 0.005;
        if (followTarget) followOffset -= dAz;
        else targetAz -= dAz;
        targetEl = T.MathUtils.clamp(
          targetEl + (e.clientY - previous.y) * 0.004,
          limits.minElevation,
          limits.maxElevation,
        );
      }
      takeOver();
    },
    opts,
  );
  canvas.addEventListener(
    "pointerleave",
    () => {
      pointerActive = false;
      setHover(null);
    },
    opts,
  );
  function pointerEnd(e: PointerEvent) {
    const click =
      pointerStart &&
      !pointerStart.moved &&
      pointers.size === 1 &&
      e.type === "pointerup" &&
      !blocked;
    pointers.delete(e.pointerId);
    pointerStart = null;
    interact();
    if (click) {
      screenToRay(e);
      const id = pick();
      if (id) onTap(id);
    }
  }
  for (const name of [
    "pointerup",
    "pointercancel",
    "lostpointercapture",
  ] as const)
    canvas.addEventListener(name, pointerEnd, opts);
  canvas.addEventListener(
    "wheel",
    (e) => {
      if (blocked) return;
      e.preventDefault();
      if (walking) return;
      if (!followTarget) presetName = null;
      targetDistance = T.MathUtils.clamp(
        targetDistance * Math.exp(e.deltaY * 0.001),
        limits.minDistance,
        limits.maxDistance,
      );
      if (e.deltaY !== 0) orbited = true;
      takeOver();
    },
    { ...opts, passive: false },
  );
  canvas.addEventListener(
    "keydown",
    (e) => {
      if (blocked) return;
      if (walking) {
        const direction = directions[e.code];
        if (direction && !e.ctrlKey && !e.metaKey && !e.altKey) {
          e.preventDefault();
          walker?.input(direction, true);
          takeOver();
        }
        return;
      }
      if (
        ![
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "+",
          "-",
          "=",
        ].includes(e.key)
      )
        return;
      e.preventDefault();
      if (!followTarget) presetName = null;
      const turn = (d: number) => {
        if (followTarget) followOffset += d;
        else targetAz += d;
      };
      if (e.key === "ArrowLeft") turn(-0.12);
      if (e.key === "ArrowRight") turn(0.12);
      if (e.key === "ArrowUp") targetEl -= 0.08;
      if (e.key === "ArrowDown") targetEl += 0.08;
      if (e.key === "+" || e.key === "=") targetDistance -= 1;
      if (e.key === "-") targetDistance += 1;
      targetDistance = T.MathUtils.clamp(
        targetDistance,
        limits.minDistance,
        limits.maxDistance,
      );
      targetEl = T.MathUtils.clamp(
        targetEl,
        limits.minElevation,
        limits.maxElevation,
      );
      orbited = true;
      takeOver();
    },
    opts,
  );
  window.addEventListener("blur", resetInput, opts);
  window.addEventListener(
    "keyup",
    (e) => {
      const direction = directions[e.code];
      if (direction) walker?.input(direction, false);
    },
    opts,
  );
  window.addEventListener(
    "focusin",
    (e) => {
      if (e.target !== canvas) walker?.clear();
    },
    opts,
  );
  // UI gestures also stop the tour, including sound and copy-link buttons.
  window.addEventListener("pointerdown", interact, opts);
  window.addEventListener("keydown", interact, opts);
  const shortest = (from: number, to: number) =>
    from + Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return {
    camera,
    preset,
    setShareView,
    get walkView(): WalkView | null {
      return walking && walker ? { ...walker.view } : null;
    },
    walkInput(direction: WalkDirection, on: boolean) {
      if (walking && !blocked) walker?.input(direction, on);
    },
    setWalking(on: boolean, view?: WalkView) {
      if (!walker || on === walking) return;
      if (on) {
        beforeWalk = {
          azimuth: targetAz,
          elevation: targetEl,
          distance: targetDistance,
          focus: [targetFocus.x, targetFocus.y, targetFocus.z],
        };
        followTarget = null;
        presetName = null;
        walker.reset(view);
        walking = true;
        camera.fov = 60;
        camera.near = 0.035;
        camera.updateProjectionMatrix();
        takeOver();
        resetInput();
        canvas.focus({ preventScroll: true });
      } else {
        leaveWalking();
        if (beforeWalk) setShareView(beforeWalk);
        else preset("reset", true);
        canvas.focus({ preventScroll: true });
      }
    },
    get sharePreset() {
      return followTarget ? "ride" : presetName;
    },
    get shareView(): CameraView {
      const dest = flight?.to;
      return {
        azimuth: Math.atan2(
          Math.sin(dest?.azimuth ?? targetAz),
          Math.cos(dest?.azimuth ?? targetAz),
        ),
        elevation: dest?.elevation ?? targetEl,
        distance: dest?.distance ?? targetDistance,
        focus: dest
          ? [...dest.focus]
          : [targetFocus.x, targetFocus.y, targetFocus.z],
      };
    },
    interact,
    resetInput,
    pointerWorld,
    get pointerActive() {
      return pointerActive;
    },
    get autoOrbit() {
      return autoOrbit;
    },
    get orbited() {
      return orbited;
    },
    resetOrbitFlag() {
      orbited = false;
    },
    get following() {
      return !!followTarget;
    },
    get followTime() {
      return followTime;
    },
    /** Ride behind the airship. Reset or the tree preset leaves the ride. */
    follow(target: T.Object3D | null) {
      leaveWalking();
      if (target === followTarget) return;
      followTarget = target;
      followTime = 0;
      if (target) {
        presetName = "ride";
        followOffset = 0.55;
        targetEl = 0.22;
        targetDistance = 9.5;
      } else preset("reset");
      takeOver();
    },
    /** Glide in from a wider, higher angle; any input cancels it. */
    arrive(duration = 1.6) {
      arrival = { t: 0, duration };
    },
    setBlocked(value: boolean) {
      blocked = value;
      if (value) setHover(null);
      resetInput();
    },
    update(dt: number, now: number, playing: boolean, reducedMotion: boolean) {
      if (walking && walker) {
        autoOrbit = false;
        if (!blocked) walker.update(dt);
        camera.position.set(...walker.eye);
        const { yaw, pitch } = walker.view;
        forward.set(
          Math.sin(yaw) * Math.cos(pitch),
          Math.sin(pitch),
          -Math.cos(yaw) * Math.cos(pitch),
        );
        camera.lookAt(forward.add(camera.position));
        return;
      }
      if (followTarget) {
        followTime += dt;
        targetFocus.copy(followTarget.position).add(new T.Vector3(0, 0.9, 0));
        // Sit behind and slightly to one side of the ship's heading.
        const behind = followTarget.rotation.y - Math.PI / 2 + followOffset;
        targetAz = shortest(targetAz, behind);
        az = shortest(az, targetAz);
      }
      const wasTouring = autoOrbit;
      autoOrbit =
        !pointers.size &&
        !blocked &&
        !reducedMotion &&
        !followTarget &&
        !flight &&
        playing &&
        now - lastInput > CONFIG.autoOrbitDelay;
      if (autoOrbit) {
        if (!wasTouring) {
          const from: CameraView = {
            azimuth: az,
            elevation: el,
            distance,
            focus: [focus.x, focus.y, focus.z],
          };
          tourTime = nearestTourTime(from);
          tourEntry = { from, age: 0 };
        }
        tourTime += dt;
        const view = sampleTour(tourTime);
        targetAz = shortest(targetAz, view.azimuth);
        targetEl = view.elevation;
        targetDistance = view.distance;
        targetFocus.fromArray(view.focus);
        if (tourEntry) {
          tourEntry.age += dt;
          const t = T.MathUtils.smoothstep(tourEntry.age / 2.8, 0, 1);
          const from = tourEntry.from;
          targetAz = T.MathUtils.lerp(
            from.azimuth,
            shortest(from.azimuth, view.azimuth),
            t,
          );
          targetEl = T.MathUtils.lerp(from.elevation, view.elevation, t);
          targetDistance = T.MathUtils.lerp(from.distance, view.distance, t);
          targetFocus.set(...from.focus).lerp(new T.Vector3(...view.focus), t);
          if (t === 1) tourEntry = null;
        }
        presetName = null;
      }
      if (flight) {
        flight.age += dt;
        const t = reducedMotion
          ? 1
          : T.MathUtils.smoothstep(flight.age / 1.8, 0, 1);
        targetAz = T.MathUtils.lerp(flight.from.azimuth, flight.to.azimuth, t);
        targetEl = T.MathUtils.lerp(
          flight.from.elevation,
          flight.to.elevation,
          t,
        );
        targetDistance = T.MathUtils.lerp(
          flight.from.distance,
          flight.to.distance,
          t,
        );
        targetFocus
          .set(...flight.from.focus)
          .lerp(new T.Vector3(...flight.to.focus), t);
        if (t === 1) flight = null;
      }
      const damping = reducedMotion ? 1 : 1 - Math.exp(-dt * 7);
      az = T.MathUtils.lerp(
        az,
        targetAz,
        followTarget ? damping * 0.45 : damping,
      );
      el = T.MathUtils.lerp(el, targetEl, damping);
      distance = T.MathUtils.lerp(
        distance,
        targetDistance,
        reducedMotion ? 1 : 1 - Math.exp(-dt * 5),
      );
      focus.lerp(targetFocus, followTarget ? 1 - Math.exp(-dt * 3.5) : damping);
      let away = 0;
      if (reducedMotion) arrival = null;
      if (arrival) {
        arrival.t += dt;
        away = 1 - T.MathUtils.smoothstep(arrival.t / arrival.duration, 0, 1);
        if (arrival.t >= arrival.duration) arrival = null;
      }
      const dist =
        distance * Math.max(1, 1.02 / camera.aspect) * (1 + away * 0.45);
      const elView = el + away * 0.14;
      // A more frontal portrait view keeps the remote beacon clear of the
      // right-hand controls without shrinking the main island further.
      const viewAz =
        az -
        T.MathUtils.smoothstep(1 - camera.aspect, 0, 0.5) * 0.35 +
        away * 0.5;
      camera.position.set(
        focus.x + Math.sin(viewAz) * Math.cos(elView) * dist,
        focus.y + Math.sin(elView) * dist,
        focus.z + Math.cos(viewAz) * Math.cos(elView) * dist,
      );
      camera.lookAt(focus);
    },
    dispose() {
      abort.abort();
      resetInput();
    },
  };
}
