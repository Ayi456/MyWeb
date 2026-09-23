import { describe, expect, it } from "vitest";
import { normalizeOrigin, siteMeta } from "../server/vite-meta.ts";

describe("site meta", () => {
  const run = (origin?: string) => {
    const hook = siteMeta(origin).transformIndexHtml as () => unknown[];
    return hook();
  };

  it("emits nothing without a known origin", () => {
    expect(run(undefined)).toEqual([]);
    expect(normalizeOrigin("not a url")).toBe("");
  });

  it("adds canonical and og:image for the production host", () => {
    expect(normalizeOrigin("postoffice.example.com")).toBe(
      "https://postoffice.example.com",
    );
    expect(JSON.stringify(run("postoffice.example.com"))).toContain(
      "https://postoffice.example.com/og.jpg",
    );
  });
});
