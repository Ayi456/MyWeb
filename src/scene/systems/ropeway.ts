import { ROPEWAY } from "../worldLayout";

export function ropewayPoint(progress: number): [number, number, number] {
  const u = Math.max(0, Math.min(1, progress));
  return [
    ROPEWAY.start[0] + (ROPEWAY.end[0] - ROPEWAY.start[0]) * u,
    ROPEWAY.start[1] +
      (ROPEWAY.end[1] - ROPEWAY.start[1]) * u -
      Math.sin(u * Math.PI) * 0.4,
    ROPEWAY.start[2] + (ROPEWAY.end[2] - ROPEWAY.start[2]) * u,
  ];
}
export function sampleRopeway(time: number) {
  const phase =
    ((time % ROPEWAY.duration) + ROPEWAY.duration) % ROPEWAY.duration;
  const ease = (u: number) => u * u * (3 - 2 * u);
  const progress =
    phase < 6
      ? 0
      : phase < 22
        ? ease((phase - 6) / 16)
        : phase < 28
          ? 1
          : 1 - ease((phase - 28) / 16);
  return {
    progress,
    stopped: phase < 6 || (phase >= 22 && phase < 28),
    position: ropewayPoint(progress),
  };
}
