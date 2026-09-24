import { defineConfig } from "@playwright/test";

// Visual regression for the main island (README promise 4). Uses the dev
// server because the browser harness in tests/ is not part of the build.
// Baselines are per-platform; generate them with `npm run test:visual -- -u`.
export default defineConfig({
  testDir: "tests/visual",
  testMatch: "**/*.visual.ts",
  workers: 2,
  timeout: 60_000,
  expect: {
    timeout: 30_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, threshold: 0.15 },
  },
  use: {
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    launchOptions: {
      args: ["--use-angle=d3d11", "--ignore-gpu-blocklist"],
    },
  },
  webServer: [
    {
      command: "npm run dev",
      url: "http://127.0.0.1:5173/tests/browser.html",
      reuseExistingServer: true,
      timeout: 60_000,
    },
    {
      // The service worker only registers in production builds. A dedicated
      // port and a fresh build keep a stale `npm run preview` from being reused.
      command:
        "npx vite build && npx vite preview --host 127.0.0.1 --port 4174",
      url: "http://127.0.0.1:4174/",
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
});
