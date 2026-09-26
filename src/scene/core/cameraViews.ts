import * as T from "three";
import { CONFIG } from "../config";
import type { CameraView, CameraPreset } from "../types";
import type { HotspotId } from "../systems/interactions";
import {
  GARDEN_ISLAND,
  LIGHTHOUSE_ISLAND,
  TEA_ISLAND,
  VILLAGE_ISLAND,
} from "../worldLayout";

export const CAMERA_VIEWS: Record<Exclude<CameraPreset, "ride">, CameraView> = {
  reset: {
    azimuth: CONFIG.camera.azimuth,
    elevation: CONFIG.camera.elevation,
    distance: CONFIG.camera.distance,
    focus: [...CONFIG.camera.focus],
  },
  tree: {
    azimuth: 0.31,
    elevation: 0.26,
    distance: 17,
    focus: [-0.4, 2.25, 0.2],
  },
  garden: {
    azimuth: 0.55,
    elevation: 0.38,
    distance: 14,
    focus: [GARDEN_ISLAND.center[0], 1.4, GARDEN_ISLAND.center[2]],
  },
  lighthouse: {
    azimuth: 0.4,
    elevation: 0.3,
    distance: 15,
    focus: [LIGHTHOUSE_ISLAND.center[0], 2.6, LIGHTHOUSE_ISLAND.center[2]],
  },
  teahouse: {
    azimuth: 0.42,
    elevation: 0.34,
    distance: 20,
    focus: [TEA_ISLAND.center[0], 0.3, TEA_ISLAND.center[2] - 1.4],
  },
  village: {
    azimuth: 0.3,
    elevation: 0.3,
    distance: 22,
    focus: [
      VILLAGE_ISLAND.center[0] + 0.9,
      -0.8,
      VILLAGE_ISLAND.center[2] + 1.3,
    ],
  },
};
export const CAMERA_PRESETS: CameraPreset[] = [
  ...(Object.keys(CAMERA_VIEWS) as Exclude<CameraPreset, "ride">[]),
  "ride",
];
export const HOTSPOT_VIEWS: Record<HotspotId, CameraPreset> = {
  mailbox: "reset",
  tree: "tree",
  lantern: "tree",
  writer: "tree",
  cat: "tree",
  windmill: "garden",
  bell: "reset",
  pool: "tree",
  airship: "ride",
  lighthouse: "lighthouse",
  teahouse: "teahouse",
  village: "village",
  gramophone: "garden",
};
export const ISLAND_VIEWS = [
  { preset: "garden", label: "花园岛" },
  { preset: "lighthouse", label: "灯塔" },
  { preset: "teahouse", label: "茶山" },
  { preset: "village", label: "温泉村" },
] as const;

const tourStops = [
  "reset",
  "garden",
  "teahouse",
  "village",
  "lighthouse",
] as const;
const tourFocus = new T.CatmullRomCurve3(
  tourStops.map((id) => new T.Vector3(...CAMERA_VIEWS[id].focus)),
  true,
  "centripetal",
);
const tourPositions = new T.CatmullRomCurve3(
  tourStops.map((id) => {
    const v = CAMERA_VIEWS[id];
    return new T.Vector3(
      v.focus[0] + Math.sin(v.azimuth) * Math.cos(v.elevation) * v.distance,
      v.focus[1] + Math.sin(v.elevation) * v.distance,
      v.focus[2] + Math.cos(v.azimuth) * Math.cos(v.elevation) * v.distance,
    );
  }),
  true,
  "centripetal",
);
export const TOUR_DURATION = 150;
/** Smooth, closed world-space routes for both the camera and its look target. */
export function sampleTour(seconds: number): CameraView {
  const phase =
    (((seconds % TOUR_DURATION) + TOUR_DURATION) % TOUR_DURATION) /
    TOUR_DURATION;
  const focus = tourFocus.getPoint(phase),
    position = tourPositions.getPoint(phase);
  const offset = position.sub(focus);
  const length = offset.length();
  return {
    azimuth: Math.atan2(offset.x, offset.z),
    elevation: T.MathUtils.clamp(
      Math.asin(offset.y / length),
      CONFIG.cameraLimits.minElevation,
      CONFIG.cameraLimits.maxElevation,
    ),
    distance: T.MathUtils.clamp(
      length,
      CONFIG.cameraLimits.minDistance,
      CONFIG.cameraLimits.maxDistance,
    ),
    focus: [focus.x, focus.y, focus.z],
  };
}

/** Join the nearest part of the loop instead of returning to the main island. */
export function nearestTourTime(view: CameraView) {
  let best = 0,
    distance = Infinity;
  const focus = new T.Vector3(...view.focus);
  for (let time = 0; time < TOUR_DURATION; time++) {
    const candidate = sampleTour(time);
    const score = focus.distanceToSquared(new T.Vector3(...candidate.focus));
    if (score < distance) {
      distance = score;
      best = time;
    }
  }
  return best;
}
