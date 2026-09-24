import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { precacheEntries, serviceWorkerSource } from "../server/vite-pwa.ts";

describe("offline shell", () => {
  it("precaches the built shell but not maps, the share image or itself", () => {
    expect(
      precacheEntries([
        "index.html",
        "assets/index-abc.js",
        "assets/index-abc.js.map",
        "assets/three-def.js",
        "og.jpg",
        "sw.js",
        ".vite/manifest.json",
        "manifest.webmanifest",
        "icon-192.png",
      ]),
    ).toEqual([
      "/",
      "/assets/index-abc.js",
      "/assets/three-def.js",
      "/icon-192.png",
      "/manifest.webmanifest",
    ]);
  });

  it("injects the version and list ahead of the worker body", async () => {
    const template = await readFile("src/pwa/sw.js", "utf8");
    const source = serviceWorkerSource(template, ["/"], "abc123");
    expect(source.startsWith('const VERSION = "abc123";')).toBe(true);
    expect(source).toContain('const PRECACHE = ["/"];');
  });

  it("never intercepts the radio API or Vercel analytics", async () => {
    const template = await readFile("src/pwa/sw.js", "utf8");
    expect(template).toContain('url.pathname.startsWith("/api/")');
    expect(template).toContain('url.pathname.startsWith("/_vercel/")');
  });
});
