import * as T from "three";
import { type SceneContext, TAU } from "../core/context";

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
  const segments = 64;
  const makeGeometry = (
    rings: readonly (readonly [number, number])[],
    grass: boolean,
  ) => {
    const positions: number[] = [],
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
      : [["#958b9f", "#cbb2a6"]];
    const palette = palettes.map((set) => set.map((c) => new T.Color(c)));
    const color = new T.Color();
    rings.forEach(([r, drop], ring) => {
      for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * TAU;
        const outline =
          islandOutline(angle) +
          (!grass && drop < -0.3
            ? Math.sin(angle * 7 + drop * 1.4) * 0.025
            : 0);
        const x = Math.cos(angle) * radius[0] * r * outline,
          z = Math.sin(angle) * radius[1] * r * outline;
        positions.push(x, height(x, z, Math.min(1, r * r)) + drop, z);
        const shade = grass
          ? 0.5 + Math.sin(x * 0.8 + z * 0.4) * 0.18 + Math.cos(z * 1.1) * 0.12
          : T.MathUtils.clamp(1 + drop / depth, 0, 1);
        for (let season = 0; season < palette.length; season++) {
          color.copy(palette[season][0]).lerp(palette[season][1], shade);
          if (!grass)
            color.multiplyScalar(
              0.95 +
                Math.sin(angle * 7) * 0.025 +
                Math.sin(drop * 5.5 + angle * 0.3) * 0.035,
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
  const soilMaterial = new T.MeshStandardMaterial({
    roughness: 0.98,
    vertexColors: true,
  });
  const soil = ctx.mesh(
    makeGeometry(
      [
        [0, -0.18],
        [0.5, -0.18],
        [0.97, -0.18],
        [1, -0.28],
        [0.98, -depth * 0.25],
        [0.86, -depth * 0.53],
        [0.64, -depth * 0.79],
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
  const grassMaterial = new T.MeshStandardMaterial({
    roughness: 0.92,
    vertexColors: true,
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
  const rings: [number, number][] = Array.from({ length: 19 }, (_, i) => [
    i / 18,
    0.09,
  ]);
  rings.push([1.006, 0.045], [1.004, -0.05], [0.98, -0.18]);
  const grass = ctx.mesh(makeGeometry(rings, true), grassMaterial, parent);
  grass.castShadow = castShadow;
  grass.name = "continuous-seasonal-grass";
  return { soil, grass };
}
