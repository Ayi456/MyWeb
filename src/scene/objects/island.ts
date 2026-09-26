import { type SceneContext, TAU } from "../core/context";
import { LEAF } from "./seasonalColors";
import { MAIN_ISLAND } from "../worldLayout";
import { createSoftTerrain, islandOutline } from "./softTerrain";

export function createIsland(ctx: SceneContext) {
  const { world, rockMat, rand, range, PuffBatch, SoftBatch, ground } = ctx;
  const { step, radius, gridOrigin } = MAIN_ISLAND;
  const { soil } = createSoftTerrain(ctx, world, radius, 3.9, ground, true);
  const walkTiles: { x: number; z: number; y: number }[] = [];
  for (let x = gridOrigin[0]; x <= -gridOrigin[0]; x += step)
    for (let z = gridOrigin[1]; z <= -gridOrigin[1]; z += step) {
      const d = (x / radius[0]) ** 2 + (z / radius[1]) ** 2;
      const outline = islandOutline(Math.atan2(z / radius[1], x / radius[0]));
      if (d <= outline ** 2) walkTiles.push({ x, z, y: ground(x, z) + 0.09 });
    }
  // Broad stepping stones follow the walking route without a tiled grass grid.
  const path = new SoftBatch();
  for (let i = 0; i < 19; i++) {
    const x = -0.85 + i * 0.285,
      z = 0.85 + 0.31 * Math.sin(x * 1.15);
    path.add(
      x,
      ground(x, z) + 0.105,
      z,
      0.28,
      0.055,
      0.37,
      i % 3 ? "#e6d8bc" : "#d7c9ae",
      0,
      Math.cos(x * 1.15) * -0.24,
    );
  }
  for (let i = 0; i < 9; i++) {
    const x = -1.05 - i * 0.27,
      z = 1.45;
    path.add(
      x,
      ground(x, z) + 0.105,
      z,
      0.27,
      0.05,
      0.33,
      "#e4d4b9",
      0,
      Math.sin(i) * 0.12,
    );
  }
  path.build(false);
  const rocks = new PuffBatch(world, rockMat);
  for (let i = 0; i < 15; i++) {
    const a = rand() * TAU,
      r = range(0.6, 1.7),
      y = range(-3.7, -2.95),
      s = range(0.14, 0.34);
    rocks.add(
      Math.cos(a) * r,
      y,
      Math.sin(a) * r,
      s,
      s * 1.3,
      s,
      ["#b49daa", "#cbb6b2", "#9b8a9f"][i % 3],
    );
  }
  for (let i = 0; i < 18; i++) {
    const a = (i * TAU) / 18,
      x = Math.cos(a) * radius[0] * 0.92,
      z = Math.sin(a) * radius[1] * 0.92;
    rocks.add(
      x,
      ground(x, z) - 0.63,
      z,
      range(0.48, 0.8),
      range(0.55, 0.95),
      range(0.4, 0.7),
      i % 3 ? "#c7b1a6" : "#baa5a6",
      0,
      -a,
    );
  }
  rocks.build();
  const vines = new PuffBatch();
  for (let i = 0; i < 18; i++) {
    const a = (i * TAU) / 18,
      r = range(0.93, 1),
      x = Math.cos(a) * radius[0] * r,
      z = Math.sin(a) * radius[1] * r,
      top = ground(x, z) - 0.08;
    const n = 4 + Math.floor(rand() * 5);
    for (let j = 0; j < n; j++) {
      const xx = x + Math.sin(j * 0.65 + i) * 0.08,
        zz = z + Math.cos(j * 0.6) * 0.06,
        y = top - j * 0.15;
      vines.add(xx, y, zz, 0.035, 0.22, 0.035, "#6c9476");
      if (j % 2 === 0)
        vines.addSeasonal(
          xx + 0.055,
          y - 0.02,
          zz,
          0.17,
          0.045,
          0.11,
          LEAF[j % 4 ? 0 : 1],
          0,
          j * 0.4,
          0.35,
        );
    }
  }
  vines.build();
  return {
    terrainCount: soil.geometry.getAttribute("position").count,
    walkTiles,
  };
}
