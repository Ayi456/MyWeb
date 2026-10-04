import { type SceneContext } from "../core/context";
import { SACRED_TREE } from "../worldLayout";
import {
  FLOWER_CENTER,
  FLOWER_LEAF,
  FLOWER_STEM,
  flowerHead,
} from "./seasonalColors";

/** Geometry and palette migrated from the original spring-post-office.html. */
export function createFlowers(ctx: SceneContext) {
  const { range, PuffBatch: Batch, ground } = ctx;
  // Beds frame the path and island edge; a few stray flowers soften their borders.
  const flowers = new Batch();
  const beds = [
    [-3.5, 0.4],
    [-2.8, -1.6],
    [-3.7, -2.7],
    [0.25, 2.1],
    [2.5, 1.9],
    [3.6, -1.05],
  ];
  for (let i = 0; i < 120; i++) {
    const bed = beds[i % beds.length];
    const angle = range(0, Math.PI * 2);
    const radius = Math.sqrt(range(0, 1));
    const x =
      i < 104 ? bed[0] + Math.cos(angle) * radius * 0.82 : range(-4.7, 4.6);
    const z =
      i < 104 ? bed[1] + Math.sin(angle) * radius * 0.55 : range(-3.3, 3.3);
    if (
      (x / 4.9) ** 2 + (z / 3.5) ** 2 > 0.94 ||
      Math.abs(z - (0.85 + 0.31 * Math.sin(x * 1.15))) < 0.42 ||
      (x > 0.7 && x < 2.9 && z > -0.75 && z < 1.08) ||
      Math.hypot(x - SACRED_TREE.center[0], z - SACRED_TREE.center[1]) < 1.88 ||
      ((x + 2.72) / 0.86) ** 2 + ((z - 1.38) / 0.7) ** 2 < 1 ||
      (x > -3.8 && x < -2.9 && z > 1.35 && z < 2.02) ||
      (x > -2.0 && x < -0.65 && z > 1.4 && z < 2.3) ||
      (Math.abs(z - 1.45) < 0.3 && x < -0.75)
    )
      continue;
    const y = ground(x, z) + 0.11,
      h = range(0.13, 0.29),
      c = ["#f2b4c6", "#fff0c5", "#deaccd", "#f6cf95", "#eac5dd"][i % 5];
    const head = flowerHead(c);

    // Stem with subtle thickness variation
    const stemThickness = range(0.018, 0.024);
    flowers.addSeasonal(
      x,
      y + h / 2,
      z,
      stemThickness,
      h,
      stemThickness,
      FLOWER_STEM,
    );

    // Multiple leaves at different heights for richness
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
    // Second leaf on opposite side
    flowers.addSeasonal(
      x - 0.025,
      y + h * 0.5,
      z,
      0.075,
      0.02,
      0.03,
      FLOWER_LEAF,
      0,
      -0.4,
      0.35,
    );

    // Main flower head
    flowers.addSeasonal(x, y + h, z, 0.08, 0.035, 0.08, head);

    // Petals with subtle height variation
    for (const [a, b, heightOffset] of [
      [-0.051, 0, 0.008],
      [0.051, 0, 0.008],
      [0, -0.051, 0.01],
      [0, 0.051, 0.006],
    ])
      flowers.addSeasonal(
        x + a,
        y + h + heightOffset,
        z + b,
        0.046,
        0.025,
        0.046,
        head,
      );

    // Flower center with slight dome
    flowers.addSeasonal(x, y + h + 0.03, z, 0.025, 0.015, 0.025, FLOWER_CENTER);

    // Add tiny buds next to some flowers (every 4th flower)
    if (i % 4 === 0) {
      const budOffset = range(0.08, 0.12);
      const budAngle = range(0, Math.PI * 2);
      const budX = x + Math.cos(budAngle) * budOffset;
      const budZ = z + Math.sin(budAngle) * budOffset;
      const budH = h * 0.65;

      // Bud stem
      flowers.addSeasonal(
        budX,
        y + budH / 2,
        budZ,
        0.015,
        budH,
        0.015,
        FLOWER_STEM,
      );
      // Closed bud
      flowers.addSeasonal(budX, y + budH, budZ, 0.035, 0.05, 0.035, {
        colors: [c, "#8ab276", "#d89a55", "#f9f7fa"],
        scales: [1, 0.9, 0.8, 0],
      });
    }
  }
  flowers.build(false);
  return flowers.cells.length;
}
