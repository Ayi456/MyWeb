import * as T from "three";
import { CONFIG } from "../config";
import type { WorldObjects } from "../objects/createWorld";
import type { SeasonWeights } from "./season";

export const EVENT_KINDS = [
  "shower",
  "shootingStar",
  "whale",
  "balloon",
] as const;
export type SceneEventKind = (typeof EVENT_KINDS)[number];

export interface EventContext {
  night: number;
  season: SeasonWeights;
  hour: number;
}
export const EVENT_NOTICES: Record<SceneEventKind, string> = {
  shower: "一阵太阳雨路过，雨后说不定有彩虹。",
  shootingStar: "有流星划过，快许个愿。",
  whale: "云鲸从远方游来了，慢慢地，慢慢地。",
  balloon: "一只热气球飘过群岛，上面有人在挥手。",
};
const DURATION: Record<SceneEventKind, number> = {
  shower: 26,
  shootingStar: 3.2,
  whale: 48,
  balloon: 44,
};
/** Which events fit the moment. Snow already falls in winter, so no rain then. */
export function eligibleEvents(ctx: EventContext): SceneEventKind[] {
  const out: SceneEventKind[] = ["whale"];
  if (ctx.night > 0.6) out.push("shootingStar");
  if (ctx.night < 0.4) out.push("balloon");
  if (ctx.night < 0.6 && ctx.season[3] < 0.5) out.push("shower");
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
  constructor(private random: () => number = Math.random) {
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
    return this.start(
      options[Math.floor(this.random() * options.length) % options.length],
    );
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
/** Drives the visitor objects and weather uniforms for the active event. */
export function createEventDirector(
  o: WorldObjects,
  U: { uRain: { value: number } },
) {
  let rainTarget = 0,
    rain = 0,
    boost = 0,
    starSeed = 0;
  const position = new T.Vector3(),
    tangent = new T.Vector3();
  return {
    get rain() {
      return rain;
    },
    update(scheduler: EventScheduler, dt: number, simTime: number) {
      const active = scheduler.active,
        t = scheduler.progress;
      rainTarget = active?.kind === "shower" ? Math.sin(t * Math.PI) ** 0.6 : 0;
      rain += (rainTarget - rain) * (1 - Math.exp(-dt * 1.2));
      if (rain < 0.002) rain = 0;
      U.uRain.value = rain;
      o.rain.visible = rain > 0.01;
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
          starSeed = Math.random();
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
