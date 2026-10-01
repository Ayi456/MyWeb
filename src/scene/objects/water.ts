import * as T from "three";
import { type SceneContext, TAU } from "../core/context";

/** A calm spring pool that turns into a continuous ribbon before leaving the island. */
export function createWater(ctx: SceneContext) {
  const { world, U, mesh, ground } = ctx;
  const poolCenter = { x: -2.72, z: 1.38 };
  const waterVertex = `uniform float uTime;uniform float uWind;uniform float uRipple;uniform vec4 uSeason;varying vec2 vUv;varying vec3 vP;void main(){vec3 p=position;float calm=1.-uSeason.w;p.y+=sin(p.x*7.+p.z*4.+uTime*1.35)*(.008+uWind*.012)*calm;float r=length(p.xz);p.y+=sin(r*22.-uTime*9.)*.014*uRipple*(1.-smoothstep(0.,.9,r));vUv=uv;vP=p;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
  const waterFragment = `uniform float uTime;uniform float uNight;uniform vec4 uSeason;varying vec2 vUv;varying vec3 vP;void main(){float glint=pow(max(0.,sin(vP.x*15.+vP.z*11.+uTime*1.4)),22.);vec3 spring=mix(vec3(.30,.64,.67),vec3(.74,.91,.85),.22+glint*.55);vec3 winter=mix(vec3(.70,.81,.91),vec3(.92,.97,1.),.45+glint*.35);vec3 c=mix(spring,winter,uSeason.w);c*=1.-uNight*.34;float edge=smoothstep(0.,.08,min(vUv.x,1.-vUv.x))*smoothstep(0.,.08,min(vUv.y,1.-vUv.y));gl_FragColor=vec4(c,.82*edge+.06);
#include <tonemapping_fragment>
#include <colorspace_fragment>}`;
  const poolMat = new T.ShaderMaterial({
    uniforms: U,
    transparent: true,
    depthWrite: false,
    vertexShader: waterVertex,
    fragmentShader: waterFragment,
  });

  // An irregular ellipse reads as a real pond instead of a perfectly stamped circle.
  const poolGeometry = new T.CircleGeometry(0.5, 48).rotateX(-Math.PI / 2);
  const poolPositions = poolGeometry.getAttribute("position");
  for (let i = 1; i < poolPositions.count; i++) {
    const x = poolPositions.getX(i),
      z = poolPositions.getZ(i),
      angle = Math.atan2(z, x),
      radius =
        1 + Math.sin(angle * 3 + 0.4) * 0.07 + Math.cos(angle * 5) * 0.035;
    poolPositions.setXYZ(i, x * radius, poolPositions.getY(i), z * radius);
  }
  poolPositions.needsUpdate = true;
  const poolMesh = new T.Mesh(poolGeometry, poolMat);
  poolMesh.position.set(
    poolCenter.x,
    ground(poolCenter.x, poolCenter.z) + 0.09,
    poolCenter.z,
  );
  poolMesh.scale.set(1.7, 1, 0.82);
  poolMesh.renderOrder = 8;
  poolMesh.castShadow = false;
  poolMesh.receiveShadow = false;
  world.add(poolMesh);

  // The outflow is a curved ribbon with a foamy mouth, rather than separate blocks.
  const streamPoints: [number, number, number][] = [
    [-3.39, ground(-3.39, 1.57) + 0.115, 1.57],
    [-3.58, ground(-3.58, 1.65) + 0.112, 1.65],
    [-3.82, ground(-3.82, 1.74) + 0.108, 1.74],
    [-4.05, ground(-4.05, 1.82) + 0.104, 1.82],
    [-4.16, ground(-4.16, 1.87) + 0.102, 1.87],
  ];
  const streamCurve = new T.CatmullRomCurve3(
    streamPoints.map((p) => new T.Vector3(...p)),
  );
  const streamMesh = new T.Mesh(ribbonGeometry(streamCurve, 0.3, 24), poolMat);
  streamMesh.renderOrder = 8;
  streamMesh.castShadow = false;
  streamMesh.receiveShadow = false;
  world.add(streamMesh);

  const foamMat = new T.MeshBasicMaterial({
    color: "#e6f4e7",
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const foam = new T.Group();
  foam.position.set(-4.13, streamPoints.at(-1)![1] + 0.006, 1.86);
  world.add(foam);
  for (let i = 0; i < 5; i++) {
    const bead = new T.Mesh(
      new T.CircleGeometry(0.055 + (i % 2) * 0.022, 14),
      foamMat,
    );
    bead.rotation.x = -Math.PI / 2;
    bead.position.set(-i * 0.075, 0, (i % 2 ? 1 : -1) * 0.045);
    foam.add(bead);
  }

  const pondStones = new ctx.PuffBatch();
  for (let i = 0; i < 18; i++) {
    const a = (i * TAU) / 18,
      x = poolCenter.x + Math.cos(a) * 0.69,
      z = poolCenter.z + Math.sin(a) * 0.53;
    pondStones.add(
      x,
      ground(x, z) + 0.055,
      z,
      0.16 + (i % 3) * 0.025,
      0.085 + (i % 2) * 0.02,
      0.12 + (i % 3) * 0.02,
      i % 3 ? "#d1c4b3" : "#e9dac0",
      0,
      a,
      0,
    );
  }
  pondStones.build();

  const lilyPads = new ctx.PuffBatch();
  for (const [x, z, scale, rotation] of [
    [poolCenter.x - 0.22, poolCenter.z - 0.1, 1, 0.2],
    [poolCenter.x + 0.27, poolCenter.z + 0.2, 0.82, -0.35],
    [poolCenter.x + 0.04, poolCenter.z + 0.34, 0.64, 0.7],
  ] as const) {
    lilyPads.add(
      x,
      ground(x, z) + 0.112,
      z,
      0.22 * scale,
      0.022,
      0.15 * scale,
      scale > 0.9 ? "#86ae98" : "#9bc0a5",
      0,
      rotation,
      0.12,
    );
  }
  lilyPads.build(false);
  const rippleMat = new T.MeshBasicMaterial({
    color: "#e4f6ed",
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  for (const [x, z, radius, rotation] of [
    [poolCenter.x - 0.03, poolCenter.z - 0.1, 0.38, 0.2],
    [poolCenter.x + 0.24, poolCenter.z + 0.14, 0.24, -0.4],
  ] as const) {
    const ripple = new T.Mesh(
      new T.RingGeometry(radius - 0.008, radius, 32, 1, 0.35, 1.8),
      rippleMat,
    );
    ripple.position.set(x, ground(x, z) + 0.116, z);
    ripple.rotation.x = -Math.PI / 2;
    ripple.rotation.z = rotation;
    ripple.renderOrder = 9;
    world.add(ripple);
  }

  const fallMat = new T.ShaderMaterial({
    uniforms: U,
    transparent: true,
    depthWrite: false,
    side: T.DoubleSide,
    vertexShader: `uniform float uTime;varying vec3 vP;void main(){vP=position;vec3 p=position;p.x+=sin(position.y*3.+uTime*1.3)*.025;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`,
    fragmentShader: `uniform float uTime;uniform float uNight;uniform vec4 uSeason;varying vec3 vP;void main(){float f=.5+.5*sin(vP.y*26.+uTime*7.*(1.-uSeason.w*.9));float side=1.-smoothstep(.05,.29,abs(vP.x));vec3 c=mix(vec3(.49,.74,.74),vec3(.91,.97,.88),pow(f,6.));c=mix(c,vec3(.86,.92,.98),uSeason.w*.8);c*=1.-uNight*.40;float fade=smoothstep(-3.35,-2.7,vP.y);gl_FragColor=vec4(c,(.45+.2*f)*side*fade);
#include <tonemapping_fragment>
#include <colorspace_fragment>}`,
  });
  const waterfall = mesh(
    new T.PlaneGeometry(0.58, 4.25, 2, 48),
    fallMat,
    world,
    -4.22,
    -0.98,
    1.89,
  );
  waterfall.rotation.y = -0.18;
  waterfall.renderOrder = 9;
  waterfall.castShadow = false;
  return { poolMesh, streamMesh, waterfall };
}

function ribbonGeometry(
  curve: T.CatmullRomCurve3,
  width: number,
  segments: number,
) {
  const positions: number[] = [],
    uvs: number[] = [],
    indices: number[] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments,
      point = curve.getPoint(t),
      tangent = curve.getTangent(t).setY(0).normalize(),
      side = new T.Vector3(-tangent.z, 0, tangent.x).multiplyScalar(width / 2);
    for (const sign of [-1, 1]) {
      const p = point.clone().addScaledVector(side, sign);
      positions.push(p.x, p.y, p.z);
      uvs.push(sign < 0 ? 0 : 1, t);
    }
    if (i) {
      const n = i * 2;
      indices.push(n - 2, n, n - 1, n - 1, n, n + 1);
    }
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new T.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
