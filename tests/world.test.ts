import { describe, expect, it } from "vitest";
import { SeasonClock, seasonWeights } from "../src/scene/systems/season";
import {
  EventScheduler,
  eligibleEvents,
  eventEnvelope,
  lightningFlash,
} from "../src/scene/systems/events";
import { ReplyLedger, StampBook } from "../src/scene/systems/postcards";
import { Impulse } from "../src/scene/systems/interactions";
import { CONFIG } from "../src/scene/config";
import { sampleFlight } from "../src/scene/systems/airshipFlight";
import { TEA_ISLAND, VILLAGE_ISLAND } from "../src/scene/worldLayout";
import { WindSystem } from "../src/scene/systems/wind";
import { soundCues } from "../src/scene/systems/soundCues";

describe("wind across the islands", () => {
  it("moves cloud, bird and windmill phases together and freezes while paused", () => {
    const wind = new WindSystem();
    wind.active = true;
    wind.update(2);
    expect(wind.cloudTravel).toBeGreaterThan(0);
    expect(wind.birdLag).toBeGreaterThan(0);
    expect(wind.millTurn).toBeGreaterThan(0);
    const phases = [wind.cloudTravel, wind.birdLag, wind.millTurn];
    wind.update(0);
    expect([wind.cloudTravel, wind.birdLag, wind.millTurn]).toEqual(phases);
    const next = new WindSystem();
    next.active = true;
    next.update(2, 0.35);
    expect(next.cloudTravel).toBeCloseTo(phases[0] * 0.35);
    expect(next.birdLag).toBeCloseTo(phases[1] * 0.35);
    expect(next.millTurn).toBeCloseTo(phases[2] * 0.35);
  });
});

describe("sound captions", () => {
  const spring = [1, 0, 0, 0] as const;
  it("detects weather and night sounds from world state without audio", () => {
    const quiet = { rain: 0, night: 0, season: spring };
    const rainy = { ...quiet, rain: 0.5 };
    expect(soundCues(quiet, rainy)).toContain("雨声渐起");
    expect(soundCues(rainy, rainy)).toEqual([]);
    expect(soundCues(quiet, { ...quiet, night: 1 })).toContain(
      "夜里的虫鸣开始了",
    );
    expect(soundCues(quiet, { ...quiet, season: [0, 0, 0, 1] })).toContain(
      "冬日的风声更轻了",
    );
  });
});

describe("seasons", () => {
  it("weights always sum to one and hold steady mid-season", () => {
    for (let y = 0; y < 4; y += 0.05) {
      const w = seasonWeights(y);
      expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 6);
    }
    expect(seasonWeights(0.5)).toEqual([1, 0, 0, 0]);
    expect(seasonWeights(1.3)).toEqual([0, 1, 0, 0]);
  });
  it("blends smoothly into the next season and wraps winter to spring", () => {
    const late = seasonWeights(0.95);
    expect(late[0]).toBeGreaterThan(0);
    expect(late[1]).toBeGreaterThan(0);
    expect(late[0] + late[1]).toBeCloseTo(1, 6);
    const wrap = seasonWeights(3.97);
    expect(wrap[3]).toBeGreaterThan(0);
    expect(wrap[0]).toBeGreaterThan(wrap[3]);
  });
  it("advances with the simulation clock and pauses with it", () => {
    const c = new SeasonClock();
    const start = c.year;
    c.advance(0);
    expect(c.year).toBe(start);
    c.advance(CONFIG.secondsPerSeason);
    expect(c.index).toBe((Math.floor(start) + 1) % 4);
    c.advance(CONFIG.secondsPerSeason * 4);
    expect(c.year).toBeCloseTo(start + 1, 6);
  });
  it("jumps to a chosen season with a settled palette", () => {
    const c = new SeasonClock();
    c.set(2);
    expect(c.name).toBe("autumn");
    expect(c.weights).toEqual([0, 0, 1, 0]);
    c.set(-1);
    expect(c.name).toBe("winter");
    c.set(Number.NaN);
    expect(c.name).toBe("winter");
  });
});

describe("surprise events", () => {
  const day = {
    night: 0,
    season: [1, 0, 0, 0] as [number, number, number, number],
    hour: 12,
  };
  const night = { ...day, night: 1, hour: 23 };
  const winter = {
    ...day,
    season: [0, 0, 0, 1] as [number, number, number, number],
  };
  it("offers weather and visitors that fit the moment", () => {
    expect(eligibleEvents(day)).toEqual(["whale", "balloon", "shower"]);
    expect(eligibleEvents(night)).toEqual([
      "whale",
      "shootingStar",
      "skyLanterns",
    ]);
    expect(eligibleEvents(winter)).not.toContain("shower");
  });
  it("keeps the three newer events to their own hours and seasons", () => {
    expect(eligibleEvents({ ...day, hour: 6 })).toContain("seaMist");
    expect(eligibleEvents({ ...day, hour: 9 })).not.toContain("seaMist");
    const summerNight = {
      ...night,
      season: [0, 1, 0, 0] as [number, number, number, number],
    };
    expect(eligibleEvents(summerNight)).toContain("thunderstorm");
    expect(eligibleEvents(night)).not.toContain("thunderstorm");
    expect(eligibleEvents({ ...summerNight, night: 0 })).not.toContain(
      "thunderstorm",
    );
    // Mid-autumn already has its own lanterns in the sky.
    expect(eligibleEvents({ ...night, festival: "midAutumn" })).not.toContain(
      "skyLanterns",
    );
  });
  it("rises, holds and settles back for mist and lantern envelopes", () => {
    expect(eventEnvelope(0, 0.3)).toBe(0);
    expect(eventEnvelope(0.5, 0.3)).toBe(1);
    expect(eventEnvelope(1, 0.3)).toBe(0);
    expect(eventEnvelope(0.15, 0.3)).toBeGreaterThan(0);
    expect(eventEnvelope(0.15, 0.3)).toBeLessThan(1);
  });
  it("flickers lightning but swells gently with reduced motion", () => {
    expect(lightningFlash(-1, false)).toBe(0);
    expect(lightningFlash(0, false)).toBe(1);
    // A second, smaller flicker after the first has faded.
    expect(lightningFlash(0.19, false)).toBeGreaterThan(
      lightningFlash(0.17, false),
    );
    expect(lightningFlash(2, false)).toBeLessThan(0.01);
    const calm = Array.from({ length: 49 }, (_, i) =>
      lightningFlash(i * 0.05, true),
    );
    expect(calm[0]).toBe(0);
    expect(Math.max(...calm)).toBeLessThanOrEqual(0.35);
    // One rise and one fall: no flicker.
    const peak = calm.indexOf(Math.max(...calm));
    for (let i = 1; i < calm.length; i++)
      if (i <= peak) expect(calm[i]).toBeGreaterThanOrEqual(calm[i - 1]);
      else expect(calm[i]).toBeLessThanOrEqual(calm[i - 1]);
    expect(lightningFlash(2.5, true)).toBe(0);
  });
  it("waits, runs one event at a time, then rests before the next", () => {
    const s = new EventScheduler(() => 0);
    expect(s.active).toBeNull();
    const first = CONFIG.events.firstDelay[0];
    expect(s.update(first - 0.01, day)).toBeNull();
    const kind = s.update(0.02, day);
    expect(kind).toBe("whale");
    expect(s.active?.kind).toBe("whale");
    expect(s.update(1, day)).toBeNull();
    expect(s.progress).toBeGreaterThan(0);
    s.update(100, day);
    expect(s.active).toBeNull();
    expect(s.countdown).toBeCloseTo(CONFIG.events.gap[0], 6);
  });
  it("does not repeat the same non-whale event twice in a row", () => {
    const s = new EventScheduler(() => 0.999);
    s.start("shower");
    s.update(100, day);
    s.update(1000, day);
    expect(s.active?.kind).not.toBe("shower");
  });
  it("is frozen by a paused clock", () => {
    const s = new EventScheduler(() => 0);
    const before = s.countdown;
    s.update(0, day);
    expect(s.countdown).toBe(before);
  });
});

describe("replies and stamps", () => {
  it("answers each delivered letter once the ship is home", () => {
    const ledger = new ReplyLedger(() => 0);
    expect(ledger.arrive("spring", 0)).toBeNull();
    ledger.deliver();
    ledger.deliver();
    const first = ledger.arrive("autumn", 10);
    expect(first?.season).toBe("autumn");
    expect(first?.text.length).toBeGreaterThan(0);
    expect(ledger.owed).toBe(1);
    expect(ledger.arrive("autumn", 11)?.text).not.toBe(first?.text);
    expect(ledger.arrive("autumn", 12)).toBeNull();
    expect(ledger.received).toHaveLength(2);
  });
  it("awards each stamp once and tracks touches and seasons", () => {
    const book = new StampBook();
    const earned: string[] = [];
    book.onEarn((id) => earned.push(id));
    expect(book.award("sakura")).toBe(true);
    expect(book.award("sakura")).toBe(false);
    for (const id of [
      "tree",
      "lantern",
      "cat",
      "bell",
      "pool",
      "windmill",
      "airship",
    ])
      book.touch(id);
    expect(book.earned.has("touch")).toBe(false);
    book.touch("lighthouse");
    expect(book.earned.has("touch")).toBe(true);
    for (const s of ["spring", "summer", "autumn"] as const) book.season(s);
    expect(book.earned.has("seasons")).toBe(false);
    book.season("winter");
    expect(earned).toEqual(["sakura", "touch", "seasons"]);
  });
});

describe("tap impulses", () => {
  it("accumulate, cap, and decay back to rest", () => {
    const i = new Impulse();
    i.hit();
    i.hit();
    expect(i.value).toBeLessThanOrEqual(1.6);
    const before = i.value;
    expect(i.decay(0.5, 2)).toBeLessThan(before);
    i.decay(60, 2);
    expect(i.value).toBe(0);
  });
});

describe("far islands", () => {
  it("stay clear of the whole postal loop", () => {
    for (let t = 0; t < CONFIG.flightDuration; t += 0.05) {
      const p = sampleFlight(t).position;
      for (const island of [TEA_ISLAND, VILLAGE_ISLAND]) {
        const dx = (p.x - island.center[0]) / (island.radius[0] + 2.5),
          dz = (p.z - island.center[2]) / (island.radius[1] + 2.5);
        expect(dx * dx + dz * dz).toBeGreaterThan(1);
      }
    }
  });
});
