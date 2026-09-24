import { describe, expect, it } from "vitest";
import {
  festivalForDate,
  limitedStampForDate,
  lunarDate,
} from "../src/scene/systems/festival";
import {
  ReplyLedger,
  encodeReply,
  decodeReply,
} from "../src/scene/systems/postcards";

describe("festival calendar", () => {
  it("recognizes the three lunar dates and skips ordinary days", () => {
    expect(festivalForDate(new Date(2026, 8, 25))).toBe("midAutumn");
    expect(festivalForDate(new Date(2026, 2, 3))).toBe("lantern");
    expect(festivalForDate(new Date(2026, 7, 19))).toBe("qixi");
    expect(festivalForDate(new Date(2026, 8, 24))).toBeNull();
    expect(lunarDate(new Date(2026, 8, 25))).toEqual({ month: 8, day: 15 });
  });
  it("limits stamps to their civil dates", () => {
    expect(limitedStampForDate(new Date(2026, 2, 20))).toBe("hanami");
    expect(limitedStampForDate(new Date(2026, 5, 21))).toBe("longday");
    expect(limitedStampForDate(new Date(2026, 7, 19))).toBe("bridge");
    expect(limitedStampForDate(new Date(2026, 8, 25))).toBe("moon");
    expect(limitedStampForDate(new Date(2026, 11, 22))).toBe("warmth");
    expect(limitedStampForDate(new Date(2027, 0, 1))).toBe("newyear");
    expect(limitedStampForDate(new Date(2026, 8, 24))).toBeNull();
  });
  it("keeps a festival reply in the fixed reply pool for local storage", () => {
    const ledger = new ReplyLedger(() => 0);
    ledger.deliver();
    const reply = ledger.arrive("autumn", 10, "midAutumn");
    expect(reply?.text).toContain("月饼香");
    expect(decodeReply(encodeReply(reply!)!)).toEqual(reply);
  });
});
