import type {
  RadioPlayback,
  RadioPlaylist,
  RadioTrack,
} from "../src/music/types.ts";

export type UpstreamCall = (
  method: "playlist_detail" | "song_url_v1",
  options: Record<string, string | number | object>,
) => Promise<unknown>;

export class MusicError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function bodyOf(response: unknown) {
  const body = record(record(response).body);
  if (body.code !== 200)
    throw new MusicError(503, "电台暂时连接不上，请稍后重试。");
  return body;
}

export function normalizePlaylist(
  response: unknown,
  id: string,
): RadioPlaylist {
  const playlist = record(bodyOf(response).playlist);
  const tracks: RadioTrack[] = [];
  const seen = new Set<string>();
  for (const item of Array.isArray(playlist.tracks) ? playlist.tracks : []) {
    const track = record(item);
    if (
      !Number.isSafeInteger(track.id) ||
      Number(track.id) <= 0 ||
      typeof track.name !== "string"
    )
      continue;
    const trackId = String(track.id);
    if (seen.has(trackId)) continue;
    seen.add(trackId);
    tracks.push({
      id: trackId,
      name: track.name,
      artist:
        (Array.isArray(track.ar) ? track.ar : [])
          .map((a) => record(a).name)
          .filter((n) => typeof n === "string")
          .join(" / ") || "未知歌手",
      duration:
        typeof track.dt === "number" && track.dt > 0 ? track.dt / 1000 : 0,
    });
    if (tracks.length === 30) break;
  }
  if (!tracks.length)
    throw new MusicError(503, "这份歌单暂时没有可读取的歌曲。");
  return {
    id,
    name: typeof playlist.name === "string" ? playlist.name : "公开歌单",
    sourceUrl: `https://music.163.com/#/playlist?id=${id}`,
    tracks,
  };
}

export function normalizePlayback(
  response: unknown,
  id: string,
): RadioPlayback {
  const data = bodyOf(response).data;
  const song = record(
    Array.isArray(data)
      ? data.find((item) => String(record(item).id) === id)
      : undefined,
  );
  if (song.code !== 200 || typeof song.url !== "string" || !song.url) {
    throw new MusicError(422, "这首歌暂时无法播放，换一首听听吧。");
  }
  let url: URL;
  try {
    url = new URL(song.url);
  } catch {
    throw new MusicError(422, "这首歌的播放地址暂时不可用。");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    !(
      url.hostname.endsWith(".music.126.net") ||
      url.hostname === "music.126.net"
    )
  ) {
    throw new MusicError(422, "这首歌的播放地址暂时不可用。");
  }
  url.protocol = "https:";
  return { id, url: url.href, trial: song.freeTrialInfo != null };
}

export function createMusicService(
  call: UpstreamCall,
  playlistId = "3778678",
  now = Date.now,
) {
  if (!/^[1-9]\d{0,15}$/.test(playlistId))
    throw new Error("MUSIC_PLAYLIST_ID must be a numeric playlist ID");
  let cached: { value: RadioPlaylist; until: number } | undefined;
  let pending: Promise<RadioPlaylist> | undefined;
  const options = {
    cookie: {},
    timeout: 8000,
    crypto: "eapi",
    randomCNIP: "false",
  };
  async function playlist(): Promise<RadioPlaylist> {
    if (cached && cached.until > now()) return cached.value;
    if (pending) return pending;
    pending = (async () => {
      try {
        const value = normalizePlaylist(
          await call("playlist_detail", { ...options, id: playlistId }),
          playlistId,
        );
        cached = { value, until: now() + 5 * 60_000 };
        return value;
      } finally {
        pending = undefined;
      }
    })();
    return pending;
  }
  async function playback(id: string) {
    if (!/^[1-9]\d{0,15}$/.test(id))
      throw new MusicError(400, "歌曲编号无效。");
    if (!(await playlist()).tracks.some((track) => track.id === id))
      throw new MusicError(404, "这首歌不在当前歌单中。");
    return normalizePlayback(
      await call("song_url_v1", {
        ...options,
        id,
        level: "standard",
        unblock: "false",
      }),
      id,
    );
  }
  return { playlist, playback };
}
