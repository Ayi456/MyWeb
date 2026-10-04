import { afterEach, describe, expect, it } from "vitest";
import { createContext } from "../src/scene/core/context";
import { ResourceTracker } from "../src/scene/core/resourceTracker";
import { createClouds } from "../src/scene/objects/clouds";
import { seededRandom } from "../src/scene/utils/seededRandom";
import { CONFIG } from "../src/scene/config";
import * as T from "three";

const cleanups: (() => void)[] = [];
function setup() {
  const context = createContext();
  const clouds = createClouds(context);
  const tracker = new ResourceTracker();
  tracker.track(context.scene);
  [context.cube, context.softCube, context.puff].forEach((g) =>
    tracker.trackGeometry(g),
  );
  [context.matte, context.rockMat, context.lampMat].forEach((m) =>
    tracker.trackMaterial(m),
  );
  cleanups.push(() => tracker.dispose());
  return { context, clouds, tracker };
}
afterEach(() => cleanups.splice(0).forEach((dispose) => dispose()));

describe("layered cloud sea", () => {
  it("keeps one soft-edged batch and all three belts in the lower detail budget", () => {
    const { clouds } = setup();
    const { cloudSea, lowCloudCount } = clouds;
    expect((cloudSea.count * cloudSea.geometry.index!.count) / 3).toBeLessThan(
      350000,
    );
    expect(Array.isArray(cloudSea.material)).toBe(false);
    expect(clouds.cloudMat.transparent).toBe(true);
    expect(clouds.cloudMat.depthWrite).toBe(false);
    expect(lowCloudCount).toBeLessThan(cloudSea.count);
    const air = cloudSea.geometry.getAttribute("cloudAir");
    const visibleLayers = new Set<number>();
    for (let i = 0; i < lowCloudCount; i++) visibleLayers.add(air.getZ(i));
    expect([...visibleLayers].sort()).toEqual([0, 1, 2]);
    // Reducing detail removes only distant clusters, keeping the island framing.
    for (let i = lowCloudCount; i < cloudSea.count; i++)
      expect(air.getZ(i)).toBe(2);
  });

  it("restores every lobe after camera sorting and repeated quality changes", () => {
    const { context, clouds } = setup();
    const { cloudSea } = clouds;
    const camera = new T.PerspectiveCamera();
    camera.position.set(11, 10, 21);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld();
    const records = (count: number) => {
      const flow = cloudSea.geometry.getAttribute("cloudFlow");
      const air = cloudSea.geometry.getAttribute("cloudAir");
      return Array.from({ length: count }, (_, i) =>
        JSON.stringify([
          ...cloudSea.instanceMatrix.array.slice(i * 16, i * 16 + 16),
          ...cloudSea.instanceColor!.array.slice(i * 3, i * 3 + 3),
          flow.getX(i),
          flow.getY(i),
          flow.getZ(i),
          flow.getW(i),
          air.getX(i),
          air.getY(i),
          air.getZ(i),
        ]),
      ).sort();
    };
    const full = records(cloudSea.count);
    const low = records(clouds.lowCloudCount);
    for (const count of [
      full.length,
      low.length,
      full.length,
      low.length,
      full.length,
    ]) {
      cloudSea.count = count;
      context.scene.onBeforeRender(
        {} as T.WebGLRenderer,
        context.scene,
        camera,
        cloudSea.geometry,
        clouds.cloudMat,
        null!,
      );
      expect(records(count)).toEqual(count === full.length ? full : low);
      camera.position.negate();
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();
    }
  });

  it("extends the cloud deck to the horizon and follows the live weather tint", () => {
    const { clouds, tracker } = setup();
    const deck = clouds.cloudHorizon;
    deck.geometry.computeBoundingBox();
    const bounds = deck.geometry.boundingBox!;
    expect(bounds.max.x - bounds.min.x).toBeGreaterThanOrEqual(300);
    expect(bounds.max.z - bounds.min.z).toBeGreaterThanOrEqual(300);
    expect(bounds.max.y).toBeLessThan(-3);
    expect(deck.material.color).toBe(clouds.cloudMat.color);
    let disposed = 0;
    deck.geometry.addEventListener("dispose", () => disposed++);
    tracker.dispose();
    expect(disposed).toBe(1);
  });

  it("moves every lobe in a cloud together, including when the group wraps", () => {
    const { clouds } = setup();
    const flow = clouds.cloudSea.geometry.getAttribute("cloudFlow");
    for (let group = 0; group < flow.count; group += 7) {
      for (let lobe = 1; lobe < 7; lobe++) {
        expect([
          flow.getX(group + lobe),
          flow.getY(group + lobe),
          flow.getZ(group + lobe),
          flow.getW(group + lobe),
        ]).toEqual([
          flow.getX(group),
          flow.getY(group),
          flow.getZ(group),
          flow.getW(group),
        ]);
      }
    }
  });

  it("freezes on pause or reduced motion and resumes without catching up", () => {
    const { clouds } = setup();
    clouds.updateClouds(2, 1, false);
    const time = clouds.cloudTime.value;
    const travel = clouds.cloudTravel.value;
    expect(time).toBeGreaterThan(0);
    expect(travel).toBeGreaterThan(0);
    clouds.updateClouds(0, 1, false);
    clouds.updateClouds(600, 1, true);
    expect(clouds.cloudTime.value).toBe(time);
    expect(clouds.cloudTravel.value).toBe(travel);
    clouds.updateClouds(0.05, 0, false);
    expect(clouds.cloudTime.value).toBeCloseTo(time + 0.05);
    expect(clouds.cloudTravel.value).toBe(travel);
  });

  it("preserves downstream scenery's random sequence", () => {
    const { context } = setup();
    const original = seededRandom(CONFIG.seed);
    // The old cloud builder consumed four draws per random cloud and three
    // per treetop lobe on each of the two miniature background islands.
    for (let i = 0; i < 37 * 4 + 2 * 10 * 3; i++) original();
    expect(context.rand()).toBe(original());
  });

  it("isolates cloud attributes from shared tree geometry and releases the clone", () => {
    const { context, clouds, tracker } = setup();
    expect(context.puff.getAttribute("cloudFlow")).toBeUndefined();
    expect(clouds.cloudSea.geometry).not.toBe(context.puff);
    let disposed = 0;
    clouds.cloudSea.geometry.addEventListener("dispose", () => disposed++);
    tracker.dispose();
    tracker.dispose();
    expect(disposed).toBe(1);
  });
});
