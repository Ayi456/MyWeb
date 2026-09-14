import * as T from "three";
import { type SceneContext } from "../core/context";

/** Geometry and palette migrated from the original spring-post-office.html. */
export function createWildlife(ctx: SceneContext) {
  const { scene, world, Batch } = ctx;
  const butterflies = [];
  for (let i = 0; i < 12; i++) {
    const g = new T.Group();
    world.add(g);
    const body = new Batch(g);
    body.add(0, 0, 0, 0.018, 0.025, 0.075, "#8c7081");
    body.build(false);
    const wings = [];
    for (const side of [-1, 1]) {
      const w = new T.Group();
      g.add(w);
      const wb = new Batch(w);
      const c = ["#efbdc4", "#f1d295", "#c5b2d5"][i % 3];
      wb.add(side * 0.067, 0, 0.016, 0.115, 0.016, 0.12, c, 0, side * 0.3, 0);
      wb.add(side * 0.047, 0, -0.055, 0.08, 0.016, 0.078, c, 0, -side * 0.4, 0);
      wb.build(false);
      wings.push(w);
    }
    butterflies.push({ g, wings });
  }
  const birds = [];
  for (let i = 0; i < 5; i++) {
    const g = new T.Group();
    scene.add(g);
    const b = new Batch(g);
    b.add(0, 0, 0, 0.16, 0.055, 0.067, "#fff5df");
    b.add(0.09, 0, 0, 0.051, 0.026, 0.027, "#d5ae87");
    b.build(false);
    const wings = [];
    for (const side of [-1, 1]) {
      const w = new T.Group();
      g.add(w);
      const wb = new Batch(w);
      wb.add(
        -0.015,
        0,
        side * 0.12,
        0.075,
        0.02,
        0.23,
        "#f4e5d5",
        0,
        side * 0.3,
        0,
      );
      wb.add(
        -0.06,
        0,
        side * 0.25,
        0.051,
        0.02,
        0.09,
        "#b4a9b3",
        0,
        side * 0.7,
        0,
      );
      wb.build(false);
      wings.push(w);
    }
    birds.push({ g, wings });
  }
  return { butterflies, birds };
}
