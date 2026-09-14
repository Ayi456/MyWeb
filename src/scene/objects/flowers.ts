import { type SceneContext } from "../core/context";

/** Geometry and palette migrated from the original spring-post-office.html. */
export function createFlowers(ctx: SceneContext) {
  const { range, Batch, ground } = ctx;
  // Flower borders and little tufts, all batched into a single mesh.
  const flowers = new Batch();
  for (let i = 0; i < 220; i++) {
    const x = range(-3.6, 3.25),
      z = range(-2.5, 2.5);
    if (
      (x / 3.7) ** 2 + (z / 2.6) ** 2 > 0.94 ||
      Math.abs(z - (0.85 + 0.31 * Math.sin(x * 1.15))) < 0.42 ||
      (x > 0.15 && x < 2.25 && z > -0.75 && z < 1.08) ||
      Math.hypot(x + 1.15, z + 0.48) < 0.54
    )
      continue;
    const y = ground(x, z) + 0.11,
      h = range(0.13, 0.29),
      c = ["#f2b4c6", "#fff0c5", "#deaccd", "#f6cf95", "#eac5dd"][i % 5];
    flowers.add(x, y + h / 2, z, 0.021, h, 0.021, "#638976");
    flowers.add(
      x + 0.03,
      y + h * 0.35,
      z,
      0.09,
      0.023,
      0.035,
      "#8daf83",
      0,
      0.3,
      0.4,
    );
    flowers.add(x, y + h, z, 0.08, 0.035, 0.08, c);
    for (const [a, b] of [
      [-0.051, 0],
      [0.051, 0],
      [0, -0.051],
      [0, 0.051],
    ])
      flowers.add(x + a, y + h + 0.008, z + b, 0.046, 0.025, 0.046, c);
    flowers.add(x, y + h + 0.03, z, 0.025, 0.015, 0.025, "#d7ad6e");
  }
  flowers.build(false);
  return flowers.cells.length;
}
