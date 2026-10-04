import { describe, expect, it, vi } from "vitest";
import * as T from "three";
import { createContext } from "../src/scene/core/context";
import { ResourceTracker } from "../src/scene/core/resourceTracker";
import { createSoftTerrain } from "../src/scene/objects/softTerrain";

function terrain(ctx: ReturnType<typeof createContext>) {
  return createSoftTerrain(ctx, ctx.world, [3, 2], 2, () => 0);
}

function seasonUniform(material: T.MeshStandardMaterial) {
  const shader = {
    uniforms: {},
    vertexShader: "#include <color_vertex>",
  } as Parameters<T.MeshStandardMaterial["onBeforeCompile"]>[0];
  material.onBeforeCompile(shader, {} as T.WebGLRenderer);
  return shader.uniforms.uSeason;
}

describe("terrain resource ownership", () => {
  it("shares surface resources within a scene and releases each exactly once", () => {
    const ctx = createContext();
    const first = terrain(ctx),
      second = terrain(ctx);
    const tracker = new ResourceTracker();
    const disposals = [];
    for (const surface of ["soil", "grass"] as const) {
      expect(first[surface].material).toBe(second[surface].material);
      const material = first[surface].material;
      expect(material.map).toBe(material.bumpMap);
      for (const resource of [material, material.map!]) {
        const disposed = vi.fn();
        resource.addEventListener("dispose", disposed);
        disposals.push(disposed);
      }
    }
    tracker.track(ctx.scene);
    tracker.dispose();
    tracker.dispose();
    disposals.forEach((disposed) => expect(disposed).toHaveBeenCalledTimes(1));
  });

  it("keeps concurrent and replacement scenes independent", () => {
    const firstCtx = createContext(),
      nextCtx = createContext();
    const first = terrain(firstCtx),
      next = terrain(nextCtx);
    expect(seasonUniform(first.grass.material)).toBe(firstCtx.U.uSeason);
    expect(seasonUniform(next.grass.material)).toBe(nextCtx.U.uSeason);
    const nextDisposed = vi.fn();
    for (const surface of ["soil", "grass"] as const) {
      expect(first[surface].material).not.toBe(next[surface].material);
      expect(first[surface].material.map).not.toBe(next[surface].material.map);
      next[surface].material.addEventListener("dispose", nextDisposed);
      next[surface].material.map!.addEventListener("dispose", nextDisposed);
    }
    const tracker = new ResourceTracker();
    tracker.track(firstCtx.scene);
    tracker.dispose();
    expect(nextDisposed).not.toHaveBeenCalled();
    const additional = terrain(nextCtx);
    expect(additional.grass.material).toBe(next.grass.material);
    expect(seasonUniform(additional.grass.material)).toBe(nextCtx.U.uSeason);
    tracker.track(nextCtx.scene);
    tracker.dispose();
    expect(nextDisposed).toHaveBeenCalledTimes(4);
  });
});
