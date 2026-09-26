import * as T from "three";
import { CONFIG } from "../config";
import type { WorldObjects } from "../objects/createWorld";
import type { SeasonName } from "./season";
import type { FestivalKind } from "./festival";
import type { SceneEventKind } from "./events";

export const REPLIES: Record<SeasonName, string[]> = {
  spring: [
    "信收到了。樱花开得正好，替你多看了一眼。",
    "风把你的话带到了灯塔，灯塔说：知道了。",
    "春天很长，慢慢走，别急着抵达。",
    "远方一切都好，只是有点想念樱花。",
    "回信裹着一点月饼香，月亮替你照亮了邮路。",
    "来时遇见一头云鲸，它替你的春日问候唱了几句。",
    "云鲸和飞艇并肩走了一段，樱花香一直留到灯塔。",
    "来时碰上太阳雨，雨停以后，樱花把路照亮了。",
    "那场雨把信封打湿了一角，里面的问候还是暖的。",
    "回信写在灯笼底下，邮差托月光带给你。",
    "春夜很静，小兔替你的问候多添了一句晚安。",
    "天刚亮，樱花树下的邮局就收到你的问候。",
    "清晨的云还没醒，邮差已经把回信带上船。",
  ],
  summer: [
    "这里的夏夜有很多萤火虫，像散落的小灯。",
    "信收到啦。午后下了一场雨，凉快了不少。",
    "茶山的茶新采了一茬，给你留了一罐。",
    "海一样的云，今天格外蓝。",
    "回信裹着一点月饼香，月亮替你照亮了邮路。",
    "来时遇见云鲸，它把一阵夏夜的凉风带到船边。",
    "云鲸替飞艇让出邮路，也听见了你的问候。",
    "那场太阳雨刚停，回信带着雨后的清凉。",
    "雷雨留在了远方，邮差把干燥的问候放在怀里。",
    "萤火虫亮起来的时候，我借着小灯写完了回信。",
    "夏夜的虫鸣没停，晚安已经随着飞艇出发。",
    "晨光照到茶山时，你的信也到了。",
    "清晨还不热，邮差先把这封回信送上了船。",
  ],
  autumn: [
    "枫叶红了，邮差的口袋里装满了叶子。",
    "谢谢你的信。秋天的风把它读了两遍。",
    "村里在晒柿子，甜味飘到了云上。",
    "落叶铺了一路，走起来沙沙响。",
    "回信裹着一点月饼香，月亮替你照亮了邮路。",
    "云鲸从红叶后游过，替你的问候领了一段路。",
    "来时遇见云鲸，邮差说秋天的云也会唱歌。",
    "那阵雨洗亮了红叶，回信也沾了一点秋天的颜色。",
    "雨声停下以后，邮局听见了你寄来的那句话。",
    "秋夜的灯很暖，这封回信写得比平时慢一点。",
    "灯塔守着夜航的船，我托它把晚安一起带给你。",
    "清晨的风翻过红叶，也翻开了你的信。",
    "村里刚开窗，邮差已经带着回信走过小桥。",
  ],
  winter: [
    "下雪了。信到的时候，还带着一点温度。",
    "温泉的热气把字都熏软了，可我读懂了。",
    "灯塔的光在雪夜里更亮，像是替你守着。",
    "冬天很安静，正好把你的话反复读。",
    "回信裹着一点月饼香，月亮替你照亮了邮路。",
    "来时遇见云鲸，它把雪云推开，替飞艇留了一条路。",
    "云鲸的歌穿过雪夜，你的问候也平安到了。",
    "路上那场雨早已停了，回信到时，岛上开始落雪。",
    "邮差把雨后的回信收好，带进了冬天的暖灯里。",
    "雪夜的灯还亮着，回信里替你留了一点温度。",
    "温泉村已经安静下来，我借着窗里的光写一句晚安。",
    "天刚亮，邮差扫开码头的雪，把回信送上船。",
    "清晨很冷，读到你的问候时，邮局暖了一点。",
  ],
};

export interface ReplyContext {
  lastEvent?: SceneEventKind | null;
  night?: number;
  hour?: number;
  festival?: FestivalKind | null;
}
/** Original indices 0–4 stay stable for already-saved collections. */
export function pickReply(season: SeasonName, ctx: ReplyContext, cursor = 0) {
  const indices =
    ctx.festival === "midAutumn"
      ? [4]
      : ctx.lastEvent === "whale"
        ? [5, 6]
        : ctx.lastEvent === "shower" || ctx.lastEvent === "thunderstorm"
          ? [7, 8]
          : (ctx.night ?? 0) > 0.6
            ? [9, 10]
            : (ctx.hour ?? 12) >= 4.5 && (ctx.hour ?? 12) < 8.5
              ? [11, 12]
              : [0, 1, 2, 3];
  return REPLIES[season][indices[cursor % indices.length]];
}
export const STAMPS = [
  { id: "sakura", label: "樱", title: "樱花邮戳", hint: "寄出第一封信" },
  { id: "beacon", label: "塔", title: "灯塔邮戳", hint: "收到第一封回信" },
  { id: "ride", label: "航", title: "登船邮戳", hint: "跟随飞艇飞完一段" },
  { id: "rain", label: "虹", title: "彩虹邮戳", hint: "遇见一场太阳雨" },
  { id: "star", label: "星", title: "流星邮戳", hint: "看见一颗流星" },
  { id: "whale", label: "鲸", title: "云鲸邮戳", hint: "遇见云鲸" },
  {
    id: "treasure",
    label: "寻",
    title: "寻宝邮戳",
    hint: "找齐一周的群岛线索",
  },
  { id: "seasons", label: "岁", title: "四季邮戳", hint: "看过四个季节" },
  {
    id: "touch",
    label: "触",
    title: "万物邮戳",
    hint: "和岛上 8 种事物打过招呼",
  },
  {
    id: "regular",
    label: "常",
    title: "常客邮戳",
    hint: "在 3 个不同日期来访",
  },
  {
    id: "hanami",
    label: "花",
    title: "花见邮戳",
    hint: "春分当天寄信",
    limited: true,
  },
  {
    id: "longday",
    label: "昼",
    title: "长日邮戳",
    hint: "夏至当天寄信",
    limited: true,
  },
  {
    id: "bridge",
    label: "桥",
    title: "鹊桥邮戳",
    hint: "七夕当天寄信",
    limited: true,
  },
  {
    id: "moon",
    label: "月",
    title: "望月邮戳",
    hint: "中秋当天寄信",
    limited: true,
  },
  {
    id: "warmth",
    label: "汤",
    title: "暖汤邮戳",
    hint: "冬至当天寄信",
    limited: true,
  },
  {
    id: "newyear",
    label: "新",
    title: "新岁邮戳",
    hint: "元旦当天寄信",
    limited: true,
  },
] as const;
export type StampId = (typeof STAMPS)[number]["id"];
export interface StoredReply {
  season: SeasonName;
  index: number;
  at: number;
}
export function decodeReply(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const item = value as Record<string, unknown>;
  if (
    typeof item.season !== "string" ||
    !(item.season in REPLIES) ||
    !Number.isInteger(item.index) ||
    !Number.isFinite(item.at) ||
    Number(item.at) < 0
  )
    return null;
  const season = item.season as SeasonName;
  const index = Number(item.index);
  const text = REPLIES[season][index];
  return text ? { text, season, at: Number(item.at) } : null;
}
export function encodeReply(reply: {
  text: string;
  season: SeasonName;
  at: number;
}): StoredReply | null {
  const index = REPLIES[reply.season]?.indexOf(reply.text) ?? -1;
  return index >= 0 && Number.isFinite(reply.at)
    ? { season: reply.season, index, at: reply.at }
    : null;
}

/** Replies that come back with the ship once a letter has gone out. */
export class ReplyLedger {
  /** Letters delivered to the ship but not yet answered. */
  owed = 0;
  received: { text: string; season: SeasonName; at: number }[] = [];
  private cursor = 0;
  constructor(private random: () => number = Math.random) {}
  restore(list: unknown) {
    this.received = Array.isArray(list)
      ? list.slice(-40).flatMap((item) => {
          const reply = decodeReply(item);
          return reply ? [reply] : [];
        })
      : [];
    return this.received;
  }
  deliver() {
    this.owed++;
  }
  /** Called when the ship moors at the main dock. Returns the new reply. */
  arrive(
    season: SeasonName,
    at: number,
    festival: FestivalKind | null = null,
    context: ReplyContext = {},
  ) {
    if (this.owed <= 0) return null;
    this.owed--;
    const text = pickReply(
      season,
      { ...context, festival },
      this.cursor++ + Math.floor(this.random() * 2),
    );
    const reply = { text, season, at };
    this.received.push(reply);
    if (this.received.length > 40) this.received.shift();
    return reply;
  }
}
export class StampBook {
  earned = new Set<StampId>();
  touched = new Set<string>();
  seasons = new Set<SeasonName>();
  private listeners = new Set<(id: StampId) => void>();
  toJSON(): StampId[] {
    return [...this.earned];
  }
  /** Restore directly, without replaying sounds or onEarn notifications. */
  from(json: unknown) {
    const valid = new Set<StampId>(STAMPS.map((stamp) => stamp.id));
    this.earned = new Set(
      Array.isArray(json)
        ? json.filter((id): id is StampId => valid.has(id))
        : [],
    );
    return this.toJSON();
  }
  clear() {
    this.earned.clear();
    this.touched.clear();
    this.seasons.clear();
  }
  onEarn(listener: (id: StampId) => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  award(id: StampId) {
    if (this.earned.has(id)) return false;
    this.earned.add(id);
    this.listeners.forEach((l) => l(id));
    return true;
  }
  touch(id: string) {
    this.touched.add(id);
    if (this.touched.size >= 8) this.award("touch");
  }
  season(name: SeasonName) {
    this.seasons.add(name);
    if (this.seasons.size >= 4) this.award("seasons");
  }
  visitDays(days: number) {
    if (days >= 3) this.award("regular");
  }
}
/** Animates the returning postcard from the moored ship into the mailbox. */
export function createPostcardFlight(o: WorldObjects) {
  let age = -1;
  const from = new T.Vector3(),
    to = new T.Vector3();
  return {
    get flying() {
      return age >= 0;
    },
    launch() {
      age = 0;
      from.copy(o.airship.position).add(new T.Vector3(0.2, 0.6, 0.4));
      o.mailbox.getWorldPosition(to);
      to.y += 1.0;
      o.postcard.visible = true;
    },
    update(dt: number) {
      if (age < 0) return false;
      age += dt;
      const t = Math.min(1, age / CONFIG.postcardDuration),
        e = t * t * (3 - 2 * t);
      o.postcard.position.copy(from).lerp(to, e);
      o.postcard.position.y += Math.sin(t * Math.PI) * 1.6;
      o.postcard.rotation.set(
        Math.sin(t * 7) * 0.3,
        t * 5,
        Math.sin(t * 5) * 0.4,
      );
      o.postcard.scale.setScalar(0.9 + Math.sin(t * Math.PI) * 0.3);
      if (t >= 1) {
        age = -1;
        o.postcard.visible = false;
        return true;
      }
      return false;
    },
  };
}
