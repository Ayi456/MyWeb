import * as T from "three";
import { type SceneContext } from "../core/context";
import { MAIN_ISLAND, MAIN_MAILBOX } from "../worldLayout";

/** Geometry and palette migrated from the original spring-post-office.html. */
export function createDock(ctx: SceneContext) {
  const { world, SoftBatch: Batch, mesh, rod, ground } = ctx;
  // Floating wooden landing and garden fences.
  const dock = new Batch();
  for (let i = 0; i < 32; i++)
    dock.add(
      3.83 + i * 0.133,
      1.16,
      0.17,
      0.124,
      0.1,
      1.2,
      i % 3 ? "#d0b38f" : "#e3c39d",
    );
  for (const z of [-0.46, 0.8])
    for (const x of [4.0, 4.75, 5.95, 6.8, 7.35, 7.95]) {
      dock.add(x, 1.32, z, 0.075, 0.5, 0.075, "#b59175");
      dock.add(x, 1.59, z, 0.1, 0.065, 0.1, "#f1d6ad");
    }
  for (const z of [-0.46, 0.8]) {
    dock.add(5.95, 1.5, z, 3.85, 0.035, 0.04, "#be9a7b");
    dock.add(5.95, 0.85, z, 4.05, 0.11, 0.08, "#997862");
  }
  rod(dock, [3.9, 0.0, -0.3], [7.75, 1.12, -0.3], 0.13, "#a88973");
  rod(dock, [3.9, 0.0, 0.6], [7.75, 1.12, 0.6], 0.13, "#a88973");
  // Mooring hardware sits on the outer rail, clear of the courier's centre lane.
  for (const x of [6.8, 7.95]) {
    for (const z of [-0.46, 0.8]) {
      dock.add(x, 1.38, z, 0.115, 0.055, 0.12, "#c8bda0");
      dock.add(x, 1.45, z, 0.2, 0.045, 0.09, "#89968e");
    }
  }
  for (const x of [5.95, 7.35]) {
    // Short batched rope segments retain a soft, round miniature silhouette.
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2,
        b = ((i + 1) / 18) * Math.PI * 2;
      rod(
        dock,
        [x + Math.cos(a) * 0.15, 1.32 + Math.sin(a) * 0.19, 0.855],
        [x + Math.cos(b) * 0.15, 1.32 + Math.sin(b) * 0.19, 0.855],
        0.035,
        "#eee0bc",
      );
    }
    dock.add(x, 1.52, 0.855, 0.055, 0.08, 0.055, "#bca58a");
    dock.add(x - 0.24, 0.93, 0.865, 0.13, 0.37, 0.13, "#9db2ad");
    dock.add(x - 0.24, 0.93, 0.865, 0.145, 0.055, 0.145, "#eee0bc");
    rod(dock, [x - 0.24, 1.12, 0.865], [x - 0.24, 1.5, 0.8], 0.023, "#c6ac8b");
  }
  // A small loading parcel and an envelope badge identify the air-mail berth.
  dock.add(7.64, 1.26, -0.26, 0.5, 0.08, 0.34, "#b4987b");
  dock.add(7.64, 1.44, -0.26, 0.37, 0.28, 0.28, "#cda884");
  dock.add(7.64, 1.44, -0.112, 0.055, 0.28, 0.018, "#f4e1ba");
  dock.add(7.64, 1.587, -0.26, 0.055, 0.018, 0.28, "#f4e1ba");
  dock.add(7.72, 1.47, -0.098, 0.11, 0.075, 0.014, "#fff0d1");
  dock.add(7.0, 1.66, -0.48, 0.62, 0.32, 0.075, "#88a39e");
  dock.add(7.0, 1.67, -0.436, 0.4, 0.21, 0.025, "#ffedce");
  rod(dock, [6.82, 1.76, -0.418], [7.0, 1.64, -0.418], 0.021, "#b57e8a");
  rod(dock, [7.0, 1.64, -0.418], [7.18, 1.76, -0.418], 0.021, "#b57e8a");
  for (const x of [6.8, 7.2])
    dock.add(x, 1.43, -0.48, 0.04, 0.25, 0.04, "#a68b70");
  dock.build();
  const fence = new Batch();
  for (let i = 0; i < 22; i++) {
    const x = -4.0 + i * 0.38,
      z = -2.65 * Math.sqrt(1 - (x / MAIN_ISLAND.radius[0]) ** 2);
    const y = ground(x, z);
    fence.add(x, y + 0.27, z, 0.065, 0.5, 0.065, "#e6d6b8");
    if (i < 21) {
      const nx = x + 0.38,
        nz = -2.65 * Math.sqrt(1 - (nx / MAIN_ISLAND.radius[0]) ** 2),
        ny = ground(nx, nz);
      rod(fence, [x, y + 0.39, z], [nx, ny + 0.39, nz], 0.047, "#ddc9ab");
      rod(fence, [x, y + 0.18, z], [nx, ny + 0.18, nz], 0.04, "#ddc9ab");
    }
  }
  const fenceMesh = fence.build();
  const mailbox = new T.Group();
  mailbox.position.set(
    MAIN_MAILBOX.x,
    ground(MAIN_MAILBOX.x, MAIN_MAILBOX.z) + 0.07,
    MAIN_MAILBOX.z,
  );
  world.add(mailbox);
  const mb = new Batch(mailbox);
  mb.add(0, 0.3, 0, 0.1, 0.62, 0.1, "#927662");
  mb.add(0, 0.69, 0, 0.42, 0.31, 0.38, "#c77f96");
  mb.add(0, 0.875, 0, 0.36, 0.08, 0.37, "#e2a5b5");
  mb.add(0, 0.93, 0, 0.23, 0.05, 0.35, "#e9b2bf");
  mb.add(0, 0.74, 0.199, 0.28, 0.032, 0.013, "#734f65");
  mb.add(0, 0.6, 0.201, 0.18, 0.1, 0.014, "#fff0d4");
  mb.add(0.23, 0.87, 0, 0.035, 0.21, 0.04, "#aa756a");
  mb.add(0.295, 0.94, 0, 0.15, 0.08, 0.035, "#d89f88");
  mb.build();
  const mailHit = mesh(
    new T.BoxGeometry(0.68, 1.22, 0.6),
    new T.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
    }),
    mailbox,
    0,
    0.58,
    0,
  );
  mailHit.castShadow = false;
  return { mailHit, mailbox, fenceMesh };
}
