import { describe, expect, it } from "vitest";
import { HOTSPOTS } from "../src/scene/systems/interactions";
import {
  pickLine,
  journeyLine,
  letterPrompt,
  type ScriptContext,
} from "../src/scene/systems/script";
import {
  REPLIES,
  ReplyLedger,
  pickReply,
  encodeReply,
  decodeReply,
} from "../src/scene/systems/postcards";
import { SEASONS } from "../src/scene/systems/season";

const day: ScriptContext = {
  season: "spring",
  hour: 12,
  night: 0,
  rain: 0,
  event: null,
  wind: 0,
  sentCount: 0,
  replyCount: 0,
  stamps: [],
  riding: false,
};
describe("contextual island script", () => {
  it("rotates each hotspot separately without mutating the input", () => {
    const original = {};
    const tree = pickLine("tree", day, original);
    const cat = pickLine("cat", day, tree.cursors);
    const nextTree = pickLine("tree", day, cat.cursors);
    expect(original).toEqual({});
    expect(tree.text).not.toBe(nextTree.text);
    expect(cat.text).toBe(pickLine("cat", day, {}).text);
    expect(pickLine("tree", day, nextTree.cursors).text).toBe(tree.text);
  });
  it("responds to night, rain, winter, wind and a sent letter", () => {
    expect(pickLine("writer", { ...day, night: 1 }, {}).text).toContain(
      "灯笼的光",
    );
    expect(pickLine("cat", { ...day, rain: 1 }, {}).text).toContain("长椅下");
    expect(pickLine("tree", { ...day, season: "winter" }, {}).text).toContain(
      "等开春",
    );
    expect(pickLine("windmill", { ...day, wind: 1 }, {}).text).toContain(
      "好风",
    );
    expect(
      pickLine("writer", { ...day, sentCount: 1, night: 1 }, {}).text,
    ).toContain("贴好了邮票");
  });
  it("knows events, replies, collected stamps and the ride", () => {
    expect(
      pickLine("village", { ...day, event: "skyLanterns" }, {}).text,
    ).toContain("孔明灯");
    expect(pickLine("bell", { ...day, replyCount: 1 }, {}).text).toContain(
      "回信",
    );
    expect(
      pickLine("lighthouse", { ...day, stamps: ["beacon"] }, {}).text,
    ).toContain("回信");
    expect(pickLine("airship", { ...day, riding: true }, {}).text).toContain(
      "坐稳了",
    );
  });
  it("has a seasonal response for every non-mailbox hotspot", () => {
    for (const season of SEASONS)
      for (const id of HOTSPOTS) {
        const picked = pickLine(id, { ...day, season }, {});
        if (id === "mailbox") expect(picked.text).toBe("");
        else expect(picked.text.length).toBeGreaterThan(5);
      }
  });
  it("uses seasonal journey lines without changing the flight sampler", () => {
    expect(journeyLine(32, { ...day, season: "winter" })).toContain("雪光");
    expect(journeyLine(12, { ...day, night: 1, riding: true })).toContain(
      "你正跟着飞艇。沿着灯塔的光",
    );
    expect(letterPrompt("winter", 0, 0)).toContain("温度");
    expect(letterPrompt("spring", 1, 0)).toContain("晚安");
  });
});

describe("contextual fixed replies", () => {
  it("mentions a recent whale or rain and prioritizes the festival", () => {
    expect(pickReply("autumn", { lastEvent: "whale", night: 1 })).toContain(
      "云鲸",
    );
    expect(pickReply("summer", { lastEvent: "shower" })).toContain("雨");
    expect(pickReply("winter", { night: 1 })).toContain("雪夜");
    expect(pickReply("spring", { hour: 6 })).toContain("天刚亮");
    expect(
      pickReply("autumn", { lastEvent: "whale", festival: "midAutumn" }),
    ).toContain("月饼");
  });
  it("keeps legacy reply indices stable and every new reply encodable", () => {
    expect(decodeReply({ season: "spring", index: 0, at: 1 })?.text).toBe(
      "信收到了。樱花开得正好，替你多看了一眼。",
    );
    expect(decodeReply({ season: "autumn", index: 4, at: 1 })?.text).toContain(
      "月饼",
    );
    for (const season of SEASONS)
      for (const text of REPLIES[season]) {
        const reply = { text, season, at: 1 };
        expect(decodeReply(encodeReply(reply))).toEqual(reply);
      }
  });
  it("delivers contextual replies once and restores their fixed indices", () => {
    const ledger = new ReplyLedger(() => 0);
    ledger.deliver();
    const reply = ledger.arrive("spring", 10, null, { lastEvent: "whale" })!;
    expect(reply.text).toContain("云鲸");
    expect(ledger.arrive("spring", 11)).toBeNull();
    expect(new ReplyLedger().restore([encodeReply(reply)])).toEqual([reply]);
  });
});
