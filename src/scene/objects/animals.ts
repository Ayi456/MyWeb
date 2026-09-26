import * as T from "three";
import { type SceneContext, PI } from "../core/context";
import { createBunny } from "./bunny";
import type { createFurniture } from "./furniture";

/** Geometry and palette migrated from the original spring-post-office.html. */
export function createAnimals(
  ctx: SceneContext,
  bench: ReturnType<typeof createFurniture>["bench"],
) {
  const { world, SoftBatch: Batch, mesh, rod } = ctx;
  const bunny = createBunny(ctx);
  const writer = bunny(bench, -0.22, 0.36, 0.025, "#cea2b1", 0.8);
  writer.g.rotation.y = 0.18;
  writer.arms[0].rotation.x = -0.7;
  writer.arms[1].rotation.x = -0.7;
  const note = new Batch(writer.g);
  note.add(0, 0.33, 0.18, 0.2, 0.13, 0.016, "#fff5df", -0.2, 0, 0);
  note.add(0, 0.35, 0.193, 0.1, 0.011, 0.005, "#c898a6");
  note.build(false);
  const courier = bunny(world, 2.54, 1.2, 0.25, "#91b4b0", 0.92);
  courier.g.rotation.y = PI / 2;
  const cart = new T.Group();
  world.add(cart);
  const cb = new Batch(cart);
  cb.add(0, 0.19, 0, 0.52, 0.09, 0.4, "#ad8e76");
  for (const z of [-0.22, 0.22])
    cb.add(0, 0.36, z, 0.55, 0.26, 0.044, "#d0b291");
  for (const x of [-0.27, 0.27])
    cb.add(x, 0.36, 0, 0.04, 0.27, 0.45, "#c2a080");
  rod(cb, [0.23, 0.28, 0], [0.63, 0.57, 0], 0.039, "#a38976");
  cb.add(-0.07, 0.37, 0.03, 0.22, 0.24, 0.24, "#d9c5a0");
  cb.add(-0.07, 0.495, 0.03, 0.025, 0.013, 0.25, "#b3877d");
  cb.add(0.13, 0.42, -0.01, 0.15, 0.33, 0.28, "#efd9b1");
  cb.add(0.13, 0.44, 0.136, 0.06, 0.055, 0.008, "#c996a3");
  cb.build();
  const wheels = [];
  for (const x of [-0.17, 0.17])
    for (const z of [-0.245, 0.245]) {
      const w = mesh(
        new T.CylinderGeometry(0.1, 0.1, 0.044, 10),
        new T.MeshStandardMaterial({ color: "#83787d", roughness: 0.8 }),
        cart,
        x,
        0.12,
        z,
      );
      w.rotation.x = PI / 2;
      wheels.push(w);
    }
  const cat = new T.Group();
  cat.position.set(0.23, 0.38, 0.06);
  cat.rotation.y = -0.3;
  bench.add(cat);
  const ct = new ctx.PuffBatch(cat);
  ct.add(0, 0.08, 0, 0.27, 0.16, 0.18, "#b4a6a5");
  ct.add(0.17, 0.17, 0, 0.18, 0.17, 0.18, "#c8b9b0");
  for (const s of [-1, 1]) {
    ct.add(
      0.16,
      0.3,
      s * 0.064,
      0.067,
      0.12,
      0.056,
      "#c8b9b0",
      s * 0.12,
      0,
      0.16,
    );
    ct.add(0.266, 0.19, s * 0.046, 0.012, 0.025, 0.022, "#6e666c");
  }
  ct.add(0.272, 0.155, 0, 0.012, 0.016, 0.018, "#dbadac");
  ct.add(0.03, 0.166, 0.013, 0.12, 0.02, 0.12, "#988b92");
  ct.build();
  const paw = new T.Group();
  paw.position.set(0.15, 0.02, 0.1);
  cat.add(paw);
  const cp = new ctx.PuffBatch(paw);
  cp.add(0.055, 0, 0, 0.16, 0.07, 0.072, "#d5c5b7");
  cp.build();
  const tail = new T.Group();
  tail.position.set(-0.14, 0.1, 0);
  cat.add(tail);
  const tb = new ctx.PuffBatch(tail);
  tb.add(-0.09, 0.02, 0, 0.21, 0.073, 0.07, "#aa9d9e", 0, 0, -0.35);
  tb.add(-0.18, 0.082, 0, 0.07, 0.11, 0.07, "#c2b3ab");
  tb.build();
  return { writer, courier, cart, wheels, paw, tail };
}
