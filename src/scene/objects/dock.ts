import * as T from "three";
import { type SceneContext } from "../core/context";

/** Geometry and palette migrated from the original spring-post-office.html. */
export function createDock(ctx: SceneContext) {
  const { world, Batch, mesh, rod, ground } = ctx;
  // Floating wooden landing and garden fences.
  const dock = new Batch();
  for (let i = 0; i < 17; i++)
    dock.add(
      2.73 + i * 0.133,
      1.16,
      0.17,
      0.124,
      0.1,
      1.0,
      i % 3 ? "#d0b38f" : "#e3c39d",
    );
  for (const z of [-0.36, 0.7])
    for (const x of [2.9, 3.65, 4.85]) {
      dock.add(x, 1.32, z, 0.075, 0.5, 0.075, "#b59175");
      dock.add(x, 1.59, z, 0.1, 0.065, 0.1, "#f1d6ad");
    }
  for (const z of [-0.36, 0.7]) {
    dock.add(3.9, 1.5, z, 2.0, 0.035, 0.04, "#be9a7b");
    dock.add(3.9, 0.85, z, 2.2, 0.11, 0.08, "#997862");
  }
  rod(dock, [2.8, 0.0, -0.3], [4.25, 1.12, -0.3], 0.13, "#a88973");
  rod(dock, [2.8, 0.0, 0.6], [4.25, 1.12, 0.6], 0.13, "#a88973");
  dock.build();
  const fence = new Batch();
  for (let i = 0; i < 16; i++) {
    const x = -2.9 + i * 0.36,
      z = -2.04 + 0.12 * Math.cos(x);
    const y = ground(x, z);
    fence.add(x, y + 0.27, z, 0.065, 0.5, 0.065, "#e6d6b8");
    if (i < 15) {
      fence.add(x + 0.18, y + 0.39, z, 0.38, 0.047, 0.04, "#ddc9ab");
      fence.add(x + 0.18, y + 0.18, z, 0.38, 0.04, 0.04, "#ddc9ab");
    }
  }
  const fenceMesh = fence.build();
  const mailbox = new T.Group();
  mailbox.position.set(2.35, ground(2.35, 1.03) + 0.07, 1.03);
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
