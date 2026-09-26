import * as T from "three";
import type { SceneContext } from "../core/context";

/** Small deterministic garden furniture, built without the world's random stream. */
export function createGramophone(ctx: SceneContext, garden: T.Group) {
  const gramophone = new T.Group();
  gramophone.name = "garden-gramophone";
  gramophone.position.set(0.88, 0.12, 0.55);
  garden.add(gramophone);
  const body = new ctx.SoftBatch(gramophone);
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
  const brass = new T.MeshStandardMaterial({
    color: "#d4b57d",
    roughness: 0.75,
    side: T.DoubleSide,
  });
  const horn = new T.Mesh(
    new T.LatheGeometry(
      [
        new T.Vector2(0.04, 0),
        new T.Vector2(0.055, 0.055),
        new T.Vector2(0.09, 0.13),
        new T.Vector2(0.15, 0.23),
        new T.Vector2(0.24, 0.32),
        new T.Vector2(0.26, 0.34),
      ],
      24,
    ),
    brass,
  );
  horn.position.set(-0.22, 0.76, -0.14);
  horn.rotation.x = Math.PI / 3;
  gramophone.add(horn);
  body.build(false);
  const gramophoneRecord = new T.Group();
  gramophoneRecord.name = "gramophone-record";
  gramophoneRecord.position.set(0, 0.56, 0.04);
  gramophone.add(gramophoneRecord);
  const record = ctx.mesh(
    new T.CylinderGeometry(0.158, 0.158, 0.025, 32),
    new T.MeshStandardMaterial({ color: "#51494b", roughness: 0.8 }),
    gramophoneRecord,
  );
  record.castShadow = false;
  const label = ctx.mesh(
    new T.CylinderGeometry(0.055, 0.055, 0.008, 24),
    new T.MeshStandardMaterial({ color: "#d7b09a", roughness: 0.9 }),
    gramophoneRecord,
    0,
    0.018,
    0,
  );
  label.castShadow = false;
  const marker = new ctx.SoftBatch(gramophoneRecord);
  marker.add(0.07, 0.018, 0, 0.035, 0.012, 0.025, "#f0dec2");
  marker.build(false);
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
