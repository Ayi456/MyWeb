import { describe, expect, it } from "vitest";
import {
  dailyLine,
  eventWeights,
  localDateKey,
  solarTerm,
} from "../src/content/calendar";
import { DAILY_LINES } from "../src/content/lines";
import { recordVisit, validateVisits } from "../src/persist/visits";
import { StampBook } from "../src/scene/systems/postcards";
import { EventScheduler } from "../src/scene/systems/events";
import { CONFIG } from "../src/scene/config";

describe("post office calendar", () => {
  it("uses the official 2026–2032 term dates and is silent outside that range", () => {
    expect(solarTerm(new Date(2026, 8, 23))?.name).toBe("秋分");
    expect(solarTerm(new Date(2027, 2, 21))?.name).toBe("春分");
    expect(solarTerm(new Date(2029, 1, 3))?.name).toBe("立春");
    expect(solarTerm(new Date(2032, 8, 22))?.name).toBe("秋分");
    expect(solarTerm(new Date(2025, 8, 23))).toBeNull();
    expect(solarTerm(new Date(2026, 8, 24))).toBeNull();
  });
  it("chooses one of sixty repeatable lines per local date", () => {
    expect(DAILY_LINES).toHaveLength(60);
    expect(dailyLine(new Date(2026, 8, 24, 1))).toBe(
      dailyLine(new Date(2026, 8, 24, 23)),
    );
    expect(localDateKey(new Date(2026, 8, 24))).toBe("2026-09-24");
  });
  it("weights weekend whales and rainy-season showers", () => {
    expect(eventWeights(new Date(2026, 8, 26)).whale).toBeGreaterThan(1);
    expect(eventWeights(new Date(2026, 5, 24)).shower).toBeGreaterThan(1);
    const scheduler = new EventScheduler(() => 0.5, {
      whale: 0,
      balloon: 0,
      shower: 1,
    });
    const day = {
      night: 0,
      season: [1, 0, 0, 0] as [number, number, number, number],
      hour: 12,
    };
    expect(scheduler.update(CONFIG.events.firstDelay[1] + 1, day)).toBe(
      "shower",
    );
  });
});

describe("return visits", () => {
  it("counts page visits but unlocks regular only after three distinct dates", () => {
    const first = recordVisit(validateVisits(null), new Date(2026, 8, 24));
    const same = recordVisit(first, new Date(2026, 8, 24));
    expect(same.count).toBe(2);
    expect(same.days).toHaveLength(1);
    const second = recordVisit(same, new Date(2026, 8, 25));
    const third = recordVisit(second, new Date(2026, 8, 26));
    const stamps = new StampBook();
    stamps.visitDays(second.days.length);
    expect(stamps.earned.has("regular")).toBe(false);
    stamps.visitDays(third.days.length);
    expect(stamps.earned.has("regular")).toBe(true);
    expect(third.firstDate).toBe("2026-09-24");
  });
});
