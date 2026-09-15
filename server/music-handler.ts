import type { IncomingMessage, ServerResponse } from "node:http";
import { MusicError, type createMusicService } from "./music-service.ts";

export function createMusicHandler(
  service: ReturnType<typeof createMusicService>,
) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    try {
      if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        throw new MusicError(405, "只支持读取电台内容。");
      }
      const query = new URL(req.url || "/", "http://localhost").searchParams;
      const action = query.get("action") || "playlist";
      let result;
      if (action === "playlist") {
        result = await service.playlist();
        res.setHeader(
          "Cache-Control",
          "public, max-age=0, s-maxage=300, stale-while-revalidate=60",
        );
      } else if (action === "play") {
        result = await service.playback(query.get("id") || "");
      } else {
        throw new MusicError(400, "没有这个电台操作。");
      }
      res.statusCode = 200;
      res.end(JSON.stringify(result));
    } catch (error) {
      res.statusCode = error instanceof MusicError ? error.status : 503;
      res.end(
        JSON.stringify({
          error:
            error instanceof MusicError
              ? error.message
              : "电台暂时连接不上，请稍后重试。",
        }),
      );
    }
  };
}
