import { describe, expect, it, vi } from "vitest";
import {
  createMusicService,
  normalizePlayback,
  normalizePlaylist,
} from "../server/music-service";
import { createMusicHandler } from "../server/music-handler";
import type { IncomingMessage, ServerResponse } from "node:http";

const playlistResponse = {
  body: {
    code: 200,
    cookie: "private-upstream-value",
    playlist: {
      name: "公开测试歌单",
      tracks: [
        { id: 1, name: "春日", ar: [{ name: "歌手" }], dt: 120000 },
        { id: 2, name: "来信", ar: [{ name: "另一位歌手" }], dt: 180000 },
      ],
    },
  },
};
const playbackResponse = (
  url: string | null = "http://m701.music.126.net/example.mp3",
  freeTrialInfo: unknown = null,
) => ({
  body: { code: 200, data: [{ id: 1, code: 200, url, freeTrialInfo }] },
});

describe("public cloud radio", () => {
  it("returns only player metadata and caps the public list at 200 unique valid tracks", () => {
    const result = normalizePlaylist(
      {
        body: {
          code: 200,
          playlist: {
            tracks: [
              { id: "invalid", name: "bad" },
              ...Array.from({ length: 250 }, (_, i) => ({
                id: i + 1,
                name: `Song ${i}`,
                ar: [],
                dt: 0,
              })),
            ],
          },
        },
      },
      "3778678",
    );
    expect(result.tracks).toHaveLength(200);
    expect(result.tracks[0]).toEqual({
      id: "1",
      name: "Song 0",
      artist: "未知歌手",
      duration: 0,
    });
    expect(normalizePlaylist(playlistResponse, "3778678")).not.toHaveProperty(
      "cookie",
    );
  });

  it("upgrades original CDN URLs to HTTPS and preserves trial status", () => {
    expect(normalizePlayback(playbackResponse(), "1")).toEqual({
      id: "1",
      url: "https://m701.music.126.net/example.mp3",
      trial: false,
    });
    expect(
      normalizePlayback(playbackResponse(undefined, { start: 0, end: 30 }), "1")
        .trial,
    ).toBe(true);
  });

  it("rejects missing, mismatched and non-NetEase playback URLs", () => {
    expect(() => normalizePlayback(playbackResponse(null), "1")).toThrow(
      "暂时无法播放",
    );
    expect(() => normalizePlayback(playbackResponse(), "2")).toThrow(
      "暂时无法播放",
    );
    for (const url of [
      "https://music.126.net.evil.test/music.mp3",
      "http://127.0.0.1/a",
      "javascript:alert(1)",
    ]) {
      expect(() => normalizePlayback(playbackResponse(url), "1")).toThrow(
        "播放地址暂时不可用",
      );
    }
  });

  it("coalesces concurrent playlist loads, caches them, and refreshes after expiry", async () => {
    let now = 0;
    const call = vi.fn().mockResolvedValue(playlistResponse);
    const service = createMusicService(call, "3778678", () => now);
    await Promise.all([
      service.playlist(),
      service.playlist(),
      service.playlist(),
    ]);
    await service.playlist();
    expect(call).toHaveBeenCalledTimes(1);
    now = 300001;
    await service.playlist();
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("allows retry after a failed playlist request", async () => {
    const call = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(playlistResponse);
    const service = createMusicService(call);
    await expect(service.playlist()).rejects.toThrow("offline");
    expect((await service.playlist()).tracks).toHaveLength(2);
    expect(call).toHaveBeenCalledTimes(2);
  });

  it("only resolves songs from the configured playlist, with unlocking disabled", async () => {
    const call = vi
      .fn()
      .mockResolvedValueOnce(playlistResponse)
      .mockResolvedValue(playbackResponse());
    const service = createMusicService(call);
    await expect(service.playback("1,2")).rejects.toThrow("编号无效");
    await expect(service.playback("999")).rejects.toThrow("不在当前歌单");
    expect(call).toHaveBeenCalledTimes(1);
    await service.playback("1");
    expect(call).toHaveBeenLastCalledWith(
      "song_url_v1",
      expect.objectContaining({
        id: "1",
        unblock: "false",
        cookie: {},
        level: "standard",
        timeout: 8000,
      }),
    );
  });

  it("does not cache playback addresses or expose upstream exceptions", async () => {
    const service = {
      playlist: vi.fn(),
      playback: vi.fn().mockRejectedValue(new Error("private-cookie-secret")),
    };
    const handler = createMusicHandler(service);
    const headers = new Map();
    const res = {
      setHeader: (key: string, value: string) => headers.set(key, value),
      statusCode: 0,
      end: vi.fn(),
    };
    await handler(
      { method: "GET", url: "/api/music?action=play&id=1" } as IncomingMessage,
      res as unknown as ServerResponse,
    );
    expect(res.statusCode).toBe(503);
    expect(headers.get("Cache-Control")).toBe("no-store");
    expect(res.end).toHaveBeenCalledWith(
      JSON.stringify({ error: "电台暂时连接不上，请稍后重试。" }),
    );
  });

  it("rejects writes and unknown actions without calling the upstream service", async () => {
    const service = { playlist: vi.fn(), playback: vi.fn() };
    const handler = createMusicHandler(service);
    const res = { setHeader: vi.fn(), statusCode: 0, end: vi.fn() };
    await handler(
      { method: "POST", url: "/api/music" } as IncomingMessage,
      res as unknown as ServerResponse,
    );
    expect(res.statusCode).toBe(405);
    await handler(
      { method: "GET", url: "/api/music?action=login" } as IncomingMessage,
      res as unknown as ServerResponse,
    );
    expect(res.statusCode).toBe(400);
    expect(service.playlist).not.toHaveBeenCalled();
    expect(service.playback).not.toHaveBeenCalled();
  });
});
