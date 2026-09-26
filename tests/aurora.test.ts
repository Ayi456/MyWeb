import { describe, expect, it } from "vitest";
import * as T from "three";
import { CONFIG } from "../src/scene/config";
import { createContext } from "../src/scene/core/context";
import { ResourceTracker } from "../src/scene/core/resourceTracker";
import { createAurora, updateAurora } from "../src/scene/objects/aurora";
import { eligibleEvents } from "../src/scene/systems/events";

describe("winter aurora", () => {
  it("only enters the event pool on winter nights", () => {
    const winter = {
      hour: 23,
      night: 1,
      season: [0, 0, 0, 1] as [number, number, number, number],
    };
    expect(eligibleEvents(winter)).toContain("aurora");
    expect(eligibleEvents({ ...winter, night: 0, hour: 12 })).not.toContain(
      "aurora",
    );
    expect(eligibleEvents({ ...winter, season: [0, 1, 0, 0] })).not.toContain(
      "aurora",
    );
  });

  it("hides outside a clear winter night and makes reduced-motion curtains still", () => {
    const ctx = createContext();
    const o = createAurora(ctx);
    updateAurora(o, 1, 1, 1, 0, false);
    expect(o.aurora.visible).toBe(true);
    expect(o.auroraMat.uniforms.uStrength.value).toBe(1);
    updateAurora(o, 1, 1, 1, 0, true);
    expect(o.auroraMat.uniforms.uMotion.value).toBe(0);
    for (const [release, winter, night, rain] of [
      [0, 1, 1, 0],
      [1, 0, 1, 0],
      [1, 1, 0, 0],
      [1, 1, 1, 1],
    ]) {
      updateAurora(o, release, winter, night, rain, false);
      expect(o.aurora.visible).toBe(false);
    }
  });

  it("preserves the model seed and disposes the added resources with the scene", () => {
    const ctx = createContext(),
      reference = createContext();
    const o = createAurora(ctx);
    expect(ctx.rand()).toBe(reference.rand());
    expect(o.auroraMat.uniforms.uTime).toBe(ctx.U.uTime);
    let geometries = 0,
      materials = 0;
    o.aurora.geometry.addEventListener("dispose", () => geometries++);
    o.auroraMat.addEventListener("dispose", () => materials++);
    const tracker = new ResourceTracker();
    tracker.track(ctx.scene);
    tracker.dispose();
    tracker.dispose();
    expect(geometries).toBe(1);
    expect(materials).toBe(1);
  });

  it("places the curtain inside the default desktop sky framing", () => {
    const ctx = createContext(),
      o = createAurora(ctx);
    const { azimuth, elevation, distance, focus } = CONFIG.camera;
    const camera = new T.PerspectiveCamera(37, 1280 / 720, 0.1, 150);
    camera.position.set(
      focus[0] + Math.sin(azimuth) * Math.cos(elevation) * distance,
      focus[1] + Math.sin(elevation) * distance,
      focus[2] + Math.cos(azimuth) * Math.cos(elevation) * distance,
    );
    camera.lookAt(new T.Vector3(...focus));
    camera.updateMatrixWorld();
    const positions = o.aurora.geometry.getAttribute("position");
    const center = new T.Vector3()
      .fromBufferAttribute(positions, 48 * 8 + 3)
      .project(camera);
    expect(Math.abs(center.x)).toBeLessThan(1);
    expect(center.y).toBeGreaterThan(0);
    expect(center.y).toBeLessThan(1);
    expect(center.z).toBeLessThan(1);
  });
});
