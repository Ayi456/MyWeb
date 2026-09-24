export interface SoundState {
  rain: number;
  night: number;
  season: readonly [number, number, number, number];
}

/** Detect sounds from scene state, independently of whether audio is enabled. */
export function soundCues(previous: SoundState, next: SoundState): string[] {
  const cues: string[] = [];
  if (previous.rain <= 0.3 && next.rain > 0.3) cues.push("雨声渐起");
  const crickets = (state: SoundState) =>
    state.night *
    (0.35 + state.season[1] * 0.65) *
    (1 - state.season[3]) *
    (1 - state.rain);
  if (crickets(previous) <= 0.3 && crickets(next) > 0.3)
    cues.push("夜里的虫鸣开始了");
  if (previous.season[3] <= 0.5 && next.season[3] > 0.5)
    cues.push("冬日的风声更轻了");
  return cues;
}
