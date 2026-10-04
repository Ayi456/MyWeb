import * as T from "three";
import { type SceneContext } from "../core/context";
import { VoxelBatch } from "../utils/voxelBatch";
import { cottageMaterial, curvedRoofTile } from "./cottageMaterials";
import {
  FLOWER_CENTER,
  FLOWER_LEAF,
  FLOWER_STEM,
  flowerHead,
} from "./seasonalColors";

/** Limewashed masonry, inset joinery and overlapping fired-clay roof tiles. */
export function createPostOffice(ctx: SceneContext) {
  const { world, lampMat, mesh, ground, paperTexture } = ctx;
  const house = new T.Group();
  house.position.set(1.85, ground(1.85, 0.15) + 0.1, 0.15);
  world.add(house);
  const plasterMaterial = cottageMaterial("plaster");
  const woodMaterial = cottageMaterial("wood");
  const tileMaterial = cottageMaterial("terracotta");
  const stoneMaterial = cottageMaterial("stone");
  const walls = new ctx.Batch(house, plasterMaterial);
  const timber = new ctx.Batch(house, woodMaterial);
  const stone = new ctx.SoftBatch(house, stoneMaterial);
  const detail = new ctx.SoftBatch(house);
  const windows = new ctx.Batch(house, lampMat);

  // Wall sections leave true openings: glazing sits behind the deep reveals.
  const wall = "#f0e3cc";
  walls.add(0, 0.6, -0.625, 1.78, 1.14, 0.1, wall);
  walls.add(-0.84, 0.6, 0, 0.1, 1.14, 1.25, wall);
  for (const [left, right] of [
    [-0.89, -0.695],
    [-0.165, 0.095],
    [0.605, 0.89],
  ])
    walls.add((left + right) / 2, 0.6, 0.625, right - left, 1.14, 0.1, wall);
  walls.add(-0.43, 0.2, 0.625, 0.53, 0.34, 0.1, wall);
  walls.add(-0.43, 1.035, 0.625, 0.53, 0.27, 0.1, wall);
  walls.add(0.35, 1.115, 0.625, 0.51, 0.11, 0.1, wall);
  for (const [back, front] of [
    [-0.625, -0.495],
    [-0.105, 0.085],
    [0.475, 0.625],
  ])
    walls.add(0.84, 0.6, (back + front) / 2, 0.1, 1.14, front - back, wall);
  walls.add(0.84, 0.215, 0, 0.1, 0.37, 1.25, wall);
  walls.add(0.84, 1.025, 0, 0.1, 0.29, 1.25, wall);
  walls.build();

  // A stone plinth and irregular block joints give the cottage visible weight.
  stone.add(0, 0.035, 0, 1.94, 0.16, 1.49, "#a69f89");
  const stoneColors = ["#bcb39a", "#c9bea5", "#b7ad96", "#d0c3a9"];
  for (let i = 0; i < 8; i++) {
    const x = -0.84 + i * 0.24;
    stone.add(x, 0.075, 0.747, 0.23, 0.145, 0.06, stoneColors[i % 4]);
    stone.add(x, 0.075, -0.747, 0.23, 0.145, 0.06, stoneColors[(i + 1) % 4]);
  }
  for (let i = 0; i < 6; i++)
    for (const side of [-1, 1])
      stone.add(
        side * 0.968,
        0.075,
        -0.62 + i * 0.25,
        0.05,
        0.145,
        0.24,
        stoneColors[i % 4],
      );
  for (let row = 0; row < 5; row++)
    for (const side of [-1, 1])
      stone.add(
        side * 0.848,
        0.25 + row * 0.185,
        0.646,
        0.1,
        0.17,
        0.09,
        stoneColors[(row + 1) % 4],
      );

  const gable = new T.Shape();
  gable.moveTo(-0.89, 1.13);
  gable.lineTo(0.89, 1.13);
  gable.lineTo(0, 1.9);
  gable.closePath();
  const gableGeometry = new T.ExtrudeGeometry(gable, {
    depth: 1.3,
    bevelEnabled: false,
    steps: 1,
  });
  gableGeometry.translate(0, 0, -0.65);
  const gableMaterial = plasterMaterial.clone();
  gableMaterial.color.set(wall);
  mesh(gableGeometry, gableMaterial, house);

  const roofAngle = Math.atan2(0.79, 1.02);
  const roofLength = Math.hypot(1.02, 0.79);
  const roof = new VoxelBatch(house, tileMaterial, curvedRoofTile());
  const roofColors = ["#aa7773", "#b47d78", "#be8b80", "#b8847b", "#a8736d"];
  for (const side of [-1, 1]) {
    // The dark roof deck remains visible in the overlaps and beneath the eaves.
    timber.add(
      side * 0.51,
      1.545,
      0,
      roofLength,
      0.065,
      1.76,
      "#74564b",
      0,
      0,
      -side * roofAngle,
    );
    // Each tile pitches slightly less than the deck so the next course rests
    // above its upper edge; overlapping courses must never be coplanar.
    for (let row = 0; row < 7; row++)
      for (let column = 0; column < 9; column++)
        roof.add(
          side * (1 - row * 0.155),
          1.205 + row * 0.12,
          -0.8 + column * 0.2,
          0.25,
          0.23,
          0.198,
          roofColors[(row * 3 + column * 7) % 5],
          0,
          0,
          -side * (roofAngle - 0.065),
        );
    timber.add(side * 1.025, 1.125, 0, 0.055, 0.11, 1.8, "#765e4e");
    for (const z of [-0.9, 0.9])
      timber.add(
        side * 0.51,
        1.55,
        z,
        roofLength + 0.08,
        0.09,
        0.045,
        "#927360",
        0,
        0,
        -side * roofAngle,
      );
    for (const z of [-0.67, -0.22, 0.23, 0.67])
      timber.add(
        side * 0.98,
        1.09,
        z,
        0.18,
        0.055,
        0.055,
        "#8c7158",
        0,
        0,
        -side * roofAngle,
      );
  }
  for (let i = 0; i < 9; i++)
    roof.add(
      0,
      1.997,
      -0.81 + i * 0.203,
      0.23,
      0.47,
      0.18,
      roofColors[(i + 2) % 5],
      0,
      Math.PI / 2,
      0,
    );
  roof.build();

  // Staggered brick joints, flashing and an open flue distinguish the chimney.
  detail.add(-0.56, 1.875, -0.38, 0.232, 0.46, 0.258, "#a7937e");
  for (let row = 0; row < 5; row++) {
    const y = 1.7 + row * 0.08;
    const cuts = row % 2 ? [-0.115, -0.055, 0.055, 0.115] : [-0.115, 0, 0.115];
    for (let j = 0; j < cuts.length - 1; j++) {
      const x = -0.56 + (cuts[j] + cuts[j + 1]) / 2;
      for (const z of [-0.512, -0.248])
        stone.add(
          x,
          y,
          z,
          cuts[j + 1] - cuts[j] - 0.007,
          0.072,
          0.035,
          ["#ad8170", "#b88c7c", "#a77b6c"][(row + j) % 3],
        );
    }
    for (const side of [-1, 1])
      stone.add(-0.56 + side * 0.12, y, -0.38, 0.036, 0.072, 0.245, "#b08873");
  }
  detail.add(-0.56, 1.6, -0.38, 0.34, 0.045, 0.37, "#847c73", 0, 0, roofAngle);
  stone.add(-0.56, 2.11, -0.38, 0.33, 0.065, 0.35, "#d0bfa2");
  detail.add(-0.56, 2.15, -0.38, 0.2, 0.018, 0.21, "#504940");
  for (const x of [-0.688, -0.432])
    stone.add(x, 2.155, -0.38, 0.043, 0.045, 0.29, "#b69b82");
  for (const z of [-0.504, -0.256])
    stone.add(-0.56, 2.155, z, 0.23, 0.045, 0.043, "#b69b82");

  // Recessed painted door: rails, stiles, inset panels and brass furniture.
  timber.add(0.35, 0.545, 0.613, 0.48, 1.015, 0.055, "#567c72");
  for (const x of [0.137, 0.563])
    timber.add(x, 0.545, 0.648, 0.052, 0.99, 0.025, "#80998b");
  for (const y of [0.095, 0.49, 1.007])
    timber.add(0.35, y, 0.65, 0.4, 0.065, 0.025, "#879f91");
  for (const y of [0.28, 0.754]) {
    timber.add(0.35, y, 0.642, 0.32, y < 0.3 ? 0.29 : 0.41, 0.018, "#719386");
    for (const x of [0.186, 0.514])
      timber.add(x, y, 0.658, 0.013, y < 0.3 ? 0.31 : 0.43, 0.012, "#a4b8a3");
  }
  for (const x of [0.08, 0.62])
    timber.add(x, 0.56, 0.697, 0.067, 1.08, 0.085, "#c3af8e");
  timber.add(0.35, 1.08, 0.697, 0.61, 0.067, 0.085, "#cbb895");
  stone.add(0.35, 0.055, 0.725, 0.63, 0.075, 0.27, "#c9c0a8");
  detail.add(0.515, 0.53, 0.669, 0.032, 0.09, 0.012, "#c0a26c");
  detail.add(0.493, 0.535, 0.689, 0.065, 0.015, 0.022, "#e0bf7b");
  detail.add(0.35, 0.84, 0.667, 0.2, 0.034, 0.012, "#b79965");
  detail.add(0.35, 0.835, 0.675, 0.163, 0.006, 0.004, "#4e594e");

  function windowFrame(parent: T.Group, width: number, height: number) {
    const joinery = new ctx.Batch(parent, woodMaterial);
    const sill = new ctx.SoftBatch(parent, stoneMaterial);
    joinery.add(0, 0, -0.041, width + 0.045, height + 0.045, 0.025, "#665c4d");
    for (const x of [-width / 2, width / 2]) {
      joinery.add(x, 0, 0.01, 0.048, height + 0.09, 0.1, "#c1ad88");
      joinery.add(x * 0.87, 0, 0.035, 0.02, height, 0.026, "#dfd0ac");
    }
    for (const y of [-height / 2, height / 2]) {
      joinery.add(0, y, 0.01, width, 0.046, 0.1, "#c7b38f");
      joinery.add(0, y * 0.87, 0.035, width * 0.9, 0.018, 0.026, "#dfd0ac");
    }
    joinery.add(0, 0, 0.035, 0.023, height, 0.026, "#e1d1aa");
    joinery.add(0, 0, 0.035, width, 0.022, 0.026, "#e1d1aa");
    sill.add(
      0,
      -height / 2 - 0.037,
      0.035,
      width + 0.17,
      0.065,
      0.2,
      "#c6b698",
    );
    joinery.build();
    sill.build();
  }
  const frontWindow = new T.Group();
  frontWindow.position.set(-0.43, 0.635, 0.675);
  house.add(frontWindow);
  windowFrame(frontWindow, 0.48, 0.48);
  windows.add(-0.43, 0.635, 0.659, 0.446, 0.446, 0.012, "#eadcb4");
  for (const z of [-0.3, 0.28]) {
    const eastWindow = new T.Group();
    eastWindow.position.set(0.89, 0.64, z);
    eastWindow.rotation.y = Math.PI / 2;
    house.add(eastWindow);
    windowFrame(eastWindow, 0.34, 0.44);
    windows.add(0.874, 0.64, z, 0.012, 0.406, 0.306, "#e3d7b7");
  }

  // Individual planter boards contain soil and the familiar seasonal flowers.
  timber.add(-0.43, 0.315, 0.8, 0.62, 0.035, 0.23, "#907360");
  for (const z of [0.695, 0.905])
    timber.add(-0.43, 0.365, z, 0.64, 0.135, 0.035, "#ac8671");
  for (const x of [-0.735, -0.125])
    timber.add(x, 0.365, 0.8, 0.035, 0.135, 0.22, "#9f7b66");
  detail.add(-0.43, 0.412, 0.8, 0.57, 0.012, 0.16, "#5f6550");
  for (const x of [-0.65, -0.21])
    detail.add(x, 0.365, 0.927, 0.018, 0.15, 0.011, "#717c6a");
  const blooms = new ctx.PuffBatch(house);
  for (let i = 0; i < 5; i++) {
    const x = -0.65 + i * 0.108;
    const y = 0.48 + (i % 2) * 0.045;
    const z = 0.8 + Math.sin(i * 2) * 0.025;
    blooms.addSeasonal(x, 0.45, z, 0.013, 0.12, 0.013, FLOWER_STEM);
    blooms.addSeasonal(
      x + 0.025,
      0.45,
      z,
      0.066,
      0.017,
      0.03,
      FLOWER_LEAF,
      0,
      i,
      -0.35,
    );
    for (let petal = 0; petal < 5; petal++) {
      const a = (petal * Math.PI * 2) / 5;
      blooms.addSeasonal(
        x + Math.cos(a) * 0.028,
        y,
        z + Math.sin(a) * 0.028,
        0.044,
        0.019,
        0.037,
        flowerHead(i % 2 ? "#f5dfb6" : "#e7afbd"),
      );
    }
    blooms.addSeasonal(x, y + 0.01, z, 0.022, 0.022, 0.022, FLOWER_CENTER);
  }
  blooms.build(false);

  timber.add(-0.05, 1.438, 0.69, 1.17, 0.325, 0.052, "#8f7761");
  const sign = mesh(
    new T.PlaneGeometry(1.105, 0.27),
    new T.MeshStandardMaterial({
      map: paperTexture(
        "POST OFFICE\nLETTERS & LITTLE WISHES",
        768,
        192,
        "#e8dfc6",
        "#6c6961",
      ),
      roughness: 0.62,
      metalness: 0.12,
    }),
    house,
    -0.05,
    1.438,
    0.718,
  );
  sign.castShadow = false;
  for (const x of [-0.582, 0.482])
    for (const y of [1.323, 1.552])
      detail.add(x, y, 0.723, 0.011, 0.011, 0.008, "#92816a");

  detail.add(0.985, 0.41, 0.54, 0.16, 0.22, 0.12, "#ad5360");
  detail.add(0.985, 0.522, 0.54, 0.18, 0.035, 0.15, "#bc6a70");
  detail.add(0.985, 0.455, 0.606, 0.116, 0.017, 0.009, "#514b43");
  timber.add(0.985, 0.215, 0.54, 0.052, 0.25, 0.055, "#8b7559");
  for (let k = 0; k < 3; k++)
    stone.add(
      0.35,
      -0.025 - k * 0.055,
      0.83 + k * 0.15,
      0.68 + k * 0.04,
      0.1,
      0.25,
      stoneColors[(k + 1) % 4],
    );

  // Lathed brass bell hangs from the existing interactive pivot.
  detail.add(0.84, 1.13, 0.9, 0.032, 0.39, 0.032, "#6c7267");
  detail.add(0.735, 1.3, 0.9, 0.24, 0.028, 0.03, "#6c7267");
  const bell = new T.Group();
  bell.position.set(0.66, 1.3, 0.9);
  house.add(bell);
  const bellMaterial = new T.MeshStandardMaterial({
    color: "#c5a169",
    roughness: 0.36,
    metalness: 0.62,
  });
  const bellShape = [
    [0.01, -0.13],
    [0.027, -0.135],
    [0.039, -0.155],
    [0.042, -0.2],
    [0.054, -0.255],
    [0.072, -0.276],
    [0.075, -0.289],
    [0.059, -0.289],
    [0.045, -0.253],
    [0.028, -0.164],
    [0.008, -0.151],
  ]
    .reverse()
    .map(([x, y]) => new T.Vector2(x, y));
  mesh(new T.LatheGeometry(bellShape, 20), bellMaterial, bell);
  const bellHardware = new ctx.PuffBatch(bell, bellMaterial);
  bellHardware.add(0, -0.084, 0, 0.017, 0.115, 0.017, "#c5a16c");
  bellHardware.add(0, -0.269, 0, 0.012, 0.069, 0.012, "#8c784f");
  bellHardware.add(0, -0.302, 0, 0.025, 0.025, 0.025, "#ac8e57");
  bellHardware.build();
  timber.build();
  stone.build();
  detail.build();
  const windowMesh = windows.build(false);
  return { house, bell, windowMesh };
}
