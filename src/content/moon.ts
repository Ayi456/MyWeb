// USNO: new moon at 2026-09-11 03:27 UTC; mean synodic month 29.530588853 days.
// This is an appearance estimate, not an astronomical ephemeris.
const NEW_MOON = Date.parse("2026-09-11T03:27:00Z");
const SYNODIC_MONTH_MS = 29.530588853 * 86_400_000;

/** 0 = new, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter. */
export function moonPhase(date: Date, festivalFull = false) {
  if (festivalFull) return 0.5;
  const at = date.getTime();
  if (!Number.isFinite(at)) return 0.5;
  const cycle = (at - NEW_MOON) / SYNODIC_MONTH_MS;
  return ((cycle % 1) + 1) % 1;
}
