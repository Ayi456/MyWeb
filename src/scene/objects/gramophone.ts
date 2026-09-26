import * as T from "three";
import type { SceneContext } from "../core/context";

/** Small deterministic garden furniture, built without the world's random stream. */
export function createGramophone(ctx: SceneContext, garden: T.Group) {
  const gramophone = new T.Group();
  gramophone.name = "garden-gramophone";
  gramophone.position.set(0.88, 0.12, 0.55);
  garden.add(gramophone);
  const body = new ctx.Batch(gramophone);
  for (const x of [-0.2, 0.2])
    for (const z of [-0.17, 0.17])
      body.add(x, 0.17, z, 0.065, 0.34, 0.065, "#a38772");
  body.add(0, 0.36, 0, 0.58, 0.09, 0.5, "#dbc098");
  body.add(0, 0.46, 0, 0.46, 0.13, 0.38, "#ad8d77");
  body.add(0, 0.53, 0, 0.5, 0.035, 0.41, "#e7caa2");
  body.add(0.3, 0.45, 0, 0.14, 0.035, 0.035, "#8b7565");
  body.add(0.37, 0.41, 0, 0.035, 0.1, 0.035, "#bc9b69");
  ctx.rod(body, [0.17, 0.55, -0.1], [0.04, 0.61, 0.03], 0.025, "#a58e68");
  ctx.rod(body, [-0.17, 0.5, -0.14], [-0.22, 0.78, -0.14], 0.055, "#bca06d");
  // A stepped hollow brass horn opening towards the visitor.
  for (let ring = 0; ring < 5; ring++) {
    const half = 0.07 + ring * 0.043;
    const y = 0.79 + ring * 0.035,
      z = -0.14 + ring * 0.08;
    const color = ring === 4 ? "#ecd6a0" : "#c9a66c";
    body.add(-0.22 - half, y, z, 0.04, half * 2, 0.075, color);
    body.add(-0.22 + half, y, z, 0.04, half * 2, 0.075, color);
    body.add(-0.22, y + half, z, half * 2, 0.04, 0.075, color);
    body.add(-0.22, y - half, z, half * 2, 0.04, 0.075, color);
  }
  body.add(-0.22, 0.79, -0.19, 0.12, 0.12, 0.025, "#806d52");
  body.build(false);
  const gramophoneRecord = new T.Group();
  gramophoneRecord.name = "gramophone-record";
  gramophoneRecord.position.set(0, 0.56, 0.04);
  gramophone.add(gramophoneRecord);
  const disc = new ctx.Batch(gramophoneRecord);
  for (let x = -3; x <= 3; x++)
    for (let z = -3; z <= 3; z++) {
      if (x * x + z * z > 10) continue;
      disc.add(
        x * 0.045,
        0,
        z * 0.045,
        0.048,
        0.025,
        0.048,
        Math.abs(x) + Math.abs(z) <= 1 ? "#d7b09a" : "#51494b",
      );
    }
  disc.add(0.07, 0.018, 0, 0.035, 0.012, 0.025, "#f0dec2");
  disc.build(false);
  return { gramophone, gramophoneRecord };
}

export function updateGramophone(
  o: { gramophoneRecord: T.Group },
  dt: number,
  playing: boolean,
  reducedMotion: boolean,
) {
  if (playing && !reducedMotion && dt > 0)
    o.gramophoneRecord.rotation.y =
      (o.gramophoneRecord.rotation.y + dt * 1.4) % (Math.PI * 2);
}
