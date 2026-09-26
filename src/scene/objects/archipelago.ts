import * as T from "three";
import { type SceneContext, type Point3, TAU } from "../core/context";
import { createSoftTerrain } from "./softTerrain";
import { seededRandom } from "../utils/seededRandom";
import { GARDEN_ISLAND, LIGHTHOUSE_ISLAND } from "../worldLayout";
import { FLOWER_LEAF, FLOWER_STEM, LEAF, flowerHead } from "./seasonalColors";

export function createArchipelago(ctx: SceneContext) {
  const { world, SoftBatch: Batch, lampMat, rod } = ctx;
  // Independent seed: adding the islands does not move existing flowers or clouds.
  const random = seededRandom(271828);
  const range = (a: number, b: number) => a + (b - a) * random();

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

  const bridge = new Batch();
  const start = new T.Vector3(-4.6, 1.12, -1.12);
  const end = new T.Vector3(
    GARDEN_ISLAND.center[0] + GARDEN_ISLAND.radius[0] * 0.9,
    GARDEN_ISLAND.center[1] + 0.17,
    GARDEN_ISLAND.center[2] + 0.24,
  );
  const delta = end.clone().sub(start);
  const side = new T.Vector3(-delta.z, 0, delta.x)
    .normalize()
    .multiplyScalar(0.31);
  const angle = Math.atan2(-delta.z, delta.x);
  const rails: [Point3[], Point3[]] = [[], []];
  for (let i = 0; i <= 16; i++) {
    const t = i / 16;
    const p = start.clone().lerp(end, t);
    p.y -= Math.sin(Math.PI * t) * 0.28;
    bridge.add(
      p.x,
      p.y,
      p.z,
      0.125,
      0.07,
      0.67,
      i % 3 ? "#d4b591" : "#e6cbab",
      0,
      angle,
    );
    for (let s = 0; s < 2; s++) {
      const edge = p.clone().addScaledVector(side, s ? 1 : -1);
      rails[s].push([edge.x, edge.y + 0.52, edge.z]);
      if (i % 4 === 0) {
        bridge.add(
          edge.x,
          edge.y + 0.26,
          edge.z,
          0.045,
          0.58,
          0.045,
          "#aa9078",
        );
      }
    }
  }
  for (const rail of rails) {
    for (let i = 1; i < rail.length; i++)
      rod(bridge, rail[i - 1], rail[i], 0.028, "#bba58d");
  }
  bridge.build(false);

  const lighthouseIsland = island(
    "lighthouse-island",
    LIGHTHOUSE_ISLAND.center,
    LIGHTHOUSE_ISLAND.radius,
    2.1,
  );
  const tower = new Batch(lighthouseIsland);
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
  for (let i = 0; i < 19; i++) {
    const a = (i * TAU) / 19;
    tower.add(
      Math.cos(a) * LIGHTHOUSE_ISLAND.radius[0] * 0.77,
      0.22,
      Math.sin(a) * LIGHTHOUSE_ISLAND.radius[1] * 0.73,
      0.13,
      0.17,
      0.13,
      i % 3 ? "#aac197" : "#e5d4aa",
    );
  }
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
