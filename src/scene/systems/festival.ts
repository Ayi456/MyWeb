import { solarTerm } from "../../content/calendar";
import type { StampId } from "./postcards";
import type { WorldObjects } from "../objects/createWorld";

export type FestivalKind = "midAutumn" | "lantern" | "qixi";

/** Intl uses the visitor's local calendar date; unsupported calendars stay quiet. */
export function lunarDate(date: Date) {
  try {
    const parts = new Intl.DateTimeFormat("zh-CN-u-ca-chinese", {
      month: "numeric",
      day: "numeric",
    }).formatToParts(date);
    const monthText = parts.find((part) => part.type === "month")?.value ?? "";
    const dayText = parts.find((part) => part.type === "day")?.value ?? "";
    // A leap month is not the ordinary festival month.
    if (!/^\d+$/.test(monthText) || !/^\d+$/.test(dayText)) return null;
    const month = Number(monthText),
      day = Number(dayText);
    return month >= 1 && month <= 12 && day >= 1 && day <= 30
      ? { month, day }
      : null;
  } catch {
    return null;
  }
}
export function festivalForDate(date: Date): FestivalKind | null {
  const lunar = lunarDate(date);
  if (!lunar) return null;
  if (lunar.month === 8 && lunar.day === 15) return "midAutumn";
  if (lunar.month === 1 && lunar.day === 15) return "lantern";
  if (lunar.month === 7 && lunar.day === 7) return "qixi";
  return null;
}
export function limitedStampForDate(date: Date): StampId | null {
  const term = solarTerm(date)?.name;
  if (term === "春分") return "hanami";
  if (term === "夏至") return "longday";
  if (term === "冬至") return "warmth";
  if (date.getMonth() === 0 && date.getDate() === 1) return "newyear";
  const festival = festivalForDate(date);
  if (festival === "qixi") return "bridge";
  if (festival === "midAutumn") return "moon";
  return null;
}
export const FESTIVAL_GREETING: Record<FestivalKind, string> = {
  midAutumn: "今晚月正圆，温泉村的天灯也会升起。",
  lantern: "元宵的红灯笼，照亮了去花园岛的桥。",
  qixi: "今晚的星桥很亮，流星也走得勤。",
};

export function updateFestival(
  objects: WorldObjects,
  kind: FestivalKind | null,
  night: number,
  lanternRelease = 0,
) {
  // The lantern release event borrows the mid-autumn lanterns and fades them.
  const midAutumn = kind === "midAutumn" && night > 0.3;
  objects.festivalLanterns.visible = midAutumn || lanternRelease > 0.01;
  objects.festivalLanternMat.opacity = midAutumn ? 1 : lanternRelease;
  objects.festivalRedLanterns.visible = kind === "lantern";
  objects.festivalStarBridge.visible = kind === "qixi" && night > 0.4;
  objects.moon.scale.setScalar(kind === "midAutumn" ? 1.18 : 1);
}
