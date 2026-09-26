import type { CameraPreset } from "../scene/types";
import type { HotspotId } from "../scene/systems/interactions";

export const TREASURE_STOPS = [
  {
    id: "windmill",
    view: "garden",
    clue: "木桥另一头，有谁用转动的叶片替花园量风？",
  },
  {
    id: "lighthouse",
    view: "lighthouse",
    clue: "邮路最远处，有谁在夜里替归船留一盏灯？",
  },
  {
    id: "teahouse",
    view: "teahouse",
    clue: "沿着茶香去找，哪座小屋把一座山的绿意收进杯里？",
  },
  {
    id: "village",
    view: "village",
    clue: "屋檐挨着屋檐，哪处热气把冬夜的窗子熏得暖暖的？",
  },
] as const satisfies readonly {
  id: HotspotId;
  view: CameraPreset;
  clue: string;
}[];

export interface TreasureProgress {
  week: string;
  started: boolean;
  found: number;
}

/** A local Monday, calculated with calendar days so DST cannot shift the week. */
export function treasureWeek(date: Date) {
  const day = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  );
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}

/** Rotate through all 24 permutations: consecutive weeks never repeat a route. */
export function treasureRoute(date: Date) {
  const week = treasureWeek(date);
  let rank = ((Math.floor(Date.parse(week) / 604800000) % 24) + 24) % 24;
  const remaining = [...TREASURE_STOPS];
  const route: (typeof TREASURE_STOPS)[number][] = [];
  for (const factorial of [6, 2, 1, 1]) {
    route.push(remaining.splice(Math.floor(rank / factorial), 1)[0]);
    rank %= factorial;
  }
  return route;
}

export function emptyTreasure(date: Date): TreasureProgress {
  return { week: treasureWeek(date), started: false, found: 0 };
}

export function validateTreasure(value: unknown, date: Date): TreasureProgress {
  const empty = emptyTreasure(date);
  if (!value || typeof value !== "object") return empty;
  const item = value as Record<string, unknown>;
  if (
    item.week !== empty.week ||
    typeof item.started !== "boolean" ||
    !Number.isInteger(item.found) ||
    Number(item.found) < 0 ||
    Number(item.found) > TREASURE_STOPS.length ||
    (!item.started && item.found !== 0)
  )
    return empty;
  return { week: empty.week, started: item.started, found: Number(item.found) };
}

export function findTreasure(
  progress: TreasureProgress,
  id: HotspotId,
  date: Date,
) {
  const next = validateTreasure(progress, date);
  if (next.started && treasureRoute(date)[next.found]?.id === id) next.found++;
  return next;
}
