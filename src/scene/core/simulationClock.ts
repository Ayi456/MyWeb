import { CONFIG } from "../config";
import type { Speed } from "../types";

export const wrapHour = (hour: number) => ((hour % 24) + 24) % 24;
export class SimulationClock {
  speed: Speed = 1;
  time = 0;
  hour: number = CONFIG.initialHour;
  advance(realDelta: number) {
    const dt =
      Math.max(0, Number.isFinite(realDelta) ? realDelta : 0) * this.speed;
    this.time += dt;
    this.hour = wrapHour(this.hour + dt * CONFIG.hoursPerSecond);
    return dt;
  }
  setHour(hour: number) {
    if (Number.isFinite(hour)) this.hour = wrapHour(hour);
  }
}
