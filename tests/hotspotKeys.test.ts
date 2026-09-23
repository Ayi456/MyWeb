import { describe, expect, it } from "vitest";
import { KEY_HOTSPOTS, hotspotForKey } from "../src/components/hotspotKeys";
import { HOTSPOTS } from "../src/scene/systems/interactions";

describe("hotspot keys", () => {
  it("covers every hotspot except the mailbox", () => {
    expect(KEY_HOTSPOTS.map((h) => h.id).sort()).toEqual(
      HOTSPOTS.filter((id) => id !== "mailbox").sort(),
    );
  });

  it("maps 1-9 then 0 to the first ten", () => {
    expect(hotspotForKey("Digit1")).toBe("tree");
    expect(hotspotForKey("Digit0")).toBe(KEY_HOTSPOTS[9].id);
    expect(hotspotForKey("KeyA")).toBeNull();
  });
});
