import * as T from "three";
import { type Point3, type SceneContext, TAU } from "../core/context";
import { VoxelBatch } from "../utils/voxelBatch";

/** The radius describes the outer structural ring, before rays and pendants. */
export const AUREOLE = {
  center: [-0.2, 3.3, -1.08] as const,
  radius: [3.05, 2.02] as const,
};

/** A gilded, flower-set aureole; light veils are owned by its caller. */
export function createSacredAureole(ctx: SceneContext, parent: T.Group) {
  const aureole = new T.Group();
  aureole.name = "sacred-aureole";
  parent.add(aureole);

  const goldMaterial = new T.MeshStandardMaterial({
    color: "#ffffff",
    emissive: "#c9a86a",
    emissiveIntensity: 0.24,
    roughness: 0.47,
    metalness: 0.46,
  });
  const crystalMaterial = new T.MeshStandardMaterial({
    color: "#ffffff",
    emissive: "#ffe8bc",
    emissiveIntensity: 0.34,
    roughness: 0.31,
    metalness: 0.12,
  });
  const tracery = new VoxelBatch(
    aureole,
    goldMaterial,
    new T.CylinderGeometry(0.5, 0.5, 1, 8),
  );
  const pearlMaterial = new T.MeshStandardMaterial({
    color: "#ffffff",
    emissive: "#fff0ce",
    emissiveIntensity: 0.38,
    roughness: 0.55,
    metalness: 0.18,
  });
  const pearls = new ctx.PuffBatch(aureole, pearlMaterial);
  const crystals = new VoxelBatch(
    aureole,
    crystalMaterial,
    new T.OctahedronGeometry(0.5),
  );
  const gold = "#ddbf7c",
    softGold = "#ead49d",
    oldGold = "#bfa06a",
    ivory = "#fff1d7",
    rose = "#e6c1b1";
  const [cx, cy, cz] = AUREOLE.center;
  const [rx, ry] = AUREOLE.radius;
  const point = (angle: number, scale = 1, depth = 0): Point3 => [
    cx + Math.cos(angle) * rx * scale,
    cy + Math.sin(angle) * ry * scale,
    cz + depth,
  ];
  const curve = (
    points: Point3[],
    width: number,
    color: string,
    steps = 12,
  ) => {
    const path = new T.CatmullRomCurve3(points.map((p) => new T.Vector3(...p)));
    for (let i = 0; i < steps; i++)
      ctx.rod(
        tracery,
        path.getPoint(i / steps).toArray() as Point3,
        path.getPoint((i + 1) / steps).toArray() as Point3,
        width,
        color,
      );
  };

  // Substantial outer gold, an ivory inner band, then a fine raised gold edge.
  for (const [scale, width, color, depth] of [
    [1, 0.052, gold, 0],
    [0.947, 0.031, ivory, 0.02],
    [0.905, 0.018, softGold, 0.034],
  ] as const) {
    for (let i = 0; i < 144; i++)
      ctx.rod(
        tracery,
        point((i * TAU) / 144, scale, depth),
        point(((i + 1) * TAU) / 144, scale, depth),
        width,
        color,
      );
  }

  // Forty-eight alternating rays use open, petal-shaped gold outlines.
  // Ellipse normals keep their lengths even at the narrow top and wide sides.
  for (let i = 0; i < 48; i++) {
    const angle = (i * TAU) / 48;
    const [x, y, z] = point(angle);
    const normal = new T.Vector2(
      Math.cos(angle) / rx,
      Math.sin(angle) / ry,
    ).normalize();
    const tangent = new T.Vector2(-normal.y, normal.x);
    const long = i % 2 === 0;
    const length = long ? 0.255 : 0.125;
    const width = long ? 0.037 : 0.026;
    const at = (out: number, side = 0): Point3 => [
      x + normal.x * out + tangent.x * side,
      y + normal.y * out + tangent.y * side,
      z,
    ];
    const root = at(0.016),
      tip = at(length);
    for (const side of [-1, 1]) {
      ctx.rod(tracery, root, at(length * 0.47, width * side), 0.016, gold);
      ctx.rod(tracery, at(length * 0.47, width * side), tip, 0.014, softGold);
    }
    if (long) {
      const [px, py, pz] = at(length * 0.44);
      crystals.add(
        px,
        py,
        pz + 0.006,
        0.037,
        length * 0.55,
        0.032,
        ivory,
        0,
        0,
        Math.atan2(normal.y, normal.x) - Math.PI / 2,
      );
      pearls.add(...tip, 0.038, 0.038, 0.038, ivory);
    }
    // Tiny beads punctuate the open band rather than forming a solid wall.
    const [bx, by, bz] = point(angle + TAU / 96, 0.975, 0.03);
    pearls.add(bx, by, bz, 0.039, 0.039, 0.039, i % 2 ? softGold : ivory);
  }

  // Twelve flower settings cross the rings, with larger cardinal rosettes.
  for (let i = 0; i < 12; i++) {
    const angle = (i * TAU) / 12;
    const [x, y, z] = point(angle, 0.983, 0.057);
    const cardinal = i % 3 === 0;
    const size = cardinal ? 1 : 0.78;
    for (let petal = 0; petal < 6; petal++) {
      const a = (petal * TAU) / 6 + angle;
      const px = x + Math.cos(a) * 0.077 * size;
      const py = y + Math.sin(a) * 0.077 * size;
      pearls.add(
        px,
        py,
        z,
        0.065 * size,
        0.147 * size,
        0.045,
        petal % 2 ? ivory : softGold,
        0,
        0,
        a - Math.PI / 2,
      );
      pearls.add(
        x + Math.cos(a) * 0.121 * size,
        y + Math.sin(a) * 0.121 * size,
        z + 0.013,
        0.027,
        0.027,
        0.027,
        rose,
      );
    }
    crystals.add(
      x,
      y,
      z + 0.043,
      0.108 * size,
      0.145 * size,
      0.072,
      i % 3 ? "#fff0c9" : "#efd0bd",
      0,
      0,
      angle,
    );

    // Inner scallops resemble embroidered lace between the flower settings.
    const next = angle + TAU / 12;
    curve(
      [
        point(angle, 0.947, 0.029),
        point(angle + TAU / 24, 0.879, 0.035),
        point(next, 0.947, 0.029),
      ],
      0.013,
      softGold,
      12,
    );
  }

  // A five-point floral diadem rises just beyond the upper ring and its rays.
  const crownZ = cz + 0.088;
  curve(
    [
      [cx - 0.43, 5.265, crownZ],
      [cx, 5.365, crownZ],
      [cx + 0.43, 5.265, crownZ],
    ],
    0.033,
    gold,
    20,
  );
  curve(
    [
      [cx - 0.39, 5.235, crownZ + 0.014],
      [cx, 5.315, crownZ + 0.014],
      [cx + 0.39, 5.235, crownZ + 0.014],
    ],
    0.018,
    ivory,
    20,
  );
  for (let i = -2; i <= 2; i++) {
    const x = cx + i * 0.177;
    const top = i === 0 ? 5.66 : Math.abs(i) === 1 ? 5.565 : 5.425;
    const base = 5.34 - Math.abs(i) * 0.028;
    curve(
      [
        [x - 0.07, base, crownZ],
        [x - 0.068, (top + base) / 2, crownZ],
        [x, top, crownZ],
        [x + 0.068, (top + base) / 2, crownZ],
        [x + 0.07, base, crownZ],
      ],
      0.017,
      softGold,
      20,
    );
    pearls.add(x, top, crownZ, 0.044, 0.044, 0.044, ivory);
    crystals.add(
      x,
      (top + base) / 2,
      crownZ + 0.03,
      i ? 0.069 : 0.093,
      (top - base) * 0.61,
      0.058,
      i ? "#f4ddc4" : "#ffe9b6",
    );
  }

  // Five short jewel drops finish the lower rim, away from the broad canopy.
  for (let i = -2; i <= 2; i++) {
    const [x, y, z] = point(-Math.PI / 2 + i * 0.16, 1, 0.018);
    const length = i === 0 ? 0.28 : 0.17 + (2 - Math.abs(i)) * 0.045;
    ctx.rod(tracery, [x, y, z], [x, y - length, z], 0.014, gold);
    for (let bead = 1; bead <= 3; bead++)
      pearls.add(x, y - (length * bead) / 4, z, 0.039, 0.039, 0.039, ivory);
    ctx.rod(
      tracery,
      [x - 0.052, y - length, z],
      [x + 0.052, y - length, z],
      0.019,
      gold,
    );
    crystals.add(
      x,
      y - length - 0.082,
      z + 0.012,
      i === 0 ? 0.105 : 0.08,
      i === 0 ? 0.2 : 0.15,
      0.07,
      i % 2 ? "#eac6ba" : "#f7e6c3",
    );
    pearls.add(
      x,
      y - length - (i === 0 ? 0.195 : 0.168),
      z,
      0.036,
      0.051,
      0.036,
      oldGold,
    );
  }

  const build = (batch: VoxelBatch, name: string) => {
    const mesh = batch.build(false);
    mesh.name = name;
    mesh.computeBoundingBox();
    mesh.computeBoundingSphere();
    if (mesh.boundingSphere) mesh.boundingSphere.radius *= 1.04;
    mesh.frustumCulled = true;
  };
  build(tracery, "sacred-aureole-goldwork");
  build(pearls, "sacred-aureole-pearls");
  build(crystals, "sacred-aureole-jewels");
  return aureole;
}
