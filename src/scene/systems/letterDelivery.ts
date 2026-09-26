import * as T from "three";
import { CONFIG } from "../config";
import type { SceneContext } from "../core/context";
import { createEnvelope } from "../objects/envelope";
import { MAIN_MAILBOX } from "../worldLayout";

export class DeliveryProgress {
  age = 0;
  get progress() {
    return Math.min(1, this.age / CONFIG.letterDuration);
  }
  get delivered() {
    return this.progress >= 1;
  }
  advance(dt: number) {
    this.age += Math.max(0, dt);
    return this.progress;
  }
}
// Per-envelope instance buffers and lines are private; cube and matte remain scene-owned.
function releaseEnvelope(g: T.Group) {
  g.removeFromParent();
  g.traverse((o) => {
    if (o instanceof T.InstancedMesh) o.dispose();
    if (o instanceof T.Line) {
      o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => m.dispose());
    }
  });
}
export function createLetterDelivery(
  ctx: SceneContext,
  onDelivered: () => void,
) {
  const makeEnvelope = createEnvelope(ctx);
  const flights: { g: T.Group; clock: DeliveryProgress }[] = [];
  const start = new T.Vector3(
      MAIN_MAILBOX.x,
      ctx.ground(MAIN_MAILBOX.x, MAIN_MAILBOX.z) + 0.98,
      MAIN_MAILBOX.z + 0.22,
    ),
    target = new T.Vector3();
  let sentCount = 0,
    deliveredCount = 0;
  return {
    get sentCount() {
      return sentCount;
    },
    get deliveredCount() {
      return deliveredCount;
    },
    get count() {
      return flights.length;
    },
    send(message: string) {
      if (
        !message.trim() ||
        Array.from(message).length > 80 ||
        flights.length >= CONFIG.maxLettersInFlight
      )
        return false;
      // Deliberately keep no message history, analytics, network requests or persistent storage.
      const g = makeEnvelope();
      g.position.copy(start);
      ctx.world.add(g);
      flights.push({ g, clock: new DeliveryProgress() });
      sentCount++;
      return true;
    },
    update(dt: number, ship: T.Group) {
      for (let i = flights.length - 1; i >= 0; i--) {
        const l = flights[i],
          t = l.clock.advance(dt),
          e = t * t * (3 - 2 * t);
        target.copy(ship.position).add(new T.Vector3(0, 0.7, 0.45));
        l.g.position.copy(start).lerp(target, e);
        l.g.position.y += Math.sin(t * Math.PI) * 2;
        l.g.rotation.set(
          Math.sin(t * 8) * 0.2,
          t * Math.PI * 2 * 0.6,
          Math.sin(t * 6) * 0.35,
        );
        l.g.scale.setScalar(0.7 + Math.sin(t * Math.PI) * 0.4);
        if (l.clock.delivered) {
          releaseEnvelope(l.g);
          flights.splice(i, 1);
          deliveredCount++;
          onDelivered();
        }
      }
    },
    dispose() {
      flights.forEach(({ g }) => releaseEnvelope(g));
      flights.length = 0;
    },
  };
}
