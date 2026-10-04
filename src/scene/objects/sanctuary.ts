import * as T from "three";
import { type SceneContext, TAU } from "../core/context";
import { SACRED_TREE } from "../worldLayout";
import { FLOWER_STEM, LEAF, flowerHead } from "./seasonalColors";

/** A walkable marble sanctuary, with quiet processional paths across the larger island. */
export function createSanctuary(ctx: SceneContext) {
  const sanctuary = new T.Group();
  sanctuary.name = "sacred-tree-sanctuary";
  ctx.world.add(sanctuary);
  const stone = new ctx.SoftBatch(sanctuary);
  const planting = new ctx.PuffBatch(sanctuary);
  const lights = new ctx.SoftBatch(sanctuary, ctx.lampMat);
  const [cx, cz] = SACRED_TREE.center;

  // One tessellated mesh keeps the inlaid stone flush with the walking surface.
  const positions: number[] = [],
    colors: number[] = [],
    indices: number[] = [];
  const rings = [0.62, 0.68, 1.27, 1.3, 1.76, 1.82];
  const color = new T.Color();
  for (let ring = 0; ring < rings.length - 1; ring++) {
    for (let i = 0; i < 96; i++) {
      const start = positions.length / 3;
      const a = (i * TAU) / 96,
        b = ((i + 1) * TAU) / 96;
      const gold = ring === 0 || ring === 2 || ring === 4;
      color.set(
        gold ? "#c6ae77" : Math.floor(i / 8) % 2 ? "#ede4cf" : "#e1d7c8",
      );
      for (const [radius, angle] of [
        [rings[ring], a],
        [rings[ring], b],
        [rings[ring + 1], a],
        [rings[ring + 1], b],
      ]) {
        const x = cx + Math.cos(angle) * radius,
          z = cz + Math.sin(angle) * radius;
        positions.push(x, ctx.ground(x, z) + 0.118, z);
        colors.push(color.r, color.g, color.b);
      }
      indices.push(
        start,
        start + 1,
        start + 2,
        start + 1,
        start + 3,
        start + 2,
      );
    }
  }
  const floorGeometry = new T.BufferGeometry();
  floorGeometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(positions, 3),
  );
  floorGeometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  floorGeometry.setIndex(indices);
  floorGeometry.computeVertexNormals();
  const floor = ctx.mesh(
    floorGeometry,
    new T.MeshStandardMaterial({ vertexColors: true, roughness: 0.86 }),
    sanctuary,
  );
  floor.castShadow = false;
  floor.name = "inlaid-sanctuary-floor";

  // Four ceremonial lamps stand outside the open approach and existing pond.
  for (const [x, z] of [
    [-2.6, -2.55],
    [0.8, -2.55],
    [-3.05, -0.45],
    [1.2, -1.45],
  ]) {
    const y = ctx.ground(x, z) + 0.1;
    stone.add(x, y + 0.07, z, 0.43, 0.14, 0.43, "#c5baa0");
    stone.add(x, y + 0.2, z, 0.28, 0.14, 0.28, "#f0e3c7");
    stone.add(x, y + 0.41, z, 0.16, 0.3, 0.16, "#e0d0b4");
    stone.add(x, y + 0.59, z, 0.34, 0.08, 0.34, "#c5ab70");
    lights.add(x, y + 0.79, z, 0.18, 0.29, 0.18, "#fff0cf");
    for (const dx of [-0.13, 0.13])
      for (const dz of [-0.13, 0.13])
        stone.add(x + dx, y + 0.8, z + dz, 0.025, 0.38, 0.025, "#bba16c");
    stone.add(x, y + 1.01, z, 0.38, 0.06, 0.38, "#e5d6b5");
    stone.add(x, y + 1.07, z, 0.16, 0.07, 0.16, "#c5ab70");
  }

  function path(points: [number, number][], width: number) {
    const curve = new T.CatmullRomCurve3(
      points.map(([x, z]) => new T.Vector3(x, 0, z)),
    );
    const count = Math.ceil(curve.getLength() / 0.34);
    for (let i = 0; i <= count; i++) {
      const p = curve.getPoint(i / count),
        tangent = curve.getTangent(i / count);
      stone.add(
        p.x,
        ctx.ground(p.x, p.z) + 0.115,
        p.z,
        width,
        0.035,
        0.29,
        i % 4 ? "#e3d6bb" : "#cbbd9f",
        0,
        Math.atan2(tangent.x, tangent.z),
      );
    }
  }
  path(
    [
      [-6.98, 0.28],
      [-5.8, 0.05],
      [-4.8, -0.8],
      [-3.4, -1.55],
      [-2.4, -1.8],
    ],
    0.46,
  );
  path(
    [
      [0.25, -2.3],
      [1.45, -3.1],
      [3.5, -3.35],
      [3.93, -4.36],
    ],
    0.46,
  );
  path(
    [
      [3.8, 0.92],
      [4.7, 0.9],
      [5.6, 0.75],
      [6.1, 0.2],
    ],
    0.54,
  );
  path(
    [
      [0.25, 1.55],
      [0.25, 2.5],
      [0.65, 3.55],
      [1.8, 3.85],
    ],
    0.58,
  );
  path(
    [
      [-4.8, 2.85],
      [-3.35, 3.8],
      [-0.4, 4.2],
      [2.6, 3.95],
      [5.15, 2.8],
    ],
    0.43,
  );

  // Low rose beds and gold-edged planters frame the new lawn and its residents.
  for (const [x, z, size] of [
    [-5.5, -1.8, 1.0],
    [-4.6, -3.0, 0.9],
    [2.0, -3.75, 0.85],
    [-4.65, 3.3, 0.75],
    [0, 4.55, 0.85],
    [4.95, 2.55, 0.9],
    [5.65, -1.65, 0.8],
  ]) {
    const y = ctx.ground(x, z) + 0.1;
    stone.add(x, y + 0.07, z, size, 0.14, size * 0.66, "#c9b99b");
    stone.add(x, y + 0.15, z, size * 1.05, 0.035, size * 0.7, "#e6d7b8");
    for (let i = 0; i < 5; i++) {
      const a = i * 2.4,
        px = x + Math.cos(a) * size * 0.28,
        pz = z + Math.sin(a) * size * 0.17;
      planting.addSeasonal(
        px,
        y + 0.24,
        pz,
        size * 0.46,
        0.27,
        size * 0.38,
        LEAF[i % 2],
      );
      for (let petal = 0; petal < 5; petal++) {
        const angle = (petal * TAU) / 5;
        planting.addSeasonal(
          px + Math.cos(angle) * 0.066,
          y + 0.42,
          pz + Math.sin(angle) * 0.066,
          0.12,
          0.07,
          0.12,
          flowerHead(i % 2 ? "#dfbdcf" : "#f0dbbd"),
        );
      }
    }
    for (const side of [-1, 1]) {
      const px = x + side * size * 0.37;
      planting.addSeasonal(px, y + 0.35, z, 0.025, 0.42, 0.025, FLOWER_STEM);
      planting.addSeasonal(
        px,
        y + 0.57,
        z,
        0.11,
        0.15,
        0.11,
        flowerHead("#d8c4df"),
      );
    }
  }
  // Everything is static and has no vertex displacement; close-ups may cull it.
  for (const batch of [stone, planting, lights]) {
    const mesh = batch.build(false);
    mesh.computeBoundingSphere();
    mesh.boundingSphere!.radius *= 1.08;
    mesh.frustumCulled = true;
  }
  return { sanctuary };
}
