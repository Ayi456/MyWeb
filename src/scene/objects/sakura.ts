import * as T from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { type SceneContext, type Point3, TAU } from "../core/context";
import { fallenPetal } from "./seasonalColors";
import { seededRandom } from "../utils/seededRandom";
import { VoxelBatch } from "../utils/voxelBatch";
import { SACRED_TREE } from "../worldLayout";
import { createSacredTree } from "./sacredTree";
import {
  createBarkTexture,
  createBlossomSpray,
  createLeafSpray,
  taperedBranch,
} from "./sakuraGeometry";

export function createSakura(ctx: SceneContext) {
  const { world, PuffBatch, ground } = ctx;
  const random = seededRandom(314160);
  const range = (a: number, b: number) => a + (b - a) * random();
  const tree = new T.Group();
  tree.name = "sakura-tree";
  const [treeX, treeZ] = SACRED_TREE.center;
  tree.position.set(treeX, ground(treeX, treeZ) + 0.1, treeZ);
  tree.scale.set(...SACRED_TREE.scale);
  world.add(tree);

  const wood: T.BufferGeometry[] = [];
  const branch = (points: Point3[], start: number, end: number) => {
    wood.push(taperedBranch(points, start, end));
  };
  branch(
    [
      [0, -0.08, 0],
      [0.08, 0.52, 0.04],
      [-0.12, 1.3, 0.01],
      [-0.02, 2.18, -0.05],
      [-0.17, 2.86, -0.3],
    ],
    0.285,
    0.08,
  );
  // Root buttresses blend into the soil rather than ending in round beads.
  for (let i = 0; i < 7; i++) {
    const angle = (i * TAU) / 7 + range(-0.2, 0.2);
    const x = Math.cos(angle),
      z = Math.sin(angle);
    branch(
      [
        [x * 0.05, 0.42, z * 0.05],
        [x * 0.25, 0.1, z * 0.2],
        [x * range(0.5, 0.8), -0.045, z * range(0.42, 0.65)],
      ],
      0.13,
      0.018,
    );
  }

  const limbs: { points: Point3[]; radius: number }[] = [
    {
      points: [
        [-0.1, 1.48, 0],
        [-0.6, 1.92, 0.11],
        [-1.21, 2.4, 0.32],
        [-1.95, 2.84, 0.4],
      ],
      radius: 0.155,
    },
    {
      points: [
        [-0.02, 2.05, -0.02],
        [0.5, 2.4, -0.25],
        [1.08, 2.65, -0.48],
        [1.77, 3.02, -0.64],
      ],
      radius: 0.13,
    },
    {
      points: [
        [-0.05, 2.18, -0.03],
        [-0.42, 2.75, -0.37],
        [-0.68, 3.32, -0.52],
        [-1, 3.82, -0.64],
      ],
      radius: 0.12,
    },
    {
      points: [
        [-0.02, 2.02, 0.02],
        [0.12, 2.46, 0.57],
        [0.38, 2.8, 0.96],
        [0.79, 3.15, 1.25],
      ],
      radius: 0.105,
    },
    {
      points: [
        [-0.72, 2.04, 0.16],
        [-0.85, 2.51, 0.57],
        [-1.1, 2.95, 0.88],
        [-1.45, 3.18, 1.2],
      ],
      radius: 0.093,
    },
    {
      points: [
        [-0.02, 2.34, -0.13],
        [0.2, 2.89, -0.34],
        [0.42, 3.38, -0.36],
        [0.5, 3.85, -0.5],
      ],
      radius: 0.096,
    },
    {
      points: [
        [-0.16, 2.43, -0.24],
        [-0.52, 2.77, -0.82],
        [-1.1, 3.05, -1.24],
        [-1.47, 3.41, -1.45],
      ],
      radius: 0.083,
    },
    {
      points: [
        [-0.13, 2.55, -0.22],
        [-0.06, 3.03, 0.09],
        [-0.21, 3.64, 0.28],
        [-0.18, 4.12, 0.34],
      ],
      radius: 0.09,
    },
  ];
  for (const { points, radius } of limbs) branch(points, radius, 0.015);
  // Keep the long, low limb over the hanging seat.
  branch(
    [
      [-1.13, 2.35, 0.3],
      [-1.45, 2.65, 0.49],
      [-1.91, 2.7, 0.53],
    ],
    0.061,
    0.02,
  );

  const petals = new T.MeshStandardMaterial({
    roughness: 0.88,
    side: T.DoubleSide,
    vertexColors: true,
  });
  const blossoms = new VoxelBatch(tree, petals, createBlossomSpray());
  blossoms.onSeasonal = (data) => ctx.seasonal.register(data);
  const leaves = new VoxelBatch(tree, petals, createLeafSpray());
  leaves.onSeasonal = (data) => ctx.seasonal.register(data);
  const snow = new PuffBatch(tree);
  const spring = ["#f8dce2", "#efc4d2", "#f6d3dc", "#e9b7ca", "#f9e4e7"];
  const summer = ["#65935e", "#7aa267", "#91ad72", "#577f54"];
  const autumn = ["#d79345", "#c16937", "#e1a554", "#a75236"];
  // Layered crowns surround an elevated heart, with branch silhouettes below.
  const lobes = [
    [-1.6, 3.08, 0.16, 0.95, 0.47, 0.73],
    [-0.85, 3.77, -0.26, 0.96, 0.55, 0.78],
    [0.4, 3.65, -0.44, 0.93, 0.54, 0.78],
    [1.46, 3.09, -0.6, 0.8, 0.46, 0.7],
    [-1.02, 3.08, 1.02, 0.77, 0.45, 0.64],
    [0.49, 3.13, 1.04, 0.86, 0.46, 0.69],
    [-0.87, 3.25, -1.18, 0.9, 0.46, 0.67],
    [-0.18, 4.05, 0.33, 0.77, 0.47, 0.67],
  ];
  lobes.forEach(([x, y, z, rx, ry, rz], index) => {
    const origin = new T.Vector3(x * 0.7, y - 0.58, z * 0.66);
    const parent = new T.Vector3(
      ...limbs[[0, 2, 5, 1, 4, 3, 6, 7][index]].points[2],
    );
    branch(
      [
        parent.toArray() as Point3,
        origin.clone().lerp(parent, 0.4).toArray() as Point3,
        origin.toArray() as Point3,
      ],
      0.038,
      0.018,
    );
    for (let j = 0; j < 12; j++) {
      const angle = j * 2.399963 + index * 0.61;
      const elevation = 1 - (2 * (j + 0.5)) / 12;
      const radial = Math.sqrt(1 - elevation * elevation);
      const px = x + Math.cos(angle) * radial * rx * range(0.78, 1.08);
      const py = y + elevation * ry + range(-0.07, 0.09);
      const pz = z + Math.sin(angle) * radial * rz * range(0.8, 1.08);
      const size = range(0.97, 1.29);
      const yaw = range(0, TAU),
        tilt = range(-0.3, 0.3);
      blossoms.addSeasonal(
        px,
        py,
        pz,
        size,
        size * range(0.7, 0.94),
        size,
        {
          colors: [
            spring[(index + j) % spring.length],
            summer[j % 4],
            autumn[j % 4],
            "#f4f2f7",
          ],
          scales: [1, 0, 0, j % 3 ? 0 : 0.22],
        },
        tilt,
        yaw,
        range(-0.2, 0.2),
      );
      leaves.addSeasonal(
        px,
        py - 0.035,
        pz,
        size,
        size * 0.8,
        size,
        {
          colors: [
            "#8ca378",
            summer[(index + j) % 4],
            autumn[(index + j) % 4],
            "#eef0f4",
          ],
          scales: [j % 4 ? 0 : 0.55, 1.08, 0.92, 0],
        },
        tilt,
        yaw,
        range(-0.25, 0.25),
      );
      const tip = new T.Vector3(px, py - 0.11, pz);
      const fork = origin.clone().lerp(tip, 0.65);
      fork.y -= 0.07;
      branch(
        [
          origin.toArray() as Point3,
          fork.toArray() as Point3,
          tip.toArray() as Point3,
        ],
        0.02,
        0.004,
      );
      for (const direction of [-1, 1]) {
        branch(
          [
            fork.toArray() as Point3,
            [
              px + Math.cos(yaw + direction) * 0.24,
              py + range(-0.12, 0.13),
              pz + Math.sin(yaw + direction) * 0.24,
            ],
          ],
          0.009,
          0.0025,
        );
      }
      if (j % 2 === 0)
        snow.addSeasonal(
          fork.x,
          fork.y + 0.022,
          fork.z,
          0.28,
          0.042,
          0.12,
          {
            colors: ["#f4f2f7", "#f4f2f7", "#f4f2f7", "#f4f2f7"],
            scales: [0, 0, 0, 1],
          },
          0,
          yaw,
          tilt,
        );
    }
  });
  const buildCrown = (batch: VoxelBatch, name: string) => {
    const mesh = batch.build();
    mesh.name = name;
    // Bound the full baseline before seasonal scales can hide any instances.
    // The 15% padding covers summer's 1.08 growth; parent sway is in matrixWorld.
    mesh.computeBoundingSphere();
    if (mesh.boundingSphere) mesh.boundingSphere.radius *= 1.15;
    mesh.frustumCulled = true;
  };
  buildCrown(blossoms, "sakura-blossom-sprays");
  buildCrown(leaves, "sakura-leaf-sprays");
  buildCrown(snow, "sakura-branch-snow");
  const barkMap = createBarkTexture();
  const bark = new T.MeshStandardMaterial({
    color: "#b6a49a",
    map: barkMap,
    bumpMap: barkMap,
    bumpScale: 0.025,
    roughness: 0.96,
    vertexColors: true,
  });
  const woodGeometry = mergeGeometries(wood)!;
  wood.forEach((geometry) => geometry.dispose());
  ctx.mesh(woodGeometry, bark, tree).name = "sakura-tapered-wood";
  createSacredTree(ctx, tree);
  const fallen = new PuffBatch();
  for (let i = 0; i < 190; i++) {
    const dx = range(-3.65, 3.65),
      dz = range(-2.8, 2.8);
    const x = treeX + dx,
      z = treeZ + dz;
    if ((dx / 3.65) ** 2 + (dz / 2.8) ** 2 < 0.95)
      fallen.addSeasonal(
        x,
        ground(x, z) + 0.102,
        z,
        0.055,
        0.008,
        0.035,
        fallenPetal(i % 3 ? "#efc4d2" : "#ffe3dc"),
        0,
        random() * TAU,
        0,
      );
  }
  fallen.build(false);
  return { tree, blossomCount: blossoms.cells.length };
}
