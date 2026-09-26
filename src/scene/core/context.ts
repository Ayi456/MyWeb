import * as T from "three";
import { CONFIG } from "../config";
import { VoxelBatch } from "../utils/voxelBatch";
import { hash, seededRandom } from "../utils/seededRandom";
import { SeasonalPalette } from "../systems/season";

export type Point3 = [number, number, number];
export const PI = Math.PI,
  TAU = PI * 2,
  clamp = T.MathUtils.clamp,
  lerp = T.MathUtils.lerp;
export function ground(x: number, z: number) {
  return (
    1.03 +
    Math.round((0.1 * Math.sin(x * 1.2) + 0.08 * Math.cos(z * 1.5)) / 0.075) *
      0.075
  );
}
export function createContext() {
  const scene = new T.Scene();
  scene.fog = new T.FogExp2("#f4e1d7", CONFIG.fogDensity);
  const world = new T.Group();
  scene.add(world);
  const U = {
    uTime: { value: 0 },
    uWind: { value: 0 },
    uCloudTravel: { value: 0 },
    uNight: { value: 0 },
    uPetalTime: { value: 0 },
    uShip: { value: new T.Vector3(5.3, 1.2, 0.4) },
    /** Season blend weights: spring, summer, autumn, winter. */
    uSeason: { value: new T.Vector4(1, 0, 0, 0) },
    /** Pointer position on the petal plane, w = influence (0 when away). */
    uPointer: { value: new T.Vector4(0, 0, 0, 0) },
    /** Extra petal burst from a tap on the tree, decays to 0. */
    uBurst: { value: 0 },
    /** Rain shower strength 0..1 from the event system. */
    uRain: { value: 0 },
    /** Cloud-sea rise during the morning mist event, 0..1. */
    uTide: { value: 0 },
    /** Firefly brightness, strongest on summer nights. */
    uFirefly: { value: 1 },
    /** Ripple strength on the spring pool after a tap. */
    uRipple: { value: 0 },
  };
  const seasonal = new SeasonalPalette();
  const cube = new T.BoxGeometry(1, 1, 1);
  const matte = new T.MeshStandardMaterial({
    roughness: 0.84,
    metalness: 0.015,
    flatShading: true,
  });
  const rockMat = new T.MeshStandardMaterial({
    roughness: 0.98,
    flatShading: true,
  });
  const lampMat = new T.MeshStandardMaterial({
    color: "#fff1c9",
    emissive: "#ffc585",
    emissiveIntensity: 0.35,
    roughness: 0.5,
  });
  const rand = seededRandom(CONFIG.seed),
    range = (a: number, b: number) => a + (b - a) * rand();
  class Batch extends VoxelBatch {
    constructor(parent: T.Object3D = world, mat: T.Material = matte) {
      super(parent, mat, cube);
      this.onSeasonal = (data) => seasonal.register(data);
    }
  }
  function mesh<M extends T.Material>(
    g: T.BufferGeometry,
    m: M,
    parent: T.Object3D = world,
    x = 0,
    y = 0,
    z = 0,
  ) {
    const o = new T.Mesh(g, m);
    o.position.set(x, y, z);
    o.castShadow = true;
    o.receiveShadow = true;
    parent.add(o);
    return o;
  }
  function rod(
    batch: VoxelBatch,
    a: Point3,
    b: Point3,
    width: number,
    c: T.ColorRepresentation,
  ) {
    const av = new T.Vector3(...a),
      bv = new T.Vector3(...b),
      len = av.distanceTo(bv),
      mid = av.clone().add(bv).multiplyScalar(0.5),
      q = new T.Quaternion().setFromUnitVectors(
        new T.Vector3(0, 1, 0),
        bv.sub(av).normalize(),
      ),
      e = new T.Euler().setFromQuaternion(q);
    batch.add(mid.x, mid.y, mid.z, width, len, width, c, e.x, e.y, e.z);
  }
  function line(
    parent: T.Object3D,
    points: Point3[],
    col = "#aa8c7f",
    opacity = 1,
  ) {
    const g = new T.BufferGeometry().setFromPoints(
      points.map((v) => new T.Vector3(...v)),
    );
    const m = new T.LineBasicMaterial({
      color: col,
      transparent: opacity < 1,
      opacity,
    });
    const l = new T.Line(g, m);
    parent.add(l);
    return l;
  }
  function paperTexture(
    text: string,
    w = 512,
    h = 192,
    bg = "#fbefcd",
    ink = "#865767",
  ) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const p = c.getContext("2d");
    if (!p) throw new Error("无法生成邮局招牌纹理");
    p.fillStyle = bg;
    p.fillRect(0, 0, w, h);
    p.strokeStyle = ink;
    p.lineWidth = 3;
    p.strokeRect(9, 9, w - 18, h - 18);
    p.textAlign = "center";
    p.textBaseline = "middle";
    const lines = text.split("\n");
    lines.forEach((s, i) => {
      p.font = (i === 0 ? "bold 42px" : "21px") + " Georgia,serif";
      p.fillStyle = ink;
      p.fillText(s, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 49);
    });
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    return t;
  }
  return {
    scene,
    world,
    U,
    seasonal,
    cube,
    matte,
    rockMat,
    lampMat,
    rand,
    range,
    hash,
    Batch,
    mesh,
    rod,
    line,
    ground,
    paperTexture,
  };
}
export type SceneContext = ReturnType<typeof createContext>;
