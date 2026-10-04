import * as T from "three";
import { type Point3, type SceneContext } from "../core/context";
import type { VoxelBatch } from "../utils/voxelBatch";
import { BUNNY_FACE, bunnyFaceZ } from "./bunny";

export type ResidentRole = "keeper" | "florist" | "scholar" | "guide" | "child";
export interface ResidentCollider {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
}

/** Residents occupy the new lawns, leaving the altar and postal paths open. */
export const RESIDENT_LAYOUT = [
  {
    role: "keeper",
    label: "守树人",
    x: -3.4,
    z: -2.85,
    yaw: 0.85,
    scale: 1.5,
  },
  {
    role: "florist",
    label: "献花访客",
    x: -3.8,
    z: 3.1,
    yaw: 0.5,
    scale: 1.45,
  },
  {
    role: "scholar",
    label: "旅行学者",
    x: 3.7,
    z: 3.0,
    yaw: -0.45,
    scale: 1.5,
  },
  {
    role: "guide",
    label: "提灯向导",
    x: -6.25,
    z: -0.8,
    yaw: 0.95,
    scale: 1.5,
  },
  {
    role: "child",
    label: "许愿的小兔",
    x: -2.75,
    z: 3.15,
    yaw: -0.2,
    scale: 1.16,
  },
] as const;

/** Five posed islanders share two draw calls, the scene's geometry, and its matte material. */
export function createResidents(ctx: SceneContext) {
  const residents = new T.Group();
  residents.name = "sacred-tree-island-residents";
  ctx.world.add(residents);
  const soft = new ctx.SoftBatch(residents),
    round = new ctx.PuffBatch(residents);
  const residentColliders: ResidentCollider[] = [];
  const residentLandmarks: {
    role: ResidentRole;
    label: string;
    x: number;
    y: number;
    z: number;
  }[] = [];
  const local = new T.Object3D(),
    combined = new T.Matrix4(),
    position = new T.Vector3(),
    scale = new T.Vector3(),
    rotation = new T.Quaternion(),
    euler = new T.Euler();
  const fur = "#fff0da",
    ink = "#594c50",
    gold = "#d5b77b";

  function part(
    batch: VoxelBatch,
    frame: T.Matrix4,
    p: Point3,
    size: Point3,
    color: string,
    angles: Point3 = [0, 0, 0],
  ) {
    local.position.set(...p);
    local.scale.set(...size);
    local.rotation.set(...angles);
    local.updateMatrix();
    combined.multiplyMatrices(frame, local.matrix);
    combined.decompose(position, rotation, scale);
    euler.setFromQuaternion(rotation);
    batch.add(
      position.x,
      position.y,
      position.z,
      scale.x,
      scale.y,
      scale.z,
      color,
      euler.x,
      euler.y,
      euler.z,
    );
  }
  function frameAt(parent: T.Matrix4, p: Point3, angles: Point3 = [0, 0, 0]) {
    return parent
      .clone()
      .multiply(
        new T.Matrix4().compose(
          new T.Vector3(...p),
          new T.Quaternion().setFromEuler(new T.Euler(...angles)),
          new T.Vector3(1, 1, 1),
        ),
      );
  }
  function stem(
    batch: VoxelBatch,
    frame: T.Matrix4,
    a: Point3,
    b: Point3,
    width: number,
    color: string,
  ) {
    const start = new T.Vector3(...a),
      end = new T.Vector3(...b),
      delta = end.clone().sub(start),
      mid = start.add(end).multiplyScalar(0.5),
      angles = new T.Euler().setFromQuaternion(
        new T.Quaternion().setFromUnitVectors(
          new T.Vector3(0, 1, 0),
          delta.clone().normalize(),
        ),
      );
    part(
      batch,
      frame,
      mid.toArray(),
      [width, delta.length() + width * 0.25, width],
      color,
      [angles.x, angles.y, angles.z],
    );
  }
  function ring(
    frame: T.Matrix4,
    center: Point3,
    rx: number,
    ry: number,
    width: number,
    color: string,
    from = 0,
    to = Math.PI * 2,
  ) {
    for (let i = 0; i < 14; i++) {
      const a = from + ((to - from) * i) / 14,
        b = from + ((to - from) * (i + 1)) / 14;
      stem(
        soft,
        frame,
        [center[0] + Math.cos(a) * rx, center[1] + Math.sin(a) * ry, center[2]],
        [center[0] + Math.cos(b) * rx, center[1] + Math.sin(b) * ry, center[2]],
        width,
        color,
      );
    }
  }
  function bloom(frame: T.Matrix4, p: Point3, color: string, radius = 0.035) {
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      part(
        round,
        frame,
        [p[0] + Math.cos(a) * radius, p[1] + Math.sin(a) * radius, p[2]],
        [radius * 1.45, radius * 1.6, radius],
        color,
      );
    }
    part(
      round,
      frame,
      [p[0], p[1], p[2] + radius * 0.4],
      [radius, radius, radius * 0.7],
      gold,
    );
  }

  for (const resident of RESIDENT_LAYOUT) {
    const { role, x, z, yaw, scale: size } = resident;
    const y = ctx.ground(x, z) + 0.09;
    const base = new T.Matrix4().compose(
      new T.Vector3(x, y, z),
      new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 1, 0), yaw),
      new T.Vector3(size, size, size),
    );
    const coat = {
      keeper: "#9caf98",
      florist: "#c58fa2",
      scholar: "#98aabd",
      guide: "#789e93",
      child: "#adbeda",
    }[role];
    const kneeling = role === "child",
      bodyDrop = kneeling ? 0.075 : 0,
      headY = 0.5 - bodyDrop;
    const head = frameAt(
      base,
      [0, headY, 0.005],
      [
        role === "scholar" || kneeling ? 0.16 : -0.03,
        0,
        role === "florist" ? -0.12 : role === "guide" ? 0.07 : 0,
      ],
    );

    // The familiar pear body, forward paws, painted muzzle, and long pink ears.
    part(round, base, [0, 0.265 - bodyDrop, 0], [0.27, 0.31, 0.22], coat);
    if (role === "keeper" || role === "florist")
      part(round, base, [0, 0.19, -0.005], [0.34, 0.3, 0.27], coat);
    for (const side of [-1, 1]) {
      const footZ =
        role === "guide" && side < 0 ? 0.09 : kneeling ? -0.035 : 0.035;
      part(
        round,
        base,
        [side * 0.08, 0.055, footZ],
        [0.12, 0.105, 0.185],
        "#f5e5ce",
        [0, side * -0.08, 0],
      );
      part(
        round,
        base,
        [side * 0.08, 0.117, footZ - 0.015],
        [0.105, 0.15, 0.13],
        fur,
      );
    }
    part(
      round,
      base,
      [0, 0.18 - bodyDrop * 0.5, -0.135],
      [0.11, 0.1, 0.1],
      fur,
    );
    part(round, base, [0, 0.38 - bodyDrop, 0], [0.17, 0.045, 0.14], "#f1dec7");
    part(
      round,
      head,
      [0, 0, 0],
      [BUNNY_FACE.x * 2, BUNNY_FACE.y * 2, BUNNY_FACE.z * 2],
      fur,
    );
    for (const side of [-1, 1]) {
      const ear = frameAt(
        head,
        [side * 0.077, 0.105, -0.01],
        [
          side < 0 ? -0.06 : 0.08,
          0,
          side < 0 ? 0.21 : role === "child" ? -0.38 : -0.14,
        ],
      );
      part(round, ear, [0, 0.125, 0], [0.086, 0.29, 0.067], fur);
      part(round, ear, [0, 0.135, 0.032], [0.043, 0.205, 0.012], "#e8b1b7");
      const eyeX = side * 0.057,
        eyeY = 0.024;
      part(
        round,
        head,
        [eyeX, eyeY, bunnyFaceZ(eyeX, eyeY) + 0.003],
        [0.023, role === "keeper" ? 0.006 : 0.033, 0.008],
        ink,
        [0, side * 0.28, role === "keeper" ? side * 0.12 : 0],
      );
      if (role !== "keeper")
        part(
          round,
          head,
          [eyeX - 0.003, eyeY + 0.006, bunnyFaceZ(eyeX, eyeY) + 0.007],
          [0.006, 0.007, 0.003],
          "#fff9ec",
        );
      const cheekX = side * 0.101;
      part(
        round,
        head,
        [cheekX, -0.023, bunnyFaceZ(cheekX, -0.023) + 0.002],
        [0.044, 0.023, 0.007],
        "#edb9bb",
        [0, side * 0.55, 0],
      );
      part(
        round,
        head,
        [side * 0.021, -0.052, bunnyFaceZ(side * 0.021, -0.052)],
        [0.039, 0.024, 0.009],
        "#fff7e9",
      );
      stem(
        round,
        head,
        [0, -0.042, 0.133],
        [side * 0.019, -0.057, 0.129],
        0.0035,
        "#ac8783",
      );
    }
    part(
      round,
      head,
      [0, -0.033, bunnyFaceZ(0, -0.033) + 0.005],
      [0.023, 0.015, 0.013],
      "#d798a4",
    );

    const hands: Record<ResidentRole, readonly [Point3, Point3]> = {
      keeper: [
        [-0.045, 0.33, 0.16],
        [0.255, 0.36, 0.07],
      ],
      florist: [
        [-0.155, 0.29, 0.23],
        [0.155, 0.29, 0.23],
      ],
      scholar: [
        [-0.145, 0.32, 0.23],
        [0.145, 0.32, 0.23],
      ],
      guide: [
        [-0.24, 0.42, 0.075],
        [0.285, 0.52, 0.04],
      ],
      child: [
        [-0.08, 0.265, 0.23],
        [0.105, 0.305, 0.19],
      ],
    };
    for (const [i, side] of [-1, 1].entries()) {
      const hand = hands[role][i],
        shoulder: Point3 = [side * 0.137, 0.345 - bodyDrop, 0],
        elbow: Point3 = [
          side * (role === "scholar" ? 0.19 : 0.175),
          (shoulder[1] + hand[1]) / 2 - 0.025,
          hand[2] * 0.5,
        ];
      stem(round, base, shoulder, elbow, 0.087, coat);
      stem(round, base, elbow, hand, 0.076, coat);
      part(round, base, hand, [0.085, 0.08, 0.084], fur);
    }

    if (role === "keeper") {
      // A leaf crown, long ceremonial stole, and a blossom-topped walking staff.
      for (const side of [-1, 1]) {
        part(
          soft,
          base,
          [side * 0.066, 0.26, 0.13],
          [0.045, 0.27, 0.018],
          "#f3e6c8",
        );
        part(
          soft,
          base,
          [side * 0.066, 0.139, 0.143],
          [0.046, 0.025, 0.012],
          gold,
        );
      }
      for (let i = 0; i < 7; i++) {
        const a = -1.25 + i * 0.42;
        part(
          round,
          head,
          [Math.sin(a) * 0.13, 0.103, Math.cos(a) * 0.081],
          [0.085, 0.035, 0.048],
          i % 2 ? "#b4c291" : "#799777",
          [0, -a, 0.2],
        );
      }
      bloom(head, [0, 0.13, 0.1], "#efdbb5", 0.025);
      stem(
        soft,
        base,
        [0.26, 0.02, 0.055],
        [0.26, 0.9, 0.055],
        0.028,
        "#9a8261",
      );
      ring(base, [0.26, 0.845, 0.055], 0.075, 0.09, 0.018, gold);
      bloom(base, [0.26, 0.85, 0.07], "#dce4b9", 0.028);
      part(
        soft,
        base,
        [0.31, 0.69, 0.06],
        [0.04, 0.19, 0.013],
        "#e0b2ba",
        [0, 0, -0.15],
      );
    } else if (role === "florist") {
      part(round, head, [0, 0.113, -0.005], [0.41, 0.045, 0.32], "#ddc99f");
      part(round, head, [0, 0.147, -0.012], [0.265, 0.095, 0.22], "#e8d5b0");
      part(round, head, [0, 0.117, 0.1], [0.255, 0.035, 0.055], "#bb8ca0");
      bloom(head, [-0.145, 0.13, 0.06], "#ead2db", 0.027);
      part(soft, base, [0, 0.226, 0.254], [0.29, 0.13, 0.205], "#bd9674");
      for (let i = 0; i < 5; i++)
        part(
          soft,
          base,
          [-0.118 + i * 0.059, 0.223, 0.363],
          [0.019, 0.12, 0.016],
          "#ddbe91",
        );
      part(soft, base, [0, 0.29, 0.254], [0.32, 0.028, 0.23], "#e3c598");
      ring(base, [0, 0.29, 0.25], 0.134, 0.13, 0.019, "#cfad80", 0, Math.PI);
      for (let i = 0; i < 5; i++) {
        const px = (i - 2) * 0.052,
          py = 0.335 + (i % 2) * 0.042;
        stem(soft, base, [px, 0.28, 0.28], [px, py, 0.29], 0.012, "#799779");
        bloom(base, [px, py, 0.3], i % 2 ? "#d9b6d0" : "#f4ddb0", 0.026);
      }
      part(soft, base, [0, 0.32, 0.12], [0.19, 0.14, 0.019], "#edcfcb");
    } else if (role === "scholar") {
      part(
        round,
        head,
        [0.02, 0.138, -0.01],
        [0.31, 0.115, 0.24],
        "#a48fa6",
        [0, 0, -0.14],
      );
      part(round, head, [0.058, 0.2, -0.03], [0.027, 0.025, 0.027], "#776c87");
      for (const side of [-1, 1])
        ring(
          head,
          [side * 0.057, 0.024, 0.135],
          0.039,
          0.034,
          0.007,
          "#927c68",
        );
      stem(
        soft,
        head,
        [-0.019, 0.03, 0.143],
        [0.019, 0.03, 0.143],
        0.007,
        "#927c68",
      );
      part(soft, base, [0, 0.27, -0.157], [0.225, 0.25, 0.12], "#bca17e");
      part(soft, base, [0, 0.395, -0.158], [0.24, 0.04, 0.14], "#d2b991");
      for (const side of [-1, 1]) {
        stem(
          soft,
          base,
          [side * 0.09, 0.37, 0.08],
          [side * 0.1, 0.2, 0.11],
          0.024,
          "#a88a6b",
        );
        const book = frameAt(
          base,
          [side * 0.078, 0.342, 0.244],
          [0.36, 0, side * -0.16],
        );
        part(soft, book, [0, -0.012, 0], [0.163, 0.025, 0.21], "#8a797f");
        part(soft, book, [0, 0.007, 0], [0.148, 0.022, 0.192], "#f6e7c7");
        for (let i = 0; i < 4; i++)
          part(
            soft,
            book,
            [0, 0.021, -0.051 + i * 0.029],
            [0.11 - (i % 2) * 0.02, 0.003, 0.005],
            "#bea995",
          );
      }
      part(
        soft,
        base,
        [0.048, 0.325, 0.335],
        [0.016, 0.008, 0.075],
        "#b78691",
        [0.36, 0, 0],
      );
    } else if (role === "guide") {
      part(
        round,
        head,
        [-0.012, 0.142, -0.01],
        [0.31, 0.12, 0.23],
        "#d5b776",
        [0, 0, 0.12],
      );
      part(round, head, [0, 0.104, 0.11], [0.31, 0.035, 0.15], "#bf9e69");
      part(
        soft,
        base,
        [-0.075, 0.315, 0.13],
        [0.074, 0.23, 0.019],
        "#eed9ac",
        [0, 0, -0.12],
      );
      part(round, base, [0, 0.382, 0], [0.23, 0.065, 0.2], "#e8d2a3");
      stem(
        soft,
        base,
        [-0.245, 0.02, 0.06],
        [-0.245, 0.68, 0.06],
        0.021,
        "#9b8067",
      );
      ring(
        base,
        [0.285, 0.475, 0.04],
        0.047,
        0.053,
        0.013,
        "#8d8572",
        0,
        Math.PI,
      );
      part(round, base, [0.285, 0.365, 0.04], [0.125, 0.15, 0.11], "#ffe8a9");
      for (const side of [-1, 1])
        part(
          soft,
          base,
          [0.285 + side * 0.067, 0.367, 0.04],
          [0.013, 0.15, 0.11],
          "#a88a67",
        );
      for (const ly of [0.285, 0.445])
        part(soft, base, [0.285, ly, 0.04], [0.16, 0.026, 0.135], "#af906b");
      part(round, base, [0.285, 0.466, 0.04], [0.14, 0.045, 0.12], "#b99c75");
    } else {
      // Kneeling with a wish tablet instead of another upright idle pose.
      part(soft, base, [0, 0.218, 0.108], [0.17, 0.16, 0.026], "#819cb2");
      for (const side of [-1, 1]) {
        part(
          soft,
          base,
          [side * 0.061, 0.286, 0.105],
          [0.028, 0.11, 0.018],
          "#819cb2",
        );
        part(
          round,
          base,
          [side * 0.061, 0.237, 0.127],
          [0.018, 0.018, 0.008],
          gold,
        );
      }
      part(round, base, [0, 0.317, 0.025], [0.21, 0.055, 0.17], "#ce9caa");
      part(
        soft,
        base,
        [-0.084, 0.254, 0.119],
        [0.06, 0.16, 0.017],
        "#ce9caa",
        [0, 0, -0.22],
      );
      const wish = frameAt(base, [0.012, 0.294, 0.25], [-0.22, 0, -0.13]);
      part(soft, wish, [0, 0, 0], [0.15, 0.17, 0.018], "#e2c59c");
      part(soft, wish, [0, 0.006, 0.014], [0.115, 0.125, 0.009], "#fff1d3");
      bloom(wish, [0, 0.012, 0.021], "#d3a3b7", 0.022);
      part(
        soft,
        wish,
        [0.026, -0.1, 0],
        [0.016, 0.085, 0.012],
        "#c9a4c5",
        [0, 0, 0.15],
      );
    }

    const radius = (role === "guide" || role === "keeper" ? 0.33 : 0.27) * size;
    residentColliders.push({
      minX: x - radius,
      maxX: x + radius,
      minZ: z - radius,
      maxZ: z + radius,
      minY: y,
      maxY: y + size * 0.93,
    });
    residentLandmarks.push({ role, label: resident.label, x, y, z });
  }
  round.build().name = "resident-fur-faces-and-clothes";
  soft.build().name = "resident-handmade-accessories";
  return { residents, residentColliders, residentLandmarks };
}

export type Residents = ReturnType<typeof createResidents>;
