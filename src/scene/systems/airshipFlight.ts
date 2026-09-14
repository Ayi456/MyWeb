import * as T from "three";
import { CONFIG } from "../config";
import type { WorldObjects } from "../objects/createWorld";

export const dockPoint = new T.Vector3(5.65, 1.21, 0.17);
// Original three Bezier segments; acceleration is eased only at the dock.
export const routes = [
  new T.CubicBezierCurve3(
    dockPoint,
    new T.Vector3(8.4, 1.8, -1.7),
    new T.Vector3(8, 3.5, -6.3),
    new T.Vector3(2.4, 3.9, -7.5),
  ),
  new T.CubicBezierCurve3(
    new T.Vector3(2.4, 3.9, -7.5),
    new T.Vector3(-5, 4.2, -8),
    new T.Vector3(-8.6, 3.1, -5.4),
    new T.Vector3(-6.5, 2.25, 0.8),
  ),
  new T.CubicBezierCurve3(
    new T.Vector3(-6.5, 2.25, 0.8),
    new T.Vector3(-5.1, 2.1, 6.7),
    new T.Vector3(8.9, 1.9, 6),
    dockPoint,
  ),
];
export function sampleFlight(
  time: number,
  position = new T.Vector3(),
  tangent = new T.Vector3(),
) {
  const f =
    ((time % CONFIG.flightDuration) + CONFIG.flightDuration) %
    CONFIG.flightDuration;
  let journey: string;
  if (f < 11) {
    position.copy(dockPoint);
    tangent.set(-1, 0, 0);
    journey = "飞艇正在等一封信。";
  } else if (f < 31) {
    const t = (f - 11) / 20,
      u = t * t * (2 - t);
    routes[0].getPoint(u, position);
    routes[0].getTangent(u, tangent);
    journey = "一封心意，正飞向远方。";
  } else if (f < 49) {
    const t = (f - 31) / 18;
    routes[1].getPoint(t, position);
    routes[1].getTangent(t, tangent);
    journey = "云海很大，春天很近。";
  } else {
    const t = (f - 49) / 27,
      u = t + t * t - t * t * t;
    routes[2].getPoint(u, position);
    routes[2].getTangent(u, tangent);
    journey = "下一站，樱花树下。";
  }
  return { position, tangent, journey, phase: f };
}
export class AirshipFlight {
  time: number = CONFIG.initialFlightTime;
  private yaw = Math.PI;
  private propellerAngle = 0;
  private position = new T.Vector3();
  private tangent = new T.Vector3();
  depart() {
    if (this.time % CONFIG.flightDuration < CONFIG.dockDuration)
      this.time += CONFIG.dockDuration - (this.time % CONFIG.flightDuration);
  }
  update(objects: WorldObjects, dt: number, simTime: number, wind: number) {
    this.time += dt;
    const state = sampleFlight(this.time, this.position, this.tangent);
    const { airship, propeller, banner, pilot } = objects;
    const desiredYaw = Math.atan2(-this.tangent.z, this.tangent.x);
    const deltaYaw = Math.atan2(
      Math.sin(desiredYaw - this.yaw),
      Math.cos(desiredYaw - this.yaw),
    );
    this.yaw += deltaYaw * (1 - Math.exp(-dt * 2.3));
    airship.position.copy(this.position);
    airship.position.y += Math.sin(simTime * 1.02) * (0.052 + wind * 0.035);
    airship.rotation.set(
      Math.sin(simTime * 0.85) * (0.012 + wind * 0.025),
      this.yaw,
      Math.sin(simTime * 0.65) * 0.023,
    );
    this.propellerAngle += dt * (state.phase < 11 ? 4.4 : 15);
    propeller.rotation.x = this.propellerAngle;
    banner.rotation.y = Math.sin(simTime * 3) * (0.12 + wind * 0.3);
    pilot.head.rotation.y = Math.sin(simTime * 0.55) * 0.22;
    return state;
  }
}
