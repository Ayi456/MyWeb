import { describe, expect, it } from "vitest";
import { createContext } from "../src/scene/core/context";
import { createBunny } from "../src/scene/objects/bunny";
import {
  courierPose,
  updateBunnyMotion,
} from "../src/scene/systems/bunnyMotion";

describe("courier dock motion", () => {
  it("faces the direction of travel and stops its stride for turns", () => {
    expect(courierPose(2).x).toBeLessThan(courierPose(3).x);
    expect(courierPose(2).yaw).toBe(Math.PI);
    expect(courierPose(9).x).toBeGreaterThan(courierPose(10).x);
    expect(courierPose(9).yaw).toBe(0);
    for (const t of [5, 6, 12, 13])
      expect(courierPose(t).stride).toBeCloseTo(0);
  });

  it("keeps positions and heading continuous at each phase boundary", () => {
    for (const t of [5, 7, 12, 14, 28]) {
      const before = courierPose(t - 0.0001);
      const after = courierPose(t + 0.0001);
      expect(Math.abs(before.x - after.x)).toBeLessThan(0.00001);
      expect(Math.abs(before.yaw - after.yaw)).toBeLessThan(0.00001);
      expect(Math.abs(before.wheel - after.wheel)).toBeLessThan(0.00001);
    }
  });

  it("ties wheel roll to distance, not elapsed time during a stopped turn", () => {
    expect(courierPose(6).wheel).toBe(courierPose(5).wheel);
    expect(courierPose(13).wheel).toBe(courierPose(12).wheel);
    expect(courierPose(3).wheel - courierPose(2).wheel).toBeCloseTo(
      (courierPose(3).x - courierPose(2).x) / 0.08,
    );
    expect(courierPose(10).wheel - courierPose(9).wheel).toBeCloseTo(
      (courierPose(9).x - courierPose(10).x) / 0.08,
    );
  });

  it("keeps the bunny and cart within the dock through a full cycle", () => {
    for (let time = 0; time <= 28; time += 0.05) {
      const { x, yaw } = courierPose(time);
      const dx = Math.cos(yaw) * 0.27;
      const dz = -Math.sin(yaw) * 0.27;
      // Cart body and wheels, after its 0.8 scale.
      const halfX =
        Math.abs(Math.cos(yaw)) * 0.24 + Math.abs(Math.sin(yaw)) * 0.22;
      const halfZ =
        Math.abs(Math.sin(yaw)) * 0.24 + Math.abs(Math.cos(yaw)) * 0.22;
      expect(x - dx - halfX).toBeGreaterThan(3.768);
      expect(x - dx + halfX).toBeLessThan(6.02);
      expect(0.17 - dz - halfZ).toBeGreaterThan(-0.43);
      expect(0.17 - dz + halfZ).toBeLessThan(0.77);
      expect(Math.abs(dz) + 0.18).toBeLessThan(0.5);
      expect(x + dx - 0.18).toBeGreaterThan(3.768);
      expect(x + dx + 0.18).toBeLessThan(6.02);
    }
  });

  it("uses an absolute, still pose for reduced motion and repeated frames", () => {
    const initial = courierPose(0, true);
    for (const t of [0, 4.2, 7.5, 29, 1000]) {
      expect(courierPose(t, true)).toEqual(initial);
      expect(courierPose(t)).toEqual(courierPose(t));
    }
  });
});

describe("bunny face motion", () => {
  it("blinks and twitches without accumulating transforms", () => {
    const ctx = createContext();
    const bunny = createBunny(ctx)(ctx.world, 0, 0, 0, undefined, 1, "writer");
    updateBunnyMotion(bunny, 4.22, false);
    expect(bunny.eyes.scale.y).toBeCloseTo(0.08);
    updateBunnyMotion(bunny, 7.6, false);
    const rotation = bunny.ears[0].rotation.toArray();
    updateBunnyMotion(bunny, 7.6, false);
    expect(bunny.ears[0].rotation.toArray()).toEqual(rotation);
    updateBunnyMotion(bunny, 4.22, true);
    expect(bunny.eyes.scale.y).toBe(1);
    expect(bunny.ears[0].rotation.z).toBe(0.22);
    expect(bunny.ears[1].rotation.z).toBe(-0.14);
  });
});
