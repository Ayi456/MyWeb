import type { SeasonalData } from "../utils/voxelBatch";
import { CONFIG } from "../config";

export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
export type SeasonName = (typeof SEASONS)[number];
export const SEASON_LABELS: Record<SeasonName, string> = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬",
};
export type SeasonWeights = [number, number, number, number];

const smooth = (t: number) => {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
};
/**
 * Blend weights for a continuous year value in [0, 4). Each season holds
 * steady, then crosses into the next during its final `transition` fraction.
 */
export function seasonWeights(
  year: number,
  transition = CONFIG.seasonTransition,
): SeasonWeights {
  const y = ((year % 4) + 4) % 4,
    index = Math.floor(y),
    frac = y - index,
    blend = smooth((frac - (1 - transition)) / transition);
  const w: SeasonWeights = [0, 0, 0, 0];
  w[index] = 1 - blend;
  w[(index + 1) % 4] += blend;
  return w;
}
/** Seasons advance with the simulation clock, so pause freezes them too. */
export class SeasonClock {
  year: number = CONFIG.initialYear;
  advance(dt: number) {
    const step = Math.max(0, Number.isFinite(dt) ? dt : 0);
    this.year = (this.year + step / CONFIG.secondsPerSeason) % 4;
    return this.year;
  }
  /** Jump a little way into a season so the new palette is fully settled. */
  set(index: number) {
    if (!Number.isFinite(index)) return;
    this.year = (((Math.floor(index) % 4) + 4) % 4) + 0.08;
  }
  get index() {
    return Math.floor(this.year) as 0 | 1 | 2 | 3;
  }
  get name(): SeasonName {
    return SEASONS[this.index];
  }
  get weights() {
    return seasonWeights(this.year);
  }
}
/** Rewrites registered instance colours (and sizes) whenever the blend moves. */
export class SeasonalPalette {
  private entries: SeasonalData[] = [];
  private last: SeasonWeights = [-1, 0, 0, 0];
  register(data: SeasonalData) {
    this.entries.push(data);
  }
  get count() {
    return this.entries.length;
  }
  apply(weights: SeasonWeights, force = false) {
    const moved =
      force ||
      this.last.some((value, i) => Math.abs(value - weights[i]) > 0.004);
    if (!moved) return false;
    this.last = [...weights] as SeasonWeights;
    for (const { mesh, colors, scales, base } of this.entries) {
      const color = mesh.instanceColor;
      if (!color) continue;
      const out = color.array as Float32Array,
        n = mesh.count;
      for (let i = 0; i < n; i++) {
        let r = 0,
          g = 0,
          b = 0;
        for (let k = 0; k < 4; k++) {
          const w = weights[k];
          if (!w) continue;
          const o = i * 12 + k * 3;
          r += colors[o] * w;
          g += colors[o + 1] * w;
          b += colors[o + 2] * w;
        }
        out[i * 3] = r;
        out[i * 3 + 1] = g;
        out[i * 3 + 2] = b;
      }
      color.needsUpdate = true;
      if (scales && base) {
        const mats = mesh.instanceMatrix.array as Float32Array;
        for (let i = 0; i < n; i++) {
          let s = 0;
          for (let k = 0; k < 4; k++) s += scales[i * 4 + k] * weights[k];
          const o = i * 16;
          for (let e = 0; e < 12; e++) mats[o + e] = base[o + e] * s;
        }
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
    return true;
  }
}
