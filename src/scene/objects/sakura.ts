import * as T from "three";
import { type SceneContext, type Point3, TAU } from "../core/context";
import {
  FLOWER_CENTER,
  blossom,
  fallenPetal,
  flowerHead,
} from "./seasonalColors";
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
  // Enhanced bark with color variation for natural wood texture
  const barkColors = ["#967365", "#8b6a5e", "#a07968", "#856358"];
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
    const barkColor = barkColors[Math.floor(random() * barkColors.length)];
    rod(bark, a, b, w, barkColor);
    bark.add(...a, w, w, w, barkColor);
    bark.add(...b, w * 0.85, w * 0.85, w * 0.85, barkColor);
  }
  // Root flare with varied colors
  for (let i = 0; i < 7; i++) {
    const a = (i * TAU) / 7;
    const rootColor = barkColors[(i * 3) % barkColors.length];
    rod(
      bark,
      [Math.cos(a) * 0.7, 0, Math.sin(a) * 0.5],
      [0, 0.22, 0],
      0.15,
      rootColor,
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
      rx * 1.64,
      ry * 1.64,
      rz * 1.64,
      blossom(colors[index % 4], true),
    );
    // Broad secondary lobes leave quiet surfaces between the blossom clusters.
    for (let j = 0; j < 3; j++) {
      const a = (j * TAU) / 3 + index * 0.73,
        high = j === 0;
      const size = 0.78 + ((index + j) % 3) * 0.1;
      blossoms.addSeasonal(
        x + Math.cos(a) * rx * 0.56,
        y + (high ? 0.4 : -0.08) * ry,
        z + Math.sin(a) * rz * 0.56,
        rx * size,
        ry * (high ? 1.06 : 0.88),
        rz * size,
        blossom(colors[(index + j) % 4], high),
        0,
        a,
        0,
      );
    }
  });
  blossoms.build();

  // Small five-petal clusters break up the large crown volumes and give the
  // tree a hand-planted, close-up read without turning every petal into a
  // separate draw call.
  const details = new PuffBatch(tree);
  const petalColors = ["#e9a9bf", "#f4c2d0", "#f8d3dc", "#dda0b8"];
  lobes.forEach(([x, y, z, rx, ry, rz], index) => {
    for (let j = 0; j < 5; j++) {
      const angle = (j * TAU) / 5 + index * 0.84,
        radius = 1.05 + random() * 0.24,
        px = x + Math.cos(angle) * rx * radius,
        py = y + Math.sin(angle * 1.7) * ry * 0.58 + (j % 2) * 0.04,
        pz = z + rz * (0.82 + random() * 0.18),
        petal = 0.068 + random() * 0.022;
      for (let k = 0; k < 5; k++) {
        const a = (k * TAU) / 5;
        // Add subtle height variation to petals for depth
        const heightOffset = Math.sin(k * TAU / 5) * 0.008;
        details.addSeasonal(
          px + Math.cos(a) * petal * 0.72,
          py + Math.sin(a) * petal * 0.48 + heightOffset,
          pz + Math.sin(a) * petal * 0.72,
          petal,
          petal * 0.42,
          petal * 0.82,
          flowerHead(petalColors[(index + j + k) % petalColors.length]),
          0,
          a,
          0,
        );
      }
      details.addSeasonal(
        px,
        py + 0.012,
        pz,
        0.024,
        0.018,
        0.024,
        FLOWER_CENTER,
      );
    }
  });
  // A few buds sit on the visible branch tips, making the crown feel attached
  // to the wood instead of floating above it.
  const branchTips: Point3[] = [
    [-1.78, 2.67, 0.27],
    [1.6, 2.94, -0.7],
    [-1, 3.65, -0.78],
    [0.65, 3.12, 1.28],
  ];
  for (const [x, y, z] of branchTips) {
    details.addSeasonal(x, y, z, 0.11, 0.11, 0.11, flowerHead("#df9db5"));
    // Add smaller buds around main buds for richness
    for (let b = 0; b < 3; b++) {
      const ba = (b * TAU) / 3 + random() * 0.5;
      details.addSeasonal(
        x + Math.cos(ba) * 0.08,
        y - 0.05 - random() * 0.03,
        z + Math.sin(ba) * 0.08,
        0.055,
        0.055,
        0.055,
        flowerHead(["#c8456e", "#d89bb0", "#e0a5b8"][b]),
      );
    }
    // Tiny spring buds - seasonal markers
    for (let t = 0; t < 5; t++) {
      const ta = (t * TAU) / 5;
      details.addSeasonal(
        x + Math.cos(ta) * 0.12,
        y - 0.08 - random() * 0.04,
        z + Math.sin(ta) * 0.12,
        0.035,
        0.035,
        0.035,
        { colors: ["#c8456e", "#8ab276", "#d89a55", "#f9f7fa"], scales: [1, 0.9, 0.8, 0] },
      );
    }
  }
  details.build(false);
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
