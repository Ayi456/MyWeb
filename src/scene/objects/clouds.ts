import * as T from "three";
import { type SceneContext, TAU } from "../core/context";
import { createCloudHorizon } from "./cloudHorizon";

const CLOUD_LAYERS = [
  {
    stretch: 1,
    depth: 1,
    thickness: 1.15,
    lift: 0,
    speed: 0.065,
    bob: 0.14,
    haze: 0.04,
    colors: ["#f1eff1", "#f5f2ef"],
  },
  {
    stretch: 1.35,
    depth: 1.4,
    thickness: 0.76,
    lift: -0.35,
    speed: 0.038,
    bob: 0.09,
    haze: 0.24,
    colors: ["#e9eaf0", "#f0eff1"],
  },
  {
    stretch: 1.65,
    depth: 1.6,
    thickness: 0.57,
    lift: -0.6,
    speed: 0.019,
    bob: 0.045,
    haze: 0.7,
    colors: ["#dce2ec", "#eaedf1"],
  },
] as const;

/** Near billows and distant banks sit above one continuous rolling cloud deck. */
export function createClouds(ctx: SceneContext) {
  const { scene, U, rand, range, PuffBatch: Batch, rod } = ctx;
  // A separate accumulated clock lets reduced motion stop without a phase jump.
  const cloudTime = { value: 0 },
    cloudTravel = { value: 0 };
  const cloudMat = new T.MeshStandardMaterial({
    roughness: 1,
    flatShading: false,
    transparent: true,
    depthWrite: false,
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
       float centerX = mod(cloudFlow.x + drift + 132., 264.) - 132.;
       float bob = (sin(uCloudTime * .12 + cloudFlow.w) - sin(cloudFlow.w)) * cloudFlow.z;
       float tide = uTide * cloudAir.y * (1.7 + .35 * sin(cloudFlow.w + uCloudTime * .08));
       transformed.x += (centerX - cloudFlow.x) / instanceMatrix[0].x;
       transformed.y += (bob + tide) / instanceMatrix[1].y;
       vCloudHaze = cloudAir.x;
       vCloudEdge = smoothstep(106., 131., abs(centerX));
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
         float distanceHaze = smoothstep(20., 115., vFogDepth) * vCloudHaze;
         float rim = pow(clamp(1. - abs(dot(normal, normalize(vViewPosition))), 0., 1.), 3.);
         float softness = rim * (.14 + vCloudHaze * .25);
         float cloudFog = 1. - (1. - distanceHaze) * (1. - softness) * (1. - vCloudEdge);
         gl_FragColor.rgb = mix(gl_FragColor.rgb, fogColor, cloudFog);
         gl_FragColor.a *= 1. - smoothstep(100., 145., vFogDepth);
       #endif
       float facing = abs(dot(normal, normalize(vViewPosition)));
       gl_FragColor.a *= smoothstep(.02, .7, facing) * .94 * (1. - vCloudEdge);
      `,
    );
  };
  const cloudHorizon = createCloudHorizon(ctx, cloudMat, cloudTime);
  const cloudBatch = new Batch(scene, cloudMat);
  const cloudCenters = [
    [-9, -4.5, 3, 3.6],
    [10, -5.0, 5, 4.3],
    [-1, -5.8, -2, 4.1],
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
    const spread = layer === 0 ? 1 : layer === 1 ? 1.5 : 2.65;
    return {
      x: x * spread,
      y: layer === 2 ? -4.9 + (y + 5) * 0.3 : y - 0.5,
      z: z * spread,
      size: size * (layer === 0 ? 1 : layer === 1 ? 1.6 : 2.6),
      layer,
      detail: layer === 2 && index % 2 === 1,
    };
  });
  // Offset banks fill the gaps between the belts and carry the sea to the
  // horizon. The golden-angle layout needs no extra shared random draws.
  for (let i = 0; i < 24; i++) {
    const angle = i * 2.399963 + 0.7;
    const distant = i >= 10;
    const radius = distant ? 48 + (i - 10) * 3.5 : 16 + i * 2.4;
    clusters.push({
      x: Math.cos(angle) * radius,
      y: -6.2 + Math.sin(i * 3.1) * 0.55,
      z: Math.sin(angle) * radius,
      size: distant ? 6.3 + (i % 4) * 0.8 : 3.3 + (i % 3) * 0.55,
      layer: distant ? 2 : 1,
      detail: distant && i % 2 === 0,
    });
  }
  clusters.sort((a, b) => Number(a.detail) - Number(b.detail));
  const flow: number[] = [],
    air: number[] = [];
  const lowCloudCount = clusters.filter((cloud) => !cloud.detail).length * 7;
  for (const { x, y, z, size: s, layer } of clusters) {
    const profile = CLOUD_LAYERS[layer];
    const phase = x * 0.18 + z * 0.09;
    for (let j = 0; j < 7; j++) {
      const angle = (j / 6) * TAU + phase;
      const core = j === 6;
      const size = s * (core ? 1.04 : 0.79 + Math.sin(j * 4.7 + phase) * 0.16);
      cloudBatch.add(
        x + (core ? 0 : Math.cos(angle) * s * 0.72 * profile.stretch),
        y +
          profile.lift +
          (core ? 0.34 : Math.sin(j * 1.9) * 0.23) * s * profile.thickness,
        z + (core ? 0 : Math.sin(angle) * s * 0.48 * profile.depth),
        size * 1.65 * profile.stretch,
        size * 0.92 * profile.thickness,
        size * 1.3 * profile.depth,
        profile.colors[core ? 1 : 0],
      );
      flow.push(x, profile.speed, profile.bob, phase);
      air.push(profile.haze, 1 - layer * 0.18, layer);
    }
  }
  const cloudSea = cloudBatch.build(false);
  cloudSea.name = "layered-cloud-sea";
  cloudSea.receiveShadow = false;
  // A gently irregular silhouette avoids identical balloons, with no per-frame
  // geometry work. This private geometry also isolates the flow attributes.
  cloudSea.geometry = new T.SphereGeometry(0.5, 24, 16);
  const positions = cloudSea.geometry.getAttribute("position");
  const point = new T.Vector3();
  for (let i = 0; i < positions.count; i++) {
    point.fromBufferAttribute(positions, i);
    const billow =
      1 +
      0.035 *
        Math.sin(point.x * 8 + point.y * 5) *
        Math.cos(point.z * 7 - point.y * 4);
    point.multiplyScalar(billow);
    positions.setXYZ(i, point.x, point.y, point.z);
  }
  cloudSea.geometry.setAttribute(
    "cloudFlow",
    new T.InstancedBufferAttribute(new Float32Array(flow), 4),
  );
  cloudSea.geometry.setAttribute(
    "cloudAir",
    new T.InstancedBufferAttribute(new Float32Array(air), 3),
  );
  // Soft edges need back-to-front ordering, including the lobes inside a bank.
  // Keep immutable source data so low quality still selects the essential banks
  // before sorting, and switching quality cannot lose or duplicate instances.
  const matrices = Float32Array.from(cloudSea.instanceMatrix.array);
  const colors = Float32Array.from(cloudSea.instanceColor!.array);
  const flowAttribute = cloudSea.geometry.getAttribute("cloudFlow");
  const airAttribute = cloudSea.geometry.getAttribute("cloudAir");
  const order = Array.from({ length: cloudSea.count }, (_, index) => ({
    index,
    depth: 0,
  }));
  const center = new T.Vector3();
  cloudSea.instanceMatrix.setUsage(T.DynamicDrawUsage);
  cloudSea.instanceColor!.setUsage(T.DynamicDrawUsage);
  const sortClouds = (camera: T.Camera) => {
    const active = order.slice(0, cloudSea.count);
    for (const entry of active) {
      const i = entry.index;
      const x = flow[i * 4],
        speed = flow[i * 4 + 1],
        phase = flow[i * 4 + 3];
      const drift =
        cloudTime.value * speed + (cloudTravel.value * speed) / 0.065;
      const wrapped = T.MathUtils.euclideanModulo(x + drift + 132, 264) - 132;
      const bob =
        (Math.sin(cloudTime.value * 0.12 + phase) - Math.sin(phase)) *
        flow[i * 4 + 2];
      const tide =
        U.uTide.value *
        air[i * 3 + 1] *
        (1.7 + 0.35 * Math.sin(phase + cloudTime.value * 0.08));
      center.set(
        matrices[i * 16 + 12] + wrapped - x,
        matrices[i * 16 + 13] + bob + tide,
        matrices[i * 16 + 14],
      );
      entry.depth = center.applyMatrix4(camera.matrixWorldInverse).z;
    }
    active.sort((a, b) => a.depth - b.depth);
    active.forEach(({ index }, target) => {
      for (let component = 0; component < 16; component++)
        cloudSea.instanceMatrix.array[target * 16 + component] =
          matrices[index * 16 + component];
      for (let component = 0; component < 3; component++)
        cloudSea.instanceColor!.array[target * 3 + component] =
          colors[index * 3 + component];
      flowAttribute.setXYZW(
        target,
        flow[index * 4],
        flow[index * 4 + 1],
        flow[index * 4 + 2],
        flow[index * 4 + 3],
      );
      airAttribute.setXYZ(
        target,
        air[index * 3],
        air[index * 3 + 1],
        air[index * 3 + 2],
      );
    });
    cloudSea.instanceMatrix.needsUpdate = true;
    cloudSea.instanceColor!.needsUpdate = true;
    flowAttribute.needsUpdate = true;
    airAttribute.needsUpdate = true;
  };
  // Scene callbacks run after the camera matrix update but before Three uploads
  // instance buffers. A mesh callback would leave sorting one frame behind.
  const beforeRender = scene.onBeforeRender;
  scene.onBeforeRender = function (...args) {
    beforeRender.apply(this, args);
    sortClouds(args[2]);
  };
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
    cloudHorizon,
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
