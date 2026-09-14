import * as T from "three";
import { type SceneContext } from "../core/context";

/** Geometry and palette migrated from the original spring-post-office.html. */
export function createEnvelope(ctx: SceneContext) {
  const { Batch, line } = ctx;
  function makeEnvelope() {
    const g = new T.Group(),
      b = new Batch(g);
    b.add(0, 0, 0, 0.34, 0.21, 0.028, "#fff4dc");
    b.add(0.115, 0.065, 0.021, 0.065, 0.062, 0.012, "#d797ac");
    b.add(-0.035, -0.035, 0.021, 0.15, 0.012, 0.005, "#c4a4a6");
    b.add(-0.06, -0.067, 0.021, 0.1, 0.01, 0.005, "#c4a4a6");
    b.build(false);
    line(
      g,
      [
        [-0.17, 0.105, 0.021],
        [0, -0.015, 0.021],
        [0.17, 0.105, 0.021],
      ],
      "#c798a8",
    );
    return g;
  }
  return makeEnvelope;
}
