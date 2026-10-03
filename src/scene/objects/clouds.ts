import * as T from "three";
import { type SceneContext, TAU } from "../core/context";

const CLOUD_LAYERS = [
  {
    stretch: 1,
    depth: 1,
    thickness: 0.94,
    lift: 0,
    speed: 0.065,
    bob: 0.14,
    haze: 0.04,
    colors: ["#efe4ed", "#fff4ea"],
  },
  {
    stretch: 1.18,
    depth: 1.12,
    thickness: 0.56,
    lift: 0.35,
    speed: 0.038,
    bob: 0.09,
    haze: 0.3,
    colors: ["#e6e6ec", "#f4f0ea"],
  },
  {
    stretch: 1.5,
    depth: 1.3,
    thickness: 0.28,
    lift: 1.1,
    speed: 0.019,
    bob: 0.045,
    haze: 0.62,
    colors: ["#e3e5e9", "#eef0ed"],
  },
] as const;

/** Three cloud belts share one instanced draw, with cohesive motion per cloud. */
export function createClouds(ctx: SceneContext) {
  const { scene, U, rand, range, PuffBatch: Batch, rod } = ctx;
  // A separate accumulated clock lets reduced motion stop without a phase jump.
  const cloudTime = { value: 0 },
    cloudTravel = { value: 0 };
  const cloudMat = new T.MeshStandardMaterial({
    roughness: 1,
    flatShading: false,
  });
  cloudMat.onBeforeCompile = (s) => {
    s.uniforms.uCloudTime = cloudTime;
    s.uniforms.uCloudTravel = cloudTravel;
    s.uniforms.uTide = U.uTide;
    s.vertexShader =
      `uniform float uCloudTime;
       uniform float uCloudTravel;
       uniform float uTide;
       attribute vec4 cloudFlow;
       attribute vec3 cloudAir;
       varying float vCloudHaze;
       varying float vCloudEdge;
      ` + s.vertexShader;
    // All seven lobes wrap and bob as a group. Displacement is in world units;
    // dividing by instance scale keeps flattened distant clouds from bouncing.
    s.vertexShader = s.vertexShader.replace(
      "#include <begin_vertex>",
      `#include <begin_vertex>
       float drift = uCloudTime * cloudFlow.y + uCloudTravel * cloudFlow.y / .065;
       float centerX = mod(cloudFlow.x + drift + 50., 100.) - 50.;
       float bob = (sin(uCloudTime * .12 + cloudFlow.w) - sin(cloudFlow.w)) * cloudFlow.z;
       float tide = uTide * cloudAir.y * (1.7 + .35 * sin(cloudFlow.w + uCloudTime * .08));
       transformed.x += (centerX - cloudFlow.x) / instanceMatrix[0].x;
       transformed.y += (bob + tide) / instanceMatrix[1].y;
       vCloudHaze = cloudAir.x;
       vCloudEdge = smoothstep(39., 49., abs(centerX));
      `,
    );
    s.fragmentShader =
      "varying float vCloudHaze;\nvarying float vCloudEdge;\n" +
      s.fragmentShader;
    s.fragmentShader = s.fragmentShader.replace(
      "#include <fog_fragment>",
      `#include <fog_fragment>
       #ifdef USE_FOG
         // Use the live scene fog colour so haze follows dusk, rain and winter.
         float distanceHaze = smoothstep(10., 46., vFogDepth) * vCloudHaze;
         float rim = pow(clamp(1. - abs(dot(normal, normalize(vViewPosition))), 0., 1.), 3.);
         float softness = rim * (.035 + vCloudHaze * .22);
         float cloudFog = 1. - (1. - distanceHaze) * (1. - softness) * (1. - vCloudEdge);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, cloudFog);
       #endif
      `,
    );
  };
  const cloudBatch = new Batch(scene, cloudMat);
  const cloudCenters = [
    [-8, -3.6, 3, 2.7],
    [8, -4.5, 5, 3.4],
    [-1, -5.5, -1, 3.1],
  ];
  for (let i = 0; i < 37; i++) {
    const a = rand() * TAU,
      r = range(11, 31);
    cloudCenters.push([
      Math.cos(a) * r,
      range(-6.7, -3.2),
      Math.sin(a) * r,
      range(1.8, 3.2),
    ]);
  }
  // Keep the original random draws above: later wildlife uses this same seed.
  // Optional far clusters go last, allowing low quality to retain every belt.
  const clusters = cloudCenters.map(([x, y, z, size], index) => {
    const radius = Math.hypot(x, z);
    const layer = radius < 12 ? 0 : radius < 23 ? 1 : 2;
    return { x, y, z, size, layer, detail: layer === 2 && index % 2 === 1 };
  });
  clusters.sort((a, b) => Number(a.detail) - Number(b.detail));
  const flow: number[] = [],
    air: number[] = [];
  const lowCloudCount = clusters.filter((cloud) => !cloud.detail).length * 7;
  for (const { x, y, z, size: s, layer } of clusters) {
    const profile = CLOUD_LAYERS[layer];
    const phase = x * 0.18 + z * 0.09;
    for (let j = 0; j < 7; j++) {
      const t = j / 6,
        dx = (t - 0.5) * s * 1.8 * profile.stretch;
      const size = s * (0.62 + Math.sin(t * Math.PI) * 0.34);
      cloudBatch.add(
        x + dx,
        y + profile.lift + Math.sin(t * Math.PI) * 0.35 * profile.thickness,
        z + Math.sin(j * 2.3) * s * 0.13 * profile.depth,
        size * 1.65 * profile.stretch,
        size * 0.85 * profile.thickness,
        size * 1.1 * profile.depth,
        profile.colors[j % 3 ? 1 : 0],
      );
      flow.push(x, profile.speed, profile.bob, phase);
      air.push(profile.haze, 1 - layer * 0.18, layer);
    }
  }
  const cloudSea = cloudBatch.build(false);
  cloudSea.name = "layered-cloud-sea";
  // PuffBatch shares its sphere geometry with trees and other scenery. Keep
  // these per-instance attributes on a private geometry owned by the tracker.
  cloudSea.geometry = cloudSea.geometry.clone();
  cloudSea.geometry.setAttribute(
    "cloudFlow",
    new T.InstancedBufferAttribute(new Float32Array(flow), 4),
  );
  cloudSea.geometry.setAttribute(
    "cloudAir",
    new T.InstancedBufferAttribute(new Float32Array(air), 3),
  );
  for (const [x, y, z, s] of [
    [-12, -1.2, -12, 0.58],
    [10, -0.7, -18, 0.44],
  ]) {
    const g = new T.Group();
    g.position.set(x, y, z);
    g.scale.setScalar(s);
    scene.add(g);
    const b = new Batch(g);
    for (let k = 0; k < 4; k++)
      b.add(
        0,
        -k * 0.45,
        0,
        2.1 - k * 0.38,
        0.5,
        1.7 - k * 0.29,
        ["#b4c2ab", "#bdaca8", "#aaa0ad", "#bbaeba"][k],
      );
    rod(b, [0, 0, 0], [0, 1.8, 0], 0.17, "#b29590");
    for (let j = 0; j < 10; j++)
      b.add(
        range(-0.9, 0.9),
        1.6 + rand() * 0.7,
        range(-0.7, 0.7),
        0.7,
        0.46,
        0.6,
        j % 2 ? "#e7b6c7" : "#efd3d6",
      );
    b.build(false);
  }
  return {
    cloudMat,
    cloudSea,
    cloudTime,
    cloudTravel,
    lowCloudCount,
    updateClouds(dt: number, wind: number, reducedMotion: boolean) {
      if (dt <= 0 || reducedMotion) return;
      cloudTime.value += dt;
      cloudTravel.value += dt * wind * 0.45;
    },
  };
}
