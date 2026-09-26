import * as T from "three";
import { type SceneContext, type Point3, PI, lerp } from "../core/context";

/** Geometry and palette migrated from the original spring-post-office.html. */
export function createLanterns(ctx: SceneContext) {
  const { world, lampMat, Batch, line } = ctx;
  const lanternMat = lampMat.clone();
  // Lantern strands follow shallow catenaries, with warm glowing paper cubes at night.
  const lanterns: T.Group[] = [],
    glows: T.Sprite[] = [];
  const glowCanvas = document.createElement("canvas");
  glowCanvas.width = 64;
  glowCanvas.height = 64;
  const gc = glowCanvas.getContext("2d")!;
  const gg = gc.createRadialGradient(32, 32, 0, 32, 32, 32);
  gg.addColorStop(0, "rgba(255,226,157,.8)");
  gg.addColorStop(0.2, "rgba(255,195,137,.35)");
  gg.addColorStop(1, "rgba(255,186,131,0)");
  gc.fillStyle = gg;
  gc.fillRect(0, 0, 64, 64);
  const glowTex = new T.CanvasTexture(glowCanvas);
  glowTex.colorSpace = T.SRGBColorSpace;
  function addLantern(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    scale = 1,
  ) {
    const g = new T.Group();
    g.position.set(x, y, z);
    g.scale.setScalar(scale);
    parent.add(g);
    const l = new Batch(g, lanternMat);
    l.add(0, 0, 0, 0.18, 0.22, 0.18, "#ffdbb7");
    l.add(0, 0.13, 0, 0.12, 0.07, 0.12, "#ffe6c6");
    l.add(0, -0.13, 0, 0.12, 0.05, 0.12, "#efc290");
    l.build(false);
    const b = new Batch(g);
    b.add(0, 0.18, 0, 0.15, 0.03, 0.15, "#b38e71");
    b.add(0, -0.17, 0, 0.15, 0.025, 0.15, "#b38e71");
    b.add(0, -0.22, 0, 0.02, 0.075, 0.02, "#b98c7a");
    b.build(false);
    const sm = new T.SpriteMaterial({
      map: glowTex,
      transparent: true,
      depthWrite: false,
      opacity: 0.15,
      blending: T.AdditiveBlending,
    });
    const spr = new T.Sprite(sm);
    spr.scale.set(0.9, 0.9, 1);
    g.add(spr);
    glows.push(spr);
    lanterns.push(g);
    return g;
  }
  for (const [a, b, n] of [
    [[-2.9, 3.64, 0.52], [0.06, 3.27, 1.35], 7],
    [[-0.15, 3.55, 1.4], [2.13, 2.88, 0.95], 6],
  ] as [Point3, Point3, number][]) {
    const pts: Point3[] = [];
    for (let i = 0; i <= 32; i++) {
      const f = i / 32;
      pts.push([
        lerp(a[0], b[0], f),
        lerp(a[1], b[1], f) - Math.sin(f * PI) * 0.42,
        lerp(a[2], b[2], f),
      ]);
    }
    line(world, pts, "#aa8f82");
    for (let i = 0; i < n; i++) {
      const f = (i + 0.5) / n;
      addLantern(
        world,
        lerp(a[0], b[0], f),
        lerp(a[1], b[1], f) - Math.sin(f * PI) * 0.42 - 0.15,
        lerp(a[2], b[2], f),
        0.75,
      );
    }
  }
  return { lanterns, glows, lanternMat };
}
