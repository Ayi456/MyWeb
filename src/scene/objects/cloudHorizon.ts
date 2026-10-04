import * as T from "three";
import type { SceneContext } from "../core/context";

// Smooth deterministic noise keeps the cloud deck continuous across every
// orbit direction, without textures or consuming the world's random sequence.
function noise(x: number, z: number) {
  const ix = Math.floor(x),
    iz = Math.floor(z);
  const fx = x - ix,
    fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx),
    sz = fz * fz * (3 - 2 * fz);
  const hash = (a: number, b: number) => {
    const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
    return n - Math.floor(n);
  };
  return T.MathUtils.lerp(
    T.MathUtils.lerp(hash(ix, iz), hash(ix + 1, iz), sx),
    T.MathUtils.lerp(hash(ix, iz + 1), hash(ix + 1, iz + 1), sx),
    sz,
  );
}

export function createCloudHorizon(
  ctx: SceneContext,
  cloudMaterial: T.MeshStandardMaterial,
  time: { value: number },
) {
  const geometry = new T.PlaneGeometry(360, 360, 160, 160);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.getAttribute("position");
  const colors = new Float32Array(positions.count * 3);
  const low = new T.Color("#bbc6d8"),
    high = new T.Color("#f3f1f0");
  const color = new T.Color();
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i),
      z = positions.getZ(i);
    const broad = noise(x * 0.034 + 12, z * 0.034 + 7);
    const billow = noise(x * 0.11, z * 0.11);
    const fine = noise(x * 0.27, z * 0.27);
    const height = broad * 2.4 + billow * 1.15 + fine * 0.24;
    positions.setY(i, -8.1 + height);
    color.copy(low).lerp(high, 0.28 + broad * 0.35 + billow * 0.32);
    color.toArray(colors, i * 3);
  }
  geometry.setAttribute("color", new T.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const material = new T.MeshStandardMaterial({
    roughness: 1,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
  });
  // The existing day/night/weather controller tints both the deck and billows.
  material.color = cloudMaterial.color;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uCloudTime = time;
    shader.uniforms.uTide = ctx.U.uTide;
    shader.vertexShader = `uniform float uCloudTime;
      uniform float uTide;
      varying vec3 vDeckPosition;
      ${shader.vertexShader}`;
    shader.vertexShader = shader.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
       transformed.y += sin(position.x * .075 + uCloudTime * .035) * .14 + uTide * .85;
       vDeckPosition = transformed;`,
    );
    shader.fragmentShader = `varying vec3 vDeckPosition;\n${shader.fragmentShader}`;
    shader.fragmentShader = shader.fragmentShader.replace(
      "#include <fog_fragment>",
      `#include <fog_fragment>
       #ifdef USE_FOG
         float distanceHaze = smoothstep(30., 125., vFogDepth);
         float edge = smoothstep(115., 173., length(vDeckPosition.xz));
         gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, max(distanceHaze, edge));
         gl_FragColor.a *= 1. - max(distanceHaze, edge);
       #endif`,
    );
  };
  const deck = new T.Mesh(geometry, material);
  deck.name = "continuous-cloud-horizon";
  // Draw before the translucent billows, fading fully into the sky before the
  // camera far plane so low-angle and night views never reveal a hard seam.
  deck.renderOrder = -1;
  deck.frustumCulled = false;
  ctx.scene.add(deck);
  return deck;
}
