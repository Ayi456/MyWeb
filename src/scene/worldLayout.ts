/** Shared landmarks keep geometry and the postal route in the same coordinates. */
export const GARDEN_ISLAND = {
  center: [-7.2, 0.45, -1.3] as const,
  radius: [1.85, 1.5] as const,
};

export const LIGHTHOUSE_ISLAND = {
  center: [6.4, 1.05, -10.4] as const,
  radius: [1.75, 1.4] as const,
  berth: [9.85, 1.18, -10.1] as const,
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
  center: [-12.5, 0.3, -7.4] as const,
  radius: [2.2, 1.8] as const,
};
export const ROPEWAY = {
  start: [-3.6, 3.35, -1.75] as const,
  end: [-11.4, 2.45, -6.75] as const,
  duration: 44,
  stop: 6,
};
