import { type SceneContext } from "../core/context";
import {
  FLOWER_CENTER,
  FLOWER_LEAF,
  FLOWER_STEM,
  flowerHead,
} from "./seasonalColors";

/** Geometry and palette migrated from the original spring-post-office.html. */
export function createFlowers(ctx: SceneContext) {
  const { range, PuffBatch: Batch, ground } = ctx;
  // Flower borders and little tufts, all batched into a single mesh.
  const flowers = new Batch();
  for (let i = 0; i < 220; i++) {
    const x = range(-4.7, 4.6),
      z = range(-3.3, 3.3);
    if (
      (x / 4.9) ** 2 + (z / 3.5) ** 2 > 0.94 ||
      Math.abs(z - (0.85 + 0.31 * Math.sin(x * 1.15))) < 0.42 ||
      (x > 0.7 && x < 2.9 && z > -0.75 && z < 1.08) ||
      Math.hypot(x + 1.8, z + 0.7) < 0.54 ||
      (x > -2.0 && x < -0.65 && z > 1.4 && z < 2.3) ||
      (Math.abs(z - 1.45) < 0.3 && x < -0.75)
    )
      continue;
    const y = ground(x, z) + 0.11,
      h = range(0.13, 0.29),
      c = ["#f2b4c6", "#fff0c5", "#deaccd", "#f6cf95", "#eac5dd"][i % 5];
    const head = flowerHead(c);
    flowers.addSeasonal(x, y + h / 2, z, 0.021, h, 0.021, FLOWER_STEM);
    flowers.addSeasonal(
      x + 0.03,
      y + h * 0.35,
      z,
      0.09,
      0.023,
      0.035,
      FLOWER_LEAF,
      0,
      0.3,
      0.4,
    );
    flowers.addSeasonal(x, y + h, z, 0.08, 0.035, 0.08, head);
    for (const [a, b] of [
      [-0.051, 0],
      [0.051, 0],
      [0, -0.051],
      [0, 0.051],
    ])
      flowers.addSeasonal(
        x + a,
        y + h + 0.008,
        z + b,
        0.046,
        0.025,
        0.046,
        head,
      );
    flowers.addSeasonal(x, y + h + 0.03, z, 0.025, 0.015, 0.025, FLOWER_CENTER);
  }
  flowers.build(false);
  return flowers.cells.length;
}
