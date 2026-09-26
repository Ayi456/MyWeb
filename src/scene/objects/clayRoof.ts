import * as T from "three";
import type { SceneContext, Point3 } from "../core/context";

/** Two continuous roof slopes and a bevelled gable, shared by smaller cottages. */
export function createClayRoof(
  ctx: SceneContext,
  parent: T.Object3D,
  center: Point3,
  width: number,
  depth: number,
  rise: number,
  color: string,
  wall: string,
) {
  const [x, y, z] = center;
  const shape = new T.Shape();
  shape.moveTo(-width * 0.44, 0);
  shape.lineTo(width * 0.44, 0);
  shape.lineTo(0, rise * 0.9);
  shape.closePath();
  const geometry = new T.ExtrudeGeometry(shape, {
    depth: depth * 0.88,
    bevelEnabled: true,
    bevelSize: 0.025,
    bevelThickness: 0.025,
    bevelSegments: 2,
    steps: 1,
  });
  geometry.translate(0, 0, -depth * 0.44);
  const gable = ctx.mesh(
    geometry,
    new T.MeshStandardMaterial({ color: wall, roughness: 0.9 }),
    parent,
    x,
    y,
    z,
  );
  gable.castShadow = false;
  const roof = new ctx.SoftBatch(parent);
  const angle = Math.atan2(rise, width / 2),
    length = Math.hypot(width / 2, rise);
  for (const side of [-1, 1])
    roof.add(
      x + side * width * 0.25,
      y + rise * 0.5,
      z,
      length + 0.06,
      0.1,
      depth,
      color,
      0,
      0,
      -side * angle,
    );
  roof.add(x, y + rise + 0.025, z, 0.13, 0.09, depth + 0.04, color);
  return roof.build(false);
}
