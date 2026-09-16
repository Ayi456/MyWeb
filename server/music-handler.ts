import type { IncomingMessage, ServerResponse } from "node:http";
import { MusicError, type createMusicService } from "./music-service.ts";
import { checkRateLimit, getClientIdentifier } from "./rate-limiter.ts";

export function createMusicHandler(
  service: ReturnType<typeof createMusicService>,
) {
  return async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("X-Frame-Options", "DENY");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    try {
      if (req.method !== "GET") {
        res.setHeader("Allow", "GET");
        throw new MusicError(405, "只支持读取电台内容。");
      }

      // Rate limiting check
      const clientId = getClientIdentifier(
        req.headers["x-forwarded-for"] || req.headers["x-real-ip"] || req.socket.remoteAddress,
        req.headers["user-agent"],
      );
      const rateLimit = checkRateLimit(clientId);
      res.setHeader("X-RateLimit-Limit", "30");
      res.setHeader("X-RateLimit-Remaining", String(rateLimit.remaining));
      res.setHeader("X-RateLimit-Reset", String(Math.floor(rateLimit.resetAt / 1000)));

      if (!rateLimit.allowed) {
        res.statusCode = 429;
        res.setHeader("Retry-After", String(Math.ceil((rateLimit.resetAt - Date.now()) / 1000)));
        res.end(JSON.stringify({ error: "请求过于频繁，请稍后再试。" }));
        return;
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
