import { describe, expect, it, vi } from "vitest";
import * as T from "three";
import { createContext } from "../src/scene/core/context";
import { createSakura } from "../src/scene/objects/sakura";
import { ResourceTracker } from "../src/scene/core/resourceTracker";

describe("sculpted island scenery", () => {
  it("preserves seasonal crown blending while using a compact tree", () => {
    const ctx = createContext();
    const { tree, blossomCount } = createSakura(ctx);
    expect(blossomCount).toBeLessThan(100);
    const crown = tree.children.find(
      (node) => node instanceof T.InstancedMesh && node.count === blossomCount,
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
