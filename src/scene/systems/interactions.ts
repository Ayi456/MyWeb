import * as T from "three";
import type { SceneContext } from "../core/context";
import type { WorldObjects } from "../objects/createWorld";

export const HOTSPOTS = [
  "mailbox",
  "tree",
  "lantern",
  "writer",
  "cat",
  "windmill",
  "bell",
  "pool",
  "airship",
  "lighthouse",
  "teahouse",
  "village",
] as const;
export type HotspotId = (typeof HOTSPOTS)[number];
/** Layer 1 is raycast only: never rendered, never in the shadow pass. */
export const HIT_LAYER = 1;

/** A tap adds energy that eases back to rest. */
export class Impulse {
  value = 0;
  hit(amount = 1) {
    this.value = Math.min(1.6, this.value + amount);
  }
  decay(dt: number, rate: number) {
    this.value *= Math.exp(-dt * rate);
    if (this.value < 0.001) this.value = 0;
    return this.value;
  }
}

export const HOTSPOT_LINES: Record<HotspotId, string[]> = {
  mailbox: [],
  tree: ["樱花树抖了抖肩膀，落下一阵花雨。", "树说：慢慢来，春天不着急。"],
  lantern: ["灯笼轻轻晃了晃，像在打招呼。", "风铃般的一声，灯笼笑了。"],
  writer: ["写信的小兔抬起头，冲你眨了眨眼。", "「这封信，写给谁呢？」"],
  cat: ["猫咪翻了个身，尾巴甩得更欢了。", "猫咪：喵。（意思是别打扰它晒太阳）"],
  windmill: [
    "风车转得飞快，把云都搅成了糖。",
    "一阵好风，风车忍不住多转了几圈。",
  ],
  bell: ["叮——邮局的铃响了，有人来取信。", "铃声传得很远，灯塔那边也听见了。"],
  pool: ["水面荡开一圈圈涟漪。", "一颗小石子，惊动了整片春水。"],
  airship: ["飞艇上的邮差向你挥了挥手。", "「下一站，樱花树下！」"],
  lighthouse: ["灯塔闪了一下，像是在回信。", "远方的光，替谁守着夜。"],
  teahouse: ["茶山上飘来一缕茶香。", "亭子里的灯亮了，有人在等雨停。"],
  village: ["温泉冒着热气，村里的窗都亮了。", "小桥那头，有人在泡脚聊天。"],
};

export function createInteractions(ctx: SceneContext, o: WorldObjects) {
  const hits: { object: T.Object3D; id: HotspotId }[] = [];
  const hitMat = new T.MeshBasicMaterial({ visible: false });
  function hit(
    id: HotspotId,
    parent: T.Object3D,
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
  ) {
    const m = new T.Mesh(new T.BoxGeometry(sx, sy, sz), hitMat);
    m.position.set(x, y, z);
    m.layers.set(HIT_LAYER);
    m.name = `hit-${id}`;
    parent.add(m);
    hits.push({ object: m, id });
    return m;
  }
  o.mailHit.layers.set(HIT_LAYER);
  hits.push({ object: o.mailHit, id: "mailbox" });
  hit("tree", o.tree, -0.2, 3.3, -0.1, 5.2, 2.8, 4.3);
  hit("lantern", ctx.world, -1.42, 3.1, 0.95, 3.0, 0.7, 0.9);
  hit("lantern", ctx.world, 1.0, 2.8, 1.18, 2.4, 0.7, 0.8);
  hit("writer", o.bench, -0.22, 0.75, 0.05, 0.5, 0.9, 0.5);
  hit("cat", o.bench, 0.28, 0.55, 0.06, 0.5, 0.45, 0.4);
  hit("windmill", o.gardenIsland, -0.68, 1.35, -0.25, 1.9, 2.2, 0.9);
  hit("bell", o.house, 0.68, 1.12, 0.9, 0.34, 0.5, 0.3);
  hit("pool", ctx.world, -2.72, 1.16, 1.38, 1.5, 0.45, 1.2);
  hit("airship", o.airship, 0, 1.4, 0, 4.4, 3.1, 2.0);
  hit("lighthouse", o.lighthouseIsland, -0.25, 1.9, -0.18, 1.3, 3.8, 1.3);
  hit("teahouse", o.teaIsland, 0.2, 1.4, -2.6, 2.2, 2.4, 2.0);
  hit("village", o.villageIsland, 0.9, 0.6, 1.3, 3.0, 1.4, 2.8);

  const impulses = Object.fromEntries(
    HOTSPOTS.map((id) => [id, new Impulse()]),
  ) as Record<HotspotId, Impulse>;
  /** Reactions that are not tied to a tap: a letter going out, a reply landing. */
  const moments = { send: new Impulse(), reply: new Impulse() };
  let windmillSpin = 0,
    lineIndex = 0;
  const writerBaseY = o.writer.g.position.y,
    tailBase = o.tail.rotation.y;
  const listeners = new Set<(id: HotspotId, line: string) => void>();
  return {
    hits,
    impulses,
    moments,
    onTap(listener: (id: HotspotId, line: string) => void) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    tap(id: HotspotId) {
      impulses[id].hit();
      const lines = HOTSPOT_LINES[id];
      const line = lines.length ? lines[lineIndex++ % lines.length] : "";
      listeners.forEach((l) => l(id, line));
    },
    /** Apply after updateAmbient so reactions layer on top of idle motion. */
    update(dt: number, simTime: number) {
      const i = impulses;
      const tree = i.tree.decay(dt, 1.6);
      ctx.U.uBurst.value = tree * 1.4;
      o.tree.rotation.z += Math.sin(simTime * 11) * tree * 0.02;
      o.tree.rotation.x += Math.sin(simTime * 9) * tree * 0.012;
      const lantern = i.lantern.decay(dt, 1.1);
      o.lanterns.forEach((l, k) => {
        l.rotation.z += Math.sin(simTime * 7 + k * 0.9) * lantern * 0.45;
        l.rotation.x += Math.cos(simTime * 6 + k) * lantern * 0.2;
      });
      const writer = i.writer.decay(dt, 2.2);
      o.writer.g.position.y =
        writerBaseY + Math.abs(Math.sin(simTime * 12)) * writer * 0.16;
      o.writer.head.rotation.x -= writer * 0.4;
      o.writer.arms[1].rotation.z = -Math.sin(simTime * 14) * writer * 0.9;
      const cat = i.cat.decay(dt, 1.4);
      o.tail.rotation.y = tailBase + Math.sin(simTime * 16) * cat * 0.9;
      o.paw.rotation.z -= Math.abs(Math.sin(simTime * 10)) * cat * 0.8;
      const windmill = i.windmill.decay(dt, 0.55);
      windmillSpin += dt * windmill * 7;
      o.windmillSails.rotation.z -= windmillSpin;
      const bell = i.bell.decay(dt, 1.8);
      o.bell.rotation.x = Math.sin(simTime * 18) * bell * 0.55;
      o.bell.rotation.z = Math.cos(simTime * 15) * bell * 0.2;
      ctx.U.uRipple.value = i.pool.decay(dt, 0.9);
      const ship = i.airship.decay(dt, 1.5);
      o.pilot.arms[0].rotation.z =
        -Math.abs(Math.sin(simTime * 9)) * ship * 1.4;
      o.banner.rotation.y += Math.sin(simTime * 12) * ship * 0.4;
      const beacon = i.lighthouse.decay(dt, 1.3);
      const pulse =
        1 + Math.pow(Math.max(0, Math.sin(simTime * 9)), 3) * beacon * 1.6;
      o.beaconGlow.scale.set(2.3 * pulse, 2.3 * pulse, 1);
      o.beaconLight.intensity += beacon * 6;
      const tea = i.teahouse.decay(dt, 0.6);
      o.teaLight.intensity += tea * 4;
      const village = i.village.decay(dt, 0.6);
      o.villageLight.intensity += village * 5;
      o.cottages.forEach((c, k) => {
        c.rotation.z = Math.sin(simTime * 10 + k) * village * 0.03;
      });
      // A letter going out: the writer looks up towards the mailbox and the
      // courier bounces on the dock. A reply landing: the courier waves.
      const send = moments.send.decay(dt, 0.7);
      o.writer.head.rotation.y += send * 0.8;
      o.writer.head.rotation.x -= send * 0.25;
      o.courier.g.position.y += Math.abs(Math.sin(simTime * 9)) * send * 0.09;
      const reply = moments.reply.decay(dt, 0.8);
      o.courier.arms[1].rotation.z =
        Math.abs(Math.sin(simTime * 8)) * reply * 1.6;
      o.courier.head.rotation.x = -reply * 0.3;
    },
    dispose() {
      hitMat.dispose();
      hits.forEach(({ object }) => {
        if (object !== o.mailHit && object instanceof T.Mesh) {
          object.geometry.dispose();
          object.removeFromParent();
        }
      });
      listeners.clear();
    },
  };
}
