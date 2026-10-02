import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCamera } from "../src/scene/core/camera";

describe("camera tour controls", () => {
  let camera: ReturnType<typeof createCamera>;
  beforeEach(() => {
    vi.stubGlobal("window", new EventTarget());
    const canvas = Object.assign(new EventTarget(), { style: { cursor: "" } });
    camera = createCamera(canvas as unknown as HTMLCanvasElement, [], () => {});
  });
  afterEach(() => {
    camera.dispose();
    vi.unstubAllGlobals();
  });

  it("holds the current view through idle time while manual destinations still work", () => {
    const now = performance.now() + 10000;
    for (let i = 0; i < 180; i++)
      camera.update(1 / 60, now + i * 17, true, false);
    expect(camera.autoOrbit).toBe(true);
    camera.setAutoTour(false);
    camera.update(1 / 60, now + 60000, true, false);
    const stopped = camera.camera.position.toArray();
    for (let i = 0; i < 600; i++)
      camera.update(1 / 60, now + 90000 + i * 17, true, false);
    expect(camera.autoOrbit).toBe(false);
    expect(camera.camera.position.toArray()).toEqual(stopped);
    camera.preset("lighthouse", true);
    camera.update(1 / 60, now + 120000, true, false);
    expect(camera.sharePreset).toBe("lighthouse");
    expect(camera.camera.position.toArray()).not.toEqual(stopped);
    expect(camera.autoOrbit).toBe(false);
  });

  it("resumes only after idle time and still respects motion and panel controls", () => {
    camera.setAutoTour(false);
    camera.setAutoTour(true);
    camera.update(1 / 60, performance.now(), true, false);
    expect(camera.autoOrbit).toBe(false);
    camera.update(1 / 60, performance.now() + 10000, true, false);
    expect(camera.autoOrbit).toBe(true);
    camera.update(1 / 60, performance.now() + 20000, true, true);
    expect(camera.autoOrbit).toBe(false);
    camera.setBlocked(true);
    camera.update(1 / 60, performance.now() + 30000, true, false);
    expect(camera.autoOrbit).toBe(false);
    camera.setBlocked(false);
    camera.update(1 / 60, performance.now() + 40000, false, false);
    expect(camera.autoOrbit).toBe(false);
  });
});
