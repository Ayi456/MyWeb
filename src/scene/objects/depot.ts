import * as T from "three";
import type { SceneContext } from "../core/context";
import { DEPOT_ISLAND, ROPEWAY } from "../worldLayout";
import { ISLET_GRASS } from "./seasonalColors";
import { ropewayPoint } from "../systems/ropeway";

/** Appended world content; no random calls or changes to existing island batches. */
export function createDepot(ctx: SceneContext) {
  const depotIsland = new T.Group();
  depotIsland.name = "postal-depot-island";
  depotIsland.position.set(...DEPOT_ISLAND.center);
  ctx.world.add(depotIsland);
  const stone = new ctx.Batch(depotIsland, ctx.rockMat),
    grass = new ctx.Batch(depotIsland);
  for (let x = -2.2; x <= 2.2; x += 0.28)
    for (let z = -1.8; z <= 1.8; z += 0.28) {
      const d = (x / 2.2) ** 2 + (z / 1.8) ** 2;
      if (d > 1) continue;
      const h = 0.4 + 2.3 * (1 - d) ** 0.65;
      stone.add(x, -h / 2, z, 0.29, h, 0.29, d > 0.8 ? "#d0b9b0" : "#b6a4a9");
      grass.addSeasonal(
        x,
        0.05,
        z,
        0.29,
        0.13,
        0.29,
        ISLET_GRASS[Math.abs(Math.round(x * 13 + z * 7)) % 3],
      );
    }
  stone.build(false);
  grass.build(false);
  const detail = new ctx.Batch(depotIsland);
  detail.add(-0.55, 0.65, -0.35, 1.6, 1.1, 1.05, "#f1dfc2");
  detail.add(-0.55, 0.14, -0.35, 1.85, 0.18, 1.3, "#bca48e");
  for (let tier = 0; tier < 5; tier++)
    detail.add(
      -0.55,
      1.27 + tier * 0.09,
      -0.35,
      1.95 - tier * 0.16,
      0.1,
      1.3 - tier * 0.18,
      "#b78391",
    );
  detail.add(-0.57, 0.56, 0.19, 0.36, 0.78, 0.035, "#a78a74");
  for (const x of [-1.1, 0.0]) {
    detail.add(x, 0.84, 0.2, 0.3, 0.32, 0.04, "#789c9d");
    detail.add(x, 0.84, 0.23, 0.035, 0.34, 0.025, "#e9d3ae");
  }
  for (let i = 0; i < 6; i++)
    detail.add(0.2 + i * 0.22, 0.14, 0.5, 0.21, 0.045, 0.38, "#d9c6a5");
  for (const [x, y, z] of [
    [-1.25, 0.28, 0.8],
    [-0.95, 0.28, 0.8],
    [-1.1, 0.57, 0.8],
  ]) {
    detail.add(x, y, z, 0.28, 0.26, 0.3, "#c19d76");
    detail.add(x, y, z + 0.155, 0.07, 0.22, 0.015, "#f2dfbc");
  }
  detail.add(1.1, 1.02, 0.65, 0.12, 1.9, 0.12, "#8e9b94");
  detail.add(1.1, 2.0, 0.65, 0.7, 0.12, 0.18, "#b2b8a4");
  detail.build(false);
  const infrastructure = new ctx.Batch();
  infrastructure.add(
    ROPEWAY.start[0],
    2.28,
    ROPEWAY.start[2],
    0.1,
    2.1,
    0.1,
    "#8e9b94",
  );
  infrastructure.add(
    ROPEWAY.start[0],
    3.31,
    ROPEWAY.start[2],
    0.65,
    0.1,
    0.18,
    "#b2b8a4",
  );
  infrastructure.build(false);
  for (const side of [-1, 1])
    ctx.line(
      ctx.world,
      Array.from({ length: 33 }, (_, i) => {
        const p = ropewayPoint(i / 32);
        p[0] += side * 0.12;
        return p;
      }),
      "#7f8c89",
    );
  const cablecar = new T.Group();
  cablecar.name = "postal-cablecar";
  ctx.world.add(cablecar);
  const car = new ctx.Batch(cablecar);
  car.add(0, -0.3, 0, 0.045, 0.6, 0.045, "#8e9b94");
  car.add(0, -0.58, 0, 0.7, 0.08, 0.52, "#bc8e99");
  car.add(0, -0.96, 0, 0.68, 0.08, 0.5, "#b5a385");
  for (const x of [-0.3, 0.3])
    for (const z of [-0.22, 0.22])
      car.add(x, -0.75, z, 0.045, 0.4, 0.045, "#88a99b");
  for (const x of [-0.16, 0.16]) {
    car.add(x, -0.83, 0, 0.26, 0.22, 0.31, "#c4a47e");
    car.add(x, -0.83, 0.16, 0.06, 0.19, 0.015, "#f1dec0");
  }
  car.build(false);
  cablecar.position.set(...ROPEWAY.start);
  cablecar.rotation.y = Math.atan2(
    ROPEWAY.end[0] - ROPEWAY.start[0],
    ROPEWAY.end[2] - ROPEWAY.start[2],
  );
  return { depotIsland, cablecar };
}
