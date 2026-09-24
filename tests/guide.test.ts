import { describe, expect, it } from "vitest";
import { nextGuideStep } from "../src/components/guideState";

describe("first-visit guide", () => {
  it("requires a real orbit after tapping the tree and a new letter on replay", () => {
    const initial = {
      treeTapped: false,
      orbited: false,
      sentCount: 2,
      sentBaseline: 2,
    };
    expect(nextGuideStep("tree", initial)).toBe("tree");
    const treeTapped = { ...initial, treeTapped: true };
    expect(nextGuideStep("tree", treeTapped)).toBe("drag");
    expect(nextGuideStep("drag", treeTapped)).toBe("drag");
    expect(nextGuideStep("drag", { ...treeTapped, orbited: true })).toBe(
      "send",
    );
    expect(nextGuideStep("send", { ...treeTapped, orbited: true })).toBe(
      "send",
    );
    expect(nextGuideStep("send", { ...treeTapped, sentCount: 3 })).toBeNull();
  });
});
