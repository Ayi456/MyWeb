import * as T from "three";
import type { SceneContext } from "../core/context";

/** One distant curtain, built without consuming the world's seeded random. */
export function createAurora(ctx: SceneContext) {
  const positions: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  const segments = 96,
    rows = 8;
  for (let i = 0; i <= segments; i++) {
    const u = i / segments;
    for (let j = 0; j < rows; j++) {
      const v = j / (rows - 1);
      positions.push(
        (u - 0.5) * 76,
        -3 + Math.sin(u * Math.PI) * 3 + v * 7,
        -38 - Math.sin(u * Math.PI) * 8 + Math.sin(u * 18) * 1.4,
      );
      uvs.push(u, v);
      if (i < segments && j < rows - 1) {
        const a = i * rows + j,
          b = a + rows;
        indices.push(a, b, a + 1, b, b + 1, a + 1);
      }
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  const auroraMat = new T.ShaderMaterial({
    uniforms: {
      uTime: ctx.U.uTime,
      uStrength: { value: 0 },
      uMotion: { value: 1 },
    },
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    blending: T.AdditiveBlending,
    vertexShader: `
      uniform float uTime;
      uniform float uMotion;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 p = position;
        p.y += sin(uv.x * 14.0 + uTime * uMotion * 0.08) * uv.y * 0.45;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uMotion;
      uniform float uStrength;
      varying vec2 vUv;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p) {
        vec2 i = floor(p), f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x),
                   mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0)), f.x), f.y);
      }
      void main() {
        float time = uTime * uMotion * 0.035;
        float folds = noise(vec2(vUv.x * 18.0 + time, vUv.y * 1.8));
        float threads = 0.6 + 0.4 * noise(vec2(vUv.x * 130.0 - time, vUv.y * 3.0));
        float edge = smoothstep(0.0, 0.12, vUv.x) * (1.0 - smoothstep(0.88, 1.0, vUv.x));
        float height = smoothstep(0.0, 0.15, vUv.y) * (1.0 - smoothstep(0.35, 1.0, vUv.y));
        vec3 color = mix(vec3(0.22, 0.72, 0.48), vec3(0.48, 0.28, 0.72), smoothstep(0.25, 0.85, vUv.y));
        gl_FragColor = vec4(color, uStrength * edge * height * threads * (0.2 + folds * 0.8) * 0.65);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
  });
  const aurora = new T.Mesh(geometry, auroraMat);
  aurora.name = "winter-aurora";
  aurora.visible = false;
  ctx.scene.add(aurora);
  return { aurora, auroraMat };
}

export function updateAurora(
  objects: ReturnType<typeof createAurora>,
  release: number,
  winter: number,
  night: number,
  rain: number,
  reducedMotion: boolean,
) {
  const strength =
    release *
    T.MathUtils.smoothstep(winter, 0.5, 1) *
    T.MathUtils.smoothstep(night, 0.6, 1) *
    (1 - rain);
  objects.auroraMat.uniforms.uStrength.value = strength;
  objects.auroraMat.uniforms.uMotion.value = reducedMotion ? 0 : 1;
  objects.aurora.visible = strength > 0.002;
}
