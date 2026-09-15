import type { Plugin, ViteDevServer, PreviewServer } from "vite";
import { createNeteaseRadio } from "./netease-radio.ts";

// Vite itself does not execute Vercel Functions; use the identical handler locally.
export function musicApi(playlistId?: string): Plugin {
  const handler = createNeteaseRadio(playlistId);
  const configure = (server: ViteDevServer | PreviewServer) => {
    server.middlewares.use((req, res, next) => {
      if (req.url?.split("?")[0] !== "/api/music") return next();
      void handler(req, res);
    });
  };
  return {
    name: "cloud-radio-api",
    configureServer: configure,
    configurePreviewServer: configure,
  };
}
