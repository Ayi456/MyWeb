import * as T from "three";
import { type SceneContext, TAU } from "../core/context";

export const TERRAIN_SEGMENTS = 64;

/** Seamless mineral/leaf grain, generated without a network image or canvas. */
function createTerrainGrain(grass: boolean) {
  const size = 128;
  const pixels = new Uint8Array(size * size * 4);
  // Every pixel samples the same small periodic lattices. Hash each lattice
  // point once instead of repeating the sine calculation for every sample.
  const lattices = new Map(
    [5, 17, 53].map((period) => {
      const values = new Float64Array(period * period);
      for (let y = 0; y < period; y++)
        for (let x = 0; x < period; x++) {
          const value = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
          values[y * period + x] = value - Math.floor(value);
        }
      return [period, values] as const;
    }),
  );
  const noise = (x: number, y: number, period: number) => {
    const values = lattices.get(period)!;
    const px = x * period,
      py = y * period,
      ix = Math.floor(px),
      iy = Math.floor(py);
    const left = ix % period,
      right = (ix + 1) % period,
      top = (iy % period) * period,
      bottom = ((iy + 1) % period) * period;
    const sx = T.MathUtils.smoothstep(px - ix, 0, 1),
      sy = T.MathUtils.smoothstep(py - iy, 0, 1);
    return T.MathUtils.lerp(
      T.MathUtils.lerp(values[top + left], values[top + right], sx),
      T.MathUtils.lerp(values[bottom + left], values[bottom + right], sx),
      sy,
    );
  };
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size,
        v = y / size;
      const grain =
        noise(u, v, 5) * 0.46 + noise(u, v, 17) * 0.3 + noise(u, v, 53) * 0.24;
      const value = Math.round((grass ? 224 : 209) + grain * (grass ? 31 : 46));
      const offset = (y * size + x) * 4;
      pixels[offset] = value;
      pixels[offset + 1] = value;
      pixels[offset + 2] = value;
      pixels[offset + 3] = 255;
    }
  }
  const texture = new T.DataTexture(pixels, size, size);
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.magFilter = T.LinearFilter;
  texture.minFilter = T.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = T.SRGBColorSpace;
  texture.needsUpdate = true;
  texture.name = grass ? "fine-meadow-grain" : "weathered-mineral-grain";
  return texture;
}

const terrainMaterials = new WeakMap<
  SceneContext,
  {
    soilMaterial: T.MeshStandardMaterial;
    grassMaterial: T.MeshStandardMaterial;
  }
>();

function getTerrainMaterials(ctx: SceneContext) {
  const cached = terrainMaterials.get(ctx);
  if (cached) return cached;
  const soilGrain = createTerrainGrain(false);
  const soilMaterial = new T.MeshStandardMaterial({
    roughness: 0.98,
    vertexColors: true,
    map: soilGrain,
    bumpMap: soilGrain,
    bumpScale: 0.085,
  });
  const grassGrain = createTerrainGrain(true);
  const grassMaterial = new T.MeshStandardMaterial({
    roughness: 0.92,
    vertexColors: true,
    map: grassGrain,
    bumpMap: grassGrain,
    bumpScale: 0.035,
  });
  grassMaterial.onBeforeCompile = (shader) => {
    shader.uniforms.uSeason = ctx.U.uSeason;
    shader.vertexShader =
      "uniform vec4 uSeason;\nattribute vec3 colorSummer;\nattribute vec3 colorAutumn;\nattribute vec3 colorWinter;\n" +
      shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <color_vertex>",
      "#include <color_vertex>\nvColor.xyz = color * uSeason.x + colorSummer * uSeason.y + colorAutumn * uSeason.z + colorWinter * uSeason.w;",
    );
  };
  grassMaterial.customProgramCacheKey = () => "seasonal-sculpted-grass";
  // ResourceTracker owns these resources and deduplicates their disposal.
  // A new scene gets its own materials, textures and seasonal uniform binding.
  const materials = { soilMaterial, grassMaterial };
  terrainMaterials.set(ctx, materials);
  return materials;
}

/** A gentle, shared outline used by the visible rim and the walking grid. */
export function islandOutline(angle: number) {
  return 1 + 0.018 * Math.sin(angle * 5 + 0.7) + 0.012 * Math.cos(angle * 3);
}

/** Continuous sculpted soil and grass; no thousands of individual terrain cubes. */
export function createSoftTerrain(
  ctx: SceneContext,
  parent: T.Object3D,
  radius: readonly [number, number],
  depth: number,
  height: (x: number, z: number, d: number) => number,
  castShadow = false,
) {
  const segments = TERRAIN_SEGMENTS;
  const makeGeometry = (
    rings: readonly (readonly [number, number])[],
    grass: boolean,
  ) => {
    const positions: number[] = [],
      uvs: number[] = [],
      colors: number[] = [],
      summer: number[] = [],
      autumn: number[] = [],
      winter: number[] = [],
      indices: number[] = [];
    const palettes = grass
      ? [
          ["#8fb396", "#a8c19c"],
          ["#679c74", "#89b482"],
          ["#b0a16b", "#c4b180"],
          ["#e3e9ed", "#f5f3f3"],
        ]
      : [["#827d87", "#c3ad95"]];
    const palette = palettes.map((set) => set.map((c) => new T.Color(c)));
    const color = new T.Color();
    rings.forEach(([r, drop], ring) => {
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * TAU;
        const weathering = grass
          ? 0
          : T.MathUtils.smoothstep(-drop / depth, 0.06, 0.35);
        const outline =
          islandOutline(angle) +
          weathering *
            (Math.sin(angle * 7 + drop * 1.4) * 0.034 +
              Math.sin(angle * 13 + drop * 0.6) * 0.018);
        const x = Math.cos(angle) * radius[0] * r * outline,
          z = Math.sin(angle) * radius[1] * r * outline;
        const y =
          height(x, z, Math.min(1, r * r)) +
          drop +
          weathering * Math.sin(angle * 5 + drop * 0.8) * depth * 0.014 * r;
        positions.push(x, y, z);
        uvs.push(
          grass ? x * 0.65 : (angle / TAU) * 6,
          grass ? z * 0.65 : y * 0.55,
        );
        const shade = grass
          ? T.MathUtils.clamp(
              0.5 +
                Math.sin(x * 0.8 + z * 0.4) * 0.2 +
                Math.cos(z * 1.1) * 0.14 +
                Math.sin(x * 2.7 - z * 1.8) * Math.cos(z * 2.2) * 0.1,
              0,
              1,
            )
          : T.MathUtils.clamp(1 + drop / depth, 0, 1);
        for (let season = 0; season < palette.length; season++) {
          color.copy(palette[season][0]).lerp(palette[season][1], shade);
          if (!grass)
            color.multiplyScalar(
              0.91 +
                Math.sin(angle * 7) * 0.045 +
                Math.sin(drop * 12 + Math.sin(angle * 3) * 0.7) * 0.075 +
                Math.cos(drop * 21 + Math.sin(angle * 5)) * 0.028,
            );
          [colors, summer, autumn, winter][season].push(
            color.r,
            color.g,
            color.b,
          );
        }
        if (ring && i) {
          const a = (ring - 1) * (segments + 1) + i - 1,
            b = a + 1,
            c = ring * (segments + 1) + i - 1,
            d = c + 1;
          // Rings run from the centre out, then down towards the bottom tip.
          indices.push(a, b, c, b, d, c);
        }
      }
    });
    const geometry = new T.BufferGeometry();
    geometry.setAttribute(
      "position",
      new T.Float32BufferAttribute(positions, 3),
    );
    geometry.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
    geometry.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
    if (grass) {
      geometry.setAttribute(
        "colorSummer",
        new T.Float32BufferAttribute(summer, 3),
      );
      geometry.setAttribute(
        "colorAutumn",
        new T.Float32BufferAttribute(autumn, 3),
      );
      geometry.setAttribute(
        "colorWinter",
        new T.Float32BufferAttribute(winter, 3),
      );
    }
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    // Smooth the duplicate seam as well, so it never looks like a cut in the island.
    const normals = geometry.getAttribute("normal");
    for (let ring = 0; ring < rings.length; ring++) {
      const a = ring * (segments + 1),
        b = a + segments;
      const normal = new T.Vector3()
        .fromBufferAttribute(normals, a)
        .add(new T.Vector3().fromBufferAttribute(normals, b))
        .normalize();
      normals.setXYZ(a, normal.x, normal.y, normal.z);
      normals.setXYZ(b, normal.x, normal.y, normal.z);
    }
    return geometry;
  };
  const { soilMaterial, grassMaterial } = getTerrainMaterials(ctx);
  const soil = ctx.mesh(
    makeGeometry(
      [
        [0, -0.18],
        [0.5, -0.18],
        [0.97, -0.18],
        [1, -0.28],
        [0.99, -depth * 0.16],
        [0.98, -depth * 0.25],
        [0.955, -depth * 0.28],
        [0.94, -depth * 0.4],
        [0.86, -depth * 0.53],
        [0.835, -depth * 0.57],
        [0.78, -depth * 0.67],
        [0.64, -depth * 0.79],
        [0.59, -depth * 0.82],
        [0.34, -depth * 0.98],
        [0.08, -depth * 1.05],
        [0, -depth * 1.06],
      ],
      false,
    ),
    soilMaterial,
    parent,
  );
  soil.castShadow = castShadow;
  soil.name = "sculpted-island-soil";
  const radialSegments = Math.max(18, Math.ceil(Math.max(...radius) * 3.6));
  const rings: [number, number][] = Array.from(
    { length: radialSegments + 1 },
    (_, i) => [i / radialSegments, 0.09],
  );
  rings.push([1.006, 0.045], [1.004, -0.05], [0.98, -0.18]);
  const grass = ctx.mesh(makeGeometry(rings, true), grassMaterial, parent);
  grass.castShadow = castShadow;
  grass.name = "continuous-seasonal-grass";
  return { soil, grass };
}
