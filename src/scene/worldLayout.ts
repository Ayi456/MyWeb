/** Shared landmarks keep geometry and the postal route in the same coordinates. */
export const MAIN_ISLAND = {
  radius: [5.1, 3.75] as const,
  gridOrigin: [-5.26, -3.91] as const,
  step: 0.29,
};
export const MAIN_MAILBOX = { x: 3.15, z: 1.4 } as const;

export const GARDEN_ISLAND = {
  center: [-9.1, 0.45, -2.2] as const,
  radius: [2.5, 2.0] as const,
};

export const LIGHTHOUSE_ISLAND = {
  center: [8.4, 1.05, -12.2] as const,
  radius: [2.45, 1.9] as const,
  berth: [11.85, 1.18, -11.9] as const,
};

/** Large terraced tea hill, far to the north-west and well outside the postal loop. */
export const TEA_ISLAND = {
  center: [-18.5, -1.4, -15.5] as const,
  radius: [4.8, 3.7] as const,
};

/** Hot-spring hamlet to the right of the beacon, past the cloud whale's lane. */
export const VILLAGE_ISLAND = {
  center: [11.5, -2.2, -27.5] as const,
  radius: [4.4, 3.3] as const,
};

export const FLIGHT_STOPS = {
  departure: 11,
  lighthouseArrival: 31,
  lighthouseDeparture: 38,
  westTurn: 52,
  southTurn: 64,
} as const;

export const DEPOT_ISLAND = {
  center: [-15.2, 0.3, -9.3] as const,
  radius: [2.8, 2.25] as const,
};
export const ROPEWAY = {
  start: [-4.0, 3.35, -1.9] as const,
  end: [-14.1, 2.45, -8.65] as const,
  duration: 44,
  stop: 6,
};
