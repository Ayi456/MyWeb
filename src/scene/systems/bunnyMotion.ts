import type { Bunny } from "../objects/bunny";

const smooth = (t: number) => t * t * (3 - 2 * t);

/** A stopped turn keeps the small convoy inside the dock, without position jumps. */
export function courierPose(time: number, reduced = false) {
  const t = reduced ? 0 : Math.max(0, time);
  const cycle = Math.floor(t / 14);
  const phase = t % 14;
  const returning = phase >= 7;
  const legTime = returning ? phase - 7 : phase;
  const progress = smooth(Math.min(legTime / 5, 1));
  const turning = legTime >= 5;
  const turn = turning ? smooth((legTime - 5) / 2) : 0;
  const yaw = returning ? Math.PI * turn : Math.PI * (1 - turn);
  const distance = cycle * 1.4 + (returning ? 0.7 : 0) + progress * 0.7;
  const speed =
    turning || reduced ? 0 : (6 * (legTime / 5) * (1 - legTime / 5)) / 5;
  return {
    x: 4.55 + (returning ? 1 - progress : progress) * 0.7,
    yaw,
    wheel: distance / 0.08,
    stride: Math.sin(distance * 32) * Math.min(1, speed * 5) * 0.24,
  };
}

/** Absolute poses keep pauses, time jumps and interaction overlays free of drift. */
export function updateBunnyMotion(
  bunny: Bunny,
  time: number,
  reduced: boolean,
) {
  const phase =
    bunny.role === "writer" ? 0 : bunny.role === "courier" ? 2.1 : 3.7;
  const blinkTime = (time + phase) % 7.3;
  const blink =
    !reduced && blinkTime > 4.1 && blinkTime < 4.34
      ? Math.sin(((blinkTime - 4.1) / 0.24) * Math.PI) ** 2
      : 0;
  bunny.eyes.scale.y = 1 - blink * 0.92;
  const earTime = (time + phase) % 11.8;
  const twitch =
    !reduced && earTime > 7 && earTime < 8.2
      ? Math.sin(((earTime - 7) / 1.2) * Math.PI) ** 2
      : 0;
  bunny.ears[0].rotation.set(-0.06 - twitch * 0.08, 0, 0.22 + twitch * 0.12);
  bunny.ears[1].rotation.set(0.08, twitch * 0.045, -0.14 - twitch * 0.04);
}
