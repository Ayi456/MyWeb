import * as T from "three";
import { type SceneContext, type Point3, TAU, PI } from "../core/context";
import { createClayRoof } from "./clayRoof";
import { createSoftTerrain } from "./softTerrain";
import { seededRandom } from "../utils/seededRandom";
import { TEA_ISLAND, VILLAGE_ISLAND } from "../worldLayout";
import { FLOWER_LEAF, TEA, flowerHead, maple } from "./seasonalColors";

/**
 * Two sculpted background islands. Their terrain uses continuous surfaces,
 * and their decorative batches
 * are grouped under `detail` so low quality can hide them.
 */
export function createFarIslands(ctx: SceneContext) {
  const { world, SoftBatch: Batch, lampMat, rod, line } = ctx;
  const random = seededRandom(161803);
  const range = (a: number, b: number) => a + (b - a) * random();
  const detail: T.Object3D[] = [];

  function terrain(
    group: T.Group,
    radius: readonly [number, number],
    depth: number,
    height: (x: number, z: number, d: number) => number,
  ) {
    createSoftTerrain(ctx, group, radius, depth, height);
    const roots = new ctx.PuffBatch(group);
    for (let i = 0; i < 16; i++) {
      const a = (i * TAU) / 16,
        x = Math.cos(a) * radius[0] * 0.84,
        z = Math.sin(a) * radius[1] * 0.84,
        length = range(0.5, 1.3),
        top = height(x, z, 0.7) - depth * 0.55;
      roots.add(x, top - length / 2, z, 0.06, length, 0.06, "#7a9981");
    }
    roots.build(false);
  }

  function mapleTree(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    s = 1,
  ) {
    const g = new T.Group();
    g.position.set(x, y, z);
    g.scale.setScalar(s);
    parent.add(g);
    const bark = new ctx.PuffBatch(g);
    rod(bark, [0, 0, 0], [0.05, 0.95, 0.03], 0.16, "#8d6b5d");
    rod(bark, [0.05, 0.8, 0.03], [-0.35, 1.35, 0.1], 0.09, "#8d6b5d");
    rod(bark, [0.05, 0.8, 0.03], [0.4, 1.4, -0.2], 0.09, "#8d6b5d");
    bark.build(false);
    const crown = new ctx.PuffBatch(g);
    const lobes = [
      [0, 1.55, 0, 0.75, 0.55, 0.7],
      [-0.4, 1.35, 0.15, 0.5, 0.4, 0.45],
      [0.45, 1.4, -0.2, 0.5, 0.42, 0.45],
    ];
    lobes.forEach(([cx, cy, cz, rx, ry, rz], i) => {
      crown.addSeasonal(cx, cy, cz, rx * 2, ry * 2, rz * 2, maple(i));
      for (let j = 0; j < 5; j++) {
        const a = (j * TAU) / 5;
        crown.addSeasonal(
          cx + Math.cos(a) * rx * 0.55,
          cy + ry * 0.2,
          cz + Math.sin(a) * rz * 0.55,
          rx * 1.2,
          ry * 1.25,
          rz * 1.2,
          maple((i + j) % 3),
        );
      }
    });
    crown.build(false);
    return g;
  }

  // ---- Tea hill: three terraces climb towards a small pavilion at the back.
  const tea = new T.Group();
  tea.name = "tea-island";
  tea.position.set(...TEA_ISLAND.center);
  world.add(tea);
  const terrace = (x: number, z: number) => {
    const t = (z + 1.2) / -4.5 + (x + 1) * 0.04;
    return Math.max(0, Math.floor(t * 3.4)) * 0.42;
  };
  terrain(tea, TEA_ISLAND.radius, 2.6, (x, z) => terrace(x, z));
  const teaDetail = new T.Group();
  tea.add(teaDetail);
  detail.push(teaDetail);
  const rows = new ctx.PuffBatch(teaDetail);
  for (let z = 2.4; z >= -2.6; z -= 0.45) {
    for (let x = -3.9; x <= 3.9; x += 0.3) {
      const d =
        (x / TEA_ISLAND.radius[0]) ** 2 + (z / TEA_ISLAND.radius[1]) ** 2;
      if (d > 0.78) continue;
      if (Math.abs(x - 0.3 - Math.sin(z * 1.4) * 0.5) < 0.42) continue; // path
      // A proper clearing lets the drying shelter read as part of the tea farm.
      if (((x + 2.05) / 1.22) ** 2 + ((z - 1.75) / 0.95) ** 2 < 1) continue;
      const y = terrace(x, z) + 0.15;
      rows.addSeasonal(
        x + Math.sin(z * 3) * 0.05,
        y + 0.12,
        z,
        0.27,
        0.24 + (Math.floor(x * 10) % 2) * 0.05,
        0.3,
        TEA[Math.floor(random() * 2)],
      );
    }
  }
  for (let i = 0; i < 24; i++) {
    const z = 2.4 - i * 0.21,
      x = 0.3 + Math.sin(z * 1.4) * 0.5;
    rows.add(
      x,
      terrace(x, z) + 0.16,
      z,
      0.36,
      0.05,
      0.22,
      i % 2 ? "#e2d3b6" : "#d2c2a4",
    );
  }
  // Wooden steps between terraces along the path.
  for (const z of [-0.8, -2.15, -0.2]) {
    const x = 0.3 + Math.sin(z * 1.4) * 0.5;
    for (let k = 0; k < 3; k++)
      rows.add(
        x,
        terrace(x, z + 0.2) + 0.2 + k * 0.12,
        z + 0.1 - k * 0.14,
        0.5,
        0.06,
        0.16,
        "#c9ab88",
      );
  }
  rows.build(false);
  // Pavilion on the top terrace with a warm lantern.
  const pavilion = new Batch(teaDetail);
  const py = terrace(0.2, -2.8) + 0.16,
    pz = -2.6;
  pavilion.add(0.2, py + 0.05, pz, 1.7, 0.1, 1.5, "#e9dcc4");
  for (const dx of [-0.62, 0.62])
    for (const dz of [-0.52, 0.52])
      pavilion.add(0.2 + dx, py + 0.62, pz + dz, 0.09, 1.1, 0.09, "#b3585c");
  pavilion.add(0.2, py + 1.2, pz, 1.85, 0.1, 1.65, "#c76b74");
  const pavilionRoof = ctx.mesh(
    new T.ConeGeometry(1.25, 0.58, 4),
    new T.MeshStandardMaterial({ color: "#c76b74", roughness: 0.9 }),
    teaDetail,
    0.2,
    py + 1.53,
    pz,
  );
  pavilionRoof.rotation.y = Math.PI / 4;
  pavilionRoof.scale.z = 0.88;
  pavilionRoof.castShadow = false;
  pavilion.add(0.2, py + 1.9, pz, 0.12, 0.25, 0.12, "#e3bd76");
  pavilion.add(0.2, py + 0.32, pz + 0.2, 0.7, 0.07, 0.3, "#d8c1a1");
  pavilion.add(0.2, py + 0.2, pz + 0.2, 0.08, 0.2, 0.08, "#a48b73");
  for (const dx of [-0.56, 0.56]) {
    pavilion.add(0.2 + dx, py + 0.26, pz - 0.06, 0.22, 0.08, 0.7, "#bb8c77");
    for (const dz of [-0.29, 0.17])
      pavilion.add(0.2 + dx, py + 0.14, pz + dz, 0.06, 0.2, 0.07, "#aa7e69");
    pavilion.add(0.2 + dx, py + 0.31, pz, 0.23, 0.035, 0.24, "#9eb5a3");
  }
  // A little tea service makes the open pavilion feel occupied.
  const teaLife = new ctx.PuffBatch(teaDetail);
  teaLife.add(0.12, py + 0.41, pz + 0.2, 0.18, 0.12, 0.15, "#b87761");
  teaLife.add(0.12, py + 0.48, pz + 0.2, 0.11, 0.035, 0.1, "#d3a184");
  rod(
    pavilion,
    [0.17, py + 0.42, pz + 0.2],
    [0.28, py + 0.47, pz + 0.2],
    0.055,
    "#b87761",
  );
  for (const x of [-0.04, 0.39]) {
    teaLife.add(x, py + 0.37, pz + 0.24, 0.11, 0.018, 0.11, "#f4e7cb");
    teaLife.add(x, py + 0.41, pz + 0.24, 0.065, 0.06, 0.065, "#e5d1a9");
  }
  pavilion.build(false);
  const teaLamp = new Batch(teaDetail, lampMat);
  teaLamp.add(0.2 + 0.62, py + 0.95, pz + 0.52, 0.16, 0.2, 0.16, "#ffe1b3");
  teaLamp.build(false);
  const teaLight = new T.PointLight("#ffd9a0", 0, 6, 2);
  teaLight.position.set(0.82, py + 0.95, pz + 0.52);
  tea.add(teaLight);
  // Stone lantern and three maples at the hill's edge.
  const stoneLantern = new Batch(teaDetail);
  const lx = -2.3,
    lz = 0.6,
    ly = terrace(lx, lz) + 0.16;
  stoneLantern.add(lx, ly + 0.05, lz, 0.4, 0.1, 0.4, "#b8b0b6");
  stoneLantern.add(lx, ly + 0.32, lz, 0.12, 0.45, 0.12, "#c7c0c5");
  stoneLantern.add(lx, ly + 0.62, lz, 0.34, 0.16, 0.34, "#d4cbcf");
  stoneLantern.add(lx, ly + 0.8, lz, 0.22, 0.2, 0.22, "#fff1d2");
  stoneLantern.add(lx, ly + 0.98, lz, 0.4, 0.1, 0.4, "#b8b0b6");
  stoneLantern.build(false);
  // A low canvas shelter, open drying trays and full wicker baskets tell the
  // harvesting story in a few broad silhouettes, even from the wide camera.
  const harvest = new Batch(teaDetail);
  harvest.add(-2.05, 0.13, 1.75, 2.0, 0.06, 1.28, "#d6c4a1");
  for (const x of [-2.82, -1.28]) {
    harvest.add(x, 0.77, 1.48, 0.07, 1.3, 0.07, "#9b9365");
    harvest.add(x, 0.68, 2.13, 0.07, 1.12, 0.07, "#9b9365");
  }
  harvest.add(-2.05, 1.39, 1.76, 1.95, 0.07, 1.1, "#eee0b9", 0.18);
  harvest.add(-2.05, 1.32, 2.29, 1.94, 0.18, 0.05, "#b8c3a0");
  for (const x of [-2.55, -1.55]) {
    harvest.add(x, 0.48, 1.76, 0.69, 0.085, 0.74, "#ba9671");
    for (const dx of [-0.26, 0.26])
      harvest.add(x + dx, 0.31, 1.76, 0.07, 0.3, 0.54, "#a88568");
    harvest.add(x, 0.54, 1.76, 0.6, 0.03, 0.64, "#d8bc83");
    for (const dz of [-0.3, 0, 0.3])
      teaLife.addSeasonal(x, 0.57, 1.76 + dz, 0.5, 0.065, 0.17, TEA[1]);
  }
  function teaBasket(x: number, z: number, scale = 1) {
    const y = terrace(x, z) + 0.12;
    teaLife.add(
      x,
      y + 0.18 * scale,
      z,
      0.43 * scale,
      0.4 * scale,
      0.42 * scale,
      "#b68b62",
    );
    teaLife.add(
      x,
      y + 0.37 * scale,
      z,
      0.4 * scale,
      0.06 * scale,
      0.39 * scale,
      "#e2c28e",
    );
    teaLife.addSeasonal(
      x,
      y + 0.4 * scale,
      z,
      0.31 * scale,
      0.11 * scale,
      0.3 * scale,
      TEA[0],
    );
    for (const band of [0.13, 0.25])
      teaLife.add(
        x,
        y + band * scale,
        z,
        0.44 * scale,
        0.025 * scale,
        0.43 * scale,
        "#d4ae7b",
      );
    for (let i = 1; i <= 6; i++) {
      const a = ((i - 1) * PI) / 6,
        b = (i * PI) / 6;
      rod(
        harvest,
        [
          x + Math.cos(a) * 0.17 * scale,
          y + (0.36 + Math.sin(a) * 0.22) * scale,
          z,
        ],
        [
          x + Math.cos(b) * 0.17 * scale,
          y + (0.36 + Math.sin(b) * 0.22) * scale,
          z,
        ],
        0.035 * scale,
        "#d7b786",
      );
    }
  }
  teaBasket(-0.96, 1.83, 1.1);
  teaBasket(-2.9, 1.96, 0.85);
  teaBasket(0.92, -0.38, 0.9);
  // A straw hat rests on a stool at the edge of the work area.
  harvest.add(-1.26, 0.36, 2.47, 0.36, 0.07, 0.28, "#c39873");
  for (const dx of [-0.12, 0.12])
    harvest.add(-1.26 + dx, 0.23, 2.47, 0.05, 0.26, 0.22, "#aa8567");
  teaLife.add(-1.26, 0.42, 2.47, 0.47, 0.045, 0.4, "#e4c792");
  teaLife.add(-1.26, 0.48, 2.47, 0.25, 0.14, 0.23, "#e8cea2");
  harvest.build(false);
  teaLife.build(false);
  const teaMaples = [
    mapleTree(teaDetail, -3.1, terrace(-3.1, -1.6) + 0.12, -1.6, 1.05),
    mapleTree(teaDetail, 3.2, terrace(3.2, -1.2) + 0.12, -1.2, 0.95),
    mapleTree(teaDetail, 2.9, terrace(2.9, 1.9) + 0.12, 1.9, 0.8),
  ];

  // ---- Hot-spring hamlet: three cottages, a red bridge over a steaming pool.
  const village = new T.Group();
  village.name = "village-island";
  village.position.set(...VILLAGE_ISLAND.center);
  world.add(village);
  const poolCenter: Point3 = [0.9, 0.16, 1.3];
  const poolRadius = [1.1, 0.8] as const;
  const villageGround = (x: number, z: number) => {
    const hill =
      0.12 * Math.round((Math.sin(x * 0.9) + Math.cos(z * 1.1)) * 0.8);
    const distance = Math.hypot(
      (x - poolCenter[0]) / poolRadius[0],
      (z - poolCenter[2]) / poolRadius[1],
    );
    // A shallow, level basin keeps even the triangulated grass below the water.
    // The flat margin also grounds the stone rim before blending into the hill.
    return T.MathUtils.lerp(
      0.025,
      hill,
      T.MathUtils.smoothstep(distance, 1.18, 1.7),
    );
  };
  terrain(village, VILLAGE_ISLAND.radius, 2.9, villageGround);
  const villageDetail = new T.Group();
  village.add(villageDetail);
  detail.push(villageDetail);
  function cottage(
    x: number,
    z: number,
    rotation: number,
    roof: string,
    wall: string,
    s = 1,
  ) {
    const g = new T.Group();
    g.position.set(x, villageGround(x, z) + 0.15, z);
    g.rotation.y = rotation;
    g.scale.setScalar(s);
    villageDetail.add(g);
    const b = new Batch(g);
    b.add(0, 0.45, 0, 1.3, 0.9, 1.0, wall);
    b.add(0, 0.03, 0, 1.45, 0.12, 1.15, "#d6c19d");
    createClayRoof(ctx, g, [0, 0.9, 0], 1.5, 1.2, 0.53, roof, wall);
    b.add(0.4, 0.95, -0.25, 0.18, 0.5, 0.18, "#b78d87");
    b.add(-0.25, 0.4, 0.51, 0.34, 0.6, 0.04, "#8a6a5e");
    // Deep eaves, a split doorway curtain and a porch give each cottage a face.
    b.add(0, 0.84, 0.54, 1.4, 0.07, 0.1, "#b68f79");
    b.add(0, 0.065, 0.8, 1.2, 0.12, 0.46, "#c5a788");
    b.add(-0.24, 0.0, 1.12, 0.55, 0.075, 0.22, "#d8c3a0");
    for (const dx of [-0.095, 0.095])
      b.add(-0.25 + dx, 0.64, 0.56, 0.17, 0.26, 0.035, roof);
    b.add(-0.25, 0.79, 0.56, 0.48, 0.035, 0.055, "#99755f");
    b.add(0.3, 0.5, 0.535, 0.025, 0.34, 0.03, "#b58c70");
    b.add(0.3, 0.5, 0.535, 0.34, 0.025, 0.03, "#b58c70");
    b.add(0.3, 0.29, 0.59, 0.44, 0.13, 0.2, "#c09277");
    const garden = new ctx.PuffBatch(g);
    for (const dx of [-0.13, 0, 0.13]) {
      garden.addSeasonal(0.3 + dx, 0.37, 0.59, 0.19, 0.13, 0.18, FLOWER_LEAF);
      garden.addSeasonal(
        0.3 + dx,
        0.44,
        0.59,
        0.09,
        0.09,
        0.09,
        flowerHead("#f0bfba"),
      );
    }
    garden.build(false);
    b.build(false);
    const win = new Batch(g, lampMat);
    win.add(0.3, 0.5, 0.505, 0.3, 0.3, 0.02, "#ffe4ac");
    win.add(-0.655, 0.5, -0.1, 0.02, 0.3, 0.3, "#ffe4ac");
    win.build(false);
    return g;
  }
  const cottages = [
    cottage(-2.4, 0.4, 0.4, "#bd7d83", "#fff0d0"),
    cottage(-0.4, -1.7, -0.3, "#8fa9b8", "#f6e7cf", 0.92),
    cottage(2.7, -0.6, 0.9, "#a9b58d", "#fbeedc", 0.85),
  ];
  const villageLight = new T.PointLight("#ffd79e", 0, 9, 2);
  villageLight.position.set(0, 1.4, -0.5);
  village.add(villageLight);
  // Hot-spring pool with a stone rim and a small red arched bridge.
  const springMat = new T.MeshStandardMaterial({
    color: "#9fd6cf",
    emissive: "#3f8a86",
    emissiveIntensity: 0.25,
    roughness: 0.3,
    transparent: true,
    opacity: 0.9,
  });
  const pool = ctx.mesh(
    new T.CircleGeometry(1, 48).rotateX(-Math.PI / 2),
    springMat,
    villageDetail,
    ...poolCenter,
  );
  pool.scale.set(poolRadius[0], 1, poolRadius[1]);
  pool.castShadow = false;
  const rim = new Batch(villageDetail);
  const stones = new ctx.PuffBatch(villageDetail);
  for (let i = 0; i < 22; i++) {
    const a = (i * TAU) / 22;
    stones.add(
      poolCenter[0] + Math.cos(a) * 1.2,
      poolCenter[1] + 0.035,
      poolCenter[2] + Math.sin(a) * 0.9,
      0.2,
      0.18,
      0.17,
      i % 3 ? "#cfc3b4" : "#e6d8c0",
      0,
      -a,
      0,
    );
  }
  // Worn stepping stones connect the three front doors to the shared spring.
  for (const [x, z] of [
    [-1.65, 1.1],
    [-1.36, 1.39],
    [-1.48, 1.75],
    [-0.65, -0.52],
    [-0.32, -0.27],
    [0.06, -0.15],
    [0.48, -0.08],
    [1.32, -0.17],
    [1.72, -0.3],
    [2.12, -0.19],
  ])
    stones.add(
      x,
      villageGround(x, z) + 0.14,
      z,
      0.38,
      0.075,
      0.29,
      "#ded2bb",
      0,
      x * 0.3,
    );

  // A raised bathing deck with a towel rail, stools and wooden wash buckets.
  for (let i = 0; i < 8; i++)
    rim.add(
      -0.87,
      0.2,
      1.65 + i * 0.14,
      1.12,
      0.09,
      0.125,
      i % 2 ? "#d8b18b" : "#cda37d",
    );
  for (const x of [-1.32, -0.42])
    for (const z of [1.7, 2.56])
      rim.add(x, 0.01, z, 0.075, 0.36, 0.075, "#a98468");
  for (const x of [-1.3, -0.54])
    rim.add(x, 0.63, 1.68, 0.05, 0.8, 0.05, "#9da17a");
  rim.add(-0.92, 1.02, 1.68, 0.84, 0.045, 0.055, "#b8b18a");
  rim.add(-1.06, 0.84, 1.68, 0.27, 0.36, 0.04, "#c0d6cb");
  rim.add(-1.06, 0.7, 1.71, 0.27, 0.025, 0.025, "#8eafa6");
  rim.add(-0.69, 0.89, 1.68, 0.24, 0.27, 0.04, "#f2e2c5");
  for (const [x, z] of [
    [-1.15, 2.21],
    [-0.62, 2.4],
  ]) {
    rim.add(x, 0.41, z, 0.3, 0.065, 0.26, "#e2bd91");
    for (const dx of [-0.1, 0.1])
      rim.add(x + dx, 0.32, z, 0.055, 0.17, 0.19, "#bd936e");
  }
  stones.add(-0.67, 0.39, 2.02, 0.31, 0.3, 0.3, "#c5a174");
  stones.add(-0.67, 0.535, 2.02, 0.32, 0.045, 0.31, "#e5c69a");
  stones.add(-0.67, 0.55, 2.02, 0.24, 0.025, 0.23, "#99b7b1");
  rim.add(-0.67, 0.59, 2.02, 0.32, 0.035, 0.045, "#dfbd8d");

  // Bamboo feeds the pool beside a compact fern and stone garden.
  rim.add(2.35, 0.63, 1.13, 0.1, 0.92, 0.1, "#96a477");
  rod(rim, [2.4, 0.97, 1.13], [1.86, 0.84, 1.13], 0.105, "#b9bf8f");
  for (const y of [0.3, 0.53, 0.76])
    rim.add(2.35, y, 1.13, 0.12, 0.035, 0.12, "#d6ce9c");
  rod(rim, [1.86, 0.81, 1.13], [1.86, 0.21, 1.13], 0.026, "#cce8df");
  stones.add(1.86, 0.18, 1.13, 0.24, 0.025, 0.2, "#dbede4");
  for (const [x, z, s] of [
    [2.42, 0.81, 0.48],
    [2.69, 1.08, 0.32],
    [2.42, 1.37, 0.34],
  ]) {
    stones.add(
      x,
      villageGround(x, z) + s * 0.22,
      z,
      s,
      s * 0.52,
      s * 0.8,
      "#c0b9a9",
    );
    stones.addSeasonal(
      x + 0.08,
      villageGround(x, z) + s * 0.53,
      z,
      s * 0.8,
      s * 0.4,
      s * 0.7,
      TEA[0],
    );
  }
  stones.build(false);
  // Bridge arch across the pool's short axis.
  for (const z of [poolCenter[2] - 1.15, poolCenter[2] + 1.15])
    rim.add(poolCenter[0], 0.2, z, 0.66, 0.16, 0.27, "#b8464f");
  const rails: [Point3[], Point3[]] = [[], []];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12,
      z = poolCenter[2] - 1.15 + t * 2.3,
      y = poolCenter[1] + 0.12 + Math.sin(t * PI) * 0.42;
    rim.add(poolCenter[0], y, z, 0.6, 0.06, 0.2, i % 2 ? "#c9515b" : "#b8464f");
    for (let s = 0; s < 2; s++) {
      const x = poolCenter[0] + (s ? 0.27 : -0.27);
      rails[s].push([x, y + 0.34, z]);
      if (i % 3 === 0) rim.add(x, y + 0.17, z, 0.04, 0.34, 0.04, "#b8464f");
    }
  }
  for (const rail of rails)
    for (let i = 1; i < rail.length; i++)
      rod(rim, rail[i - 1], rail[i], 0.03, "#d4666f");
  rim.build(false);
  line(
    villageDetail,
    [
      [-2.0, 1.55, 0.9],
      [-0.6, 1.35, 0.4],
      [0.8, 1.5, -0.6],
    ],
    "#c9a88e",
  );
  // Pennants along the line between cottages.
  const flags = new Batch(villageDetail);
  for (let i = 0; i < 9; i++) {
    const t = i / 8,
      x = -2.0 + t * 2.8,
      z = 0.9 - t * 1.5,
      y = 1.55 - Math.sin(t * PI) * 0.18 - 0.09;
    flags.add(
      x,
      y,
      z,
      0.12,
      0.14,
      0.02,
      ["#e7a5b3", "#f2d9a0", "#a9c8d4", "#c7b6da"][i % 4],
      0,
      0.5,
      0,
    );
  }
  flags.build(false);
  mapleTree(villageDetail, -3.0, 0.1, -1.7, 1.15);
  mapleTree(villageDetail, 2.9, 0.1, 1.8, 0.9);

  // Steam rising from the hot spring: a small GPU point cloud.
  const steamGeo = new T.BufferGeometry(),
    seeds: number[] = [];
  for (let i = 0; i < 48; i++) seeds.push(random(), random(), random());
  steamGeo.setAttribute("position", new T.Float32BufferAttribute(seeds, 3));
  const steamMat = new T.ShaderMaterial({
    uniforms: ctx.U,
    transparent: true,
    depthWrite: false,
    vertexShader: `uniform float uTime;uniform vec4 uSeason;varying float vAlpha;void main(){float life=fract(position.y+uTime*(.08+position.z*.05));vec3 p=vec3(${poolCenter[0]}+(position.x-.5)*1.6+sin(uTime*.5+position.z*20.)*.25*life,${poolCenter[1]}+.1+life*1.9,${poolCenter[2]}+(position.z-.5)*1.2);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((120.+life*140.)/-mv.z,3.,26.);vAlpha=(1.-life)*smoothstep(0.,.15,life)*(.28+uSeason.w*.3);}`,
    fragmentShader: `varying float vAlpha;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(1.,.98,.97,pow(1.-r,2.2)*vAlpha);}`,
  });
  const steam = new T.Points(steamGeo, steamMat);
  steam.frustumCulled = false;
  steam.renderOrder = 11;
  villageDetail.add(steam);

  // These batches have no shader displacement. Cull the distant islands during
  // close-ups, retaining room for the flower heads' 1.05 summer growth. Cottage
  // reactions transform their parent groups, which culling already accounts for.
  // The animated steam is a Points object and keeps its explicit no-cull policy.
  for (const island of [tea, village])
    island.traverse((object) => {
      if (!(object instanceof T.InstancedMesh)) return;
      object.computeBoundingSphere();
      if (object.boundingSphere) object.boundingSphere.radius *= 1.06;
      object.frustumCulled = true;
    });

  return {
    teaIsland: tea,
    villageIsland: village,
    teaLight,
    villageLight,
    farDetail: detail,
    farMaples: [...teaMaples],
    cottages,
  };
}
