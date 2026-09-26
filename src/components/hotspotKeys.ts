import type { HotspotId } from "../scene/systems/interactions";

/** Hotspots reachable without a pointer; the mailbox already has 写信. */
export const KEY_HOTSPOTS: { id: HotspotId; label: string }[] = [
  { id: "tree", label: "樱花树" },
  { id: "lantern", label: "灯笼" },
  { id: "writer", label: "写信的小兔" },
  { id: "cat", label: "猫咪" },
  { id: "windmill", label: "风车" },
  { id: "bell", label: "门铃" },
  { id: "pool", label: "水池" },
  { id: "airship", label: "飞艇" },
  { id: "lighthouse", label: "灯塔" },
  { id: "teahouse", label: "茶山" },
  { id: "village", label: "温泉村" },
  { id: "gramophone", label: "花园留声机" },
];

/** Digit1..Digit9 then Digit0 reach the first ten hotspots. */
export function hotspotForKey(code: string): HotspotId | null {
  const match = /^Digit(\d)$/.exec(code);
  if (!match) return null;
  const n = Number(match[1]);
  return KEY_HOTSPOTS[n === 0 ? 9 : n - 1]?.id ?? null;
}

export function keyLabel(index: number) {
  return index < 9 ? String(index + 1) : index === 9 ? "0" : "";
}
