import { describe, expect, it } from "vitest";
import {
  MAX_SKIP_FAILURES,
  nextPlayable,
  skipDelay,
} from "../src/music/skipPolicy";

describe("radio skip policy", () => {
  it("backs off exponentially and stops after the limit", () => {
    expect(skipDelay(1)).toBe(1500);
    expect(skipDelay(2)).toBe(3000);
    expect(skipDelay(4)).toBe(12000);
    expect(skipDelay(MAX_SKIP_FAILURES)).toBeNull();
  });

  it("waits at least as long as Retry-After", () => {
    expect(skipDelay(1, 40)).toBe(40000);
  });

  it("steps over failed tracks in both directions", () => {
    const failed = new Set([1, 2]);
    expect(nextPlayable(0, 1, 5, (i) => failed.has(i))).toBe(3);
    expect(nextPlayable(3, -1, 5, (i) => failed.has(i))).toBe(0);
  });

  it("falls back to the neighbour when everything failed", () => {
    expect(nextPlayable(4, 1, 5, () => true)).toBe(0);
  });
});
