import * as T from "three";
import { CONFIG } from "../config";
import type { CameraPreset } from "../types";
import { HIT_LAYER } from "../systems/interactions";

export interface HitTarget<Id extends string = string> {
  object: T.Object3D;
  id: Id;
}
export function createCamera<Id extends string>(
  canvas: HTMLCanvasElement,
  hits: HitTarget<Id>[],
  onTap: (id: Id) => void,
  onHover: (id: Id) => void = () => {},
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
    const found = raycaster.intersectObjects(
      hits.map((h) => h.object),
      false,
    );
    return found.length
      ? (hits.find((h) => h.object === found[0].object)?.id ?? null)
      : null;
  }
  const interact = () => {
    lastInput = performance.now();
    autoOrbit = false;
  };
  function resetInput() {
    pointers.clear();
    pointerStart = null;
    pointerActive = false;
    interact();
  }
  function preset(value: CameraPreset) {
    followTarget = null;
    targetAz = value === "tree" ? 0.31 : CONFIG.camera.azimuth;
    targetEl = value === "tree" ? 0.26 : CONFIG.camera.elevation;
    targetDistance = value === "tree" ? 17 : CONFIG.camera.distance;
    targetFocus.fromArray(
      value === "tree" ? [-0.4, 2.25, 0.2] : CONFIG.camera.focus,
    );
    interact();
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
    "pointerdown",
    (e) => {
      if (blocked) return;
      canvas.focus({ preventScroll: true });
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      pointerStart = { x: e.clientX, y: e.clientY, moved: false };
      setHover(null);
      interact();
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
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (
        pointerStart &&
        Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 5
      )
        pointerStart.moved = true;
      if (pointers.size === 2) {
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
      interact();
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
      targetDistance = T.MathUtils.clamp(
        targetDistance * Math.exp(e.deltaY * 0.001),
        limits.minDistance,
        limits.maxDistance,
      );
      interact();
    },
    { ...opts, passive: false },
  );
  canvas.addEventListener(
    "keydown",
    (e) => {
      if (blocked) return;
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
      interact();
    },
    opts,
  );
  window.addEventListener("blur", resetInput, opts);
  const shortest = (from: number, to: number) =>
    from + Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return {
    camera,
    preset,
    interact,
    resetInput,
    pointerWorld,
    get pointerActive() {
      return pointerActive;
    },
    get autoOrbit() {
      return autoOrbit;
    },
    get following() {
      return !!followTarget;
    },
    get followTime() {
      return followTime;
    },
    /** Ride behind the airship. Reset or the tree preset leaves the ride. */
    follow(target: T.Object3D | null) {
      if (target === followTarget) return;
      followTarget = target;
      followTime = 0;
      if (target) {
        followOffset = 0.55;
        targetEl = 0.22;
        targetDistance = 9.5;
      } else preset("reset");
      interact();
    },
    setBlocked(value: boolean) {
      blocked = value;
      if (value) setHover(null);
      resetInput();
    },
    update(dt: number, now: number, playing: boolean, reducedMotion: boolean) {
      if (followTarget) {
        followTime += dt;
        targetFocus.copy(followTarget.position).add(new T.Vector3(0, 0.9, 0));
        // Sit behind and slightly to one side of the ship's heading.
        const behind = followTarget.rotation.y - Math.PI / 2 + followOffset;
        targetAz = shortest(targetAz, behind);
        az = shortest(az, targetAz);
      }
      autoOrbit =
        !pointers.size &&
        !blocked &&
        !reducedMotion &&
        !followTarget &&
        playing &&
        now - lastInput > CONFIG.autoOrbitDelay;
      if (autoOrbit) targetAz += dt * 0.018;
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
      const dist = distance * Math.max(1, 1.3 / camera.aspect);
      // A more frontal portrait view keeps the remote beacon clear of the
      // right-hand controls without shrinking the main island further.
      const viewAz =
        az - T.MathUtils.smoothstep(1 - camera.aspect, 0, 0.5) * 0.35;
      camera.position.set(
        focus.x + Math.sin(viewAz) * Math.cos(el) * dist,
        focus.y + Math.sin(el) * dist,
        focus.z + Math.cos(viewAz) * Math.cos(el) * dist,
      );
      camera.lookAt(focus);
    },
    dispose() {
      abort.abort();
      resetInput();
    },
  };
}
