import * as T from "three";
import { type SceneContext } from "../core/context";

/** Geometry and palette migrated from the original spring-post-office.html. */
export function createPostOffice(ctx: SceneContext) {
  const { world, lampMat, Batch, mesh, ground, paperTexture } = ctx;
  // Postal cottage, cedar framework, individually stepped terracotta tiles and a brass bell.
  const house = new T.Group();
  house.position.set(1.85, ground(1.85, 0.15) + 0.1, 0.15);
  world.add(house);
  const hb = new Batch(house);
  hb.add(0, 0.58, 0, 1.78, 1.16, 1.35, "#fff0d0");
  hb.add(0, 0.04, 0, 1.98, 0.15, 1.57, "#d6c19d");
  for (const x of [-0.84, 0.84])
    for (const z of [-0.62, 0.62])
      hb.add(x, 0.62, z, 0.075, 1.2, 0.075, "#ad8e71");
  for (let k = 0; k < 6; k++)
    hb.add(0, 1.18 + k * 0.11, 0, 1.78 - k * 0.27, 0.115, 1.35, "#f6e2c1");
  for (const side of [-1, 1])
    for (let k = 0; k < 7; k++) {
      const x = side * (0.99 - k * 0.143),
        y = 1.19 + k * 0.115;
      for (let zz = -0.81; zz < 0.84; zz += 0.15)
        hb.add(
          x,
          y,
          zz,
          0.175,
          0.11,
          0.156,
          (k + Math.round(zz * 10)) % 3 ? "#bd7d83" : "#d79495",
          0,
          0,
          side * -0.08,
        );
    }
  hb.add(0, 2.0, 0, 0.14, 0.1, 1.7, "#e5aaa5");
  hb.add(-0.56, 1.79, -0.38, 0.22, 0.66, 0.24, "#b78d87");
  hb.add(-0.56, 2.12, -0.38, 0.3, 0.07, 0.31, "#dcc1a7");
  hb.add(0.35, 0.49, 0.692, 0.43, 0.94, 0.045, "#89a9a0");
  hb.add(0.35, 1.0, 0.71, 0.49, 0.06, 0.09, "#ad9279");
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
