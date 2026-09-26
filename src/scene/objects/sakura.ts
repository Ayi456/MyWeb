import * as T from "three";
import { type SceneContext, type Point3, TAU } from "../core/context";
import { blossom, fallenPetal } from "./seasonalColors";
import { seededRandom } from "../utils/seededRandom";

export function createSakura(ctx: SceneContext) {
  const { world, PuffBatch, rod, ground } = ctx;
  const random = seededRandom(314160);
  const range = (a: number, b: number) => a + (b - a) * random();
  const tree = new T.Group();
  tree.position.set(-1.8, ground(-1.8, -0.7) + 0.1, -0.7);
  world.add(tree);
  const trunk = new T.CatmullRomCurve3([
    new T.Vector3(0, -0.03, 0),
    new T.Vector3(0.08, 0.65, 0.04),
    new T.Vector3(-0.14, 1.45, 0.02),
    new T.Vector3(-0.03, 2.35, -0.03),
  ]);
  ctx.mesh(
    new T.TubeGeometry(trunk, 18, 0.22, 10, false),
    new T.MeshStandardMaterial({ color: "#967365", roughness: 0.95 }),
    tree,
  );
  const bark = new PuffBatch(tree);
  const branches: [Point3, Point3, number][] = [
    [[-0.1, 1.6, 0], [-1, 2.1, 0.18], 0.32],
    [[-1, 2.1, 0.18], [-1.78, 2.67, 0.27], 0.2],
    [[-0.04, 2.1, 0], [0.85, 2.6, -0.45], 0.28],
    [[0.85, 2.6, -0.45], [1.6, 2.94, -0.7], 0.16],
    [[-0.02, 2.2, -0.03], [-0.55, 3.15, -0.6], 0.24],
    [[-0.55, 3.15, -0.6], [-1, 3.65, -0.78], 0.13],
    [[0, 2.2, 0.04], [0.28, 2.8, 1], 0.22],
    [[0.28, 2.8, 1], [0.65, 3.12, 1.28], 0.13],
    [[-0.8, 2, 0.15], [-1.05, 2.85, 1], 0.18],
  ];
  for (const [a, b, w] of branches) {
    rod(bark, a, b, w, "#967365");
    bark.add(...a, w, w, w, "#967365");
    bark.add(...b, w * 0.85, w * 0.85, w * 0.85, "#967365");
  }
  for (let i = 0; i < 7; i++) {
    const a = (i * TAU) / 7;
    rod(
      bark,
      [Math.cos(a) * 0.7, 0, Math.sin(a) * 0.5],
      [0, 0.22, 0],
      0.15,
      "#a38369",
    );
  }
  bark.build();
  const lobes = [
    [-1.55, 2.96, 0.04, 1.18, 0.77, 1],
    [-0.77, 3.62, -0.18, 1.3, 0.96, 1.15],
    [0.38, 3.54, -0.38, 1.28, 0.94, 1.15],
    [1.4, 2.99, -0.62, 1.05, 0.76, 0.96],
    [-0.98, 3, 0.95, 1.07, 0.76, 0.88],
    [0.45, 3, 0.95, 1.17, 0.74, 0.9],
    [-0.9, 3.1, -1.1, 1.38, 0.8, 0.88],
  ];
  const blossoms = new PuffBatch(tree);
  lobes.forEach(([x, y, z, rx, ry, rz], index) => {
    const colors = ["#e8aec2", "#f3bfd0", "#f8cbd5", "#eeb4c8"];
    blossoms.addSeasonal(
      x,
      y,
      z,
      rx * 1.9,
      ry * 1.9,
      rz * 1.9,
      blossom(colors[index % 4], true),
    );
    // A handful of overlapping petals softens each crown without granular noise.
    for (let j = 0; j < 8; j++) {
      const a = (j * TAU) / 8 + index * 0.37,
        high = j % 3 === 0;
      blossoms.addSeasonal(
        x + Math.cos(a) * rx * 0.65,
        y + (high ? 0.5 : -0.04) * ry,
        z + Math.sin(a) * rz * 0.65,
        rx * 0.92,
        ry * (high ? 0.95 : 0.8),
        rz * 0.95,
        blossom(colors[(index + j) % 4], high),
        0,
        a,
        0,
      );
    }
  });
  blossoms.build();
  const fallen = new PuffBatch();
  for (let i = 0; i < 140; i++) {
    const x = range(-4.2, 0.4),
      z = range(-2.3, 2);
    if ((x / 3.9) ** 2 + (z / 2.9) ** 2 < 0.88)
      fallen.addSeasonal(
        x,
        ground(x, z) + 0.102,
        z,
        0.07,
        0.016,
        0.048,
        fallenPetal(i % 3 ? "#efb6c5" : "#ffe3dc"),
        0,
        random() * TAU,
        0,
      );
  }
  fallen.build(false);
  return { tree, blossomCount: blossoms.cells.length };
}
