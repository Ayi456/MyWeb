import * as T from "three";
import { type Point3, type SceneContext } from "../core/context";
import {
  DEPOT_ISLAND,
  GARDEN_ISLAND,
  LIGHTHOUSE_ISLAND,
  MAIN_ISLAND,
  TEA_ISLAND,
  VILLAGE_ISLAND,
} from "../worldLayout";
import { islandOutline } from "./softTerrain";

type Island = {
  center: readonly [number, number, number];
  radius: readonly [number, number];
};

/** Light branches connect the outer islands without crossing the sacred grove. */
export function createIslandConnections(ctx: SceneContext) {
  const islandConnections = new T.Group();
  islandConnections.name = "sacred-island-bridges";
  ctx.world.add(islandConnections);
  const structure = new ctx.SoftBatch(islandConnections);
  const lamps = new ctx.SoftBatch(islandConnections, ctx.lampMat);

  function shore(
    island: Island,
    angle: number,
    height: (x: number, z: number) => number = () => 0,
  ): Point3 {
    const radius = islandOutline(angle) * 0.99;
    const x = Math.cos(angle) * island.radius[0] * radius;
    const z = Math.sin(angle) * island.radius[1] * radius;
    return [
      island.center[0] + x,
      island.center[1] + height(x, z) + 0.16,
      island.center[2] + z,
    ];
  }

  const main: Island = { center: [0, 0, 0], radius: MAIN_ISLAND.radius };
  const teaHeight = (x: number, z: number) =>
    Math.max(0, Math.floor(((z + 1.2) / -4.5 + (x + 1) * 0.04) * 3.4)) * 0.42;
  const villageHeight = (x: number, z: number) =>
    0.12 * Math.round((Math.sin(x * 0.9) + Math.cos(z * 1.1)) * 0.8);

  function bridge(
    name: string,
    start: Point3,
    end: Point3,
    controls: readonly [readonly [number, number], readonly [number, number]],
    sag: number,
    width = 0.74,
  ) {
    const curve = new T.CubicBezierCurve3(
      new T.Vector3(...start),
      new T.Vector3(
        controls[0][0],
        T.MathUtils.lerp(start[1], end[1], 1 / 3),
        controls[0][1],
      ),
      new T.Vector3(
        controls[1][0],
        T.MathUtils.lerp(start[1], end[1], 2 / 3),
        controls[1][1],
      ),
      new T.Vector3(...end),
    );
    const count = Math.max(5, Math.ceil(curve.getLength() / 0.245));
    const sample = (t: number) => {
      const point = curve.getPointAt(t);
      point.y =
        T.MathUtils.lerp(start[1], end[1], t) - Math.sin(t * Math.PI) * sag;
      return point;
    };
    const points = Array.from({ length: count + 1 }, (_, i) =>
      sample(i / count),
    );
    const sides = points.map((_, i) => {
      const tangent = points[Math.min(count, i + 1)]
        .clone()
        .sub(points[Math.max(0, i - 1)]);
      return new T.Vector3(-tangent.z, 0, tangent.x).normalize();
    });
    const euler = new T.Euler();
    const basis = new T.Matrix4();
    const postEvery = Math.max(
      3,
      Math.round(count / Math.max(2, curve.getLength() / 1.25)),
    );
    for (let i = 0; i < count; i++) {
      const a = points[i],
        b = points[i + 1];
      const point = a.clone().add(b).multiplyScalar(0.5);
      const tangent = b.clone().sub(a).normalize();
      const side = new T.Vector3(-tangent.z, 0, tangent.x).normalize();
      const up = side.clone().cross(tangent).normalize();
      euler.setFromRotationMatrix(basis.makeBasis(tangent, up, side));
      structure.add(
        point.x,
        point.y,
        point.z,
        a.distanceTo(b) * 0.96,
        0.065,
        width,
        i % 4 ? "#ece2c6" : "#d8c79d",
        euler.x,
        euler.y,
        euler.z,
      );
      for (const sign of [-1, 1]) {
        const edgeA = a.clone().addScaledVector(sides[i], sign * width * 0.45);
        const edgeB = b
          .clone()
          .addScaledVector(sides[i + 1], sign * width * 0.45);
        // Slender gilded rails and pale underside ropes follow the same sag.
        ctx.rod(
          structure,
          [edgeA.x, edgeA.y + 0.43, edgeA.z],
          [edgeB.x, edgeB.y + 0.43, edgeB.z],
          0.027,
          "#c5ac75",
        );
        ctx.rod(
          structure,
          [edgeA.x, edgeA.y - 0.07, edgeA.z],
          [edgeB.x, edgeB.y - 0.07, edgeB.z],
          0.035,
          "#c6b99d",
        );
      }
    }
    for (let i = 0; i <= count; i++) {
      if (i !== count && i % postEvery !== 0) continue;
      for (const sign of [-1, 1]) {
        const p = points[i]
          .clone()
          .addScaledVector(sides[i], sign * width * 0.45);
        structure.add(p.x, p.y + 0.21, p.z, 0.04, 0.46, 0.04, "#d7c291");
        structure.add(p.x, p.y + 0.465, p.z, 0.075, 0.05, 0.075, "#ecdfb6");
      }
    }
    // A pair of small lanterns marks each crossing, with one more on long spans.
    const lanternStops =
      count > 36 ? [0, Math.round(count / 2), count] : [0, count];
    for (let k = 0; k < lanternStops.length; k++) {
      const i = lanternStops[k];
      const p = points[i]
        .clone()
        .addScaledVector(sides[i], (k % 2 ? -1 : 1) * width * 0.45);
      structure.add(p.x, p.y + 0.35, p.z, 0.055, 0.72, 0.055, "#bca375");
      structure.add(p.x, p.y + 0.79, p.z, 0.18, 0.045, 0.18, "#c9b183");
      structure.add(p.x, p.y + 0.595, p.z, 0.15, 0.035, 0.15, "#d6c299");
      lamps.add(p.x, p.y + 0.69, p.z, 0.115, 0.16, 0.115, "#fff1cc");
    }
    // Useful to inspect connectivity without adding per-bridge draw calls.
    const marker = new T.Object3D();
    marker.name = name;
    marker.userData = { start: [...start], end: [...end], plankCount: count };
    islandConnections.add(marker);
  }

  // The expanded west shore nearly meets the garden: a short ramp replaces the
  // former long bridge whose first half would now be buried inside the island.
  const west = shore(main, Math.PI - 0.055, ctx.ground);
  const gardenEast = shore(GARDEN_ISLAND, 0.78);
  bridge(
    "grove-to-garden",
    west,
    gardenEast,
    [
      [west[0] - 0.65, west[2] - 0.12],
      [gardenEast[0] - 0.28, gardenEast[2] + 0.4],
    ],
    0.025,
    0.8,
  );

  bridge(
    "grove-to-lighthouse",
    shore(main, -0.99, ctx.ground),
    shore(LIGHTHOUSE_ISLAND, 2.18),
    [
      [4.3, -6.9],
      [5.8, -9.0],
    ],
    0.3,
    0.8,
  );
  // This lower western branch stays south of the suspended cablecar route.
  bridge(
    "garden-to-depot",
    shore(GARDEN_ISLAND, -2.1),
    shore(DEPOT_ISLAND, 1.13),
    [
      [-10.7, -5.2],
      [-12.6, -6.5],
    ],
    0.28,
  );
  bridge(
    "depot-to-tea-hill",
    shore(DEPOT_ISLAND, -Math.PI + 0.05),
    shore(TEA_ISLAND, 1.53, teaHeight),
    [
      [-19.0, -9.7],
      [-19.6, -10.8],
    ],
    0.12,
  );
  // Keep the eastern branch west of the airship berth and below its return
  // corridor; the bridge drops gently to the lower spring village.
  bridge(
    "lighthouse-to-spring-village",
    shore(LIGHTHOUSE_ISLAND, -1.7),
    shore(VILLAGE_ISLAND, 1.95, villageHeight),
    [
      [7.0, -17.4],
      [8.1, -21.9],
    ],
    0.28,
  );

  for (const batch of [structure, lamps]) {
    const mesh = batch.build(false);
    mesh.computeBoundingSphere();
    mesh.frustumCulled = true;
  }
  return { islandConnections };
}
