import { describe, expect, it, vi } from "vitest";
import * as T from "three";
import { createContext } from "../src/scene/core/context";
import { createSakura } from "../src/scene/objects/sakura";
import { createCloudWhale } from "../src/scene/objects/cloudWhale";
import { ResourceTracker } from "../src/scene/core/resourceTracker";
import type { SeasonWeights } from "../src/scene/systems/season";

describe("sculpted island scenery", () => {
  it("keeps the entire whale smile visible in front of its curved face", () => {
    const { whale } = createCloudWhale(createContext());
    whale.updateMatrixWorld(true);
    const body = whale.getObjectByName("whale-body") as T.Mesh;
    const mouth = whale.getObjectByName(
      "whale-smile",
    ) as T.Mesh<T.TubeGeometry>;
    const path = mouth.geometry.parameters.path;
    const camera = new T.Vector3(8, 0, 0);
    const ray = new T.Raycaster();
    for (const point of path.getPoints(128)) {
      ray.set(camera, point.clone().sub(camera).normalize());
      const surface = ray.intersectObject(body)[0];
      expect(surface.distance).toBeGreaterThan(camera.distanceTo(point));
    }
    // The middle sits below both corners, reading as a smile from the front.
    expect(path.getPoint(0.5).y).toBeLessThan(path.getPoint(0).y);
    expect(path.getPoint(0.5).y).toBeLessThan(path.getPoint(1).y);
  });

  it("keeps a dense instanced crown within seasonal culling bounds", () => {
    const ctx = createContext();
    const { tree, blossomCount } = createSakura(ctx);
    expect(blossomCount).toBeGreaterThan(100);
    expect(blossomCount).toBeLessThanOrEqual(180);
    const crown = tree.getObjectByName(
      "sakura-blossom-sprays",
    ) as T.InstancedMesh;
    const spring = new T.Color(),
      winter = new T.Color();
    ctx.seasonal.apply([1, 0, 0, 0], true);
    crown.getColorAt(0, spring);
    ctx.seasonal.apply([0, 0, 0, 1], true);
    crown.getColorAt(0, winter);
    expect(spring.equals(winter)).toBe(false);
    const matrix = new T.Matrix4();
    crown.getMatrixAt(0, matrix);
    expect(new T.Vector3().setFromMatrixScale(matrix).length()).toBeGreaterThan(
      0,
    );
    const seasonalCrowns = [
      crown,
      tree.getObjectByName("sakura-leaf-sprays") as T.InstancedMesh,
      tree.getObjectByName("sakura-branch-snow") as T.InstancedMesh,
    ];
    const seasons: SeasonWeights[] = [
      [1, 0, 0, 0],
      [0, 1, 0, 0],
      [0, 0, 1, 0],
      [0, 0, 0, 1],
      [0, 0.5, 0.5, 0],
    ];
    const instanceBounds = new T.Sphere();
    for (const weights of seasons) {
      ctx.seasonal.apply(weights, true);
      for (const mesh of seasonalCrowns) {
        expect(mesh.frustumCulled).toBe(true);
        expect(mesh.boundingSphere).not.toBeNull();
        mesh.geometry.computeBoundingSphere();
        const bounds = mesh.boundingSphere!;
        for (let i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, matrix);
          instanceBounds
            .copy(mesh.geometry.boundingSphere!)
            .applyMatrix4(matrix);
          expect(
            bounds.center.distanceTo(instanceBounds.center) +
              instanceBounds.radius,
          ).toBeLessThanOrEqual(bounds.radius + 0.00001);
        }
      }
    }
  });
  it("disposes shared rounded and organic geometry exactly once", () => {
    const ctx = createContext(),
      tracker = new ResourceTracker();
    const rounded = new ctx.SoftBatch(),
      organic = new ctx.PuffBatch();
    rounded.add(0, 0, 0, 1, 1, 1, "white").build();
    organic.add(0, 0, 0, 1, 1, 1, "white").build();
    organic.build();
    const softDisposed = vi.fn(),
      puffDisposed = vi.fn();
    ctx.softCube.addEventListener("dispose", softDisposed);
    ctx.puff.addEventListener("dispose", puffDisposed);
    tracker.track(ctx.scene);
    tracker.dispose();
    tracker.dispose();
    expect(softDisposed).toHaveBeenCalledTimes(1);
    expect(puffDisposed).toHaveBeenCalledTimes(1);
  });
});
