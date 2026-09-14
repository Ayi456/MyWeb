import * as T from "three";
import { type SceneContext } from "../core/context";

/** Geometry and palette migrated from the original spring-post-office.html. */
export function createFurniture(ctx: SceneContext, tree: T.Group) {
  const { world, Batch, line, ground } = ctx;
  // Furniture under the tree and a gently swinging seat.
  const bench = new T.Group();
  bench.position.set(-1.72, ground(-1.72, 1.1) + 0.12, 1.1);
  bench.rotation.y = 0.1;
  world.add(bench);
  const bn = new Batch(bench);
  for (let k = 0; k < 4; k++)
    bn.add(0, 0.32, -0.18 + k * 0.11, 1.08, 0.05, 0.085, "#d1ad87");
  for (const x of [-0.43, 0.43]) {
    bn.add(x, 0.16, 0, 0.065, 0.3, 0.34, "#8c7a67");
    bn.add(x, 0.55, -0.24, 0.055, 0.65, 0.055, "#a4886f");
  }
  for (const y of [0.5, 0.67]) bn.add(0, y, -0.24, 1.08, 0.12, 0.05, "#e4c69e");
  bn.build();
  const swing = new T.Group();
  swing.position.set(-1.61, 2.7, 0.5);
  tree.add(swing);
  const sb = new Batch(swing);
  sb.add(0, -1.98, 0, 0.54, 0.08, 0.3, "#d9b68f");
  sb.add(0, -1.92, 0, 0.38, 0.07, 0.22, "#f4d3d2");
  sb.build();
  for (const x of [-0.23, 0.23])
    line(
      swing,
      [
        [x, 0, 0],
        [x, -1.94, 0],
      ],
      "#c9ae8a",
    );
  return { bench, swing };
}
