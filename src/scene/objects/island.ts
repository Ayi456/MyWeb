import { type SceneContext, TAU } from "../core/context";

/** Geometry and palette migrated from the original spring-post-office.html. */
export function createIsland(ctx: SceneContext) {
  const { world, rockMat, rand, range, hash, Batch, ground } = ctx;
  // A floating, layered chunk of springtime: irregular grass rim, exposed pink stone, hanging roots.
  const terrain = new Batch(world, rockMat),
    grass = new Batch();
  const step = 0.29;
  for (let x = -4.1; x <= 4.1; x += step)
    for (let z = -3.04; z <= 3.04; z += step) {
      const d = (x / 3.95) ** 2 + (z / 2.9) ** 2,
        edge = 1 + 0.044 * Math.sin(x * 4 + z * 3);
      if (d > edge) continue;
      const y = ground(x, z),
        depth =
          0.42 + 3.47 * Math.pow(Math.max(0, 1 - d), 0.63) + hash(x, z) * 0.31;
      const lower = y - depth;
      const layers = 4;
      for (let k = 0; k < layers; k++) {
        const h = depth / layers;
        terrain.add(
          x,
          lower + h * (k + 0.5),
          z,
          step + 0.007,
          h + 0.012,
          step + 0.007,
          ["#948696", "#aa939d", "#c0aaa5", "#cfb8a7"][k],
        );
      }
      const pathZ = 0.85 + 0.31 * Math.sin(x * 1.15),
        isPath =
          (x > -0.9 && x < 3.52 && Math.abs(z - pathZ) < 0.23) ||
          (x < -0.75 && x > -2.7 && Math.abs(z - 1.13) < 0.18);
      const c = isPath
        ? ["#e5d5b2", "#d6c6a8", "#efe0c1"][Math.floor(hash(x + 4, z) * 3)]
        : ["#78a884", "#89b78d", "#a0c295", "#73a080"][
            Math.floor(hash(x, z + 5) * 4)
          ];
      grass.add(x, y + 0.02, z, step + 0.005, 0.14, step + 0.005, c);
      if (d > 0.85 && hash(x + 8, z) > 0.6)
        grass.add(x, y - 0.11, z, step + 0.03, 0.16, step + 0.03, "#698d77");
    }
  terrain.build();
  grass.build();
  const strayRock = new Batch(world, rockMat);
  for (let i = 0; i < 15; i++) {
    const a = rand() * TAU,
      r = range(0.6, 1.7),
      y = range(-3.7, -2.55),
      s = range(0.12, 0.38);
    strayRock.add(
      Math.cos(a) * r,
      y,
      Math.sin(a) * r,
      s,
      s * 1.3,
      s,
      ["#b49daa", "#cbb6b2", "#9b8a9f"][i % 3],
    );
  }
  strayRock.build();
  const vines = new Batch();
  for (let i = 0; i < 24; i++) {
    const a = (i * TAU) / 24,
      r = range(0.9, 1.01),
      x = Math.cos(a) * 3.75 * r,
      z = Math.sin(a) * 2.77 * r,
      top = ground(x, z) - 0.1;
    const n = 4 + Math.floor(rand() * 9);
    for (let j = 0; j < n; j++) {
      const xx = x + Math.sin(j * 0.65 + i) * 0.08,
        zz = z + Math.cos(j * 0.6) * 0.06,
        y = top - j * 0.15;
      vines.add(xx, y, zz, 0.038, 0.17, 0.038, "#6c9476");
      if (j % 2 === 0)
        vines.add(
          xx + 0.055,
          y - 0.02,
          zz,
          0.14,
          0.035,
          0.1,
          j % 4 ? "#9abc87" : "#7da280",
          0,
          j * 0.4,
          0.35,
        );
    }
  }
  vines.build();
  return { terrainCount: terrain.cells.length };
}
