import * as T from "three";
import { type SceneContext, TAU } from "../core/context";
import { createSoftTerrain } from "./softTerrain";
import { seededRandom } from "../utils/seededRandom";
import { GARDEN_ISLAND, LIGHTHOUSE_ISLAND } from "../worldLayout";
import {
  FLOWER_CENTER,
  FLOWER_LEAF,
  FLOWER_STEM,
  LEAF,
  flowerHead,
} from "./seasonalColors";

export function createArchipelago(ctx: SceneContext) {
  const { world, SoftBatch: Batch, lampMat, rod } = ctx;
  // Independent seed: adding the islands does not move existing flowers or clouds.
  const random = seededRandom(271828);
  const range = (a: number, b: number) => a + (b - a) * random();
  const detailRandom = seededRandom(271829);
  const detailRange = (a: number, b: number) => a + (b - a) * detailRandom();

  function island(
    name: string,
    center: readonly [number, number, number],
    radius: readonly [number, number],
    depth: number,
  ) {
    const group = new T.Group();
    group.name = name;
    group.position.set(...center);
    world.add(group);
    createSoftTerrain(ctx, group, radius, depth, () => 0);
    const roots = new ctx.PuffBatch(group);
    for (let i = 0; i < 12; i++) {
      const angle = (i * TAU) / 12;
      const x = Math.cos(angle) * radius[0] * 0.86;
      const z = Math.sin(angle) * radius[1] * 0.86;
      const length = range(0.35, 0.8);
      roots.add(x, -length / 2, z, 0.045, length, 0.045, "#7a9981");
      roots.addSeasonal(
        x + 0.06,
        -length * 0.7,
        z,
        0.16,
        0.06,
        0.13,
        LEAF[i % 2],
      );
    }
    roots.build(false);
    return group;
  }

  const gardenIsland = island(
    "garden-island",
    GARDEN_ISLAND.center,
    GARDEN_ISLAND.radius,
    1.9,
  );
  const garden = new Batch(gardenIsland);
  const flowers = new ctx.PuffBatch(gardenIsland);
  // A pale stone path leads off the bridge, through two planted flower beds.
  for (let i = 0; i < 10; i++) {
    const x = 1.65 - i * 0.26;
    garden.add(
      x,
      0.15,
      0.28 + Math.sin(i * 0.55) * 0.16,
      0.24,
      0.045,
      0.28,
      i % 2 ? "#e9d9ba" : "#d9caae",
    );
  }
  for (let i = 0; i < 68; i++) {
    const x = range(-2.1, 2.1),
      z = range(-1.65, 1.65);
    if ((x / 2.2) ** 2 + (z / 1.75) ** 2 > 1 || Math.abs(z - 0.3) < 0.27)
      continue;
    if (x < -0.45 && z < -0.15) continue;
    const h = range(0.13, 0.28);
    flowers.addSeasonal(x, 0.14 + h / 2, z, 0.025, h, 0.025, FLOWER_STEM);
    flowers.addSeasonal(
      x,
      0.14 + h,
      z,
      0.1,
      0.065,
      0.1,
      flowerHead(["#ebbbc7", "#f1dda6", "#b6abd2", "#faf1d9"][i % 4]),
    );
    flowers.addSeasonal(
      x - 0.04,
      0.14 + h * 0.4,
      z,
      0.1,
      0.025,
      0.05,
      FLOWER_LEAF,
      0,
      0,
      0.3,
    );
  }
  // Raised beds make the scattered blooms read as a garden someone tends.
  for (const [cx, cz, width, depth] of [
    [-1.32, 0.94, 0.84, 0.6],
    [0.54, -1.18, 0.88, 0.46],
  ]) {
    garden.add(cx, 0.16, cz, width, 0.09, depth, "#a18a71");
    for (const side of [-1, 1]) {
      garden.add(
        cx,
        0.23,
        cz + side * depth * 0.5,
        width + 0.07,
        0.15,
        0.07,
        "#d8bd9b",
      );
      garden.add(
        cx + side * width * 0.5,
        0.23,
        cz,
        0.07,
        0.15,
        depth,
        "#c6ab88",
      );
    }
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 4; col++) {
        const x = cx + (col - 1.5) * width * 0.2;
        const z = cz + (row - 0.5) * depth * 0.48;
        const h = detailRange(0.17, 0.3);
        const head = flowerHead(
          ["#edb5c3", "#f4d99d", "#bfb0d7"][(col + row) % 3],
        );
        flowers.addSeasonal(x, 0.22 + h / 2, z, 0.026, h, 0.026, FLOWER_STEM);
        flowers.addSeasonal(
          x - 0.04,
          0.26 + h * 0.32,
          z,
          0.12,
          0.035,
          0.065,
          FLOWER_LEAF,
          0,
          0,
          0.4,
        );
        for (let petal = 0; petal < 5; petal++) {
          const a = (petal * TAU) / 5;
          flowers.addSeasonal(
            x + Math.cos(a) * 0.047,
            0.22 + h,
            z + Math.sin(a) * 0.047,
            0.095,
            0.055,
            0.095,
            head,
          );
        }
        flowers.addSeasonal(
          x,
          0.247 + h,
          z,
          0.053,
          0.028,
          0.053,
          FLOWER_CENTER,
        );
      }
    }
    garden.add(
      cx + width * 0.38,
      0.38,
      cz + depth * 0.25,
      0.025,
      0.26,
      0.025,
      "#b69877",
    );
    garden.add(
      cx + width * 0.38,
      0.5,
      cz + depth * 0.25,
      0.13,
      0.08,
      0.025,
      "#f0e0bd",
      0,
      0,
      -0.14,
    );
  }
  // A low rose arbor frames the bridge entrance, clear of the gramophone.
  for (const z of [-0.12, 0.85]) {
    garden.add(1.66, 0.74, z, 0.085, 1.18, 0.085, "#e3d0ac");
    garden.add(1.66, 0.2, z, 0.18, 0.14, 0.18, "#c5b298");
    for (let i = 0; i < 5; i++) {
      flowers.addSeasonal(
        1.66 + Math.sin(i * 1.8) * 0.09,
        0.39 + i * 0.18,
        z,
        0.28,
        0.25,
        0.24,
        LEAF[i % 2],
      );
      if (i % 2 === 0)
        flowers.addSeasonal(
          1.78,
          0.42 + i * 0.18,
          z + 0.05,
          0.12,
          0.1,
          0.12,
          flowerHead("#eab9c6"),
        );
    }
  }
  garden.add(1.66, 1.33, 0.365, 0.13, 0.11, 1.2, "#e8d5b2");
  for (const z of [-0.2, 0.08, 0.365, 0.65, 0.93]) {
    garden.add(1.66, 1.4, z, 0.44, 0.055, 0.065, "#d2bc98");
    flowers.addSeasonal(1.65, 1.4, z, 0.3, 0.19, 0.3, LEAF[0]);
  }
  // Clay pots, a tray of seedlings and hand tools on the gardener's workbench.
  garden.add(1.6, 0.48, -0.87, 0.62, 0.08, 0.38, "#d5b68e");
  garden.add(1.6, 0.22, -0.87, 0.52, 0.055, 0.3, "#b89b7b");
  for (const x of [1.36, 1.84])
    for (const z of [-1.0, -0.74])
      garden.add(x, 0.3, z, 0.05, 0.34, 0.05, "#a78b6c");
  for (const [x, z, size] of [
    [1.42, -0.88, 0.15],
    [1.67, -0.93, 0.19],
    [1.82, -0.79, 0.12],
  ]) {
    flowers.add(x, 0.55 + size * 0.2, z, size, size * 0.95, size, "#c5957d");
    garden.add(
      x,
      0.56 + size * 0.6,
      z,
      size * 1.12,
      0.035,
      size * 1.12,
      "#dfb19a",
    );
    flowers.addSeasonal(
      x,
      0.61 + size * 0.6,
      z,
      size * 1.1,
      size * 0.8,
      size,
      LEAF[0],
    );
  }
  garden.add(1.51, 0.3, -0.87, 0.21, 0.12, 0.2, "#e7d8b7");
  rod(garden, [1.88, 0.18, -0.63], [1.98, 0.68, -0.7], 0.025, "#b79a78");
  garden.add(1.875, 0.17, -0.63, 0.09, 0.15, 0.035, "#8ba4a0", 0, 0, -0.18);
  // A little birdhouse gives the windmill's quieter side a second silhouette.
  garden.add(-1.65, 0.61, -0.96, 0.06, 0.96, 0.06, "#b89978");
  garden.add(-1.65, 1.08, -0.96, 0.27, 0.31, 0.24, "#dfc49c");
  garden.add(-1.65, 1.28, -0.96, 0.36, 0.075, 0.31, "#b7918d");
  flowers.add(-1.65, 1.1, -0.829, 0.09, 0.09, 0.024, "#756b61");
  garden.add(-1.65, 0.99, -0.78, 0.045, 0.035, 0.11, "#a98d72");
  flowers.build(false);
  // Tapered clay windmill with a soft pink cap and lattice sails.
  const towerMesh = (
    parent: T.Group,
    geometry: T.BufferGeometry,
    color: string,
    x: number,
    y: number,
    z: number,
  ) => {
    const object = ctx.mesh(
      geometry,
      new T.MeshStandardMaterial({ color, roughness: 0.9 }),
      parent,
      x,
      y,
      z,
    );
    object.castShadow = false;
    return object;
  };
  towerMesh(
    gardenIsland,
    new T.CylinderGeometry(0.23, 0.39, 1.55, 24),
    "#f0dfc3",
    -0.68,
    0.91,
    -0.48,
  );
  towerMesh(
    gardenIsland,
    new T.CylinderGeometry(0.34, 0.35, 0.19, 24),
    "#a6bfb0",
    -0.68,
    0.57,
    -0.48,
  );
  towerMesh(
    gardenIsland,
    new T.ConeGeometry(0.45, 0.55, 24),
    "#c493a0",
    -0.68,
    1.97,
    -0.48,
  );
  garden.add(-0.68, 0.39, -0.105, 0.19, 0.4, 0.025, "#9c8579");
  garden.add(-0.68, 1.02, -0.2, 0.14, 0.19, 0.035, "#7f9e9e");
  // Bench at the edge, and a small watering can beside the flowers.
  garden.add(0.46, 0.37, 0.93, 0.72, 0.08, 0.27, "#d7bd98");
  garden.add(0.46, 0.58, 1.04, 0.72, 0.26, 0.055, "#e3cca9");
  for (const x of [0.2, 0.72])
    garden.add(x, 0.23, 0.93, 0.055, 0.25, 0.19, "#a28c75");
  garden.add(1.0, 0.26, -0.43, 0.16, 0.2, 0.15, "#96b6b3");
  rod(garden, [1.06, 0.28, -0.43], [1.25, 0.41, -0.43], 0.045, "#96b6b3");
  garden.add(1.27, 0.42, -0.43, 0.075, 0.035, 0.09, "#c0d0c5", 0, 0, -0.45);
  rod(garden, [0.92, 0.32, -0.43], [0.83, 0.4, -0.43], 0.025, "#96b6b3");
  rod(garden, [0.83, 0.4, -0.43], [0.92, 0.46, -0.43], 0.025, "#96b6b3");
  garden.build(false);

  const windmillSails = new T.Group();
  windmillSails.name = "windmill-sails";
  windmillSails.position.set(-0.68, 1.54, -0.02);
  gardenIsland.add(windmillSails);
  const sails = new Batch(windmillSails);
  sails.add(0, 0, 0.03, 0.19, 0.19, 0.13, "#aa8e79");
  for (let blade = 0; blade < 4; blade++) {
    const angle = (blade * Math.PI) / 2 + Math.PI / 4;
    const arm = new T.Group();
    arm.rotation.z = angle;
    windmillSails.add(arm);
    const slats = new Batch(arm);
    slats.add(0, 0.57, 0, 0.05, 1.1, 0.045, "#b09b81");
    for (let j = 0; j < 6; j++) {
      slats.add(
        0.095,
        0.38 + j * 0.12,
        0.005,
        0.24,
        0.075,
        0.035,
        j % 2 ? "#f5e8cf" : "#e3d0b1",
      );
    }
    slats.build(false);
  }
  sails.build(false);

  // All island crossings, including the garden ramp, share the bridge network
  // batches created by createIslandConnections.

  const lighthouseIsland = island(
    "lighthouse-island",
    LIGHTHOUSE_ISLAND.center,
    LIGHTHOUSE_ISLAND.radius,
    2.1,
  );
  const tower = new Batch(lighthouseIsland);
  const shore = new ctx.PuffBatch(lighthouseIsland);
  towerMesh(
    lighthouseIsland,
    new T.CylinderGeometry(0.3, 0.44, 2.3, 32),
    "#f1e5cc",
    -0.25,
    1.3,
    -0.18,
  );
  for (const [y, r, h] of [
    [0.85, 0.403, 0.39],
    [1.88, 0.343, 0.22],
  ])
    towerMesh(
      lighthouseIsland,
      new T.CylinderGeometry(r - 0.006, r + 0.006, h, 32),
      "#9bb8af",
      -0.25,
      y,
      -0.18,
    );
  tower.add(-0.25, 0.4, 0.25, 0.24, 0.49, 0.025, "#998778");
  tower.add(-0.25, 1.3, 0.18, 0.15, 0.26, 0.03, "#809f9e");
  // Stone doorstep and a gentle curved walk connect the door to the landing.
  tower.add(-0.25, 0.18, 0.35, 0.48, 0.1, 0.27, "#e2d5b9");
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    shore.add(
      -0.2 + t * 1.15,
      0.155,
      0.58 + Math.sin(t * Math.PI) * 0.12 - t * 0.27,
      0.27,
      0.065,
      0.23,
      i % 2 ? "#e4d6b9" : "#cfc5ab",
      0,
      -t * 0.5,
    );
  }
  towerMesh(
    lighthouseIsland,
    new T.CylinderGeometry(0.53, 0.53, 0.12, 32),
    "#bba992",
    -0.25,
    2.52,
    -0.18,
  );
  towerMesh(
    lighthouseIsland,
    new T.CylinderGeometry(0.48, 0.48, 0.09, 32),
    "#c9b299",
    -0.25,
    3.03,
    -0.18,
  );
  towerMesh(
    lighthouseIsland,
    new T.ConeGeometry(0.56, 0.48, 32),
    "#90aaa2",
    -0.25,
    3.31,
    -0.18,
  );
  for (let i = 0; i < 6; i++) {
    const a = (i * TAU) / 6;
    tower.add(
      -0.25 + Math.cos(a) * 0.4,
      2.8,
      -0.18 + Math.sin(a) * 0.4,
      0.045,
      0.53,
      0.045,
      "#a9927c",
    );
  }
  // The gallery's slender railing follows the round lantern room.
  for (let i = 0; i < 12; i++) {
    const a = (i * TAU) / 12;
    const b = ((i + 1) * TAU) / 12;
    const x = -0.25 + Math.cos(a) * 0.5;
    const z = -0.18 + Math.sin(a) * 0.5;
    tower.add(x, 2.7, z, 0.025, 0.3, 0.025, "#a48d78");
    rod(
      tower,
      [x, 2.84, z],
      [-0.25 + Math.cos(b) * 0.5, 2.84, -0.18 + Math.sin(b) * 0.5],
      0.025,
      "#bca58c",
    );
  }
  // A small landing beside the beacon gives the postal ship a real destination.
  for (let i = 0; i < 18; i++) {
    tower.add(
      0.84 + i * 0.125,
      0.09,
      0.3,
      0.117,
      0.1,
      0.75,
      i % 3 ? "#d1b897" : "#e6cfac",
    );
  }
  for (const x of [1.48, 2.22, 2.92]) {
    for (const z of [-0.1, 0.7])
      tower.add(x, 0.24, z, 0.06, 0.42, 0.06, "#b49a80");
  }
  for (const z of [-0.1, 0.7])
    tower.add(2.2, 0.39, z, 1.48, 0.035, 0.035, "#d9c3a2");
  // The distant outpost's mailbox and two parcels echo the main post office.
  tower.add(0.69, 0.32, 0.65, 0.07, 0.45, 0.07, "#a48c77");
  tower.add(0.69, 0.6, 0.65, 0.3, 0.23, 0.25, "#c99aa9");
  tower.add(0.69, 0.63, 0.785, 0.2, 0.026, 0.015, "#8b6c82");
  tower.add(1.0, 0.27, -0.09, 0.26, 0.26, 0.24, "#d9bea0");
  tower.add(1.04, 0.43, -0.1, 0.2, 0.09, 0.19, "#f1e1c7");
  tower.add(1.0, 0.273, 0.034, 0.055, 0.25, 0.012, "#f1dfbd");
  tower.add(1.0, 0.273, 0.035, 0.25, 0.045, 0.014, "#f1dfbd");
  // Tied rope, a life ring and a supply crate make the outpost feel inhabited.
  for (const x of [1.48, 2.92]) {
    tower.add(x, 0.19, 0.56, 0.08, 0.19, 0.075, "#8c9d94");
    tower.add(x, 0.285, 0.56, 0.17, 0.045, 0.09, "#8c9d94");
  }
  for (let loop = 0; loop < 3; loop++) {
    const radius = 0.095 + loop * 0.024;
    for (let i = 0; i < 12; i++) {
      const a = (i * TAU) / 12;
      const b = ((i + 1) * TAU) / 12;
      rod(
        tower,
        [
          2.61 + Math.cos(a) * radius,
          0.163 + loop * 0.008,
          0.42 + Math.sin(a) * radius,
        ],
        [
          2.61 + Math.cos(b) * radius,
          0.163 + loop * 0.008,
          0.42 + Math.sin(b) * radius,
        ],
        0.025,
        "#b89d78",
      );
    }
  }
  for (let i = 0; i < 16; i++) {
    const a = (i * TAU) / 16;
    const b = ((i + 1) * TAU) / 16;
    rod(
      tower,
      [1.9 + Math.cos(a) * 0.16, 0.32 + Math.sin(a) * 0.16, 0.725],
      [1.9 + Math.cos(b) * 0.16, 0.32 + Math.sin(b) * 0.16, 0.725],
      0.065,
      Math.floor(i / 2) % 2 ? "#f2e5c9" : "#c5958d",
    );
  }
  tower.add(0.77, 0.32, -0.65, 0.4, 0.36, 0.35, "#bd9f7d");
  for (const y of [0.2, 0.32, 0.44])
    tower.add(0.77, y, -0.466, 0.43, 0.085, 0.032, "#d7bd98");
  rod(tower, [0.59, 0.17, -0.443], [0.95, 0.47, -0.443], 0.035, "#ad8f70");
  // Three rounded coastal bushes and flowering grasses leave the jetty clear.
  for (const [cx, cz, size] of [
    [-1.43, -0.63, 0.66],
    [0.63, -1.08, 0.52],
    [-1.33, 0.65, 0.6],
  ]) {
    shore.add(cx, 0.19, cz, size * 1.2, 0.23, size, "#b8b4a0");
    for (let i = 0; i < 5; i++) {
      const a = (i * TAU) / 5;
      shore.addSeasonal(
        cx + Math.cos(a) * size * 0.22,
        0.29 + detailRange(0, 0.1),
        cz + Math.sin(a) * size * 0.18,
        size * 0.7,
        size * 0.6,
        size * 0.66,
        LEAF[i % 2],
      );
    }
  }
  for (let i = 0; i < 23; i++) {
    const a = 0.9 + (i / 22) * 4.6;
    const x = Math.cos(a) * detailRange(1.65, 2.03);
    const z = Math.sin(a) * detailRange(1.2, 1.53);
    const h = detailRange(0.18, 0.33);
    shore.addSeasonal(
      x,
      0.15 + h / 2,
      z,
      0.035,
      h,
      0.035,
      FLOWER_STEM,
      0,
      0,
      -0.2,
    );
    shore.addSeasonal(x - 0.035, 0.19, z, 0.17, 0.11, 0.13, FLOWER_LEAF);
    shore.addSeasonal(
      x,
      0.16 + h,
      z,
      0.11,
      0.07,
      0.1,
      flowerHead(i % 3 ? "#ece2c6" : "#c9b9d8"),
    );
  }
  for (let i = 0; i < 19; i++) {
    const a = (i * TAU) / 19;
    shore.addSeasonal(
      Math.cos(a) * LIGHTHOUSE_ISLAND.radius[0] * 0.77,
      0.22,
      Math.sin(a) * LIGHTHOUSE_ISLAND.radius[1] * 0.73,
      0.13,
      0.17,
      0.13,
      LEAF[i % 2],
    );
  }
  const shoreMesh = shore.build(false);
  shoreMesh.computeBoundingSphere();
  // Static plants can be culled in close-ups; reserve room for summer blooms.
  shoreMesh.boundingSphere!.radius *= 1.1;
  shoreMesh.frustumCulled = true;
  tower.build(false);
  const beacon = ctx.mesh(
    new T.CylinderGeometry(0.25, 0.25, 0.38, 24),
    lampMat,
    lighthouseIsland,
    -0.25,
    2.79,
    -0.18,
  );
  beacon.castShadow = false;
  const beaconLight = new T.PointLight("#ffd9a0", 0, 7, 2);
  beaconLight.position.set(-0.25, 2.8, -0.18);
  lighthouseIsland.add(beaconLight);
  // A soft glow, without a sweeping searchlight across the quiet scene.
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = glowCanvas.height = 64;
  const paint = glowCanvas.getContext("2d");
  if (!paint) throw new Error("无法生成灯塔柔光");
  const gradient = paint.createRadialGradient(32, 32, 1, 32, 32, 32);
  gradient.addColorStop(0, "rgba(255,225,166,0.8)");
  gradient.addColorStop(0.25, "rgba(255,213,151,0.3)");
  gradient.addColorStop(1, "rgba(255,213,151,0)");
  paint.fillStyle = gradient;
  paint.fillRect(0, 0, 64, 64);
  const texture = new T.CanvasTexture(glowCanvas);
  texture.colorSpace = T.SRGBColorSpace;
  const beaconGlow = new T.Sprite(
    new T.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
  );
  beaconGlow.position.copy(beaconLight.position);
  beaconGlow.scale.set(2.3, 2.3, 1);
  lighthouseIsland.add(beaconGlow);
  return {
    gardenIsland,
    lighthouseIsland,
    windmillSails,
    beaconLight,
    beaconGlow,
  };
}
