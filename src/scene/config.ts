/** The reference's visual constants. Keep these in sync for visual comparisons. */
export const CONFIG = {
  seed: 314159,
  initialHour: 16.33,
  hoursPerSecond: 0.017,
  initialFlightTime: 1.5,
  flightDuration: 76,
  dockDuration: 11,
  letterDuration: 4,
  maxLettersInFlight: 24,
  petals: 1250,
  exposure: 0.95,
  fogDensity: 0.014,
  uiInterval: 300,
  statsInterval: 1000,
  autoOrbitDelay: 8500,
  camera: {
    azimuth: 0.46,
    elevation: 0.36,
    distance: 25,
    focus: [0.55, 1.55, 0] as const,
  },
  cameraLimits: {
    minDistance: 12,
    maxDistance: 39,
    minElevation: 0.08,
    maxElevation: 1.08,
  },
} as const;

export const QUALITY = {
  high: { dpr: 1.6, shadows: 1024, petals: 1250, bloom: 1 },
  medium: { dpr: 1.2, shadows: 768, petals: 850, bloom: 0.6 },
  low: { dpr: 0.9, shadows: 512, petals: 480, bloom: 0 },
} as const;
