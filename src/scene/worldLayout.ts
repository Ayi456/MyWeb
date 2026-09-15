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

export const FLIGHT_STOPS = {
  departure: 11,
  lighthouseArrival: 31,
  lighthouseDeparture: 38,
  westTurn: 52,
  southTurn: 64,
} as const;
