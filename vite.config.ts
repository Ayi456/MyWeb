import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { musicApi } from "./server/vite-music.ts";
import { siteMeta } from "./server/vite-meta.ts";
import { offlineShell } from "./server/vite-pwa.ts";

export default defineConfig(({ mode }) => ({
  cacheDir:
    process.env.SCENE_TEST_SERVER === "1"
      ? "node_modules/.vite-scene-tests"
      : "node_modules/.vite",
  plugins: [
    react(),
    musicApi(loadEnv(mode, process.cwd(), "MUSIC_").MUSIC_PLAYLIST_ID),
    siteMeta(process.env.SITE_URL ?? process.env.VERCEL_PROJECT_PRODUCTION_URL),
    offlineShell(),
  ],
  build: {
    target: "es2022",
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [{ name: "three", test: /node_modules[\\/]three/ }],
        },
      },
    },
  },
  server: { strictPort: true },
  preview: { strictPort: true },
}));
