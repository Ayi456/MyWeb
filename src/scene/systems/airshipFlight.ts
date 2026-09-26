import * as T from "three";
import { CONFIG } from "../config";
import type { WorldObjects } from "../objects/createWorld";
import { FLIGHT_STOPS, LIGHTHOUSE_ISLAND } from "../worldLayout";

export const dockPoint = new T.Vector3(6.75, 1.21, 0.17);
export const lighthouseDockPoint = new T.Vector3(...LIGHTHOUSE_ISLAND.berth);
const westPoint = new T.Vector3(-14, 3, -4.1);
const southPoint = new T.Vector3(-1.2, 1.9, 8.8);
// The outbound leg docks at the beacon. The return passes behind the islands,
// around the garden and across the foreground, with clearance for the balloon.
export const routes = [
  new T.CubicBezierCurve3(
    dockPoint,
    new T.Vector3(11.7, 2, 0.17),
    new T.Vector3(15, 1.18, -11.9),
    lighthouseDockPoint,
  ),
  new T.CubicBezierCurve3(
    lighthouseDockPoint,
    new T.Vector3(16, 2.8, -20),
    new T.Vector3(-12, 3.4, -18),
    westPoint,
  ),
  new T.CubicBezierCurve3(
    westPoint,
    new T.Vector3(-15, 3, 4.5),
    new T.Vector3(-8, 2.1, 9.2),
    southPoint,
  ),
  new T.CubicBezierCurve3(
    southPoint,
    new T.Vector3(6, 1.9, 8.8),
    new T.Vector3(10.3, 1.21, 0.17),
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
  if (f < FLIGHT_STOPS.departure) {
    position.copy(dockPoint);
    tangent.set(-1, 0, 0);
    journey = "飞艇正在等一封信。";
  } else if (f < FLIGHT_STOPS.lighthouseArrival) {
    const t =
        (f - FLIGHT_STOPS.departure) /
        (FLIGHT_STOPS.lighthouseArrival - FLIGHT_STOPS.departure),
      u = t * t * (3 - 2 * t);
    routes[0].getPoint(u, position);
    routes[0].getTangent(u, tangent);
    journey = "一封心意，正飞向灯塔。";
  } else if (f < FLIGHT_STOPS.lighthouseDeparture) {
    position.copy(lighthouseDockPoint);
    tangent.set(-1, 0, 0);
    journey = "灯塔小站，收到了春天。";
  } else if (f < FLIGHT_STOPS.westTurn) {
    const t =
        (f - FLIGHT_STOPS.lighthouseDeparture) /
        (FLIGHT_STOPS.westTurn - FLIGHT_STOPS.lighthouseDeparture),
      u = t * t * (2 - t);
    routes[1].getPoint(u, position);
    routes[1].getTangent(u, tangent);
    journey = "带上远方的问候，穿过云海。";
  } else if (f < FLIGHT_STOPS.southTurn) {
    const t =
      (f - FLIGHT_STOPS.westTurn) /
      (FLIGHT_STOPS.southTurn - FLIGHT_STOPS.westTurn);
    routes[2].getPoint(t, position);
    routes[2].getTangent(t, tangent);
    journey = "风车转过一圈，花园又近了。";
  } else {
    const t =
        (f - FLIGHT_STOPS.southTurn) /
        (CONFIG.flightDuration - FLIGHT_STOPS.southTurn),
      u = t + t * t - t * t * t;
    routes[3].getPoint(u, position);
    routes[3].getTangent(u, tangent);
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
    const moored =
      state.phase < CONFIG.dockDuration ||
      (state.phase >= FLIGHT_STOPS.lighthouseArrival &&
        state.phase < FLIGHT_STOPS.lighthouseDeparture);
    this.propellerAngle += dt * (moored ? 4.4 : 15);
    propeller.rotation.x = this.propellerAngle;
    banner.rotation.y = Math.sin(simTime * 3) * (0.12 + wind * 0.3);
    pilot.head.rotation.y = Math.sin(simTime * 0.55) * 0.22;
    return state;
  }
}
