import type { QualityLevel, QualityMode } from "../types";
/** Automatic quality only steps down. Explicit selection resets the observation window. */
export class QualityController {
  mode: QualityMode = "auto";
  level: QualityLevel;
  private slowSeconds = 0;
  private cooldown = 8;
  constructor(private mobile: boolean) {
    this.level = mobile ? "medium" : "high";
  }
  select(mode: QualityMode) {
    this.mode = mode;
    this.level = mode === "auto" ? (this.mobile ? "medium" : "high") : mode;
    this.slowSeconds = 0;
    this.cooldown = 8;
  }
  sample(fps: number, seconds: number) {
    if (this.mode !== "auto" || this.level === "low") return false;
    this.cooldown = Math.max(0, this.cooldown - seconds);
    if (this.cooldown > 0) return false;
    this.slowSeconds =
      fps < 43
        ? this.slowSeconds + seconds
        : Math.max(0, this.slowSeconds - seconds * 2);
    if (this.slowSeconds < 5) return false;
    this.level = this.level === "high" ? "medium" : "low";
    this.slowSeconds = 0;
    this.cooldown = 10;
    return true;
  }
}
