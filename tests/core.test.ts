import { describe, expect, it } from "vitest";
import { SimulationClock, wrapHour } from "../src/scene/core/simulationClock";
import { seededRandom } from "../src/scene/utils/seededRandom";
import { WindSystem } from "../src/scene/systems/wind";
import {
  AirshipFlight,
  sampleFlight,
  dockPoint,
  lighthouseDockPoint,
} from "../src/scene/systems/airshipFlight";
import { DeliveryProgress } from "../src/scene/systems/letterDelivery";
import { QualityController } from "../src/scene/systems/quality";
import { CONFIG } from "../src/scene/config";
import {
  FLIGHT_STOPS,
  GARDEN_ISLAND,
  LIGHTHOUSE_ISLAND,
  MAIN_ISLAND,
} from "../src/scene/worldLayout";

describe("the shared simulation clock", () => {
  it.each([1, 4, 12] as const)("advances every system at ×%i", (speed) => {
    const c = new SimulationClock();
    c.speed = speed;
    expect(c.advance(2)).toBe(2 * speed);
    expect(c.time).toBe(2 * speed);
  });
  it("freezes simulation and resumes without catching up wall time", () => {
    const c = new SimulationClock();
    c.advance(1);
    c.speed = 0;
    const hour = c.hour;
    expect(c.advance(300)).toBe(0);
    expect(c.time).toBe(1);
    expect(c.hour).toBe(hour);
    c.speed = 1;
    c.advance(0.02);
    expect(c.time).toBeCloseTo(1.02);
  });
  it("wraps midnight, 24:00 and negative slider input", () => {
    const c = new SimulationClock();
    c.setHour(23.99);
    c.advance(2);
    expect(c.hour).toBeCloseTo(0.024);
    c.setHour(24);
    expect(c.hour).toBe(0);
    expect(wrapHour(-1)).toBe(23);
  });
  it("scrubs daylight while keeping paused flight and particles frozen", () => {
    const c = new SimulationClock();
    c.speed = 0;
    c.setHour(5);
    expect(c.advance(4)).toBe(0);
    expect(c.hour).toBe(5);
    expect(c.time).toBe(0);
  });
  it("sources local hour while moving, then freezes sourced hour on pause", () => {
    const c = new SimulationClock();
    let hour = 21.5;
    c.hourSource = () => hour;
    c.advance(1);
    expect(c.hour).toBe(21.5);
    expect(c.time).toBe(1);
    c.speed = 0;
    hour = 22.5;
    c.advance(60);
    expect(c.hour).toBe(21.5);
    expect(c.time).toBe(1);
    c.speed = 1;
    c.advance(1);
    expect(c.hour).toBe(22.5);
  });
});
it("reproduces the reference LCG exactly", () => {
  const a = seededRandom(CONFIG.seed),
    b = seededRandom(CONFIG.seed);
  expect(Array.from({ length: 100 }, a)).toEqual(
    Array.from({ length: 100 }, b),
  );
  expect(seededRandom(1)()).not.toBe(seededRandom(2)());
  expect(seededRandom(314159)()).toBe(0.9891509269364178);
});
describe("wind", () => {
  it("rises and settles smoothly without overshooting", () => {
    const w = new WindSystem();
    w.active = true;
    w.update(0.1);
    expect(w.value).toBeGreaterThan(0);
    expect(w.value).toBeLessThan(0.2);
    for (let i = 0; i < 60; i++) w.update(0.1);
    expect(w.value).toBeGreaterThan(0.99);
    w.active = false;
    const before = w.value;
    w.update(0.1);
    expect(w.value).toBeLessThan(before);
    expect(w.value).toBeGreaterThan(0.8);
    for (let i = 0; i < 160; i++) w.update(0.1);
    expect(w.value).toBeLessThan(0.00001);
  });
  it("stops easing during pause", () => {
    const w = new WindSystem();
    w.active = true;
    w.update(1);
    const before = w.value;
    w.active = false;
    w.update(0);
    expect(w.value).toBe(before);
  });
});
describe("airship route", () => {
  it.each([
    ...Object.values(FLIGHT_STOPS),
    CONFIG.flightDuration,
    CONFIG.flightDuration * 2,
  ])("is position-continuous at %i seconds", (t) => {
    const a = sampleFlight(t - 1e-5),
      b = sampleFlight(t + 1e-5);
    expect(a.position.distanceTo(b.position)).toBeLessThan(0.0001);
  });
  it("closes every loop at the dock", () => {
    expect(sampleFlight(76).position.distanceTo(dockPoint)).toBe(0);
    expect(sampleFlight(152).position.distanceTo(dockPoint)).toBe(0);
  });
  it("stays outside the island and tree during cruise", () => {
    for (let t = 11; t < 76; t += 0.05) {
      const p = sampleFlight(t).position;
      expect(
        (p.x / (MAIN_ISLAND.radius[0] + 0.55)) ** 2 +
          (p.z / (MAIN_ISLAND.radius[1] + 0.6)) ** 2,
      ).toBeGreaterThan(1);
    }
  });
  it("stops at the lighthouse landing before returning to the main dock", () => {
    for (
      let t = FLIGHT_STOPS.lighthouseArrival;
      t < FLIGHT_STOPS.lighthouseDeparture;
      t += 0.25
    ) {
      const state = sampleFlight(t);
      expect(state.position.distanceTo(lighthouseDockPoint)).toBe(0);
      expect(state.journey).toContain("灯塔小站");
    }
    expect(
      sampleFlight(FLIGHT_STOPS.lighthouseDeparture + 1).position.distanceTo(
        lighthouseDockPoint,
      ),
    ).toBeGreaterThan(0);
    expect(
      sampleFlight(CONFIG.flightDuration).position.distanceTo(dockPoint),
    ).toBe(0);
  });
  it.each([
    FLIGHT_STOPS.departure,
    FLIGHT_STOPS.lighthouseArrival,
    FLIGHT_STOPS.lighthouseDeparture,
    CONFIG.flightDuration,
  ])("eases to zero speed at the stop boundary %i", (time) => {
    const before = sampleFlight(time - 0.001).position;
    const after = sampleFlight(time + 0.001).position;
    expect(before.distanceTo(after) / 0.002).toBeLessThan(0.01);
  });
  it("keeps the balloon clear of the windmill and lighthouse throughout the loop", () => {
    const landmarks = [
      [GARDEN_ISLAND.center[0] - 0.68, GARDEN_ISLAND.center[2] - 0.48, 3.1],
      [
        LIGHTHOUSE_ISLAND.center[0] - 0.25,
        LIGHTHOUSE_ISLAND.center[2] - 0.18,
        2.7,
      ],
    ];
    for (let t = 0; t < CONFIG.flightDuration; t += 0.025) {
      const p = sampleFlight(t).position;
      for (const [x, z, clearance] of landmarks) {
        expect(Math.hypot(p.x - x, p.z - z)).toBeGreaterThan(clearance);
      }
    }
  });
  it("a letter triggers departure at the main dock without skipping the remote stop", () => {
    const flight = new AirshipFlight();
    flight.time = 2;
    flight.depart();
    expect(flight.time).toBe(CONFIG.dockDuration);
    flight.time = FLIGHT_STOPS.lighthouseArrival + 2;
    flight.depart();
    expect(flight.time).toBe(FLIGHT_STOPS.lighthouseArrival + 2);
  });
});
describe("letter delivery", () => {
  it("progresses from departure to arrival with the simulation clock", () => {
    const letter = new DeliveryProgress(),
      c = new SimulationClock();
    expect(letter.progress).toBe(0);
    letter.advance(c.advance(1));
    expect(letter.progress).toBe(0.25);
    c.speed = 0;
    letter.advance(c.advance(99));
    expect(letter.progress).toBe(0.25);
    c.speed = 4;
    letter.advance(c.advance(0.75));
    expect(letter.delivered).toBe(true);
    expect(letter.progress).toBe(1);
  });
});
describe("automatic quality", () => {
  it("requires warmup and sustained slow samples, with no oscillation", () => {
    const q = new QualityController(false);
    for (let i = 0; i < 11; i++) q.sample(20, 1);
    expect(q.level).toBe("high");
    q.sample(20, 1);
    expect(q.level).toBe("medium");
    for (let i = 0; i < 50; i++) q.sample(60, 1);
    expect(q.level).toBe("medium");
  });
  it("respects manual quality even on slow devices", () => {
    const q = new QualityController(true);
    q.select("high");
    for (let i = 0; i < 40; i++) q.sample(10, 1);
    expect(q.level).toBe("high");
  });
});
