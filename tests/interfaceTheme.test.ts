import { describe, expect, it } from "vitest";
import { isNightInterface } from "../src/content/interfaceTheme";

describe("interface sky contrast", () => {
  it("keeps dark text during the bright dusk and morning sky", () => {
    for (const hour of [5.5, 6.5, 12, 16.33, 18, 18.9, 19.49])
      expect(isNightInterface(hour), `hour ${hour}`).toBe(false);
  });
  it("uses light text after dusk, through midnight, and before dawn", () => {
    for (const hour of [19.5, 22, 23.99, 0, 5.49, 24, -1])
      expect(isNightInterface(hour), `hour ${hour}`).toBe(true);
  });
});
