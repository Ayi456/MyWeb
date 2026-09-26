import { describe, expect, it } from "vitest";
import {
  CAMERA_VIEWS,
  CAMERA_PRESETS,
  HOTSPOT_VIEWS,
  sampleTour,
  nearestTourTime,
  TOUR_DURATION,
} from "../src/scene/core/cameraViews";
import { HOTSPOTS } from "../src/scene/systems/interactions";
import { CONFIG } from "../src/scene/config";
import { parseSceneLink } from "../src/content/sceneLink";

describe("island views and camera tour", () => {
  it("keeps the reference framing and makes every destination shareable", () => {
    expect(CAMERA_VIEWS.reset).toEqual({
      ...CONFIG.camera,
      focus: [...CONFIG.camera.focus],
    });
    expect(CAMERA_VIEWS.tree).toEqual({
      azimuth: 0.31,
      elevation: 0.26,
      distance: 17,
      focus: [-0.4, 2.25, 0.2],
    });
    for (const preset of CAMERA_PRESETS)
      expect(parseSceneLink(`?preset=${preset}`).cameraPreset).toBe(preset);
    expect(parseSceneLink("?classic=1&preset=village").cameraPreset).toBeNull();
  });
  it("maps every hotspot to a valid destination", () => {
    expect(Object.keys(HOTSPOT_VIEWS).sort()).toEqual([...HOTSPOTS].sort());
    for (const preset of Object.values(HOTSPOT_VIEWS))
      expect(CAMERA_PRESETS).toContain(preset);
  });
  it("keeps the closed tour finite and within camera and share-link bounds", () => {
    for (let time = 0; time <= TOUR_DURATION; time += 0.25) {
      const view = sampleTour(time);
      expect(view.distance).toBeGreaterThanOrEqual(
        CONFIG.cameraLimits.minDistance,
      );
      expect(view.distance).toBeLessThanOrEqual(
        CONFIG.cameraLimits.maxDistance,
      );
      expect(view.elevation).toBeGreaterThanOrEqual(
        CONFIG.cameraLimits.minElevation,
      );
      expect(view.elevation).toBeLessThanOrEqual(
        CONFIG.cameraLimits.maxElevation,
      );
      for (const v of [view.azimuth, ...view.focus])
        expect(Number.isFinite(v)).toBe(true);
      for (const v of view.focus) expect(Math.abs(v)).toBeLessThan(40);
    }
    expect(sampleTour(0)).toEqual(sampleTour(TOUR_DURATION));
    const before = sampleTour(TOUR_DURATION - 0.001),
      after = sampleTour(0.001);
    for (let i = 0; i < 3; i++)
      expect(Math.abs(before.focus[i] - after.focus[i])).toBeLessThan(0.01);
  });
  it("joins the loop near the current island", () => {
    const view = CAMERA_VIEWS.village;
    const nearest = sampleTour(nearestTourTime(view));
    for (let i = 0; i < 3; i++)
      expect(nearest.focus[i]).toBeCloseTo(view.focus[i], 1);
  });
});
