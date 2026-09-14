import * as T from "three";
import { type SceneContext, type Point3, PI, lerp } from "../core/context";
import { createBunny } from "./bunny";

/** Geometry and palette migrated from the original spring-post-office.html. */
export function createAirship(ctx: SceneContext) {
  const { world, Batch, mesh, rod, line, paperTexture } = ctx;
  const bunny = createBunny(ctx);
  // Airship: a scalloped voxel balloon, suspended postal gondola, rigging and a turning propeller.
  const airship = new T.Group();
  world.add(airship);
  const envelope = new Batch(airship);
  for (let x = -2.04; x <= 2.04; x += 0.15)
    for (let y = -0.9; y <= 0.9; y += 0.15)
      for (let z = -0.9; z <= 0.9; z += 0.15) {
        const d = (x / 2.08) ** 2 + (y / 0.87) ** 2 + (z / 0.81) ** 2;
        if (d > 1 || d < 0.67) continue;
        const band =
          (Math.abs(x) > 0.75 && Math.abs(x) < 1.04) || Math.abs(x) < 0.14;
        const c = band
          ? y > 0.15
            ? "#e8adb9"
            : "#ce90a5"
          : y > 0.1
            ? "#fff0d7"
            : "#e6cebd";
        envelope.add(x, 1.92 + y, z, 0.155, 0.155, 0.155, c);
      }
  envelope.build();
  const shipWood = new Batch(airship);
  for (let x = -0.76; x < 0.81; x += 0.105) {
    const w = 0.34 * Math.sqrt(Math.max(0, 1 - (x / 0.89) ** 2));
    shipWood.add(x, 0.17, 0, 0.11, 0.28, w * 2, "#c3a186");
    shipWood.add(x, 0.34, 0, 0.11, 0.035, w * 2, "#efd7b0");
    for (const s of [-1, 1])
      shipWood.add(x, 0.4, s * w, 0.11, 0.18, 0.035, "#f8e6cb");
  }
  shipWood.add(0, 0.06, 0, 1.0, 0.06, 0.36, "#927d6d");
  shipWood.add(-0.51, 0.51, 0, 0.25, 0.12, 0.49, "#e5d2ac");
  shipWood.add(0.44, 0.49, -0.07, 0.21, 0.19, 0.28, "#d3b592");
  shipWood.add(0.42, 0.55, 0.13, 0.23, 0.27, 0.12, "#f0dfbc");
  shipWood.add(0.42, 0.61, 0.198, 0.065, 0.075, 0.009, "#c891a0");
  for (const s of [-1, 1]) {
    rod(
      shipWood,
      [-0.58, 0.43, s * 0.27],
      [-0.68, 1.28, s * 0.52],
      0.024,
      "#ae9581",
    );
    rod(
      shipWood,
      [0.58, 0.43, s * 0.27],
      [0.71, 1.28, s * 0.52],
      0.024,
      "#ae9581",
    );
  }
  shipWood.add(-1.73, 1.96, 0, 0.6, 0.73, 0.05, "#a5c1b6", 0, 0, 0.23);
  shipWood.add(-1.75, 1.94, 0, 0.54, 0.05, 1.18, "#c78d9e", 0, 0.08, 0);
  shipWood.add(-0.98, 0.47, 0, 0.23, 0.08, 0.09, "#baa289");
  shipWood.build();
  for (const z of [-0.71, 0.71]) {
    const curve: Point3[] = [];
    for (let k = 0; k <= 20; k++) {
      const f = k / 20;
      curve.push([lerp(-1.4, 1.4, f), 1.75 - Math.sin(f * PI) * 0.21, z]);
    }
    line(airship, curve, "#c7b296");
  }
  const pilot = bunny(airship, -0.21, 0.35, 0, "#8faeb2", 0.7);
  pilot.g.rotation.y = PI / 2;
  const badge = mesh(
    new T.PlaneGeometry(0.63, 0.39),
    new T.MeshStandardMaterial({
      map: paperTexture("AIR MAIL", 256, 160, "#fae5ce", "#a17184"),
      roughness: 0.8,
    }),
    airship,
    0.03,
    1.93,
    0.82,
  );
  badge.castShadow = false;
  const propeller = new T.Group();
  propeller.position.set(-1.14, 0.47, 0);
  airship.add(propeller);
  const pb = new Batch(propeller);
  pb.add(0, 0, 0, 0.07, 0.095, 0.095, "#ae977c");
  pb.add(0, 0, 0, 0.025, 0.08, 0.56, "#b98593");
  pb.add(0, 0, 0, 0.025, 0.56, 0.08, "#d4b093");
  pb.build();
  const banner = new T.Group();
  banner.position.set(-1.83, 1.5, 0.05);
  airship.add(banner);
  const bb = new Batch(banner);
  bb.add(-0.27, 0, 0, 0.54, 0.1, 0.025, "#e9b5c1");
  bb.add(-0.55, 0, 0, 0.12, 0.07, 0.02, "#f4d3d6");
  bb.build();
  return { airship, propeller, banner, pilot };
}
