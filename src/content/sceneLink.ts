import { EVENT_KINDS, type SceneEventKind } from "../scene/systems/events";
import { SEASONS } from "../scene/systems/season";
import type {
  CameraPreset,
  CameraView,
  SceneSnapshot,
  WalkView,
} from "../scene/types";
import { sceneFromSearch } from "./realTime";
import { CAMERA_PRESETS } from "../scene/core/cameraViews";

const CAMERA_BOUNDS: [number, number][] = [
  [-Math.PI, Math.PI],
  [0.08, 1.08],
  [8, 39],
  [-40, 40],
  [-40, 40],
  [-40, 40],
];

function cameraFromText(text: string | null): CameraView | null {
  if (!text) return null;
  const parts = text.split(",");
  if (
    parts.length !== 6 ||
    parts.some((part) => !/^-?\d+(?:\.\d+)?$/.test(part))
  )
    return null;
  const numbers = parts.map(Number);
  if (
    numbers.some(
      (value, i) =>
        !Number.isFinite(value) ||
        value < CAMERA_BOUNDS[i][0] ||
        value > CAMERA_BOUNDS[i][1],
    )
  )
    return null;
  return {
    azimuth: numbers[0],
    elevation: numbers[1],
    distance: numbers[2],
    focus: [numbers[3], numbers[4], numbers[5]],
  };
}

export function parseSceneLink(search: string) {
  const base = sceneFromSearch(search);
  const params = new URLSearchParams(search);
  const presetText = params.get("preset");
  const eventText = params.get("event");
  return {
    ...base,
    cameraPreset:
      !base.classic && CAMERA_PRESETS.includes(presetText as CameraPreset)
        ? (presetText as CameraPreset)
        : null,
    cameraView: base.classic ? null : cameraFromText(params.get("cam")),
    walkView: base.classic ? null : walkFromText(params.get("walk")),
    event:
      !base.classic && EVENT_KINDS.includes(eventText as SceneEventKind)
        ? (eventText as SceneEventKind)
        : null,
  };
}

/** Build only approved scene fields, so old query parameters and letters cannot leak. */
export function buildSceneLink(currentUrl: string, snapshot: SceneSnapshot) {
  const url = new URL(currentUrl);
  url.search = "";
  url.hash = "";
  const numeric = (value: number, places: number) =>
    Number(value.toFixed(places)).toString();
  url.searchParams.set("hour", numeric(snapshot.hour, 2));
  url.searchParams.set("season", String(SEASONS.indexOf(snapshot.season)));
  if (snapshot.walkView) {
    const { x, z, yaw, pitch } = snapshot.walkView;
    url.searchParams.set(
      "walk",
      [x, z, yaw, pitch].map((value) => numeric(value, 3)).join(","),
    );
  } else if (snapshot.cameraPreset)
    url.searchParams.set("preset", snapshot.cameraPreset);
  else {
    const view = snapshot.cameraView;
    url.searchParams.set(
      "cam",
      [view.azimuth, view.elevation, view.distance, ...view.focus]
        .map((value) => numeric(value, 3))
        .join(","),
    );
  }
  if (snapshot.event) url.searchParams.set("event", snapshot.event);
  return url.toString();
}

function walkFromText(text: string | null): WalkView | null {
  if (!text) return null;
  const parts = text.split(",");
  if (parts.length !== 4 || parts.some((p) => !/^-?\d+(?:\.\d+)?$/.test(p)))
    return null;
  const bounds = [
    [-4.1, 4.1],
    [-3.04, 3.04],
    [-Math.PI, Math.PI],
    [-0.8, 0.8],
  ];
  const values = parts.map(Number);
  if (
    values.some(
      (v, i) => !Number.isFinite(v) || v < bounds[i][0] || v > bounds[i][1],
    )
  )
    return null;
  return { x: values[0], z: values[1], yaw: values[2], pitch: values[3] };
}
