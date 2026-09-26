import type { HotspotId } from "./interactions";
import type { SeasonName } from "./season";
import type { SceneEventKind } from "./events";
import type { StampId } from "./postcards";
import { FLIGHT_STOPS } from "../worldLayout";

export interface ScriptContext {
  season: SeasonName;
  hour: number;
  night: number;
  rain: number;
  event: SceneEventKind | null;
  wind: number;
  sentCount: number;
  replyCount: number;
  stamps: readonly StampId[];
  riding: boolean;
}
export type LineCursors = Partial<Record<HotspotId, number>>;
type Pair = readonly [string, string];
type Rule = { when: (ctx: ScriptContext) => boolean; lines: Pair };
const night = (ctx: ScriptContext) => ctx.night > 0.6;
const rain = (ctx: ScriptContext) => ctx.rain > 0.3;
const windy = (ctx: ScriptContext) => ctx.wind > 0.5;
const winter = (ctx: ScriptContext) => ctx.season === "winter";

const RULES: Partial<Record<HotspotId, Rule[]>> = {
  tree: [
    {
      when: winter,
      lines: [
        "樱花树攒着劲等开春，枝头只留了一点雪。",
        "树说：先把根暖好，花会慢慢回来。",
      ],
    },
    {
      when: rain,
      lines: [
        "雨珠沿着树枝滚下来，替花瓣洗了个澡。",
        "树把雨声收进了叶子里，轻轻一碰就响。",
      ],
    },
    {
      when: windy,
      lines: [
        "树把枝头的问候交给风，送到下一座岛。",
        "一阵风穿过树冠，叶子一起挥了挥手。",
      ],
    },
    {
      when: night,
      lines: [
        "树影守着邮局，灯笼替花瓣留了一盏光。",
        "树说：夜深了，把今天的心事放轻一点。",
      ],
    },
  ],
  writer: [
    {
      when: (c) => c.sentCount > 0,
      lines: [
        "小兔说：你的那封，我帮你贴好了邮票。",
        "小兔把笔放下：放心，你的问候已经在路上。",
      ],
    },
    {
      when: rain,
      lines: [
        "小兔把信纸往里挪了挪，听着雨声写下一行。",
        "小兔说：雨停以前，还来得及写一句想念。",
      ],
    },
    {
      when: night,
      lines: [
        "小兔借着灯笼的光还在写，字比白天慢一点。",
        "小兔说：晚安，也可以写成一封信。",
      ],
    },
  ],
  cat: [
    {
      when: rain,
      lines: [
        "猫躲到长椅下，只露出一条轻轻摇的尾巴。",
        "猫咪听着雨声打盹，暂时不想挪窝。",
      ],
    },
    {
      when: winter,
      lines: [
        "猫把爪子藏进肚皮底下，守着邮局的暖光。",
        "猫咪缩成一个小毛球，尾巴盖住了鼻尖。",
      ],
    },
    {
      when: night,
      lines: [
        "猫咪睁开一只眼，确认灯笼还亮着。",
        "猫的尾巴慢慢摆着，像在数夜里的星星。",
      ],
    },
  ],
  lantern: [
    {
      when: windy,
      lines: [
        "灯笼被风轻轻推了一下，暖光跟着摇晃。",
        "灯笼说：风再大，回家的灯也亮着。",
      ],
    },
    {
      when: rain,
      lines: [
        "雨落在灯笼上，暖光把水珠照得透亮。",
        "灯笼替等雨停的人，多留了一点亮。",
      ],
    },
    {
      when: night,
      lines: [
        "灯笼亮起来了，替写信的人守着夜。",
        "灯笼晃了晃：今晚的邮局还没打烊。",
      ],
    },
  ],
  windmill: [
    {
      when: windy,
      lines: [
        "风车转得快起来，把这一阵好风留在花园。",
        "风车多转了几圈，像在催邮差顺风出发。",
      ],
    },
    {
      when: rain,
      lines: [
        "风车听着雨点，转得比平时安静一点。",
        "叶片甩掉几颗水珠，继续替花园看风向。",
      ],
    },
    {
      when: night,
      lines: [
        "风车的影子转过花园，声音融进了虫鸣。",
        "夜里风小，风车也慢慢地转。",
      ],
    },
  ],
  bell: [
    {
      when: (c) => c.replyCount > 0,
      lines: [
        "叮——回信已经进了信箱，记得拆开看看。",
        "门铃说：远方的问候，有一封是给你的。",
      ],
    },
    {
      when: night,
      lines: [
        "一声轻铃，穿过邮局窗里的暖光。",
        "叮——夜里的铃声，怕惊醒长椅上的猫。",
      ],
    },
  ],
  pool: [
    {
      when: rain,
      lines: [
        "雨点在水面画圈，一圈追着另一圈。",
        "水池把天上的雨，接成一首小曲子。",
      ],
    },
    {
      when: winter,
      lines: [
        "雪落到水面，涟漪比平时更轻。",
        "池边安静下来，水里还映着邮局的灯。",
      ],
    },
    {
      when: night,
      lines: [
        "水面把灯笼的光晃碎，又慢慢拼回来。",
        "轻轻一点，水里的星光跟着荡开。",
      ],
    },
  ],
  airship: [
    {
      when: (c) => c.riding,
      lines: [
        "邮差回头说：坐稳了，前面就是灯塔。",
        "你和邮差一起，看见云从船舷旁慢慢退去。",
      ],
    },
    {
      when: (c) => c.event === "whale",
      lines: [
        "邮差指向远处：看，云鲸也走这一条邮路。",
        "飞艇放慢脚步，给游过群岛的云鲸让路。",
      ],
    },
    {
      when: night,
      lines: [
        "飞艇上的小灯亮了，邮差还在送最后几封信。",
        "邮差说：沿着灯塔的光，夜里也不会迷路。",
      ],
    },
  ],
  lighthouse: [
    {
      when: (c) => c.event === "seaMist",
      lines: [
        "雾漫过岛基，灯塔的光替邮路留下一条线。",
        "看不清远方的时候，先跟着这一盏灯。",
      ],
    },
    {
      when: night,
      lines: [
        "灯塔替夜航的飞艇，把下一站照亮。",
        "远方的光守着夜，也守着回家的方向。",
      ],
    },
    {
      when: (c) => c.stamps.includes("beacon"),
      lines: [
        "灯塔闪了一下：你的那封回信，已经送到了。",
        "你认得这座灯塔，它的邮戳还在收藏里。",
      ],
    },
  ],
  teahouse: [
    {
      when: rain,
      lines: [
        "亭子里留着一壶热茶，等你听完这阵雨。",
        "雨洗过茶山，新沏的茶香更清了。",
      ],
    },
    {
      when: winter,
      lines: [
        "茶亭里的水开了，暖气慢慢升到雪里。",
        "冬天的茶要趁热，亭子给你留了一个座位。",
      ],
    },
    {
      when: night,
      lines: [
        "茶亭的灯亮着，还有人在等最后一壶茶。",
        "夜里的茶山很静，杯里的热气却没停。",
      ],
    },
  ],
  village: [
    {
      when: (c) => c.event === "skyLanterns",
      lines: [
        "村里把写好的祝愿放进孔明灯，一盏盏送上夜空。",
        "小桥边的人抬着头，看暖光慢慢飘远。",
      ],
    },
    {
      when: (c) => c.event === "aurora",
      lines: [
        "泡汤的人抬起头，绿紫色的光正越过村顶。",
        "村里的窗还亮着，今晚大家都在看极光。",
      ],
    },
    {
      when: winter,
      lines: [
        "雪落在小桥上，温泉的热气暖着整个村子。",
        "冬天的泡汤水正好，村里给晚归的人留了灯。",
      ],
    },
    {
      when: night,
      lines: [
        "温泉村的窗一盏盏亮了，桥边有人轻声聊天。",
        "热气慢慢升起，村子把今天过成了一声晚安。",
      ],
    },
  ],
};

const SEASON_LINES: Record<
  Exclude<HotspotId, "mailbox">,
  Record<SeasonName, Pair>
> = {
  depot: {
    spring: [
      "驿站把花香和邮包一起收好，等下一班缆车。",
      "木屋里有人清点来信，春天的邮路又长了一点。",
    ],
    summer: [
      "驿站的窗开着，让邮包先吹一阵凉风。",
      "茶山的问候也到了，缆车正把它们送往邮局。",
    ],
    autumn: [
      "驿站把落叶夹进包裹，给远方添一点秋色。",
      "缆车运来一箱问候，屋里亮起了暖灯。",
    ],
    winter: [
      "驿站替邮包掸去薄雪，缆车慢慢等它们上路。",
      "冬夜的木屋还开着，晚来的问候也有人接。",
    ],
  },
  cablecar: {
    spring: [
      "缆车捎着一箱春日问候，沿着细细的索道远行。",
      "下一站是驿站，木盒里的心意都坐稳了。",
    ],
    summer: [
      "邮包在缆车里乘凉，云从车窗边慢慢过去。",
      "缆车沿着索道走，替邮差省下一段山路。",
    ],
    autumn: [
      "缆车从落叶上方经过，带着驿站的来信。",
      "一箱秋天的问候正在路上。",
    ],
    winter: [
      "邮包裹得暖暖的，缆车慢慢穿过冬云。",
      "索道两头的灯都亮着，问候会平安抵达。",
    ],
  },
  gramophone: {
    spring: [
      "花园留声机把旋律送过木桥，陪春日的信一起远行。",
      "轻轻转一下唱片，把花园的声音留给你。",
    ],
    summer: [
      "花园留声机替午后添一阵带着旋律的凉风。",
      "夏夜很长，让一首歌陪你等飞艇。",
    ],
    autumn: [
      "落叶擦过唱片盒，一首歌沿着木桥慢慢走。",
      "留声机收着秋天的旋律，轻轻一碰就醒来。",
    ],
    winter: [
      "唱片盒藏着一点暖意，把冬夜唱得慢一些。",
      "花园留声机等你唤醒一首暖暖的歌。",
    ],
  },
  tree: {
    spring: ["樱花树抖了抖肩膀，落下一阵花雨。", "树说：慢慢来，春天不着急。"],
    summer: [
      "树荫铺在长椅上，替小兔挡住午后的太阳。",
      "树叶长得很密，把风分成一阵阵清凉。",
    ],
    autumn: [
      "树抖下几片红叶，像寄出一封秋天的信。",
      "树说：这一季的颜色，也分你一点。",
    ],
    winter: ["樱花树攒着劲等开春。", "树把春天收在了根里。"],
  },
  lantern: {
    spring: ["灯笼轻轻晃了晃，像在打招呼。", "风铃般的一声，灯笼笑了。"],
    summer: [
      "灯笼的影子落在绿叶间，等着夏夜。",
      "白天的灯笼歇一会儿，夜里再照萤火虫。",
    ],
    autumn: [
      "一片叶子擦过灯笼，像带来秋天的口信。",
      "灯笼把落叶照得暖了一点。",
    ],
    winter: [
      "灯笼上的一点雪，被暖光照得很软。",
      "灯笼说：天冷了，邮局里暖和。",
    ],
  },
  writer: {
    spring: ["写信的小兔抬起头，冲你眨了眨眼。", "「这封信，写给谁呢？」"],
    summer: [
      "小兔在信纸旁放了一杯凉茶，慢慢写。",
      "小兔说：蝉声也想搭这班飞艇去远方。",
    ],
    autumn: [
      "小兔捡起一片红叶，夹在还没封好的信里。",
      "小兔说：秋天的话，写在纸上更暖。",
    ],
    winter: [
      "小兔搓了搓爪子，把问候写得更认真。",
      "小兔把信纸靠近灯光：这封要带一点温度。",
    ],
  },
  cat: {
    spring: [
      "猫咪翻了个身，尾巴甩得更欢了。",
      "猫咪：喵。（意思是别打扰它晒太阳）",
    ],
    summer: [
      "猫咪躲进树荫，伸了一个很长的懒腰。",
      "猫的尾巴扫过长椅，替自己扇一点凉风。",
    ],
    autumn: [
      "猫追了一片落叶，又决定先躺一会儿。",
      "猫把长椅的阳光占住，留下一声满意的呼噜。",
    ],
    winter: ["猫咪守着暖光打盹。", "天冷了，猫的尾巴也不想动。"],
  },
  windmill: {
    spring: [
      "风车转得飞快，把云都搅成了糖。",
      "一阵好风，风车忍不住多转了几圈。",
    ],
    summer: [
      "风车把热风吹过花园，叶子翻出浅色的背面。",
      "花园的风车转着，替午后的云找一点凉快。",
    ],
    autumn: [
      "风车卷起几片落叶，把秋天送过木桥。",
      "叶片转了一圈，秋风又走了一段路。",
    ],
    winter: ["风车戴着一点雪，还在慢慢转。", "冬风路过花园，风车轻轻点头。"],
  },
  bell: {
    spring: [
      "叮——邮局的铃响了，有人来取信。",
      "铃声传得很远，灯塔那边也听见了。",
    ],
    summer: [
      "叮——邮差带着一阵凉风走进来。",
      "门铃响了一声，蝉鸣替它接了下半句。",
    ],
    autumn: [
      "铃声穿过红叶，落在还没封口的信上。",
      "叮——邮局里多了一点秋天的热闹。",
    ],
    winter: [
      "叮——门开了一下，暖气和铃声一起跑出来。",
      "门铃说：进来吧，外面下雪了。",
    ],
  },
  pool: {
    spring: ["水面荡开一圈圈涟漪。", "一颗小石子，惊动了整片春水。"],
    summer: [
      "水面晃了晃，把午后的热气推远一点。",
      "清凉的水声，替夏天说了一句慢慢来。",
    ],
    autumn: [
      "一片叶子搭着涟漪，慢慢漂过水池。",
      "水里映着红叶，也映着路过的云。",
    ],
    winter: ["水里映着雪。", "池边安静下来。"],
  },
  airship: {
    spring: ["飞艇上的邮差向你挥了挥手。", "「下一站，樱花树下！」"],
    summer: [
      "邮差把帽子扶好，带着一船夏天的问候。",
      "飞艇飞过绿荫，下一站还有人在等信。",
    ],
    autumn: [
      "飞艇的邮袋里，多了几枚红叶邮戳。",
      "邮差挥挥手：今天的问候带着一点秋风。",
    ],
    winter: [
      "飞艇带着雪夜的问候，靠近暖灯的码头。",
      "邮差说：雪再厚，信也会慢慢送到。",
    ],
  },
  lighthouse: {
    spring: ["灯塔闪了一下，像是在回信。", "远方的光，记着回家的方向。"],
    summer: [
      "灯塔的小站敞着门，让海一样的云带走热气。",
      "邮差在灯塔歇了一会儿，又开始下一程。",
    ],
    autumn: [
      "灯塔守着秋天的邮路，光比云走得远。",
      "灯塔旁的风带着凉意，停靠的船却很安心。",
    ],
    winter: [
      "灯塔顶落着雪，暖光还在等飞艇。",
      "白色的岛基上，灯塔留下一个暖暖的方向。",
    ],
  },
  teahouse: {
    spring: ["茶山上飘来一缕茶香。", "新茶沏好了，亭子给你留了一杯。"],
    summer: [
      "茶亭里有一壶凉茶，刚好配午后的风。",
      "茶山绿得正好，杯里的香气也新鲜。",
    ],
    autumn: [
      "茶亭里晒着新收的茶，香气混着秋风。",
      "秋天的下午，适合在亭子里慢慢喝一杯。",
    ],
    winter: ["茶亭里的水开了。", "冬天的茶要趁热。"],
  },
  village: {
    spring: ["温泉冒着热气，村里的窗都亮了。", "小桥那头，有人在泡脚聊天。"],
    summer: [
      "村里的人坐在桥边，让晚风把热气吹散。",
      "温泉旁的石阶晒暖了，路过的人慢慢歇脚。",
    ],
    autumn: [
      "村里在晒柿子，甜味一直飘到小桥边。",
      "温泉的热气混着秋风，暖得刚刚好。",
    ],
    winter: ["温泉暖着整个村子。", "村里给晚归的人留了灯。"],
  },
};

/** Deterministic selection; callers own the returned per-hotspot cursors. */
export function pickLine(
  id: HotspotId,
  ctx: ScriptContext,
  cursors: LineCursors,
) {
  if (id === "mailbox") return { text: "", cursors };
  const lines =
    RULES[id]?.find((rule) => rule.when(ctx))?.lines ??
    SEASON_LINES[id][ctx.season];
  const cursor = cursors[id] ?? 0;
  return {
    text: lines[cursor % lines.length],
    cursors: { ...cursors, [id]: cursor + 1 },
  };
}

export function journeyLine(phase: number, ctx: ScriptContext) {
  const season = {
    spring: "樱花",
    summer: "绿荫",
    autumn: "红叶",
    winter: "雪光",
  }[ctx.season];
  let line: string;
  if (phase < FLIGHT_STOPS.departure)
    line = ctx.sentCount
      ? "飞艇在码头歇脚，下一程问候已经备好。"
      : "飞艇正在等一封信。";
  else if (phase < FLIGHT_STOPS.lighthouseArrival)
    line =
      ctx.night > 0.6
        ? "沿着灯塔的光，把问候送进夜色。"
        : `带着${season}的问候，飞向灯塔。`;
  else if (phase < FLIGHT_STOPS.lighthouseDeparture)
    line = `灯塔小站，收到了${season}的问候。`;
  else if (phase < FLIGHT_STOPS.westTurn)
    line =
      ctx.rain > 0.3
        ? "穿过这阵雨，带上远方的回信。"
        : "带上远方的问候，穿过云海。";
  else if (phase < FLIGHT_STOPS.southTurn)
    line = `风车转过一圈，${season}里的花园又近了。`;
  else
    line =
      ctx.season === "winter"
        ? "下一站，暖灯照着的邮局。"
        : "下一站，树下的春日邮局。";
  return ctx.riding ? `你正跟着飞艇。${line}` : line;
}

export function letterPrompt(season: SeasonName, night: number, rain: number) {
  if (rain > 0.3) return "听着雨声，给想念的人写一句话。";
  if (night > 0.6) return "借着灯笼的光，寄一句晚安到远方。";
  return {
    spring: "把春天的一点好心情，寄给想念的人。",
    summer: "把夏日的一阵凉风，写进这封信。",
    autumn: "把秋天的一点暖意，寄到远方。",
    winter: "天冷了，给想念的人寄一点温度。",
  }[season];
}
