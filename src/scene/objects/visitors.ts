import * as T from "three";
import { type SceneContext, PI } from "../core/context";
import { seededRandom } from "../utils/seededRandom";
import { createCloudWhale } from "./cloudWhale";

/**
 * Occasional visitors and weather used by the event system. Everything is
 * built once and hidden until an event brings it on stage.
 */
export function createVisitors(ctx: SceneContext) {
  const { scene, SoftBatch: Batch, U, rod } = ctx;
  const random = seededRandom(577215);
  const cloudWhale = createCloudWhale(ctx);
  // Preserve the weather seed sequence previously used by the spout.
  for (let i = 0; i < 14; i++) random();

  // Hot-air balloon: striped envelope, wicker basket, a tiny passenger lantern.
  const balloon = new T.Group();
  balloon.visible = false;
  scene.add(balloon);
  const bb = new Batch(balloon);
  const balloonGeometry = new T.SphereGeometry(1, 48, 32);
  balloonGeometry.scale(0.9, 1, 0.9);
  const paintCanvas = document.createElement("canvas");
  paintCanvas.width = 256;
  paintCanvas.height = 32;
  const paint = paintCanvas.getContext("2d");
  if (!paint) throw new Error("Unable to paint the balloon");
  for (let stripe = 0; stripe < 8; stripe++) {
    paint.fillStyle = stripe % 2 ? "#f0c7a0" : "#c884a1";
    paint.fillRect(stripe * 32, 0, 32, 32);
  }
  const balloonTexture = new T.CanvasTexture(paintCanvas);
  balloonTexture.colorSpace = T.SRGBColorSpace;
  const skin = ctx.mesh(
    balloonGeometry,
    new T.MeshStandardMaterial({ map: balloonTexture, roughness: 0.9 }),
    balloon,
    0,
    1.95,
    0,
  );
  skin.castShadow = false;
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
    ...cloudWhale,
    balloon,
    shootingStar,
    shootingStarMat: starMat,
    rain,
    postcard,
  };
}
