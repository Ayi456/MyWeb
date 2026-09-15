import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { musicApi } from "./server/vite-music.ts";

export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    musicApi(loadEnv(mode, process.cwd(), "MUSIC_").MUSIC_PLAYLIST_ID),
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
