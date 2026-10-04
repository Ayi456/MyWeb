import * as T from "three";
import type { SceneContext } from "../core/context";
import { DEPOT_ISLAND, ROPEWAY } from "../worldLayout";
import { createClayRoof } from "./clayRoof";
import { createSoftTerrain } from "./softTerrain";
import { ropewayPoint } from "../systems/ropeway";
import { flowerHead, FLOWER_STEM, LEAF } from "./seasonalColors";

/** Appended world content; no random calls or changes to existing island batches. */
export function createDepot(ctx: SceneContext) {
  const depotIsland = new T.Group();
  depotIsland.name = "postal-depot-island";
  depotIsland.position.set(...DEPOT_ISLAND.center);
  ctx.world.add(depotIsland);
  createSoftTerrain(ctx, depotIsland, DEPOT_ISLAND.radius, 2.7, () => 0);
  const detail = new ctx.SoftBatch(depotIsland);
  detail.add(-0.55, 0.65, -0.35, 1.6, 1.1, 1.05, "#f1dfc2");
  detail.add(-0.55, 0.14, -0.35, 1.85, 0.18, 1.3, "#bca48e");
  createClayRoof(
    ctx,
    depotIsland,
    [-0.55, 1.19, -0.35],
    1.96,
    1.36,
    0.48,
    "#b78391",
    "#f1dfc2",
  );
  detail.add(-0.57, 0.56, 0.19, 0.36, 0.78, 0.035, "#a78a74");
  for (const x of [-1.1, 0.0]) {
    detail.add(x, 0.84, 0.2, 0.3, 0.32, 0.04, "#789c9d");
    detail.add(x, 0.84, 0.23, 0.035, 0.34, 0.025, "#e9d3ae");
    detail.add(x, 0.84, 0.235, 0.31, 0.025, 0.025, "#e9d3ae");
    detail.add(x, 0.61, 0.31, 0.41, 0.13, 0.2, "#b88d80");
    detail.add(x, 0.68, 0.31, 0.43, 0.035, 0.22, "#d8b6a0");
    for (let i = 0; i < 3; i++) {
      const px = x - 0.13 + i * 0.13;
      detail.addSeasonal(px, 0.73, 0.31, 0.15, 0.12, 0.16, LEAF[i % 2]);
      detail.addSeasonal(
        px,
        0.8 + (i % 2) * 0.045,
        0.32,
        0.065,
        0.065,
        0.07,
        flowerHead(i % 2 ? "#e6b06e" : "#edbdc3"),
      );
    }
  }
  // An envelope crest and striped porch make the little depot readable at a distance.
  detail.add(-0.55, 1.36, 0.27, 0.43, 0.23, 0.06, "#fff0d2");
  ctx.rod(detail, [-0.74, 1.45, 0.306], [-0.55, 1.32, 0.306], 0.025, "#b17e8b");
  ctx.rod(detail, [-0.55, 1.32, 0.306], [-0.36, 1.45, 0.306], 0.025, "#b17e8b");
  detail.add(-0.55, 1.11, 0.38, 0.68, 0.08, 0.44, "#b7c7b2", -0.12);
  for (const x of [-0.77, -0.55, -0.33])
    detail.add(x, 1.08, 0.59, 0.105, 0.11, 0.045, "#ede0be");
  detail.add(-0.55, 0.17, 0.36, 0.62, 0.14, 0.3, "#d6c1a1");
  detail.add(-0.45, 0.58, 0.222, 0.04, 0.075, 0.035, "#e6bc77");
  detail.add(-1.0, 1.58, -0.73, 0.22, 0.46, 0.24, "#d6b59c");
  detail.add(-1.0, 1.82, -0.73, 0.29, 0.075, 0.3, "#a78579");
  for (let i = 0; i < 6; i++)
    detail.add(0.2 + i * 0.22, 0.14, 0.5, 0.21, 0.045, 0.38, "#d9c6a5");
  for (const [x, y, z] of [
    [-1.25, 0.28, 0.8],
    [-0.95, 0.28, 0.8],
    [-1.1, 0.57, 0.8],
  ]) {
    detail.add(x, y, z, 0.28, 0.26, 0.3, "#c19d76");
    detail.add(x, y, z + 0.155, 0.07, 0.22, 0.015, "#f2dfbc");
    detail.add(x, y + 0.135, z, 0.07, 0.015, 0.31, "#f2dfbc");
    detail.add(x + 0.065, y + 0.035, z + 0.165, 0.09, 0.065, 0.015, "#fff0d2");
  }
  // Open sorting shelter: shallow pigeonholes, bundled letters, and a weighing table.
  for (const x of [0.44, 1.65]) {
    detail.add(x, 0.68, -0.96, 0.075, 1.16, 0.075, "#9caa97");
    detail.add(x, 0.68, -0.26, 0.075, 1.16, 0.075, "#9caa97");
  }
  detail.add(1.045, 1.29, -0.61, 1.43, 0.12, 0.95, "#b7c5ab", -0.08);
  detail.add(1.045, 1.21, -0.12, 1.42, 0.1, 0.055, "#e5d7b8");
  detail.add(1.045, 0.53, -0.9, 1.12, 0.73, 0.075, "#b5977b");
  for (const y of [0.2, 0.51, 0.85])
    detail.add(1.045, y, -0.73, 1.19, 0.055, 0.4, "#e0c39b");
  for (const x of [0.49, 0.86, 1.23, 1.6])
    detail.add(x, 0.53, -0.74, 0.035, 0.65, 0.37, "#dec3a0");
  for (let i = 0; i < 6; i++) {
    const x = 0.67 + (i % 3) * 0.37,
      y = i < 3 ? 0.32 : 0.64;
    detail.add(x, y, -0.7, 0.24, 0.18, 0.24, i % 2 ? "#d8b28d" : "#f1dfbe");
    detail.add(x, y, -0.574, 0.035, 0.17, 0.015, "#b9967d");
    detail.add(x + 0.065, y + 0.03, -0.562, 0.07, 0.055, 0.012, "#fcf0d6");
  }
  detail.add(1.045, 0.48, -0.25, 1.14, 0.08, 0.25, "#c9ab86");
  detail.add(1.4, 0.56, -0.25, 0.22, 0.08, 0.19, "#829d96");
  detail.add(1.4, 0.635, -0.25, 0.31, 0.04, 0.23, "#c7c5af");
  for (let i = 0; i < 3; i++)
    detail.add(
      0.72,
      0.535 + i * 0.026,
      -0.23,
      0.24,
      0.022,
      0.16,
      "#fff1d5",
      0,
      i * 0.07,
    );

  // Tied canvas mailbags and low planting keep the rest of the lawn open.
  for (const [x, z, height] of [
    [-1.85, 0.42, 0.5],
    [-1.8, 0.85, 0.4],
  ]) {
    detail.add(
      x,
      0.1 + height / 2,
      z,
      0.36,
      height,
      0.31,
      "#c7b792",
      0,
      -0.14,
      0.08,
    );
    detail.add(x + 0.025, height + 0.08, z, 0.17, 0.075, 0.16, "#927e65");
    detail.add(
      x + 0.03,
      height + 0.15,
      z,
      0.2,
      0.12,
      0.18,
      "#dbc9a6",
      0,
      0,
      -0.2,
    );
    detail.add(x, height * 0.57, z + 0.16, 0.16, 0.11, 0.015, "#f8e9c8");
  }
  for (let i = 0; i < 7; i++) {
    const angle = 0.3 + (i / 6) * 2.5,
      x = Math.cos(angle) * 2.08,
      z = Math.sin(angle) * 1.55;
    detail.add(x, 0.12, z, 0.32, 0.07, 0.23, "#d5c6aa", 0, -angle);
    for (let j = 0; j < 2; j++) {
      const px = x + (j - 0.5) * 0.15;
      detail.addSeasonal(px, 0.24, z, 0.035, 0.25, 0.035, FLOWER_STEM);
      detail.addSeasonal(
        px,
        0.26,
        z,
        0.17,
        0.07,
        0.1,
        LEAF[(i + j) % 2],
        0,
        0,
        j ? -0.4 : 0.4,
      );
      detail.addSeasonal(
        px,
        0.39,
        z,
        0.12,
        0.09,
        0.12,
        flowerHead(i % 2 ? "#e8ba78" : "#d9adc1"),
      );
    }
  }
  detail.add(1.1, 1.02, 0.65, 0.12, 1.9, 0.12, "#8e9b94");
  detail.add(1.1, 2.0, 0.65, 0.7, 0.12, 0.18, "#b2b8a4");
  detail.build(false);
  const infrastructure = new ctx.SoftBatch();
  const stationGround = ctx.ground(ROPEWAY.start[0], ROPEWAY.start[2]) + 0.09;
  const supportTop = ROPEWAY.start[1] - 0.04;
  infrastructure.add(
    ROPEWAY.start[0],
    (stationGround + supportTop) / 2,
    ROPEWAY.start[2],
    0.1,
    supportTop - stationGround,
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
  const car = new ctx.SoftBatch(cablecar);
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
