import { describe, expect, it } from "vitest";
import { validateCollection } from "../src/persist/storage";
import { ReplyLedger, StampBook } from "../src/scene/systems/postcards";

describe("local collection", () => {
  it("restores known stamps without awarding them again", () => {
    const stamps = new StampBook();
    let earned = 0;
    stamps.onEarn(() => earned++);
    expect(stamps.from(["sakura", "sakura", "unknown", 3])).toEqual(["sakura"]);
    expect(earned).toBe(0);
    expect(stamps.award("sakura")).toBe(false);
    stamps.clear();
    expect(stamps.toJSON()).toEqual([]);
  });
  it("loads only fixed reply lines, valid ids and bounded counts", () => {
    const parsed = validateCollection({
      stamps: ["beacon", "bogus"],
      replies: [
        { season: "spring", index: 0, at: 100 },
        { season: "spring", index: 99, at: 200 },
        { season: "bad", index: 0, at: 300 },
        { text: "private letter", season: "spring", index: 0, at: -1 },
      ],
      totalSent: 7,
    });
    expect(parsed).toEqual({
      stamps: ["beacon"],
      replies: [{ season: "spring", index: 0, at: 100 }],
      totalSent: 7,
    });
    const ledger = new ReplyLedger();
    expect(ledger.restore(parsed.replies)[0].text).toContain("樱花");
    expect(validateCollection({ totalSent: Infinity }).totalSent).toBe(0);
  });
});
