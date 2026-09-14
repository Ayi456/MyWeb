import * as T from "three";
import { type SceneContext } from "../core/context";

/** Geometry and palette migrated from the original spring-post-office.html. */
export function createBunny(ctx: SceneContext) {
  const { Batch } = ctx;
  function bunny(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    coat = "#86a9a7",
    scale = 1,
  ) {
    const g = new T.Group();
    g.position.set(x, y, z);
    g.scale.setScalar(scale);
    parent.add(g);
    const b = new Batch(g);
    b.add(0, 0.27, 0, 0.24, 0.29, 0.18, coat);
    b.add(0, 0.36, 0.096, 0.16, 0.048, 0.026, "#e7b0b3");
    b.add(0.09, 0.29, -0.105, 0.12, 0.21, 0.095, "#ba947c");
    const head = new T.Group();
    head.position.y = 0.49;
    g.add(head);
    const hb = new Batch(head);
    hb.add(0, 0, 0, 0.27, 0.23, 0.23, "#fff2de");
    hb.add(-0.078, 0.22, -0.01, 0.074, 0.26, 0.078, "#fff2de", 0, 0, 0.11);
    hb.add(0.078, 0.23, -0.01, 0.074, 0.28, 0.078, "#fff2de", 0, 0, -0.1);
    hb.add(-0.078, 0.22, 0.031, 0.033, 0.17, 0.009, "#e6adb9");
    hb.add(0.078, 0.23, 0.031, 0.033, 0.18, 0.009, "#e6adb9");
    for (const s of [-1, 1]) {
      hb.add(s * 0.058, 0.015, 0.123, 0.025, 0.035, 0.014, "#68565c");
      hb.add(s * 0.098, -0.03, 0.12, 0.043, 0.024, 0.01, "#e8b3b8");
    }
    hb.add(0, -0.046, 0.127, 0.031, 0.022, 0.013, "#d29da8");
    hb.build();
    const arms = [],
      legs = [];
    for (const s of [-1, 1]) {
      const a = new T.Group();
      a.position.set(s * 0.145, 0.35, 0);
      g.add(a);
      const ab = new Batch(a);
      ab.add(0, -0.072, 0, 0.073, 0.18, 0.085, coat);
      ab.add(0, -0.16, 0.015, 0.076, 0.075, 0.082, "#fff2de");
      ab.build();
      arms.push(a);
      const f = new T.Group();
      f.position.set(s * 0.077, 0.11, 0);
      g.add(f);
      const fb = new Batch(f);
      fb.add(0, -0.065, 0.025, 0.083, 0.13, 0.14, "#f3e5d0");
      fb.build();
      legs.push(f);
    }
    b.build();
    return { g, head, arms, legs };
  }
  return bunny;
}
