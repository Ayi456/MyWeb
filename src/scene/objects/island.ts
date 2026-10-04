import { type SceneContext, TAU } from "../core/context";
import { LEAF } from "./seasonalColors";
import { MAIN_ISLAND } from "../worldLayout";
import { createSoftTerrain, islandOutline } from "./softTerrain";
import { createIslandDetails } from "./islandDetails";

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
      0.27 + (i % 3) * 0.01,
      0.045 + (i % 2) * 0.008,
      0.35 + (i % 4) * 0.012,
      i % 3 ? "#e6d8bc" : "#d7c9ae",
      0,
      Math.cos(x * 1.15) * -0.24 + Math.sin(i * 2.4) * 0.06,
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

  // Add grass tufts scattered across the island for natural detail
  const grass = new PuffBatch();
  for (let i = 0; i < 45; i++) {
    const a = rand() * TAU;
    const r = range(0.3, 0.85);
    const x = Math.cos(a) * radius[0] * r;
    const z = Math.sin(a) * radius[1] * r;
    const d = (x / radius[0]) ** 2 + (z / radius[1]) ** 2;
    const outline = islandOutline(Math.atan2(z / radius[1], x / radius[0]));

    if (d <= outline ** 2 * 0.7) {
      const y = ground(x, z) + 0.08;
      // Grass blade cluster (3-5 blades per tuft)
      const bladeCount = 3 + Math.floor(rand() * 3);
      for (let b = 0; b < bladeCount; b++) {
        const angle = (b / bladeCount) * TAU + rand() * 0.3;
        const offset = rand() * 0.025;
        grass.addSeasonal(
          x + Math.cos(angle) * offset,
          y + 0.045,
          z + Math.sin(angle) * offset,
          0.018,
          0.09,
          0.018,
          LEAF[b % LEAF.length],
          0,
          angle,
          rand() * 0.2 - 0.1,
        );
      }
    }
  }
  grass.build(false);

  // Small wildflowers dotted around
  const wildflowers = new PuffBatch();
  for (let i = 0; i < 25; i++) {
    const a = rand() * TAU;
    const r = range(0.35, 0.8);
    const x = Math.cos(a) * radius[0] * r;
    const z = Math.sin(a) * radius[1] * r;
    const d = (x / radius[0]) ** 2 + (z / radius[1]) ** 2;
    const outline = islandOutline(Math.atan2(z / radius[1], x / radius[0]));

    if (d <= outline ** 2 * 0.65) {
      const y = ground(x, z) + 0.09;
      const flowerColors = ["#f5dfb6", "#e7afbd", "#d4c5e8", "#ffd4a3"];
      const stemColor = i % 3 ? "#7a9b72" : "#6b8966";

      // Stem
      wildflowers.add(x, y + 0.03, z, 0.012, 0.06, 0.012, stemColor);
      // Flower head
      wildflowers.addSeasonal(x, y + 0.065, z, 0.028, 0.028, 0.028, {
        colors: [flowerColors[i % 4], "#8ab276", "#d89a55", "#f9f7fa"],
        scales: [1, 0.9, 0.8, 0],
      });
    }
  }
  wildflowers.build(false);

  // Decorative pebbles near the path
  const pebbles = new PuffBatch(world, rockMat);
  for (let i = 0; i < 30; i++) {
    const a = rand() * TAU;
    const r = range(0.25, 0.75);
    const x = Math.cos(a) * radius[0] * r;
    const z = Math.sin(a) * radius[1] * r;
    const d = (x / radius[0]) ** 2 + (z / radius[1]) ** 2;
    const outline = islandOutline(Math.atan2(z / radius[1], x / radius[0]));

    if (d <= outline ** 2 * 0.72) {
      const y = ground(x, z) + 0.04;
      const size = range(0.03, 0.07);
      pebbles.add(
        x,
        y,
        z,
        size,
        size * range(0.6, 0.9),
        size * range(0.8, 1.1),
        ["#d8ccc1", "#c9bdb5", "#b5a99f"][i % 3],
        0,
        rand() * TAU,
      );
    }
  }
  createIslandDetails(ctx, soil, pebbles, vines);
  pebbles.build(false).name = "island-stone-ledges-and-borders";
  vines.build(false).name = "island-seasonal-gardens-and-ivy";

  return {
    terrainCount: soil.geometry.getAttribute("position").count,
    walkTiles,
  };
}
