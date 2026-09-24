import * as T from "three";
import { CONFIG } from "../config";
import type { WorldObjects } from "../objects/createWorld";
import type { SeasonName } from "./season";

export const REPLIES: Record<SeasonName, string[]> = {
  spring: [
    "信收到了。樱花开得正好，替你多看了一眼。",
    "风把你的话带到了灯塔，灯塔说：知道了。",
    "春天很长，慢慢走，别急着抵达。",
    "远方一切都好，只是有点想念樱花。",
  ],
  summer: [
    "这里的夏夜有很多萤火虫，像散落的小灯。",
    "信收到啦。午后下了一场雨，凉快了不少。",
    "茶山的茶新采了一茬，给你留了一罐。",
    "海一样的云，今天格外蓝。",
  ],
  autumn: [
    "枫叶红了，邮差的口袋里装满了叶子。",
    "谢谢你的信。秋天的风把它读了两遍。",
    "村里在晒柿子，甜味飘到了云上。",
    "落叶铺了一路，走起来沙沙响。",
  ],
  winter: [
    "下雪了。信到的时候，还带着一点温度。",
    "温泉的热气把字都熏软了，可我读懂了。",
    "灯塔的光在雪夜里更亮，像是替你守着。",
    "冬天很安静，正好把你的话反复读。",
  ],
};
export const STAMPS = [
  { id: "sakura", label: "樱", title: "樱花邮戳", hint: "寄出第一封信" },
  { id: "beacon", label: "塔", title: "灯塔邮戳", hint: "收到第一封回信" },
  { id: "ride", label: "航", title: "登船邮戳", hint: "跟随飞艇飞完一段" },
  { id: "rain", label: "虹", title: "彩虹邮戳", hint: "遇见一场太阳雨" },
  { id: "star", label: "星", title: "流星邮戳", hint: "看见一颗流星" },
  { id: "whale", label: "鲸", title: "云鲸邮戳", hint: "遇见云鲸" },
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
  arrive(season: SeasonName, at: number) {
    if (this.owed <= 0) return null;
    this.owed--;
    const lines = REPLIES[season];
    const text =
      lines[(this.cursor++ + Math.floor(this.random() * 2)) % lines.length];
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
