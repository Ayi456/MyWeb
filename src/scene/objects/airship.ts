import * as T from "three";
import { type SceneContext, type Point3, PI, lerp } from "../core/context";
import { createBunny } from "./bunny";

/** Geometry and palette migrated from the original spring-post-office.html. */
export function createAirship(ctx: SceneContext) {
  const { world, SoftBatch: Batch, mesh, rod, line, paperTexture } = ctx;
  const bunny = createBunny(ctx);
  // Continuous balloon skin with painted bands, matching the cloud whale's curves.
  const airship = new T.Group();
  world.add(airship);
  const geometry = new T.SphereGeometry(1, 48, 32);
  geometry.rotateZ(-Math.PI / 2);
  geometry.scale(2.08, 0.87, 0.81);
  const canvas = document.createElement("canvas");
  canvas.width = 16;
  canvas.height = 512;
  const paint = canvas.getContext("2d");
  if (!paint) throw new Error("Unable to paint the airship envelope");
  for (let row = 0; row < canvas.height; row++) {
    const x = Math.abs(Math.cos((row / (canvas.height - 1)) * Math.PI) * 2.08);
    const band = Math.max(
      1 - T.MathUtils.smoothstep(x, 0.11, 0.17),
      T.MathUtils.smoothstep(x, 0.73, 0.79) *
        (1 - T.MathUtils.smoothstep(x, 1.01, 1.07)),
    );
    const color = new T.Color("#fff0d7").lerp(new T.Color("#d69caf"), band);
    paint.fillStyle = "#" + color.getHexString();
    paint.fillRect(0, row, 16, 1);
  }
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  mesh(
    geometry,
    new T.MeshStandardMaterial({ map: texture, roughness: 0.88 }),
    airship,
    0,
    1.92,
    0,
  );
  const hull = mesh(
    ctx.puff,
    new T.MeshStandardMaterial({ color: "#c3a186", roughness: 0.93 }),
    airship,
    0,
    0.2,
    0,
  );
  hull.scale.set(1.74, 0.4, 0.69);
  const shipWood = new Batch(airship);
  shipWood.add(0, 0.34, 0, 1.55, 0.06, 0.6, "#efd7b0");
  for (const side of [-1, 1])
    shipWood.add(0, 0.43, side * 0.29, 1.43, 0.18, 0.05, "#f8e6cb");
  for (const x of [-0.73, 0.73])
    shipWood.add(x, 0.42, 0, 0.05, 0.18, 0.48, "#f8e6cb");
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
  const pb = new ctx.PuffBatch(propeller);
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
