import * as T from "three";
import { type SceneContext, type Point3, TAU, clamp } from "../core/context";
import { blossom, fallenPetal } from "./seasonalColors";

/** Geometry and palette migrated from the original spring-post-office.html. */
export function createSakura(ctx: SceneContext) {
  const { world, rand, range, Batch, rod, ground } = ctx;
  // The cherry tree is a voxel union of seven broad, asymmetrical blossom crowns.
  const tree = new T.Group();
  tree.position.set(-1.8, ground(-1.8, -0.7) + 0.1, -0.7);
  world.add(tree);
  const bark = new Batch(tree);
  const branches: [Point3, Point3, number][] = [
    [[0, 0, 0], [0.1, 0.86, 0.04], 0.57],
    [[0.1, 0.8, 0.04], [-0.16, 1.6, 0.02], 0.44],
    [[-0.16, 1.48, 0.02], [-0.03, 2.35, -0.03], 0.33],
    [[-0.1, 1.6, 0], [-1.0, 2.1, 0.18], 0.28],
    [[-1, 2.1, 0.18], [-1.78, 2.67, 0.27], 0.17],
    [[-0.04, 2.1, 0], [0.85, 2.6, -0.45], 0.25],
    [[0.85, 2.6, -0.45], [1.6, 2.94, -0.7], 0.13],
    [[-0.02, 2.2, -0.03], [-0.55, 3.15, -0.6], 0.21],
    [[-0.55, 3.15, -0.6], [-1.0, 3.65, -0.78], 0.1],
    [[0.0, 2.2, 0.04], [0.28, 2.8, 1.0], 0.19],
    [[0.28, 2.8, 1.0], [0.65, 3.12, 1.28], 0.1],
    [[-0.8, 2.0, 0.15], [-1.05, 2.85, 1.0], 0.14],
  ];
  for (const [a, b, w] of branches) rod(bark, a, b, w, "#967365");
  for (let i = 0; i < 7; i++) {
    const a = (i * TAU) / 7;
    rod(
      bark,
      [Math.cos(a) * 0.78, 0.01, Math.sin(a) * 0.55],
      [0, 0.35, 0],
      0.13,
      "#a38369",
    );
  }
  for (let i = 0; i < 10; i++)
    bark.add(
      range(-0.13, 0.14),
      0.35 + i * 0.15,
      0.24,
      0.075,
      0.035,
      0.033,
      "#bf9b7b",
    );
  bark.build();
  const lobes = [
    [-1.55, 2.96, 0.04, 1.18, 0.77, 1.0],
    [-0.77, 3.62, -0.18, 1.3, 0.96, 1.15],
    [0.38, 3.54, -0.38, 1.28, 0.94, 1.15],
    [1.4, 2.99, -0.62, 1.05, 0.76, 0.96],
    [-0.98, 3.0, 0.95, 1.07, 0.76, 0.88],
    [0.45, 3.0, 0.95, 1.17, 0.74, 0.9],
    [-0.9, 3.1, -1.1, 1.38, 0.8, 0.88],
  ];
  function inCrown(x: number, y: number, z: number) {
    return lobes.some(
      (p) =>
        ((x - p[0]) / p[3]) ** 2 +
          ((y - p[1]) / p[4]) ** 2 +
          ((z - p[2]) / p[5]) ** 2 <
        1,
    );
  }
  const blossoms = new Batch(tree);
  const leafStep = 0.17;
  for (let x = -2.75; x <= 2.55; x += leafStep)
    for (let y = 2.1; y <= 4.65; y += leafStep)
      for (let z = -2.1; z <= 2.0; z += leafStep) {
        if (!inCrown(x, y, z)) continue;
        if (
          inCrown(x + leafStep, y, z) &&
          inCrown(x - leafStep, y, z) &&
          inCrown(x, y + leafStep, z) &&
          inCrown(x, y - leafStep, z) &&
          inCrown(x, y, z + leafStep) &&
          inCrown(x, y, z - leafStep)
        )
          continue;
        const q = rand(),
          high = clamp((y - 2.3) / 2, 0, 1);
        const c =
          q < 0.07
            ? "#ffebe3"
            : q < 0.21
              ? "#e4a0b5"
              : high > 0.6
                ? q < 0.6
                  ? "#f7bfce"
                  : "#ffd6db"
                : q < 0.55
                  ? "#e6a0b7"
                  : "#efb0c4";
        const s = leafStep * range(0.94, 1.13);
        // Upper, outer voxels hold snow in winter; the rest of the crown goes bare.
        blossoms.addSeasonal(
          x,
          y,
          z,
          s,
          s * range(0.78, 1),
          s,
          blossom(c, high > 0.45 && q > 0.3),
        );
      }
  blossoms.build();
  const fallen = new Batch();
  for (let i = 0; i < 220; i++) {
    const x = range(-4.2, 0.4),
      z = range(-2.3, 2.0);
    if ((x / 3.9) ** 2 + (z / 2.9) ** 2 < 0.88)
      fallen.addSeasonal(
        x,
        ground(x, z) + 0.096,
        z,
        0.063,
        0.012,
        0.045,
        fallenPetal(i % 3 ? "#efb6c5" : "#ffe3dc"),
        0,
        rand() * TAU,
        0,
      );
  }
  fallen.build(false);
  return { tree, blossomCount: blossoms.cells.length };
}
