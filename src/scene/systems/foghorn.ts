export function foghornWeather(
  night: number,
  rain: number,
  tide: number,
  winter: number,
) {
  return night > 0.65 && (rain > 0.45 || tide > 0.25 || winter > 0.5);
}

/** Only simulated eligible time counts; no catch-up or bursts after a pause. */
export class Foghorn {
  remaining = 6;
  count = 0;
  update(dt: number, eligible: boolean) {
    if (!eligible) {
      this.remaining = 6;
      return false;
    }
    if (!Number.isFinite(dt) || dt <= 0) return false;
    this.remaining -= dt;
    if (this.remaining > 0) return false;
    this.remaining = 60;
    this.count++;
    return true;
  }
}
