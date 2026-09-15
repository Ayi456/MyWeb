import { createMusicService, type UpstreamCall } from "./music-service.ts";
import { createMusicHandler } from "./music-handler.ts";

export function createNeteaseRadio(playlistId?: string) {
  const service = createMusicService(async (method, options) => {
    const { default: api } = await import("@neteasecloudmusicapienhanced/api");
    // 4.40.1 supports crypto/timeout and cookie objects at runtime; its published
    // declarations omit those options. Confine the type boundary to this adapter.
    const call = api[method] as unknown as (
      data: Parameters<UpstreamCall>[1],
    ) => Promise<unknown>;
    return call(options);
  }, playlistId);
  return createMusicHandler(service);
}
