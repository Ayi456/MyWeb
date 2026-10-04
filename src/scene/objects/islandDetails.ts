import * as T from "three";
import { type SceneContext, TAU } from "../core/context";
import { seededRandom } from "../utils/seededRandom";
import type { VoxelBatch } from "../utils/voxelBatch";
import { FLOWER_CENTER, FLOWER_STEM, LEAF, flowerHead } from "./seasonalColors";
import { TERRAIN_SEGMENTS } from "./softTerrain";

/** Planted borders and weathered ledges follow the existing sculpted island. */
export function createIslandDetails(
  ctx: SceneContext,
  soil: T.Mesh,
  mineral: VoxelBatch,
  plants: VoxelBatch,
) {
  const random = seededRandom(314162);
  const range = (a: number, b: number) => a + (b - a) * random();
  const surface = soil.geometry.getAttribute("position");
  const ringSize = TERRAIN_SEGMENTS + 1;
  const point = new T.Vector3();

  // Sample the actual cliff rings so the relief sits in the soil, even along
  // the irregular outline. Short, broken shelves leave the broad rock readable.
  for (const [ring, indices] of [
    [5, [3, 4, 10, 11, 12, 20, 21, 29, 36, 37, 45, 53, 54, 60]],
    [8, [8, 9, 18, 19, 28, 38, 39, 50, 51, 59]],
  ] as const) {
    for (const i of indices) {
      point.fromBufferAttribute(surface, ring * ringSize + i);
      const angle = (i / TERRAIN_SEGMENTS) * TAU;
      mineral.add(
        point.x * 0.99,
        point.y,
        point.z * 0.99,
        range(0.42, 0.7),
        range(0.14, 0.21),
        0.28,
        ring === 5 ? "#a69785" : "#8f8278",
        0,
        Math.PI / 2 - angle,
        0.08,
      );
      if (ring === 5 && i % 3 !== 0)
        plants.addSeasonal(
          point.x * 0.99,
          point.y + 0.075,
          point.z * 0.99,
          0.36,
          0.04,
          0.2,
          LEAF[i % 2],
          0,
          Math.PI / 2 - angle,
        );
    }
  }

  // Ivy spills over a few sections of the rim, with branching leaf pairs.
  // Each strand follows the narrowing cliff instead of hanging in empty air.
  const upper = new T.Vector3(),
    lower = new T.Vector3();
  for (const segment of [3, 10, 18, 25, 36, 44, 53, 59]) {
    const angle = (segment / TERRAIN_SEGMENTS) * TAU;
    const rim = new T.Vector3().fromBufferAttribute(
      surface,
      3 * ringSize + segment,
    );
    for (let strand = 0; strand < 2; strand++) {
      const length = 7 + ((segment + strand) % 4);
      for (let j = 0; j < length; j++) {
        const offset =
          (strand - 0.5) * 0.14 + Math.sin(j * 0.72 + strand) * 0.04;
        const y = ctx.ground(rim.x, rim.z) + 0.08 - j * 0.14;
        point.copy(rim);
        for (let ring = 3; ring < surface.count / ringSize - 1; ring++) {
          upper.fromBufferAttribute(surface, ring * ringSize + segment);
          lower.fromBufferAttribute(surface, (ring + 1) * ringSize + segment);
          if (y < lower.y) continue;
          point.lerpVectors(
            upper,
            lower,
            T.MathUtils.clamp((upper.y - y) / (upper.y - lower.y), 0, 1),
          );
          break;
        }
        const x = point.x + Math.cos(angle) * 0.035 - Math.sin(angle) * offset;
        const z = point.z + Math.sin(angle) * 0.035 + Math.cos(angle) * offset;
        plants.add(x, y - 0.04, z, 0.022, 0.19, 0.022, "#70876a");
        for (const side of [-1, 1])
          plants.addSeasonal(
            x - Math.sin(angle) * side * 0.062,
            y,
            z + Math.cos(angle) * side * 0.062,
            0.17 - j * 0.004,
            0.055,
            0.11,
            LEAF[(j + strand) % 2],
            0.25,
            -angle,
            side * 0.4,
          );
      }
    }
  }

  // Low hydrangea borders sit outside the postal and walking routes. Larger
  // foliage masses make the existing fine meadow flowers read as planted beds.
  for (const [cx, cz, size, color] of [
    [-4.45, 0.5, 0.74, "#ceb4da"],
    [-3.25, -1.9, 0.65, "#e4b6c7"],
    [-0.35, 2.8, 0.8, "#d9bfdc"],
    [1.55, 2.6, 0.7, "#efcfad"],
    [3.75, -1.25, 0.65, "#d5b4ce"],
  ] as const) {
    const y = ctx.ground(cx, cz) + 0.11;
    for (let lobe = 0; lobe < 5; lobe++) {
      const a = lobe * 2.4;
      const x = cx + Math.cos(a) * size * 0.23;
      const z = cz + Math.sin(a) * size * 0.17;
      plants.addSeasonal(
        x,
        y + size * 0.13,
        z,
        size * 0.62,
        size * 0.32,
        size * 0.5,
        LEAF[lobe % 2],
        0,
        a,
      );
      const head = flowerHead(color);
      for (let petal = 0; petal < 7; petal++) {
        const pa = petal * 2.4;
        const r = petal ? size * 0.085 : 0;
        plants.addSeasonal(
          x + Math.cos(pa) * r,
          y + size * (0.31 + (petal ? 0 : 0.045)),
          z + Math.sin(pa) * r,
          size * 0.135,
          size * 0.09,
          size * 0.135,
          head,
        );
      }
    }
    // A loose arc of half-buried stones frames each border without fencing it in.
    for (let i = 0; i < 7; i++) {
      const a = 0.1 + (i * Math.PI) / 7;
      const x = cx + Math.cos(a) * size * 0.63;
      const z = cz + Math.sin(a) * size * 0.48;
      mineral.add(
        x,
        ctx.ground(x, z) + 0.105,
        z,
        0.16,
        0.07,
        0.11,
        i % 2 ? "#c7bdab" : "#dfd1b8",
        0,
        -a,
      );
    }
  }

  // Ferns and little mushrooms give the shaded pond/tree corner a different
  // texture from the sunnier flower beds; none encroach on the pond or path.
  for (const [x, z] of [
    [-4.3, 0.35],
    [-2.95, -1.7],
    [-0.2, -3.1],
  ]) {
    const y = ctx.ground(x, z) + 0.1;
    for (let frond = 0; frond < 5; frond++) {
      const a = (frond * TAU) / 5;
      for (let leaf = 1; leaf <= 4; leaf++) {
        const r = leaf * 0.05;
        plants.addSeasonal(
          x + Math.cos(a) * r,
          y + Math.sin((leaf / 5) * Math.PI) * 0.18,
          z + Math.sin(a) * r,
          0.16 - leaf * 0.02,
          0.033,
          0.055,
          LEAF[frond % 2],
          0,
          -a,
        );
      }
    }
    for (let i = 0; i < 3; i++) {
      const mx = x + 0.22 + i * 0.075,
        mz = z + Math.sin(i * 2) * 0.08;
      const my = ctx.ground(mx, mz) + 0.1,
        h = 0.08 + (i % 2) * 0.045;
      plants.add(mx, my + h / 2, mz, 0.028, h, 0.028, "#e4d8ba");
      plants.add(mx, my + h, mz, h * 1.2, h * 0.5, h, "#b68978");
    }
  }

  // Taller flower spires vary the silhouette of the existing low flower beds.
  for (const [x, z] of [
    [0.38, 2.65],
    [2.15, 2.35],
    [-3.8, -1.2],
  ]) {
    for (let i = 0; i < 4; i++) {
      const xx = x + (i - 1.5) * 0.095,
        zz = z + Math.sin(i * 2) * 0.1;
      const y = ctx.ground(xx, zz) + 0.1,
        h = 0.3 + range(0, 0.15);
      plants.addSeasonal(xx, y + h / 2, zz, 0.016, h, 0.016, FLOWER_STEM);
      for (let bud = 0; bud < 4; bud++)
        plants.addSeasonal(
          xx + Math.sin(bud * 2.4) * 0.027,
          y + h - bud * 0.045,
          zz + Math.cos(bud * 2.4) * 0.027,
          0.07 - bud * 0.006,
          0.06,
          0.07,
          flowerHead(i % 2 ? "#beafd5" : "#f0d5ac"),
        );
      plants.addSeasonal(
        xx,
        y + h + 0.018,
        zz,
        0.022,
        0.028,
        0.022,
        FLOWER_CENTER,
      );
    }
  }
}
