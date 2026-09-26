import { afterEach, describe, expect, it, vi } from "vitest";
import {
  emptyTreasure,
  findTreasure,
  treasureRoute,
  treasureWeek,
  validateTreasure,
} from "../src/content/treasure";
import { loadTreasure, saveTreasure } from "../src/persist/treasure";
import { StampBook } from "../src/scene/systems/postcards";

const monday = new Date(2026, 8, 21, 10);
afterEach(() => vi.unstubAllGlobals());

describe("weekly island treasure", () => {
  it("uses local Mondays, including Sunday night and year boundaries", () => {
    expect(treasureWeek(new Date(2026, 8, 27, 23, 59))).toBe("2026-09-21");
    expect(treasureWeek(new Date(2026, 8, 28))).toBe("2026-09-28");
    expect(treasureWeek(new Date(2027, 0, 1))).toBe("2026-12-28");
    expect(treasureWeek(new Date(2026, 2, 8, 23))).toBe("2026-03-02");
    expect(treasureWeek(new Date(2026, 2, 9))).toBe("2026-03-09");
  });
  it("keeps a route stable within a week and visits every permutation in 24 weeks", () => {
    expect(treasureRoute(monday).map((s) => s.id)).toEqual([
      "lighthouse",
      "windmill",
      "village",
      "teahouse",
    ]);
    expect(treasureRoute(new Date(2026, 8, 27, 23))).toEqual(
      treasureRoute(monday),
    );
    const routes = new Set<string>();
    for (let week = 0; week < 24; week++) {
      const route = treasureRoute(new Date(2026, 8, 21 + week * 7));
      expect(new Set(route.map((s) => s.id)).size).toBe(4);
      routes.add(route.map((s) => s.id).join(","));
    }
    expect(routes.size).toBe(24);
  });
  it("requires starting and finding clues in order, ignoring wrong and repeated taps", () => {
    let state = emptyTreasure(monday);
    expect(findTreasure(state, "lighthouse", monday).found).toBe(0);
    state = { ...state, started: true };
    expect(findTreasure(state, "tree", monday)).toEqual(state);
    expect(findTreasure(state, "windmill", monday)).toEqual(state);
    state = findTreasure(state, "lighthouse", monday);
    expect(state.found).toBe(1);
    expect(findTreasure(state, "lighthouse", monday)).toEqual(state);
    for (const id of ["windmill", "village", "teahouse"] as const)
      state = findTreasure(state, id, monday);
    expect(state.found).toBe(4);
    expect(findTreasure(state, "teahouse", monday)).toEqual(state);
  });
  it("starts a fresh week even if an old page taps a matching landmark", () => {
    const nextMonday = new Date(2026, 8, 28);
    expect(
      findTreasure(
        { week: "2026-09-21", started: true, found: 3 },
        "lighthouse",
        nextMonday,
      ),
    ).toEqual(emptyTreasure(nextMonday));
    expect(
      validateTreasure(
        { week: "2026-09-21", started: true, found: 4 },
        nextMonday,
      ),
    ).toEqual(emptyTreasure(nextMonday));
  });
  it.each([
    null,
    [],
    { started: true, found: 1 },
    { week: "2026-09-21", started: "true", found: 1 },
    { week: "2026-09-21", started: false, found: 1 },
    { week: "2026-09-21", started: true, found: -1 },
    { week: "2026-09-21", started: true, found: 5 },
    { week: "2026-09-21", started: true, found: 1.5 },
    { week: "2026-09-21", started: true, found: "1" },
  ])("discards invalid progress: %j", (value) => {
    expect(validateTreasure(value, monday)).toEqual(emptyTreasure(monday));
  });
  it("round-trips only a week, a boolean and a count, dropping arbitrary text", () => {
    const data = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => data.set(key, value),
    });
    const progress = { week: "2026-09-21", started: true, found: 2 };
    saveTreasure(
      { ...progress, letter: "private letter" } as typeof progress,
      monday,
    );
    expect(loadTreasure(monday)).toEqual(progress);
    expect([...data.values()].join()).not.toContain("private letter");
    data.set("spring-post-office:v1:treasure", "{broken");
    expect(loadTreasure(monday)).toEqual(emptyTreasure(monday));
  });
  it("remains usable when storage throws on read or write", () => {
    vi.stubGlobal("localStorage", {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("full");
      },
    });
    expect(loadTreasure(monday)).toEqual(emptyTreasure(monday));
    expect(() =>
      saveTreasure(
        { ...emptyTreasure(monday), started: true, found: 1 },
        monday,
      ),
    ).not.toThrow();
  });
  it("restores the reward silently and awards it at most once across weekly hunts", () => {
    const stamps = new StampBook();
    const earned = vi.fn();
    stamps.onEarn(earned);
    stamps.from(["treasure"]);
    expect(earned).not.toHaveBeenCalled();
    expect(stamps.award("treasure")).toBe(false);
    stamps.clear();
    expect(stamps.award("treasure")).toBe(true);
    expect(stamps.award("treasure")).toBe(false);
    expect(earned).toHaveBeenCalledTimes(1);
  });
});
