export const MAX_SKIP_FAILURES = 5;
const BASE_DELAY = 1500;

/**
 * Delay before auto-skipping after the `failures`-th consecutive failure,
 * or null to stop. Doubles each time and honours the server's Retry-After.
 */
export function skipDelay(failures: number, retryAfterSeconds = 0) {
  if (failures >= MAX_SKIP_FAILURES) return null;
  const backoff = BASE_DELAY * 2 ** Math.max(0, failures - 1);
  return Math.max(backoff, retryAfterSeconds * 1000);
}

/** Next index in `step` direction, stepping over tracks that already failed. */
export function nextPlayable(
  from: number,
  step: number,
  count: number,
  failed: (index: number) => boolean,
) {
  for (let i = 1; i <= count; i++) {
    const index = (((from + step * i) % count) + count) % count;
    if (!failed(index)) return index;
  }
  return (((from + step) % count) + count) % count;
}
