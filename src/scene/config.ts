/** Main-island visual constants retained from the reference. */
export const CONFIG = {
  seed: 314159,
  initialHour: 16.33,
  hoursPerSecond: 0.017,
  /** Continuous year: 0 spring, 1 summer, 2 autumn, 3 winter. */
  initialYear: 0.2,
  secondsPerSeason: 360,
  /** Fraction of each season spent blending into the next. */
  seasonTransition: 0.16,
  /** Simulation seconds before the first surprise, and between later ones. */
  events: {
    firstDelay: [18, 40] as const,
    gap: [45, 110] as const,
  },
  /** Simulation seconds a postcard takes to fly from the ship to the mailbox. */
  postcardDuration: 3.2,
  initialFlightTime: 1.5,
  flightDuration: 76,
  dockDuration: 11,
  letterDuration: 4,
  maxLettersInFlight: 24,
  petals: 1250,
  exposure: 0.95,
  fogDensity: 0.011,
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
  high: {
    dpr: 1.6,
    shadows: 1024,
    petals: 1250,
    snow: 1100,
    bloom: 1,
    farDetail: true,
  },
  medium: {
    dpr: 1.2,
    shadows: 768,
    petals: 850,
    snow: 750,
    bloom: 0.6,
    farDetail: true,
  },
  low: {
    dpr: 0.9,
    shadows: 512,
    petals: 480,
    snow: 420,
    bloom: 0,
    farDetail: false,
  },
} as const;
