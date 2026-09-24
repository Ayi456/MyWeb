import { localDateKey } from "../content/calendar";

const KEY = "spring-post-office:v1:visits";
export interface Visits {
  firstDate: string;
  days: string[];
  count: number;
}
function validDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value))
    return false;
  const date = new Date(`${value}T12:00:00Z`);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}
export function validateVisits(value: unknown): Visits {
  if (!value || typeof value !== "object")
    return { firstDate: "", days: [], count: 0 };
  const source = value as Record<string, unknown>;
  const days = Array.isArray(source.days)
    ? [...new Set(source.days.filter(validDate))].slice(-3660)
    : [];
  const firstDate = validDate(source.firstDate)
    ? source.firstDate
    : (days[0] ?? "");
  const count = source.count;
  return {
    firstDate,
    days,
    count:
      typeof count === "number" && Number.isSafeInteger(count) && count >= 0
        ? Math.min(count, 10_000_000)
        : 0,
  };
}
export function recordVisit(previous: Visits, date: Date): Visits {
  const today = localDateKey(date);
  return {
    firstDate: previous.firstDate || today,
    days: previous.days.includes(today)
      ? previous.days
      : [...previous.days, today].slice(-3660),
    count: Math.min(previous.count + 1, 10_000_000),
  };
}
export function loadVisits(): Visits {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? validateVisits(JSON.parse(raw)) : validateVisits(null);
  } catch {
    return validateVisits(null);
  }
}
export function saveVisits(visits: Visits) {
  try {
    localStorage.setItem(KEY, JSON.stringify(validateVisits(visits)));
  } catch {
    // Returning visitors still get the current visit's message.
  }
}
