/** Lamps come on well before the pastel sky gets dark. Keep readable ink
 * through dusk rather than using the scene's night-lighting intensity. */
export function isNightInterface(hour: number) {
  const normalized = ((hour % 24) + 24) % 24;
  return normalized < 5.5 || normalized >= 19.5;
}
