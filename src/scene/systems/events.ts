import * as T from "three";
import { CONFIG } from "../config";
import type { WorldObjects } from "../objects/createWorld";
import type { SeasonWeights } from "./season";
import type { FestivalKind } from "./festival";

export const EVENT_KINDS = [
  "shower",
  "shootingStar",
  "whale",
  "balloon",
  "skyLanterns",
  "seaMist",
  "thunderstorm",
  "aurora",
] as const;
export type SceneEventKind = (typeof EVENT_KINDS)[number];

export interface EventContext {
  night: number;
  season: SeasonWeights;
  hour: number;
  festival?: FestivalKind | null;
}
export const EVENT_NOTICES: Record<SceneEventKind, string> = {
  shower: "一阵太阳雨路过，雨后说不定有彩虹。",
  shootingStar: "有流星划过，快许个愿。",
  whale: "云鲸从远方游来了，慢慢地，慢慢地。",
  balloon: "一只热气球飘过群岛，上面有人在挥手。",
  skyLanterns: "温泉村放起了一串孔明灯，慢慢飘进夜色里。",
  seaMist: "晨雾漫上来了，云海涨过了岛基。",
  thunderstorm: "远处响起夏夜的雷，雨下得密了。",
  aurora: "冬夜的北方天空，泛起了绿紫色的极光。",
};
const DURATION: Record<SceneEventKind, number> = {
  shower: 26,
  shootingStar: 3.2,
  whale: 48,
  balloon: 44,
  skyLanterns: 40,
  seaMist: 50,
  thunderstorm: 36,
  aurora: 56,
};
/** Which events fit the moment. Snow already falls in winter, so no rain then. */
export function eligibleEvents(ctx: EventContext): SceneEventKind[] {
  const out: SceneEventKind[] = ["whale"];
  if (ctx.night > 0.6) out.push("shootingStar");
  // Mid-autumn already fills the village sky with lanterns.
  if (ctx.night > 0.6 && ctx.festival !== "midAutumn") out.push("skyLanterns");
  if (ctx.night < 0.4) out.push("balloon");
  if (ctx.night < 0.6 && ctx.season[3] < 0.5) out.push("shower");
  if (ctx.hour >= 4.5 && ctx.hour < 8.5) out.push("seaMist");
  if (ctx.night > 0.5 && ctx.season[1] > 0.5) out.push("thunderstorm");
  if (ctx.night > 0.6 && ctx.season[3] > 0.5) out.push("aurora");
  return out;
}
/**
 * Picks an occasional surprise on the simulation clock, so pause freezes it.
 * `random` is injectable for tests; the scene passes its own generator.
 */
export class EventScheduler {
  active: { kind: SceneEventKind; age: number } | null = null;
  countdown: number;
  last: SceneEventKind | null = null;
  constructor(
    private random: () => number = Math.random,
    private weights: Partial<Record<SceneEventKind, number>> = {},
  ) {
    this.countdown =
      CONFIG.events.firstDelay[0] + this.span(CONFIG.events.firstDelay);
  }
  private span([a, b]: readonly [number, number]) {
    return (b - a) * this.random();
  }
  /** Force an event now; used by tests and the debug hook. */
  start(kind: SceneEventKind) {
    this.active = { kind, age: 0 };
    this.last = kind;
    return kind;
  }
  /** Returns the kind that started this tick, if any. */
  update(dt: number, ctx: EventContext): SceneEventKind | null {
    if (this.active) {
      this.active.age += dt;
      if (this.active.age >= DURATION[this.active.kind]) {
        this.active = null;
        this.countdown = CONFIG.events.gap[0] + this.span(CONFIG.events.gap);
      }
      return null;
    }
    this.countdown -= dt;
    if (this.countdown > 0) return null;
    const options = eligibleEvents(ctx).filter(
      (kind) => kind !== this.last || kind === "whale",
    );
    if (!options.length) {
      this.countdown = 8;
      return null;
    }
    const weights = options.map((kind) => {
      const value =
        (this.weights[kind] ?? 1) *
        (ctx.festival === "qixi" && kind === "shootingStar" ? 3 : 1);
      return Number.isFinite(value) ? Math.max(0, value) : 1;
    });
    const total = weights.reduce((a, b) => a + b, 0);
    if (total <= 0) {
      this.countdown = 8;
      return null;
    }
    let roll = this.random() * total;
    for (let i = 0; i < options.length; i++) {
      roll -= weights[i];
      if (roll < 0) return this.start(options[i]);
    }
    return this.start(options[options.length - 1]);
  }
  get progress() {
    return this.active
      ? Math.min(1, this.active.age / DURATION[this.active.kind])
      : 0;
  }
}
const whaleCurve = new T.CatmullRomCurve3([
  new T.Vector3(-30, 3.5, -22),
  new T.Vector3(-14, 5.5, -16),
  new T.Vector3(1, 6.2, -13.5),
  new T.Vector3(16, 5.5, -17),
  new T.Vector3(32, 4, -26),
]);
const balloonCurve = new T.CatmullRomCurve3([
  new T.Vector3(26, -2, 14),
  new T.Vector3(14, 3, 9),
  new T.Vector3(-2, 5.5, 11),
  new T.Vector3(-18, 6.5, 6),
  new T.Vector3(-30, 8, -4),
]);
const starOrigin = new T.Vector3(),
  starTangent = new T.Vector3();
const smooth = T.MathUtils.smoothstep;
/** Rises over the first `edge` of an event, holds, then falls over the last. */
export function eventEnvelope(t: number, edge: number) {
  return smooth(t, 0, edge) * (1 - smooth(t, 1 - edge, 1));
}
/**
 * Lightning brightness `age` seconds after a strike: a sharp double flicker,
 * or with reduced motion a single slow swell that never flashes.
 */
export function lightningFlash(age: number, calm: boolean) {
  if (age < 0) return 0;
  if (calm) return age < 2.4 ? Math.sin((age / 2.4) * Math.PI) * 0.35 : 0;
  const second = age > 0.18 ? Math.exp(-(age - 0.18) * 12) * 0.6 : 0;
  return Math.exp(-age * 9) + second;
}
/** Drives the visitor objects and weather uniforms for the active event. */
export function createEventDirector(
  o: Pick<
    WorldObjects,
    | "rain"
    | "rainbowBoost"
    | "whale"
    | "whaleTail"
    | "whaleSpout"
    | "balloon"
    | "shootingStar"
    | "shootingStarMat"
  >,
  U: { uRain: { value: number }; uTide: { value: number } },
  onThunder: () => void = () => {},
  random: () => number = Math.random,
) {
  let rainTarget = 0,
    rain = 0,
    boost = 0,
    starSeed = 0,
    tide = 0,
    heavy = 0,
    lanterns = 0,
    flash = 0,
    strikeIn = 2,
    strikeAge = Infinity,
    thunderIn = Infinity;
  const position = new T.Vector3(),
    tangent = new T.Vector3();
  return {
    get rain() {
      return rain;
    },
    /** How far the cloud sea has risen, 0..1. */
    get tide() {
      return tide;
    },
    /** Extra rain loudness during a thunderstorm, 0..1. */
    get heavy() {
      return heavy;
    },
    /** Sky-lantern visibility for the lantern release, 0..1. */
    get lanterns() {
      return lanterns;
    },
    /** Lightning brightness for the sky and hemisphere light, 0..1. */
    get flash() {
      return flash;
    },
    update(
      scheduler: EventScheduler,
      dt: number,
      simTime: number,
      calm = false,
    ) {
      const active = scheduler.active,
        t = scheduler.progress;
      const storm = active?.kind === "thunderstorm";
      rainTarget =
        active?.kind === "shower"
          ? Math.sin(t * Math.PI) ** 0.6
          : storm
            ? eventEnvelope(t, 0.2)
            : 0;
      rain += (rainTarget - rain) * (1 - Math.exp(-dt * 1.2));
      if (rain < 0.002) rain = 0;
      U.uRain.value = rain;
      o.rain.visible = rain > 0.01;
      heavy += ((storm ? 1 : 0) - heavy) * (1 - Math.exp(-dt * 0.8));
      if (heavy < 0.002) heavy = 0;
      // Strikes only in the heart of the storm; thunder follows a moment later.
      strikeAge += dt;
      if (storm && t > 0.15 && t < 0.85) {
        strikeIn -= dt;
        if (strikeIn <= 0) {
          strikeAge = 0;
          thunderIn = 0.8 + random() * 1.6;
          strikeIn = 5 + random() * 6;
        }
      } else if (!storm) strikeIn = 2;
      thunderIn -= dt;
      if (thunderIn <= 0) {
        thunderIn = Infinity;
        onThunder();
      }
      flash = lightningFlash(strikeAge, calm);
      const mist = active?.kind === "seaMist" ? eventEnvelope(t, 0.3) : 0;
      tide += (mist - tide) * (1 - Math.exp(-dt * 0.9));
      if (tide < 0.002) tide = 0;
      U.uTide.value = tide;
      lanterns = active?.kind === "skyLanterns" ? eventEnvelope(t, 0.12) : 0;
      // A rainbow lingers after the shower has passed, then fades.
      if (active?.kind === "shower" && t > 0.6)
        boost = Math.min(0.5, boost + dt * 0.25);
      else boost = Math.max(0, boost - dt * 0.02);
      o.rainbowBoost = boost;

      const whale = o.whale;
      whale.visible = active?.kind === "whale";
      if (whale.visible) {
        whaleCurve.getPoint(t, position);
        whaleCurve.getTangent(t, tangent);
        whale.position.copy(position);
        whale.position.y += Math.sin(simTime * 0.7) * 0.4;
        whale.rotation.set(
          0,
          Math.atan2(-tangent.z, tangent.x),
          Math.sin(simTime * 0.5) * 0.05,
        );
        whale.scale.setScalar(2.1);
        o.whaleTail.rotation.y = Math.sin(simTime * 1.4) * 0.35;
        const spouting = (simTime * 0.13) % 1 < 0.18;
        o.whaleSpout.visible = spouting;
        if (spouting)
          o.whaleSpout.scale.setScalar(0.6 + ((simTime * 0.13) % 1) * 3);
      }
      const balloon = o.balloon;
      balloon.visible = active?.kind === "balloon";
      if (balloon.visible) {
        balloonCurve.getPoint(t, position);
        balloon.position.copy(position);
        balloon.position.y += Math.sin(simTime * 0.9) * 0.25;
        balloon.rotation.y = simTime * 0.08;
        balloon.rotation.z = Math.sin(simTime * 0.6) * 0.04;
        balloon.scale.setScalar(1.15);
      }
      const star = o.shootingStar;
      if (active?.kind === "shootingStar") {
        if (!star.visible) {
          starSeed = random();
          // Streaks cross the upper third of the default framing, above the islands.
          starOrigin.set(-4 + starSeed * 18, 15 + starSeed * 4, -34);
          starTangent.set(-9 - starSeed * 3, -3.2, 0);
        }
        star.visible = true;
        star.position.copy(starOrigin).addScaledVector(starTangent, t * 2.2);
        star.rotation.z = Math.atan2(starTangent.y, starTangent.x);
        o.shootingStarMat.opacity = Math.sin(t * Math.PI) * 0.95;
      } else star.visible = false;
    },
  };
}
