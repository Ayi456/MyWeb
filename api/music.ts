import { createNeteaseRadio } from "../server/netease-radio.ts";

// Only these two read operations are exposed. The package stays on the server.
export default createNeteaseRadio(process.env.MUSIC_PLAYLIST_ID || "3778678");
