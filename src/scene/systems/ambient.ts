import { PI, TAU } from "../core/context";
import type { WorldObjects } from "../objects/createWorld";

export function updateAmbient(
  objects: WorldObjects,
  simTime: number,
  wind: number,
  f: number,
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
  swing.rotation.z = Math.sin(simTime * 1.35) * (0.05 + wind * 0.12);
  swing.rotation.x = Math.sin(simTime * 1.1) * 0.015;
  lanterns.forEach(
    (l, i) =>
      (l.rotation.z =
        Math.sin(simTime * 1.15 + i * 0.44) * (0.025 + wind * 0.1)),
  );
  writer.head.rotation.y = Math.sin(simTime * 0.45) * 0.11;
  writer.head.rotation.x = 0.05 + Math.sin(simTime * 0.6) * 0.04;
  tail.rotation.y = Math.sin(simTime * 1.2) * 0.36;
  paw.rotation.z =
    -0.12 - Math.pow(Math.max(0, Math.sin(simTime * 0.75)), 7) * 0.95;
  const busy = f < 11 || f > 70,
    walk = busy
      ? Math.sin(simTime * 0.72) * 0.6
      : Math.sin(simTime * 0.28) * 0.12;
  courier.g.position.set(3.24 + walk, 1.21, 0.18);
  courier.g.rotation.y = walk >= 0 ? PI / 2 : -PI / 2;
  courier.g.position.y += busy ? Math.abs(Math.sin(simTime * 4)) * 0.018 : 0;
  courier.legs.forEach(
    (l, i) => (l.rotation.x = busy ? Math.sin(simTime * 4 + i * PI) * 0.3 : 0),
  );
  courier.arms[0].rotation.z = busy
    ? -0.1
    : -0.8 + Math.sin(simTime * 3) * 0.28;
  cart.position.set(2.7 + walk, 1.15, 0.18);
  wheels.forEach((w) => (w.rotation.y = busy ? simTime * 2 : 0));
  butterflies.forEach(({ g, wings }, i) => {
    const a = simTime * (0.34 + i * 0.008) + i * 2.41;
    g.position.set(
      -1.1 + Math.cos(a) * (1.6 + (i % 3) * 0.4),
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
    const a = simTime * 0.14 + (i * TAU) / 5;
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
