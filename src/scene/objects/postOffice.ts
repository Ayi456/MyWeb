import * as T from "three";
import { type SceneContext } from "../core/context";
import {
  FLOWER_CENTER,
  FLOWER_LEAF,
  FLOWER_STEM,
  flowerHead,
} from "./seasonalColors";

/** Geometry and palette migrated from the original spring-post-office.html. */
export function createPostOffice(ctx: SceneContext) {
  const { world, lampMat, SoftBatch: Batch, mesh, ground, paperTexture } = ctx;
  // A miniature clay cottage with a continuous gable and softly edged tiles.
  const house = new T.Group();
  house.position.set(1.85, ground(1.85, 0.15) + 0.1, 0.15);
  world.add(house);
  const hb = new Batch(house);
  hb.add(0, 0.58, 0, 1.78, 1.16, 1.35, "#fff0d0");
  hb.add(0, 0.04, 0, 1.98, 0.15, 1.57, "#d6c19d");
  for (const x of [-0.84, 0.84])
    for (const z of [-0.62, 0.62])
      hb.add(x, 0.62, z, 0.075, 1.2, 0.075, "#ad8e71");
  const gable = new T.Shape();
  gable.moveTo(-0.89, 1.13);
  gable.lineTo(0.89, 1.13);
  gable.lineTo(0, 1.89);
  gable.closePath();
  const gableGeometry = new T.ExtrudeGeometry(gable, {
    depth: 1.3,
    bevelEnabled: true,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    bevelSegments: 2,
    steps: 1,
  });
  gableGeometry.translate(0, 0, -0.65);
  mesh(
    gableGeometry,
    new T.MeshStandardMaterial({ color: "#f6e2c1", roughness: 0.9 }),
    house,
  );
  for (const side of [-1, 1])
    for (let k = 0; k < 5; k++) {
      const x = side * (0.97 - k * 0.218),
        y = 1.22 + k * 0.175;
      for (let zz = -0.64; zz <= 0.65; zz += 0.425)
        hb.add(
          x,
          y,
          zz,
          0.32,
          0.115,
          0.445,
          ["#c1868a", "#c68b8e", "#c38a8c"][
            (k * 7 + Math.round((zz + 0.64) / 0.425) * 11) % 3
          ],
          0,
          0,
          side * -0.675,
        );
    }
  for (const side of [-1, 1]) {
    for (const z of [-0.86, 0.86])
      hb.add(
        side * 0.5,
        1.58,
        z,
        1.36,
        0.068,
        0.065,
        "#b57d80",
        0,
        0,
        side * -0.675,
      );
    hb.add(side * 0.99, 1.17, 0, 0.085, 0.1, 1.8, "#ad787a");
  }
  hb.add(0, 2.0, 0, 0.14, 0.1, 1.7, "#dba19d");
  hb.add(-0.56, 1.79, -0.38, 0.22, 0.66, 0.24, "#b78d87");
  hb.add(-0.56, 2.12, -0.38, 0.3, 0.07, 0.31, "#dcc1a7");
  hb.add(0.35, 0.49, 0.692, 0.43, 0.94, 0.045, "#89a9a0");
  for (const x of [0.108, 0.592])
    hb.add(x, 0.49, 0.727, 0.058, 1.0, 0.082, "#ccb393");
  for (const x of [0.242, 0.35, 0.458])
    hb.add(x, 0.49, 0.717, 0.006, 0.86, 0.005, "#77988d");
  for (const y of [0.12, 0.78])
    hb.add(0.35, y, 0.725, 0.37, 0.038, 0.024, "#97b1a0");
  hb.add(0.35, 1.0, 0.71, 0.55, 0.085, 0.12, "#c4a789");
  hb.add(0.52, 0.45, 0.728, 0.035, 0.04, 0.023, "#e3bd76");
  hb.add(-0.43, 0.61, 0.699, 0.47, 0.47, 0.042, "#a58373");
  hb.add(-0.43, 0.61, 0.73, 0.032, 0.48, 0.03, "#e1c9a0");
  hb.add(-0.43, 0.61, 0.73, 0.48, 0.032, 0.03, "#e1c9a0");
  for (const z of [-0.3, 0.28]) {
    hb.add(0.908, 0.66, z, 0.035, 0.44, 0.33, "#b18e74");
    hb.add(0.938, 0.66, z, 0.027, 0.035, 0.34, "#e7cba5");
    hb.add(0.938, 0.66, z, 0.027, 0.45, 0.027, "#e7cba5");
  }
  hb.add(-0.43, 0.32, 0.81, 0.65, 0.17, 0.23, "#be8f83");
  hb.add(-0.43, 0.402, 0.81, 0.55, 0.017, 0.15, "#806d59");
  hb.add(-0.43, 0.405, 0.925, 0.69, 0.05, 0.05, "#d0a395");
  for (const z of [-0.3, 0.28])
    hb.add(0.968, 0.407, z, 0.15, 0.06, 0.43, "#d2b998");
  const blooms = new ctx.PuffBatch(house);
  for (let i = 0; i < 5; i++) {
    const x = -0.65 + i * 0.108;
    const y = 0.47 + (i % 2) * 0.045;
    const z = 0.81 + Math.sin(i * 2) * 0.025;
    blooms.addSeasonal(x, 0.45, z, 0.019, 0.12, 0.018, FLOWER_STEM);
    blooms.addSeasonal(
      x + 0.031,
      0.45,
      z,
      0.085,
      0.026,
      0.04,
      FLOWER_LEAF,
      0,
      i,
      -0.35,
    );
    for (let petal = 0; petal < 5; petal++) {
      const a = (petal * Math.PI * 2) / 5;
      blooms.addSeasonal(
        x + Math.cos(a) * 0.03,
        y,
        z + Math.sin(a) * 0.03,
        0.047,
        0.023,
        0.042,
        flowerHead(i % 2 ? "#f5dfb6" : "#e7afbd"),
      );
    }
    blooms.addSeasonal(x, y + 0.012, z, 0.026, 0.025, 0.026, FLOWER_CENTER);
  }
  blooms.build(false);
  for (let k = 0; k < 3; k++)
    hb.add(0.35, -0.03 - k * 0.07, 0.88 + k * 0.11, 0.66, 0.1, 0.18, "#e4d3b4");
  hb.build();
  const windows = new Batch(house, lampMat);
  windows.add(-0.43, 0.61, 0.721, 0.39, 0.39, 0.014, "#ffe4ac");
  for (const z of [-0.3, 0.28])
    windows.add(0.929, 0.66, z, 0.014, 0.36, 0.27, "#ffe8b6");
  const sign = mesh(
    new T.PlaneGeometry(1.14, 0.36),
    new T.MeshStandardMaterial({
      map: paperTexture("POST OFFICE\nLETTERS & LITTLE WISHES"),
      roughness: 0.8,
    }),
    house,
    -0.05,
    1.43,
    0.696,
  );
  sign.castShadow = false;
  const hb2 = new Batch(house);
  hb2.add(0.84, 1.13, 0.9, 0.045, 0.39, 0.045, "#ac906f");
  hb2.add(0.71, 1.3, 0.9, 0.31, 0.04, 0.04, "#ac906f");
  hb2.build();
  // The brass bell hangs from its own pivot so a tap can swing it.
  const bell = new T.Group();
  bell.position.set(0.66, 1.3, 0.9);
  house.add(bell);
  const bellBatch = new Batch(bell);
  bellBatch.add(0, -0.21, 0, 0.1, 0.11, 0.1, "#d6b370");
  bellBatch.add(0, -0.285, 0, 0.13, 0.027, 0.13, "#deb96e");
  bellBatch.add(0, -0.1, 0, 0.03, 0.12, 0.03, "#b89a62");
  bellBatch.build();
  const windowMesh = windows.build(false);
  return { house, bell, windowMesh };
}
