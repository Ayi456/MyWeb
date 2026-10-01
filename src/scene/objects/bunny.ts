import * as T from "three";
import { type SceneContext } from "../core/context";

export type BunnyRole = "visitor" | "writer" | "courier";
export const BUNNY_FACE = { x: 0.164, y: 0.139, z: 0.137 } as const;
export function bunnyFaceZ(x: number, y: number) {
  return (
    BUNNY_FACE.z *
    Math.sqrt(
      Math.max(0, 1 - (x / BUNNY_FACE.x) ** 2 - (y / BUNNY_FACE.y) ** 2),
    )
  );
}

/** Small painted patches follow the actual face instead of floating in front of it. */
function facePaint(eyes: boolean) {
  const positions: number[] = [],
    colors: number[] = [],
    indices: number[] = [];
  const color = new T.Color();
  function vertex(x: number, y: number, ink: string) {
    color.set(ink);
    positions.push(
      x,
      y - (eyes ? 0.028 : 0),
      bunnyFaceZ(x, y) +
        (eyes ? 0.004 : 0.0015) +
        (ink === "#fff6e6" ? 0.0008 : 0),
    );
    colors.push(color.r, color.g, color.b);
  }
  function oval(x: number, y: number, rx: number, ry: number, ink: string) {
    const start = positions.length / 3;
    vertex(x, y, ink);
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      vertex(x + Math.cos(a) * rx, y + Math.sin(a) * ry, ink);
      if (i) indices.push(start, start + i, start + i + 1);
    }
  }
  if (eyes) {
    for (const side of [-1, 1]) {
      oval(side * 0.057, 0.028, 0.013, 0.017, "#51494f");
      oval(side * 0.057 - 0.003, 0.034, 0.0034, 0.004, "#fff6e6");
    }
  } else {
    for (const side of [-1, 1]) {
      // Enhanced cheek blush with gradient
      oval(side * 0.105, -0.022, 0.032, 0.018, "#f5dada"); // Outer fade
      oval(side * 0.105, -0.022, 0.025, 0.014, "#e9b6b6"); // Main blush
      oval(side * 0.022, -0.047, 0.024, 0.017, "#fff5e4");
    }
    // A tiny Y-shaped smile is painted as a continuous ribbon on the muzzle.
    for (const side of [-1, 1]) {
      const start = positions.length / 3;
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const x = side * t * 0.023;
        const y = -0.043 - Math.sin(t * Math.PI * 0.85) * 0.013;
        vertex(x, y - 0.0018, "#a1817e");
        vertex(x, y + 0.0018, "#a1817e");
        if (i) {
          const p = start + i * 2;
          indices.push(p - 2, p, p - 1, p - 1, p, p + 1);
        }
      }
    }
    oval(0, -0.033, 0.012, 0.008, "#cb929d");
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export function createBunny(ctx: SceneContext) {
  const fur = new T.MeshStandardMaterial({ color: "#fff0da", roughness: 0.94 });
  const paint = new T.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    side: T.DoubleSide,
  });
  const headGeometry = new T.SphereGeometry(1, 32, 24);
  headGeometry.scale(BUNNY_FACE.x, BUNNY_FACE.y, BUNNY_FACE.z);
  const faceGeometry = facePaint(false),
    eyeGeometry = facePaint(true);
  const earGeometry = new T.SphereGeometry(0.5, 24, 18);
  const p = earGeometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const t = p.getY(i) + 0.5;
    p.setXYZ(i, p.getX(i) * 0.092 + 0.035 * t * t, t * 0.31, p.getZ(i) * 0.068);
  }
  earGeometry.computeVertexNormals();
  const innerGeometry = new T.SphereGeometry(0.5, 20, 16);
  const inner = innerGeometry.attributes.position;
  for (let i = 0; i < inner.count; i++) {
    const t = 0.19 + (inner.getY(i) + 0.5) * 0.65;
    const x = inner.getX(i) * 0.045;
    const surface =
      0.034 *
      Math.sqrt(Math.max(0, 1 - ((t - 0.5) * 2) ** 2 - (x / 0.046) ** 2));
    inner.setXYZ(
      i,
      x + 0.035 * t * t,
      t * 0.31,
      surface + 0.001 + inner.getZ(i) * 0.002,
    );
  }
  innerGeometry.computeVertexNormals();
  const innerMat = new T.MeshStandardMaterial({
    color: "#e6aeb5",
    roughness: 1,
  });

  return function bunny(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    coat = "#86a9a7",
    scale = 1,
    role: BunnyRole = "visitor",
  ) {
    const g = new T.Group();
    g.name = `bunny-${role}`;
    g.position.set(x, y, z);
    g.scale.setScalar(scale);
    parent.add(g);
    const b = new ctx.PuffBatch(g);
    // Subtle fur highlight layer for depth
    const furHighlight = new ctx.PuffBatch(g);
    furHighlight.add(0, 0.255, 0, 0.252, 0.282, 0.197, "#fffcf0");
    furHighlight.build();
    b.add(0, 0.255, 0, 0.25, 0.28, 0.195, coat);
    for (const side of [-1, 1])
      b.add(side * 0.068, 0.12, 0.014, 0.118, 0.16, 0.142, "#fff0da");
    b.add(0, 0.378, 0.013, 0.13, 0.047, 0.13, "#fff1de");
    b.add(-0.032, 0.343, 0.09, 0.064, 0.069, 0.026, "#f3d6c6", 0, 0, -0.32);
    b.add(0.032, 0.343, 0.09, 0.064, 0.069, 0.026, "#f3d6c6", 0, 0, 0.32);
    b.add(0, 0.289, 0.099, 0.017, 0.017, 0.013, "#dab67c");
    b.add(0, 0.238, 0.1, 0.015, 0.015, 0.012, "#dab67c");
    b.add(0, 0.18, -0.105, 0.105, 0.1, 0.1, "#fff0da");
    // Add tail fluff layers for volume
    b.add(0, 0.175, -0.135, 0.095, 0.092, 0.085, "#fffcf0");
    b.add(0, 0.165, -0.11, 0.082, 0.078, 0.075, "#fff5e8");
    if (role === "courier") {
      const bag = new ctx.SoftBatch(g);
      bag.add(0.123, 0.22, 0.01, 0.13, 0.145, 0.112, "#b88e70");
      bag.add(0.123, 0.275, 0.065, 0.13, 0.052, 0.019, "#cba382");
      bag.add(0.125, 0.242, 0.08, 0.029, 0.027, 0.014, "#e6c785");
      ctx.rod(bag, [-0.08, 0.38, 0.07], [0.12, 0.23, 0.094], 0.023, "#b58c72");
      bag.add(0.134, 0.296, 0.012, 0.07, 0.051, 0.014, "#fff3dc", 0, 0, -0.15);
      bag.build();
    }
    b.build();
    const head = new T.Group();
    head.position.y = 0.485;
    g.add(head);
    ctx.mesh(headGeometry, fur, head).name = "bunny-head";
    const face = ctx.mesh(faceGeometry, paint, head);
    face.name = "bunny-face-paint";
    face.castShadow = false;

    // Add nose detail with highlight
    const nose = new ctx.PuffBatch(head);
    nose.add(0, 0.012, 0.136, 0.022, 0.018, 0.025, "#e8a8b4");
    nose.add(0, 0.015, 0.138, 0.012, 0.008, 0.012, "#f5c5ce"); // Nose highlight
    nose.build(false);

    const eyes = ctx.mesh(eyeGeometry, paint, head, 0, 0.028, 0);
    eyes.name = "bunny-eyes";
    eyes.castShadow = false;
    const ears: T.Group[] = [];
    for (const side of [-1, 1]) {
      const ear = new T.Group();
      ear.name = `bunny-ear-${side}`;
      ear.position.set(side * 0.077, 0.089, -0.014);
      ear.rotation.z = side < 0 ? 0.22 : -0.14;
      ear.rotation.x = side < 0 ? -0.06 : 0.08;
      if (side < 0) ear.scale.x = -1;
      head.add(ear);
      ctx.mesh(earGeometry, fur, ear).name = "bunny-outer-ear";
      const pigment = ctx.mesh(innerGeometry, innerMat, ear);
      pigment.name = "bunny-inner-ear";
      pigment.castShadow = false;

      // Add ear tip color variation
      const earTip = new ctx.PuffBatch(ear);
      earTip.add(0, 0.195, 0, 0.048, 0.065, 0.03, coat, 0, 0, -0.08);
      earTip.build(false);

      ears.push(ear);
    }
    if (role === "courier") {
      const hat = new ctx.PuffBatch(head);
      hat.add(0, 0.093, 0.021, 0.266, 0.08, 0.226, "#759b96");
      hat.add(0, 0.064, 0.095, 0.255, 0.025, 0.16, "#608983");
      hat.add(0, 0.092, 0.133, 0.037, 0.028, 0.014, "#efd19b");
      hat.build();
    }
    const arms: T.Group[] = [],
      legs: T.Group[] = [];
    for (const side of [-1, 1]) {
      const arm = new T.Group();
      arm.position.set(side * 0.14, 0.34, 0);
      g.add(arm);
      const ab = new ctx.PuffBatch(arm);
      ab.add(0, -0.065, 0, 0.083, 0.15, 0.09, coat);
      ab.add(0, -0.139, 0.014, 0.085, 0.08, 0.09, "#fff0da");
      // Add finger details on paw
      for (let f = 0; f < 3; f++) {
        const fx = (f - 1) * 0.022;
        ab.add(fx, -0.175, 0.045, 0.018, 0.025, 0.035, "#fff5e8");
      }
      ab.build();
      arms.push(arm);
      const leg = new T.Group();
      leg.position.set(side * 0.075, 0.102, 0);
      g.add(leg);
      const lb = new ctx.PuffBatch(leg);
      lb.add(0, -0.052, 0.039, 0.105, 0.1, 0.172, "#f5e5ce");
      // Add paw pads for detail - main pad
      lb.add(0, -0.095, 0.11, 0.045, 0.018, 0.065, "#f0c9d5");
      // Add individual toe pads (4 small pads)
      for (let t = 0; t < 4; t++) {
        const tx = side * (t - 1.5) * 0.018;
        lb.add(tx, -0.085, 0.145, 0.016, 0.012, 0.022, "#f0c9d5");
      }
      lb.build();
      legs.push(leg);
    }
    return { g, head, arms, legs, ears, eyes, role };
  };
}
export type Bunny = ReturnType<ReturnType<typeof createBunny>>;
