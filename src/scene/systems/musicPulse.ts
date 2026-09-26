export class MusicPulse {
  level = 0;
  angle = 0;
  update(
    dt: number,
    energy: number,
    enabled: boolean,
    paused: boolean,
    reduced: boolean,
  ) {
    if (reduced) {
      this.level = 0;
      return;
    }
    if (paused || !Number.isFinite(dt) || dt <= 0) return;
    const target =
      enabled && Number.isFinite(energy) ? Math.max(0, Math.min(1, energy)) : 0;
    this.level +=
      (target - this.level) *
      (1 - Math.exp(-Math.min(dt, 0.05) * (target > this.level ? 10 : 5)));
    this.angle = (this.angle + dt * this.level * 8) % (Math.PI * 2);
  }
}
