import api from "@neteasecloudmusicapienhanced/api";
const options = {
  cookie: {},
  timeout: 8000,
  crypto: "eapi",
  randomCNIP: "false",
};
try {
  const list = await api.playlist_detail({
    ...options,
    id: process.env.MUSIC_PLAYLIST_ID || "3778678",
    limit: 10,
  });
  const track = list.body.playlist.tracks[0];
  const result = await api.song_url_v1({
    ...options,
    id: String(track.id),
    level: "standard",
  });
  if (!result.body.data[0]?.url) throw new Error("No public playback URL");
  const url = new URL(result.body.data[0].url);
  url.protocol = "https:";
  const response = await fetch(url, {
    method: "HEAD",
    headers: { Origin: "http://127.0.0.1:5173" },
    signal: AbortSignal.timeout(10000),
  });
  console.log(
    JSON.stringify({
      track: track.id,
      host: url.hostname,
      status: response.status,
      cors: response.headers.get("access-control-allow-origin"),
      type: response.headers.get("content-type"),
    }),
  );
  if (!response.ok || !response.headers.get("access-control-allow-origin"))
    process.exitCode = 1;
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
