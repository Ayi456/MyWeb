import * as T from "three";
import { type Point3, type SceneContext, TAU } from "../core/context";
import { VoxelBatch } from "../utils/voxelBatch";

/** Permanent votive ornaments remain legible beneath every seasonal crown. */
export function createSacredTree(ctx: SceneContext, tree: T.Group) {
  const ornaments = new T.Group();
  ornaments.name = "sacred-tree-ornaments";
  tree.add(ornaments);
  const gold = new T.MeshStandardMaterial({
    color: "#ffffff",
    emissive: "#c0a16c",
    emissiveIntensity: 0.055,
    roughness: 0.55,
    metalness: 0.32,
  });
  const warmCrystal = new T.MeshStandardMaterial({
    color: "#ffffff",
    emissive: "#ffe6b2",
    emissiveIntensity: 0.38,
    roughness: 0.38,
    metalness: 0.08,
  });
  const gilding = new ctx.SoftBatch(ornaments, gold);
  const ivory = new ctx.SoftBatch(ornaments);
  const pearls = new ctx.PuffBatch(ornaments, gold);
  const crystals = new VoxelBatch(
    ornaments,
    warmCrystal,
    new T.OctahedronGeometry(0.5),
  );
  const paleGold = "#d8be83",
    deepGold = "#b99a62",
    pearl = "#fff1d3";

  // Three interwoven strands hug the trunk above its spreading roots.
  const ropePoint = (angle: number, strand: number): Point3 => {
    const weave = angle * 7 + (strand * TAU) / 3;
    const radius = 0.267 + Math.cos(weave) * 0.018;
    return [
      -0.07 + Math.cos(angle) * radius,
      0.97 + Math.sin(weave) * 0.021,
      0.025 + Math.sin(angle) * radius,
    ];
  };
  for (let strand = 0; strand < 3; strand++) {
    for (let i = 0; i < 42; i++) {
      ctx.rod(
        gilding,
        ropePoint((i * TAU) / 42, strand),
        ropePoint(((i + 1) * TAU) / 42, strand),
        0.036,
        strand === 1 ? paleGold : pearl,
      );
    }
  }
  // Folded prayer papers, with a central braided knot and silk tassels.
  for (const x of [-0.25, -0.07, 0.11]) {
    const z = 0.26;
    ivory.add(x, 0.855, z, 0.08, 0.17, 0.025, "#fff1d8", 0, 0, -0.22);
    ivory.add(
      x + 0.032,
      0.745,
      z + 0.006,
      0.075,
      0.14,
      0.023,
      "#ecdbb6",
      0,
      0,
      0.45,
    );
    ivory.add(
      x + 0.005,
      0.645,
      z + 0.012,
      0.075,
      0.135,
      0.022,
      "#fff3df",
      0,
      0,
      -0.22,
    );
  }
  for (const side of [-1, 1]) {
    pearls.add(
      -0.07 + side * 0.067,
      0.976,
      0.3,
      0.16,
      0.065,
      0.075,
      paleGold,
      0,
      0,
      side * 0.35,
    );
    ctx.rod(
      gilding,
      [-0.07, 0.96, 0.3],
      [-0.07 + side * 0.16, 0.65, 0.34],
      0.025,
      paleGold,
    );
    for (let i = 0; i < 4; i++)
      ivory.add(
        -0.07 + side * 0.16 + (i - 1.5) * 0.018,
        0.585,
        0.34,
        0.012,
        0.15,
        0.013,
        i % 2 ? pearl : "#dcc496",
      );
  }

  // A fine gilded aureole frames the crown from behind, without a light beam.
  const haloPoint = (angle: number, radius = 1): Point3 => [
    -0.2 + Math.cos(angle) * 2.62 * radius,
    3.18 + Math.sin(angle) * 1.64 * radius,
    -0.91 + Math.sin(angle) * 0.12,
  ];
  for (let i = 0; i < 96; i++) {
    const angle = (i * TAU) / 96;
    ctx.rod(
      gilding,
      haloPoint(angle),
      haloPoint(((i + 1) * TAU) / 96),
      0.018,
      paleGold,
    );
    if (i % 8 === 0) {
      const [x, y, z] = haloPoint(angle);
      pearls.add(x, y, z, 0.063, 0.063, 0.063, pearl);
      if (i % 24 === 0)
        crystals.add(
          x,
          y,
          z,
          0.105,
          0.2,
          0.065,
          "#f5e4be",
          0,
          0,
          angle - Math.PI / 2,
        );
    }
  }
  // A small crest at the crown's highest point catches the warm ambient light.
  for (let i = 0; i < 6; i++) {
    const angle = (i * TAU) / 6;
    pearls.add(
      -0.2 + Math.sin(angle) * 0.1,
      4.87 + Math.cos(angle) * 0.1,
      -0.77,
      0.055,
      0.17,
      0.043,
      paleGold,
      0,
      0,
      -angle,
    );
  }
  crystals.add(-0.2, 4.87, -0.73, 0.105, 0.15, 0.08, "#fff0ca");

  // Pendants hang from actual branches; long silk tails sit below the flowers.
  const anchors: Point3[] = [
    [-1.89, 2.84, 0.4],
    [-1.42, 3.17, 1.19],
    [0.77, 3.14, 1.24],
    [1.72, 3.0, -0.64],
    [1.07, 2.67, -0.48],
    [-0.86, 3.6, -0.59],
    [-1.43, 3.39, -1.42],
    [-0.18, 4.07, 0.34],
  ];
  anchors.forEach(([x, y, z], index) => {
    const length = 0.36 + (index % 3) * 0.12;
    const bottom = y - length;
    const face = index % 2 ? -0.22 : 0.18;
    ctx.rod(gilding, [x, y, z], [x, bottom, z], 0.014, deepGold);
    pearls.add(x, bottom + 0.05, z, 0.055, 0.055, 0.055, pearl);
    if (index % 2 === 0) {
      // A framed ivory wish plaque bears a simple inlaid blossom.
      gilding.add(x, bottom - 0.11, z, 0.19, 0.245, 0.045, paleGold, 0, face);
      ivory.add(
        x,
        bottom - 0.11,
        z + 0.029,
        0.154,
        0.205,
        0.022,
        "#fff0d2",
        0,
        face,
      );
      for (let petal = 0; petal < 5; petal++) {
        const angle = (petal * TAU) / 5;
        pearls.add(
          x + Math.cos(angle) * 0.026,
          bottom - 0.11 + Math.sin(angle) * 0.026,
          z + 0.048,
          0.028,
          0.035,
          0.013,
          "#cba77b",
        );
      }
      ctx.rod(
        gilding,
        [x, bottom - 0.235, z],
        [x, bottom - 0.33, z],
        0.014,
        deepGold,
      );
      for (let tail = 0; tail < 3; tail++)
        ivory.add(
          x + (tail - 1) * 0.028,
          bottom - 0.37,
          z,
          0.018,
          0.14,
          0.016,
          tail === 1 ? "#e4b7bf" : pearl,
        );
    } else {
      // Opaque faceted crystals are inexpensive and softly self-lit at dusk.
      gilding.add(x, bottom - 0.025, z, 0.13, 0.04, 0.13, paleGold);
      crystals.add(
        x,
        bottom - 0.15,
        z,
        0.13,
        0.26,
        0.13,
        index % 3 ? "#fff0cb" : "#e7d8e5",
        0,
        Math.PI / 4,
      );
      gilding.add(x, bottom - 0.27, z, 0.075, 0.035, 0.075, paleGold);
      for (const side of [-1, 1])
        ctx.rod(
          gilding,
          [x + side * 0.06, bottom - 0.03, z],
          [x + side * 0.035, bottom - 0.25, z],
          0.012,
          paleGold,
        );
      pearls.add(x, bottom - 0.32, z, 0.045, 0.08, 0.045, pearl);
    }
  });

  // A scalloped votive garland links the low boughs, visible below the crown.
  const garland = new T.CatmullRomCurve3([
    new T.Vector3(-1.88, 2.84, 0.41),
    new T.Vector3(-1.05, 2.38, 0.86),
    new T.Vector3(-0.18, 2.4, 1.12),
    new T.Vector3(0.78, 3.15, 1.25),
  ]);
  for (let i = 0; i < 36; i++) {
    const a = garland.getPoint(i / 36);
    const b = garland.getPoint((i + 1) / 36);
    ctx.rod(
      gilding,
      a.toArray() as Point3,
      b.toArray() as Point3,
      0.015,
      paleGold,
    );
    if (i % 3 === 0) {
      pearls.add(a.x, a.y, a.z, 0.048, 0.048, 0.048, pearl);
      if (i % 6 === 0)
        crystals.add(a.x, a.y - 0.075, a.z, 0.05, 0.13, 0.045, "#f7e5c1");
    }
  }
  const buildOrnaments = (batch: VoxelBatch, name: string) => {
    const mesh = batch.build(false);
    mesh.name = name;
    // These instances are static: their parent matrix carries the tree's sway.
    // A small padded local bound keeps the fine ornaments safe at view edges.
    mesh.computeBoundingSphere();
    if (mesh.boundingSphere) mesh.boundingSphere.radius *= 1.06;
    mesh.frustumCulled = true;
  };
  buildOrnaments(gilding, "sacred-tree-gilding");
  buildOrnaments(ivory, "sacred-tree-prayers");
  buildOrnaments(pearls, "sacred-tree-pearls");
  buildOrnaments(crystals, "sacred-tree-crystals");
  return ornaments;
}
