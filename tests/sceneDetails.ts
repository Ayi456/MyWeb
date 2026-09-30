/** Static close-ups use production models, materials and the production output pass. */
import * as T from "three";
import { createContext } from "../src/scene/core/context";
import { createRenderer } from "../src/scene/core/renderer";
import { ResourceTracker } from "../src/scene/core/resourceTracker";
import { createWorld } from "../src/scene/objects/createWorld";
import { updateAmbient } from "../src/scene/systems/ambient";
import { createDayNight } from "../src/scene/systems/dayNight";
import { createInteractions } from "../src/scene/systems/interactions";
import {
  IslandWalker,
  WALK_START,
  walkingObstacles,
} from "../src/scene/systems/walking";
import type { SeasonWeights } from "../src/scene/systems/season";

const canvas = document.querySelector<HTMLCanvasElement>("#world")!;
const params = new URLSearchParams(location.search);
const ctx = createContext();
const objects = createWorld(ctx);
const output = createRenderer(canvas);
const camera = new T.PerspectiveCamera(37, 1, 0.04, 150);
const daylight = createDayNight(ctx, objects);
const interactions = createInteractions(ctx, objects);
const resources = new ResourceTracker();
resources.track(ctx.scene);
const walker = new IslandWalker(objects.walkTiles, walkingObstacles(objects));

function frame() {
  ctx.scene.updateMatrixWorld(true);
  const shot = params.get("shot") ?? "writer";
  const target = new T.Vector3();
  let offset: [number, number, number];
  if (shot.startsWith("writer")) {
    objects.writer.g.getWorldPosition(target);
    target.y += 0.37;
    offset = shot === "writer-side" ? [1.9, 0.35, 0.4] : [0.25, 0.45, 2.15];
  } else if (shot.startsWith("courier")) {
    objects.courier.g.getWorldPosition(target);
    target.y += 0.39;
    offset = shot === "courier-side" ? [0.25, 0.4, 2.1] : [2.1, 0.5, 0.42];
  } else if (shot === "village") {
    objects.villageIsland.getWorldPosition(target);
    target.y += 0.65;
    offset = [3.8, 4.2, 10.5];
  } else {
    objects.house.getWorldPosition(target);
    target.y += 0.9;
    offset = shot === "office-front" ? [0, 1.2, 5] : [3.5, 2.1, 4.5];
  }
  camera.position.copy(target).add(new T.Vector3(...offset));
  camera.lookAt(target);
  output.resize(camera, "high");
}

export function renderAt(time = 0, reduced = false, season = 0) {
  const weights: SeasonWeights = [0, 0, 0, 0];
  weights[season] = 1;
  ctx.U.uSeason.value.fromArray(weights);
  ctx.U.uTime.value = reduced ? 0 : time;
  ctx.seasonal.apply(weights, true);
  daylight(Number(params.get("hour") ?? 12), weights);
  updateAmbient(objects, time, 0, 1.5, undefined, reduced);
  interactions.update(0, time);
  frame();
  output.render(ctx.scene, camera);
  canvas.dataset.ready = "true";
  return inspect();
}

export function tapWriter(time = 0) {
  interactions.tap("writer");
  return renderAt(time);
}

export function inspect() {
  const pose = (bunny: typeof objects.writer) => ({
    eyes: bunny.eyes.scale.y,
    ears: bunny.ears.map((ear) => ear.rotation.toArray()),
    head: bunny.head.rotation.toArray(),
    position: bunny.g.position.toArray(),
    rotation: bunny.g.rotation.toArray(),
    arms: bunny.arms.map((arm) => arm.rotation.toArray()),
  });
  const gripErrors = objects.courier.arms.map((arm, i) => {
    const palm = arm.localToWorld(new T.Vector3(0, -0.139, 0.014));
    const grip = objects.cart.localToWorld(
      new T.Vector3(0.525, 0.34, i ? 0.175 : -0.175),
    );
    return palm.distanceTo(grip);
  });
  return {
    writer: pose(objects.writer),
    courier: pose(objects.courier),
    pilot: pose(objects.pilot),
    gripErrors,
    cart: {
      position: objects.cart.position.toArray(),
      rotation: objects.cart.rotation.toArray(),
    },
    wheels: objects.wheels.map((wheel) => wheel.rotation.y),
    calls: output.renderer.info.render.calls,
    triangles: output.renderer.info.render.triangles,
    geometries: output.renderer.info.memory.geometries,
    textures: output.renderer.info.memory.textures,
    startClear: walker.canStand(WALK_START.x, WALK_START.z),
    pathClear: [0, 0.3, 0.6].map((x) =>
      walker.canStand(x, 0.85 + 0.31 * Math.sin(x * 1.15)),
    ),
  };
}

renderAt(
  Number(params.get("time") ?? 0),
  params.has("reduced"),
  Number(params.get("season") ?? 0),
);
window.addEventListener(
  "pagehide",
  () => {
    resources.dispose();
    output.dispose();
  },
  { once: true },
);
