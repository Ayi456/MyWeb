/** Shared landmarks keep geometry and the postal route in the same coordinates. */
export const MAIN_ISLAND = {
  radius: [7.2, 5.25] as const,
  gridOrigin: [-7.435, -5.405] as const,
  step: 0.29,
};
/** The sanctuary is the visual centre of the archipelago. */
export const SACRED_TREE = {
  center: [-0.9, -0.85] as const,
  scale: [1.9, 2.0, 1.9] as const,
};
export const MAIN_DOCK = {
  offset: [2.2, 0.16, 0] as const,
  berth: [10.2, 1.51, 0.17] as const,
};
export const MAIN_STREAM = [
  [-3.39, 1.57],
  [-4.05, 1.75],
  [-4.85, 2.05],
  [-5.6, 2.33],
  [-6.48, 2.45],
] as const;
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
