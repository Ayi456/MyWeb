import * as T from "three";
import { CONFIG } from "../config";
import type { CameraPreset } from "../types";

export function createCamera(
  canvas: HTMLCanvasElement,
  mailHit: T.Object3D,
  onMailbox: () => void,
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
  const pointers = new Map<number, { x: number; y: number }>();
  let pointerStart: { x: number; y: number; moved: boolean } | null = null;
  const raycaster = new T.Raycaster(),
    mouse = new T.Vector2();
  const limits = CONFIG.cameraLimits;
  const interact = () => {
    lastInput = performance.now();
    autoOrbit = false;
  };
  function resetInput() {
    pointers.clear();
    pointerStart = null;
    interact();
  }
  function preset(value: CameraPreset) {
    targetAz = value === "tree" ? 0.31 : CONFIG.camera.azimuth;
    targetEl = value === "tree" ? 0.26 : CONFIG.camera.elevation;
    targetDistance = value === "tree" ? 17 : CONFIG.camera.distance;
    targetFocus.fromArray(
      value === "tree" ? [-0.4, 2.25, 0.2] : CONFIG.camera.focus,
    );
    interact();
  }
  canvas.addEventListener(
    "pointerdown",
    (e) => {
      if (blocked) return;
      canvas.focus({ preventScroll: true });
      canvas.setPointerCapture(e.pointerId);
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      pointerStart = { x: e.clientX, y: e.clientY, moved: false };
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
        targetAz -= (e.clientX - previous.x) * 0.005;
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
      const b = canvas.getBoundingClientRect();
      mouse.set(
        ((e.clientX - b.left) / b.width) * 2 - 1,
        (-(e.clientY - b.top) / b.height) * 2 + 1,
      );
      raycaster.setFromCamera(mouse, camera);
      if (raycaster.intersectObject(mailHit).length) onMailbox();
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
      if (e.key === "ArrowLeft") targetAz -= 0.12;
      if (e.key === "ArrowRight") targetAz += 0.12;
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
  return {
    camera,
    preset,
    interact,
    resetInput,
    get autoOrbit() {
      return autoOrbit;
    },
    setBlocked(value: boolean) {
      blocked = value;
      resetInput();
    },
    update(dt: number, now: number, playing: boolean, reducedMotion: boolean) {
      autoOrbit =
        !pointers.size &&
        !blocked &&
        !reducedMotion &&
        playing &&
        now - lastInput > CONFIG.autoOrbitDelay;
      if (autoOrbit) targetAz += dt * 0.018;
      const damping = reducedMotion ? 1 : 1 - Math.exp(-dt * 7);
      az = T.MathUtils.lerp(az, targetAz, damping);
      el = T.MathUtils.lerp(el, targetEl, damping);
      distance = T.MathUtils.lerp(
        distance,
        targetDistance,
        reducedMotion ? 1 : 1 - Math.exp(-dt * 5),
      );
      focus.lerp(targetFocus, damping);
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
