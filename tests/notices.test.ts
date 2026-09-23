import { describe, expect, it } from "vitest";
import { pruneNotices, pushNotice } from "../src/components/noticeQueue";

describe("notice queue", () => {
  it("keeps a reply and the stamp it grants side by side", () => {
    let list = pushNotice(
      [],
      { kind: "keep", tone: "reply", text: "reply" },
      0,
    );
    list = pushNotice(list, { kind: "keep", tone: "stamp", text: "stamp" }, 0);
    expect(list.map((n) => n.text)).toEqual(["reply", "stamp"]);
  });

  it("lets taps replace taps but not other notices", () => {
    let list = pushNotice([], { kind: "event", text: "whale" }, 0);
    list = pushNotice(list, { kind: "tap", text: "a" }, 0);
    list = pushNotice(list, { kind: "tap", text: "b" }, 0);
    expect(list.map((n) => n.text)).toEqual(["whale", "b"]);
  });

  it("shows at most two and expires by kind", () => {
    let list = pushNotice([], { kind: "tap", text: "a" }, 0);
    list = pushNotice(list, { kind: "event", text: "b" }, 0);
    list = pushNotice(list, { kind: "keep", text: "c" }, 0);
    expect(list.map((n) => n.text)).toEqual(["b", "c"]);
    expect(pruneNotices(list, 6000).map((n) => n.text)).toEqual(["c"]);
    expect(pruneNotices(list, 9000)).toEqual([]);
  });
});
