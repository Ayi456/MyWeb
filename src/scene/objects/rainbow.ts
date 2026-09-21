import * as T from "three";
import type { SceneContext } from "../core/context";

/** A translucent, world-space arc: terrain naturally occludes the distant mist. */
export function createRainbow(ctx: SceneContext) {
  const colors = [
    "#cf98bd",
    "#a9acd4",
    "#96bfda",
    "#a7caa9",
    "#eddda0",
    "#efbc9a",
    "#e69eae",
    "#e69eae",
  ].map((color) => new T.Color(color));
  const positions: number[] = [],
    vertexColors: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  const segments = 96,
    rows = colors.length;
  const axis = new T.Vector3(16, 0, -9.2).normalize();
  const center = new T.Vector3(0, -2.1, -7.6);
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI;
    for (let j = 0; j < rows; j++) {
      const band = j / (rows - 1),
        offset = (band - 0.5) * 0.76;
      const horizontal = Math.cos(angle) * (9.2 + offset);
      positions.push(
        center.x + axis.x * horizontal,
        center.y + Math.sin(angle) * (7.4 + offset),
        center.z + axis.z * horizontal,
      );
      vertexColors.push(colors[j].r, colors[j].g, colors[j].b);
      uvs.push(i / segments, band);
      if (i < segments && j < rows - 1) {
        const a = i * rows + j,
          b = a + rows;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new T.Float32BufferAttribute(vertexColors, 3));
  geometry.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  const rainbowMat = new T.ShaderMaterial({
    uniforms: {
      ...T.UniformsUtils.clone(T.UniformsLib.fog),
      uStrength: { value: 0.46 },
    },
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    fog: true,
    vertexColors: true,
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vColor;
      #include <fog_pars_vertex>
      void main() {
        vUv = uv;
        vColor = color;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: `
      uniform float uStrength;
      varying vec2 vUv;
      varying vec3 vColor;
      #include <fog_pars_fragment>
      void main() {
        float ends = smoothstep(0.0, 0.14, vUv.x) * (1.0 - smoothstep(0.86, 1.0, vUv.x));
        float edge = smoothstep(0.0, 0.15, vUv.y) * (1.0 - smoothstep(0.85, 1.0, vUv.y));
        gl_FragColor = vec4(vColor, uStrength * ends * edge);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
  const rainbow = new T.Mesh(geometry, rainbowMat);
  rainbow.name = "cloud-mist-rainbow";
  rainbow.renderOrder = 3;
  ctx.world.add(rainbow);
  /** Extra strength after a shower; the event system eases it back to 0. */
  return { rainbow, rainbowMat, rainbowBoost: 0 };
}
