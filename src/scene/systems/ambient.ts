import { PI, TAU } from "../core/context";
import type { WorldObjects } from "../objects/createWorld";
import { CONFIG } from "../config";
import type { WindSystem } from "./wind";
import { courierPose, updateBunnyMotion } from "./bunnyMotion";

export function updateAmbient(
  objects: WorldObjects,
  simTime: number,
  wind: number,
  f: number,
  windMotion?: WindSystem,
  reducedMotion = false,
) {
  const {
    tree,
    swing,
    lanterns,
    writer,
    tail,
    paw,
    courier,
    cart,
    wheels,
    butterflies,
    birds,
  } = objects;
  tree.rotation.z = Math.sin(simTime * 0.82) * (0.004 + wind * 0.022);
  tree.rotation.x = Math.sin(simTime * 0.71) * (0.004 + wind * 0.009);
  objects.windmillSails.rotation.z =
    -simTime * 0.25 -
    Math.sin(simTime * 0.6) * wind * 0.12 -
    (windMotion?.millTurn ?? 0);
  swing.rotation.z = Math.sin(simTime * 1.35) * (0.05 + wind * 0.12);
  swing.rotation.x = Math.sin(simTime * 1.1) * 0.015;
  lanterns.forEach(
    (l, i) =>
      (l.rotation.z =
        Math.sin(simTime * 1.15 + i * 0.44) * (0.025 + wind * 0.1)),
  );
  updateBunnyMotion(writer, simTime, reducedMotion);
  updateBunnyMotion(courier, simTime, reducedMotion);
  updateBunnyMotion(objects.pilot, simTime, reducedMotion);
  const writing = !reducedMotion && simTime % 13 < 8;
  writer.head.rotation.y = reducedMotion ? 0 : Math.sin(simTime * 0.28) * 0.08;
  writer.head.rotation.x = writing
    ? 0.14 + Math.sin(simTime * 1.8) * 0.015
    : 0.025;
  writer.arms[0].rotation.x =
    -0.7 + (writing ? Math.sin(simTime * 3.4) * 0.035 : 0);
  writer.arms[0].rotation.y = writing ? Math.sin(simTime * 2.2) * 0.035 : 0;
  tail.rotation.y = Math.sin(simTime * 1.2) * 0.36;
  paw.rotation.z =
    -0.12 - Math.pow(Math.max(0, Math.sin(simTime * 0.75)), 7) * 0.95;
  const busy = f < CONFIG.dockDuration || f > CONFIG.flightDuration - 6;
  const pose = courierPose(simTime, reducedMotion);
  const dx = Math.cos(pose.yaw) * 0.27;
  const dz = -Math.sin(pose.yaw) * 0.27;
  courier.g.position.set(pose.x + dx, 1.21, 0.17 + dz);
  courier.g.rotation.y = pose.yaw - PI / 2;
  courier.legs.forEach((leg, i) => {
    leg.rotation.x = pose.stride * (i ? -1 : 1);
  });
  courier.arms.forEach((arm) => arm.rotation.set(-0.95, 0, 0));
  courier.head.rotation.y =
    !busy && !reducedMotion ? Math.sin(simTime * 0.4) * 0.06 : 0;
  cart.position.set(pose.x - dx, 1.194, 0.17 - dz);
  cart.rotation.y = pose.yaw;
  wheels.forEach((wheel) => (wheel.rotation.y = pose.wheel));
  butterflies.forEach(({ g, wings }, i) => {
    const a = simTime * (0.34 + i * 0.008) + i * 2.41;
    g.position.set(
      -1.1 +
        Math.cos(a) * (1.6 + (i % 3) * 0.4) +
        wind * (0.35 + Math.sin(a * 1.7 + i) * 0.25),
      1.55 + (i % 4) * 0.28 + Math.sin(a * 1.9) * 0.15,
      0.4 + Math.sin(a) * 1.5,
    );
    g.rotation.y = -a;
    wings.forEach(
      (w, j) =>
        (w.rotation.z =
          (j ? 1 : -1) * (0.25 + Math.sin(simTime * 9 + i) * 0.67)),
    );
  });
  birds.forEach(({ g, wings }, i) => {
    const a = simTime * 0.14 - (windMotion?.birdLag ?? 0) + (i * TAU) / 5;
    g.position.set(
      Math.cos(a) * 7.2,
      6.15 + Math.sin(a * 2 + i) * 0.36,
      Math.sin(a) * 5.9 - 1,
    );
    g.rotation.set(0.05, -a - PI / 2, Math.sin(a) * 0.1);
    wings.forEach(
      (w, j) =>
        (w.rotation.x =
          (j ? 1 : -1) * (0.05 + Math.sin(simTime * 3.5 + i) * 0.29)),
    );
  });
}
