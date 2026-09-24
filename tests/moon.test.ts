import { expect, it } from "vitest";
import { moonPhase } from "../src/content/moon";

it("moves through a 29.53-day moon cycle and keeps mid-autumn full", () => {
  const newMoon = new Date("2026-09-11T03:27:00Z");
  expect(moonPhase(newMoon)).toBeCloseTo(0);
  expect(
    moonPhase(new Date(newMoon.getTime() + (29.530588853 * 86_400_000) / 4)),
  ).toBeCloseTo(0.25);
  expect(
    moonPhase(new Date(newMoon.getTime() + (29.530588853 * 86_400_000) / 2)),
  ).toBeCloseTo(0.5);
  expect(
    moonPhase(new Date(newMoon.getTime() - (29.530588853 * 86_400_000) / 4)),
  ).toBeCloseTo(0.75);
  expect(moonPhase(new Date("2026-09-25T20:00:00+08:00"), true)).toBe(0.5);
  expect(moonPhase(new Date(NaN))).toBe(0.5);
});
