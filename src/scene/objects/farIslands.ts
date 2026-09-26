import * as T from "three";
import { type SceneContext, type Point3, TAU, PI } from "../core/context";
import { createClayRoof } from "./clayRoof";
import { createSoftTerrain } from "./softTerrain";
import { seededRandom } from "../utils/seededRandom";
import { TEA_ISLAND, VILLAGE_ISLAND } from "../worldLayout";
import { TEA, maple } from "./seasonalColors";

/**
 * Two sculpted background islands. Their terrain uses continuous surfaces,
 * and their decorative batches
 * are grouped under `detail` so low quality can hide them.
 */
export function createFarIslands(ctx: SceneContext) {
  const { world, SoftBatch: Batch, lampMat, rod, line } = ctx;
  const random = seededRandom(161803);
  const range = (a: number, b: number) => a + (b - a) * random();
  const detail: T.Object3D[] = [];

  function terrain(
    group: T.Group,
    radius: readonly [number, number],
    depth: number,
    height: (x: number, z: number, d: number) => number,
  ) {
    createSoftTerrain(ctx, group, radius, depth, height);
    const roots = new ctx.PuffBatch(group);
    for (let i = 0; i < 16; i++) {
      const a = (i * TAU) / 16,
        x = Math.cos(a) * radius[0] * 0.84,
        z = Math.sin(a) * radius[1] * 0.84,
        length = range(0.5, 1.3),
        top = height(x, z, 0.7) - depth * 0.55;
      roots.add(x, top - length / 2, z, 0.06, length, 0.06, "#7a9981");
    }
    roots.build(false);
  }

  function mapleTree(
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    s = 1,
  ) {
    const g = new T.Group();
    g.position.set(x, y, z);
    g.scale.setScalar(s);
    parent.add(g);
    const bark = new ctx.PuffBatch(g);
    rod(bark, [0, 0, 0], [0.05, 0.95, 0.03], 0.16, "#8d6b5d");
    rod(bark, [0.05, 0.8, 0.03], [-0.35, 1.35, 0.1], 0.09, "#8d6b5d");
    rod(bark, [0.05, 0.8, 0.03], [0.4, 1.4, -0.2], 0.09, "#8d6b5d");
    bark.build(false);
    const crown = new ctx.PuffBatch(g);
    const lobes = [
      [0, 1.55, 0, 0.75, 0.55, 0.7],
      [-0.4, 1.35, 0.15, 0.5, 0.4, 0.45],
      [0.45, 1.4, -0.2, 0.5, 0.42, 0.45],
    ];
    lobes.forEach(([cx, cy, cz, rx, ry, rz], i) => {
      crown.addSeasonal(cx, cy, cz, rx * 2, ry * 2, rz * 2, maple(i));
      for (let j = 0; j < 5; j++) {
        const a = (j * TAU) / 5;
        crown.addSeasonal(
          cx + Math.cos(a) * rx * 0.55,
          cy + ry * 0.2,
          cz + Math.sin(a) * rz * 0.55,
          rx * 1.2,
          ry * 1.25,
          rz * 1.2,
          maple((i + j) % 3),
        );
      }
    });
    crown.build(false);
    return g;
  }

  // ---- Tea hill: three terraces climb towards a small pavilion at the back.
  const tea = new T.Group();
  tea.name = "tea-island";
  tea.position.set(...TEA_ISLAND.center);
  world.add(tea);
  const terrace = (x: number, z: number) => {
    const t = (z + 1.2) / -4.5 + (x + 1) * 0.04;
    return Math.max(0, Math.floor(t * 3.4)) * 0.42;
  };
  terrain(tea, TEA_ISLAND.radius, 2.6, (x, z) => terrace(x, z));
  const teaDetail = new T.Group();
  tea.add(teaDetail);
  detail.push(teaDetail);
  const rows = new ctx.PuffBatch(teaDetail);
  for (let z = 2.4; z >= -2.6; z -= 0.45) {
    for (let x = -3.9; x <= 3.9; x += 0.3) {
      const d =
        (x / TEA_ISLAND.radius[0]) ** 2 + (z / TEA_ISLAND.radius[1]) ** 2;
      if (d > 0.78) continue;
      if (Math.abs(x - 0.3 - Math.sin(z * 1.4) * 0.5) < 0.42) continue; // path
      const y = terrace(x, z) + 0.15;
      rows.addSeasonal(
        x + Math.sin(z * 3) * 0.05,
        y + 0.12,
        z,
        0.27,
        0.24 + (Math.floor(x * 10) % 2) * 0.05,
        0.3,
        TEA[Math.floor(random() * 2)],
      );
    }
  }
  for (let i = 0; i < 24; i++) {
    const z = 2.4 - i * 0.21,
      x = 0.3 + Math.sin(z * 1.4) * 0.5;
    rows.add(
      x,
      terrace(x, z) + 0.16,
      z,
      0.36,
      0.05,
      0.22,
      i % 2 ? "#e2d3b6" : "#d2c2a4",
    );
  }
  // Wooden steps between terraces along the path.
  for (const z of [-0.8, -2.15, -0.2]) {
    const x = 0.3 + Math.sin(z * 1.4) * 0.5;
    for (let k = 0; k < 3; k++)
      rows.add(
        x,
        terrace(x, z + 0.2) + 0.2 + k * 0.12,
        z + 0.1 - k * 0.14,
        0.5,
        0.06,
        0.16,
        "#c9ab88",
      );
  }
  rows.build(false);
  // Pavilion on the top terrace with a warm lantern.
  const pavilion = new Batch(teaDetail);
  const py = terrace(0.2, -2.8) + 0.16,
    pz = -2.6;
  pavilion.add(0.2, py + 0.05, pz, 1.7, 0.1, 1.5, "#e9dcc4");
  for (const dx of [-0.62, 0.62])
    for (const dz of [-0.52, 0.52])
      pavilion.add(0.2 + dx, py + 0.62, pz + dz, 0.09, 1.1, 0.09, "#b3585c");
  pavilion.add(0.2, py + 1.2, pz, 1.85, 0.1, 1.65, "#c76b74");
  const pavilionRoof = ctx.mesh(
    new T.ConeGeometry(1.25, 0.58, 4),
    new T.MeshStandardMaterial({ color: "#c76b74", roughness: 0.9 }),
    teaDetail,
    0.2,
    py + 1.53,
    pz,
  );
  pavilionRoof.rotation.y = Math.PI / 4;
  pavilionRoof.scale.z = 0.88;
  pavilionRoof.castShadow = false;
  pavilion.add(0.2, py + 1.9, pz, 0.12, 0.25, 0.12, "#e3bd76");
  pavilion.add(0.2, py + 0.32, pz + 0.2, 0.7, 0.07, 0.3, "#d8c1a1");
  pavilion.add(0.2, py + 0.2, pz + 0.2, 0.08, 0.2, 0.08, "#a48b73");
  pavilion.build(false);
  const teaLamp = new Batch(teaDetail, lampMat);
  teaLamp.add(0.2 + 0.62, py + 0.95, pz + 0.52, 0.16, 0.2, 0.16, "#ffe1b3");
  teaLamp.build(false);
  const teaLight = new T.PointLight("#ffd9a0", 0, 6, 2);
  teaLight.position.set(0.82, py + 0.95, pz + 0.52);
  tea.add(teaLight);
  // Stone lantern and three maples at the hill's edge.
  const stoneLantern = new Batch(teaDetail);
  const lx = -2.3,
    lz = 0.6,
    ly = terrace(lx, lz) + 0.16;
  stoneLantern.add(lx, ly + 0.05, lz, 0.4, 0.1, 0.4, "#b8b0b6");
  stoneLantern.add(lx, ly + 0.32, lz, 0.12, 0.45, 0.12, "#c7c0c5");
  stoneLantern.add(lx, ly + 0.62, lz, 0.34, 0.16, 0.34, "#d4cbcf");
  stoneLantern.add(lx, ly + 0.8, lz, 0.22, 0.2, 0.22, "#fff1d2");
  stoneLantern.add(lx, ly + 0.98, lz, 0.4, 0.1, 0.4, "#b8b0b6");
  stoneLantern.build(false);
  const teaMaples = [
    mapleTree(teaDetail, -3.1, terrace(-3.1, -1.6) + 0.12, -1.6, 1.05),
    mapleTree(teaDetail, 3.2, terrace(3.2, -1.2) + 0.12, -1.2, 0.95),
    mapleTree(teaDetail, 2.9, terrace(2.9, 1.9) + 0.12, 1.9, 0.8),
  ];

  // ---- Hot-spring hamlet: three cottages, a red bridge over a steaming pool.
  const village = new T.Group();
  village.name = "village-island";
  village.position.set(...VILLAGE_ISLAND.center);
  world.add(village);
  terrain(
    village,
    VILLAGE_ISLAND.radius,
    2.9,
    (x, z) => 0.12 * Math.round((Math.sin(x * 0.9) + Math.cos(z * 1.1)) * 0.8),
  );
  const villageDetail = new T.Group();
  village.add(villageDetail);
  detail.push(villageDetail);
  function cottage(
    x: number,
    z: number,
    rotation: number,
    roof: string,
    wall: string,
    s = 1,
  ) {
    const g = new T.Group();
    g.position.set(x, 0.15, z);
    g.rotation.y = rotation;
    g.scale.setScalar(s);
    villageDetail.add(g);
    const b = new Batch(g);
    b.add(0, 0.45, 0, 1.3, 0.9, 1.0, wall);
    b.add(0, 0.03, 0, 1.45, 0.12, 1.15, "#d6c19d");
    createClayRoof(ctx, g, [0, 0.9, 0], 1.5, 1.2, 0.53, roof, wall);
    b.add(0.4, 0.95, -0.25, 0.18, 0.5, 0.18, "#b78d87");
    b.add(-0.25, 0.4, 0.51, 0.34, 0.6, 0.04, "#8a6a5e");
    b.build(false);
    const win = new Batch(g, lampMat);
    win.add(0.3, 0.5, 0.505, 0.3, 0.3, 0.02, "#ffe4ac");
    win.add(-0.655, 0.5, -0.1, 0.02, 0.3, 0.3, "#ffe4ac");
    win.build(false);
    return g;
  }
  const cottages = [
    cottage(-2.4, 0.4, 0.4, "#bd7d83", "#fff0d0"),
    cottage(-0.4, -1.7, -0.3, "#8fa9b8", "#f6e7cf", 0.92),
    cottage(2.7, -0.6, 0.9, "#a9b58d", "#fbeedc", 0.85),
  ];
  const villageLight = new T.PointLight("#ffd79e", 0, 9, 2);
  villageLight.position.set(0, 1.4, -0.5);
  village.add(villageLight);
  // Hot-spring pool with a stone rim and a small red arched bridge.
  const springMat = new T.MeshStandardMaterial({
    color: "#9fd6cf",
    emissive: "#3f8a86",
    emissiveIntensity: 0.25,
    roughness: 0.3,
    transparent: true,
    opacity: 0.9,
  });
  const poolCenter: Point3 = [0.9, 0.16, 1.3];
  const pool = ctx.mesh(
    new T.CircleGeometry(1, 48).rotateX(-Math.PI / 2),
    springMat,
    villageDetail,
    ...poolCenter,
  );
  pool.scale.set(1.1, 1, 0.8);
  pool.castShadow = false;
  const rim = new Batch(villageDetail);
  const stones = new ctx.PuffBatch(villageDetail);
  for (let i = 0; i < 22; i++) {
    const a = (i * TAU) / 22;
    stones.add(
      poolCenter[0] + Math.cos(a) * 1.2,
      poolCenter[1] + 0.05,
      poolCenter[2] + Math.sin(a) * 0.9,
      0.2,
      0.14,
      0.17,
      i % 3 ? "#cfc3b4" : "#e6d8c0",
      0,
      -a,
      0,
    );
  }
  stones.build(false);
  // Bridge arch across the pool's short axis.
  const rails: [Point3[], Point3[]] = [[], []];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12,
      z = poolCenter[2] - 1.15 + t * 2.3,
      y = poolCenter[1] + 0.12 + Math.sin(t * PI) * 0.42;
    rim.add(poolCenter[0], y, z, 0.6, 0.06, 0.2, i % 2 ? "#c9515b" : "#b8464f");
    for (let s = 0; s < 2; s++) {
      const x = poolCenter[0] + (s ? 0.27 : -0.27);
      rails[s].push([x, y + 0.34, z]);
      if (i % 3 === 0) rim.add(x, y + 0.17, z, 0.04, 0.34, 0.04, "#b8464f");
    }
  }
  for (const rail of rails)
    for (let i = 1; i < rail.length; i++)
      rod(rim, rail[i - 1], rail[i], 0.03, "#d4666f");
  rim.build(false);
  line(
    villageDetail,
    [
      [-2.0, 1.55, 0.9],
      [-0.6, 1.35, 0.4],
      [0.8, 1.5, -0.6],
    ],
    "#c9a88e",
  );
  // Pennants along the line between cottages.
  const flags = new Batch(villageDetail);
  for (let i = 0; i < 9; i++) {
    const t = i / 8,
      x = -2.0 + t * 2.8,
      z = 0.9 - t * 1.5,
      y = 1.55 - Math.sin(t * PI) * 0.18 - 0.09;
    flags.add(
      x,
      y,
      z,
      0.12,
      0.14,
      0.02,
      ["#e7a5b3", "#f2d9a0", "#a9c8d4", "#c7b6da"][i % 4],
      0,
      0.5,
      0,
    );
  }
  flags.build(false);
  mapleTree(villageDetail, -3.0, 0.1, -1.7, 1.15);
  mapleTree(villageDetail, 2.9, 0.1, 1.8, 0.9);

  // Steam rising from the hot spring: a small GPU point cloud.
  const steamGeo = new T.BufferGeometry(),
    seeds: number[] = [];
  for (let i = 0; i < 48; i++) seeds.push(random(), random(), random());
  steamGeo.setAttribute("position", new T.Float32BufferAttribute(seeds, 3));
  const steamMat = new T.ShaderMaterial({
    uniforms: ctx.U,
    transparent: true,
    depthWrite: false,
    vertexShader: `uniform float uTime;uniform vec4 uSeason;varying float vAlpha;void main(){float life=fract(position.y+uTime*(.08+position.z*.05));vec3 p=vec3(${poolCenter[0]}+(position.x-.5)*1.6+sin(uTime*.5+position.z*20.)*.25*life,${poolCenter[1]}+.1+life*1.9,${poolCenter[2]}+(position.z-.5)*1.2);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((120.+life*140.)/-mv.z,3.,26.);vAlpha=(1.-life)*smoothstep(0.,.15,life)*(.28+uSeason.w*.3);}`,
    fragmentShader: `varying float vAlpha;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(1.,.98,.97,pow(1.-r,2.2)*vAlpha);}`,
  });
  const steam = new T.Points(steamGeo, steamMat);
  steam.frustumCulled = false;
  steam.renderOrder = 11;
  villageDetail.add(steam);

  return {
    teaIsland: tea,
    villageIsland: village,
    teaLight,
    villageLight,
    farDetail: detail,
    farMaples: [...teaMaples],
    cottages,
  };
}
