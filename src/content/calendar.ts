import { hash } from "../scene/utils/seededRandom";
import type { SceneEventKind } from "../scene/systems/events";
import { DAILY_LINES } from "./lines";

const TERMS = [
  ["小寒", "寒意渐深，灯火仍暖。"],
  ["大寒", "一年最冷时，心意要慢慢送。"],
  ["立春", "春天在路上，邮局先替你看见了。"],
  ["雨水", "细雨落下，云也柔软起来。"],
  ["惊蛰", "小小的生命从梦里醒来。"],
  ["春分", "昼夜平分，春色正好。"],
  ["清明", "风轻云薄，适合想念。"],
  ["谷雨", "雨生百谷，花也在长大。"],
  ["立夏", "夏天轻轻站上了码头。"],
  ["小满", "刚刚好的圆满，留一点给明天。"],
  ["芒种", "忙着播种，也别忘了抬头。"],
  ["夏至", "一年最长的白昼，寄一封长长的信。"],
  ["小暑", "热意初起，去云里乘一乘凉。"],
  ["大暑", "热得很认真，风也要认真吹。"],
  ["立秋", "第一片秋色落在邮筒旁。"],
  ["处暑", "暑气慢慢收起行李。"],
  ["白露", "清晨的叶尖，装着一点凉意。"],
  ["秋分", "昼夜从今天开始平分。"],
  ["寒露", "天气转凉，信要多带一点暖。"],
  ["霜降", "霜白了屋顶，灯仍亮着。"],
  ["立冬", "冬天来了，温泉村正冒着热气。"],
  ["小雪", "轻雪路过，留下一点安静。"],
  ["大雪", "雪落在云上，也落在心上。"],
  ["冬至", "夜最长，灯塔就多亮一会儿。"],
] as const;

// Day of each term, Jan..Dec, two terms per month, for 2026–2032.
// Source: Hong Kong Observatory Gregorian-Lunar Conversion Tables:
// https://www.hko.gov.hk/en/gts/time/conversion1_text.htm
const TERM_DAYS: Record<number, readonly number[]> = {
  2026: [
    5, 20, 4, 18, 5, 20, 5, 20, 5, 21, 5, 21, 7, 23, 7, 23, 7, 23, 8, 23, 7, 22,
    7, 22,
  ],
  2027: [
    5, 20, 4, 19, 6, 21, 5, 20, 6, 21, 6, 21, 7, 23, 8, 23, 8, 23, 8, 23, 7, 22,
    7, 22,
  ],
  2028: [
    6, 20, 4, 19, 5, 20, 4, 19, 5, 20, 5, 21, 6, 22, 7, 22, 7, 22, 8, 23, 7, 22,
    6, 21,
  ],
  2029: [
    5, 20, 3, 18, 5, 20, 4, 20, 5, 21, 5, 21, 7, 22, 7, 23, 7, 23, 8, 23, 7, 22,
    7, 21,
  ],
  2030: [
    5, 20, 4, 18, 5, 20, 5, 20, 5, 21, 5, 21, 7, 23, 7, 23, 7, 23, 8, 23, 7, 22,
    7, 22,
  ],
  2031: [
    5, 20, 4, 19, 6, 21, 5, 20, 6, 21, 6, 21, 7, 23, 8, 23, 8, 23, 8, 23, 7, 22,
    7, 22,
  ],
  2032: [
    6, 20, 4, 19, 5, 20, 4, 19, 5, 20, 5, 21, 6, 22, 7, 22, 7, 22, 8, 23, 7, 22,
    6, 21,
  ],
};

export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function solarTerm(date: Date) {
  const days = TERM_DAYS[date.getFullYear()];
  if (!days) return null;
  const index = date.getMonth() * 2;
  const offset =
    date.getDate() === days[index]
      ? 0
      : date.getDate() === days[index + 1]
        ? 1
        : -1;
  if (offset < 0) return null;
  const [name, line] = TERMS[index + offset];
  return { name, line };
}
export function dailyLine(date: Date) {
  const day = Math.floor(
    (Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) -
      Date.UTC(date.getFullYear(), 0, 1)) /
      86_400_000,
  );
  return DAILY_LINES[
    Math.floor(hash(date.getFullYear(), day) * DAILY_LINES.length)
  ];
}
export function eventWeights(
  date: Date,
): Partial<Record<SceneEventKind, number>> {
  const weekend = date.getDay() === 0 || date.getDay() === 6;
  const wetSeason = date.getMonth() >= 4 && date.getMonth() <= 6;
  return { whale: weekend ? 1.6 : 1, shower: wetSeason ? 1.5 : 1 };
}
