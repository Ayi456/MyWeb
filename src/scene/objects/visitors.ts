import * as T from "three";
import { type SceneContext, TAU, PI } from "../core/context";
import { seededRandom } from "../utils/seededRandom";

/**
 * Occasional visitors and weather used by the event system. Everything is
 * built once and hidden until an event brings it on stage.
 */
export function createVisitors(ctx: SceneContext) {
  const { scene, Batch, U, rod } = ctx;
  const random = seededRandom(577215);
  const range = (a: number, b: number) => a + (b - a) * random();

  // Cloud whale: a long, gentle voxel body with a paler belly and a tail that beats.
  const whale = new T.Group();
  whale.visible = false;
  scene.add(whale);
  const body = new Batch(whale);
  for (let x = -2.6; x <= 2.2; x += 0.3)
    for (let y = -0.75; y <= 0.75; y += 0.3)
      for (let z = -0.75; z <= 0.75; z += 0.3) {
        const taper =
          x > 0 ? 1 - (x / 2.4) ** 2 * 0.7 : 1 - ((x + 0.4) / 2.6) ** 2 * 0.4;
        const d = (y / (0.78 * taper)) ** 2 + (z / (0.78 * taper)) ** 2;
        if (d > 1 || d < 0.45) continue;
        body.add(x, y, z, 0.31, 0.31, 0.31, y < -0.25 ? "#f4ecf1" : "#aab0d6");
      }
  body.add(1.2, 0.65, 0, 0.2, 0.3, 0.2, "#aab0d6");
  for (const s of [-1, 1]) {
    body.add(1.35, -0.1, s * 0.48, 0.14, 0.08, 0.14, "#4d475f");
    body.add(
      0.4,
      -0.5,
      s * 0.95,
      0.8,
      0.1,
      0.45,
      "#9ea4cc",
      0,
      s * 0.35,
      s * -0.4,
    );
  }
  body.build(false);
  const tail = new T.Group();
  tail.position.set(-2.6, 0, 0);
  whale.add(tail);
  const tb = new Batch(tail);
  tb.add(-0.45, 0, 0, 0.9, 0.24, 0.3, "#aab0d6");
  tb.add(-1.0, 0, 0, 0.5, 0.12, 1.4, "#9ea4cc");
  tb.build(false);
  const spout = new T.Group();
  spout.position.set(1.2, 0.85, 0);
  whale.add(spout);
  const sp = new Batch(spout);
  for (let i = 0; i < 7; i++)
    sp.add(
      range(-0.25, 0.25),
      0.15 + i * 0.16,
      range(-0.2, 0.2),
      0.18 - i * 0.01,
      0.16,
      0.18 - i * 0.01,
      "#ffffff",
    );
  sp.build(false);
  spout.visible = false;

  // Hot-air balloon: striped envelope, wicker basket, a tiny passenger lantern.
  const balloon = new T.Group();
  balloon.visible = false;
  scene.add(balloon);
  const bb = new Batch(balloon);
  for (let y = -0.9; y <= 0.9; y += 0.18)
    for (let x = -0.9; x <= 0.9; x += 0.18)
      for (let z = -0.9; z <= 0.9; z += 0.18) {
        const d = (x / 0.9) ** 2 + ((y + 0.15) / 1.0) ** 2 + (z / 0.9) ** 2;
        if (d > 1 || d < 0.6) continue;
        const stripe = Math.floor((Math.atan2(z, x) / TAU + 0.5) * 8) % 2;
        bb.add(
          x,
          2.1 + y,
          z,
          0.185,
          0.185,
          0.185,
          stripe ? "#f0c7a0" : "#c884a1",
        );
      }
  bb.add(0, 1.02, 0, 0.36, 0.14, 0.36, "#b48a72");
  bb.add(0, 0.3, 0, 0.55, 0.42, 0.55, "#c9a57e");
  bb.add(0, 0.52, 0, 0.6, 0.05, 0.6, "#e5cba4");
  for (const sx of [-1, 1])
    for (const sz of [-1, 1])
      rod(
        bb,
        [sx * 0.24, 0.5, sz * 0.24],
        [sx * 0.3, 1.05, sz * 0.3],
        0.025,
        "#9d8069",
      );
  bb.build(false);

  // Shooting star: a bright head with a tapering tail, both fog-free so they
  // read against the night sky. Moved and faded by the event director.
  const shootingStar = new T.Group();
  shootingStar.visible = false;
  scene.add(shootingStar);
  const starMat = new T.MeshBasicMaterial({
    color: "#fff6dc",
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
  });
  const starHead = new T.Mesh(new T.SphereGeometry(0.38, 8, 6), starMat);
  shootingStar.add(starHead);
  const starTail = new T.Mesh(new T.ConeGeometry(0.26, 8, 6), starMat);
  starTail.rotation.z = Math.PI / 2;
  starTail.position.x = 4;
  shootingStar.add(starTail);
  shootingStar.traverse((o) => {
    o.frustumCulled = false;
    o.castShadow = false;
    o.receiveShadow = false;
  });

  // Rain: a sheet of falling streaks over the main island, faded by uRain.
  const rainGeo = new T.BufferGeometry(),
    rainSeed: number[] = [];
  for (let i = 0; i < 700; i++) rainSeed.push(random(), random(), random());
  rainGeo.setAttribute("position", new T.Float32BufferAttribute(rainSeed, 3));
  const rainMat = new T.ShaderMaterial({
    uniforms: U,
    transparent: true,
    depthWrite: false,
    vertexShader: `uniform float uTime;uniform float uRain;uniform float uWind;varying float vAlpha;void main(){float life=fract(position.y+uTime*(.55+position.z*.2));vec3 p=vec3(-7.+position.x*15.+life*uWind*2.,7.-life*8.5,-5.+position.z*10.);vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp(30./-mv.z,1.,3.);vAlpha=uRain*.55*smoothstep(0.,.1,life)*(1.-smoothstep(.85,1.,life));}`,
    fragmentShader: `varying float vAlpha;void main(){vec2 c=gl_PointCoord-.5;if(abs(c.x)>.22)discard;gl_FragColor=vec4(.82,.88,.96,vAlpha*(1.-abs(c.y)*1.4));}`,
  });
  const rain = new T.Points(rainGeo, rainMat);
  rain.visible = false;
  rain.frustumCulled = false;
  rain.renderOrder = 14;
  scene.add(rain);

  // A soft postcard that rides back with the airship and lands in the mailbox.
  const postcard = new T.Group();
  postcard.visible = false;
  scene.add(postcard);
  const pc = new Batch(postcard);
  pc.add(0, 0, 0, 0.36, 0.24, 0.02, "#fdf3e1");
  pc.add(0.11, 0.07, 0.014, 0.08, 0.08, 0.008, "#c98aa1");
  pc.add(-0.05, -0.03, 0.014, 0.16, 0.012, 0.004, "#c4a4a6");
  pc.add(-0.05, -0.07, 0.014, 0.12, 0.012, 0.004, "#c4a4a6");
  pc.build(false);
  postcard.rotation.y = PI / 4;

  return {
    whale,
    whaleTail: tail,
    whaleSpout: spout,
    balloon,
    shootingStar,
    shootingStarMat: starMat,
    rain,
    postcard,
  };
}
