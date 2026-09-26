import { expect, it } from "vitest";
import * as T from "three";
import { ROPEWAY } from "../src/scene/worldLayout";
import { sampleRopeway, ropewayPoint } from "../src/scene/systems/ropeway";
import { createContext } from "../src/scene/core/context";
import { createDepot } from "../src/scene/objects/depot";

it("stops at both stations and smoothly returns along the sagging cable", () => {
  for (const t of [0, 2, 5.9, 44, 88])
    expect(sampleRopeway(t).position).toEqual([...ROPEWAY.start]);
  for (const t of [22, 24, 27.9])
    expect(sampleRopeway(t).position).toEqual([...ROPEWAY.end]);
  expect(sampleRopeway(14).position).toEqual(sampleRopeway(36).position);
  expect(ropewayPoint(0.5)[1]).toBeCloseTo(
    (ROPEWAY.start[1] + ROPEWAY.end[1]) / 2 - 0.4,
  );
  for (const t of [6, 22, 28, 44]) {
    const a = sampleRopeway(t - 0.001).position,
      b = sampleRopeway(t + 0.001).position;
    expect(Math.hypot(...a.map((v, i) => v - b[i]))).toBeLessThan(0.000001);
  }
});
it("builds a compact depot with shared furniture geometry without consuming the main random sequence", () => {
  const ctx = createContext(),
    reference = createContext();
  const depot = createDepot(ctx);
  expect(ctx.rand()).toBe(reference.rand());
  let batches = 0,
    lines = 0;
  ctx.world.traverse((node) => {
    if (node instanceof T.InstancedMesh) {
      batches++;
      expect(node.castShadow).toBe(false);
      expect(node.geometry).toBe(ctx.softCube);
    }
    if (node instanceof T.Line) lines++;
  });
  expect(batches).toBeLessThanOrEqual(5);
  expect(lines).toBe(2);
  expect(depot.cablecar.position.toArray()).toEqual([...ROPEWAY.start]);
});
