import { expect, it } from "vitest";
import * as T from "three";
import { createContext } from "../src/scene/core/context";
import { createIsland } from "../src/scene/objects/island";
import { IslandWalker, WALK_START } from "../src/scene/systems/walking";
import { parseSceneLink, buildSceneLink } from "../src/content/sceneLink";
import type { SceneSnapshot } from "../src/scene/types";
function map() {
  const ctx = createContext();
  return { ctx, ...createIsland(ctx) };
}
it("reads heights from the actual grass cubes, including uneven terrain", () => {
  const o = map(),
    walker = new IslandWalker(o.walkTiles, []);
  const grass = o.ctx.world.children[1] as T.InstancedMesh;
  const matrix = new T.Matrix4();
  for (const tile of o.walkTiles.filter((_, i) => i % 17 === 0)) {
    let found = false;
    for (let i = 0; i < grass.count; i++) {
      grass.getMatrixAt(i, matrix);
      if (
        Math.abs(matrix.elements[12] - tile.x) < 0.001 &&
        Math.abs(matrix.elements[14] - tile.z) < 0.001 &&
        Math.abs(matrix.elements[5] - 0.14) < 0.001
      ) {
        expect(walker.height(tile.x, tile.z)).toBeCloseTo(
          matrix.elements[13] + matrix.elements[5] / 2,
          5,
        );
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  }
});
it("cannot walk off any island edge even after sustained or diagonal input", () => {
  const walker = new IslandWalker(map().walkTiles, []);
  for (const direction of ["forward", "back", "left", "right"] as const) {
    walker.reset();
    walker.input(direction, true);
    for (let i = 0; i < 600; i++) {
      walker.update(0.05);
      expect(walker.canStand(walker.view.x, walker.view.z)).toBe(true);
    }
    const stopped = { ...walker.view };
    walker.update(1);
    expect(walker.view).toEqual(stopped);
  }
});
it("blocks walls and slides along them; clear and zero time stop movement", () => {
  const walker = new IslandWalker(map().walkTiles, [
    { minX: -0.5, maxX: 0.5, minZ: 0.3, maxZ: 0.5, minY: 1, maxY: 3 },
  ]);
  walker.input("forward", true);
  for (let i = 0; i < 200; i++) walker.update(0.05);
  expect(walker.view.z).toBeGreaterThan(0.63);
  walker.input("right", true);
  for (let i = 0; i < 12; i++) walker.update(0.05);
  expect(walker.view.x).toBeGreaterThan(0.3);
  const stopped = { ...walker.view };
  walker.update(0);
  walker.clear();
  walker.update(0.05);
  expect(walker.view).toEqual(stopped);
  walker.reset({ x: 0, z: 0.4, yaw: 0, pitch: 0 });
  expect(walker.view).toEqual(WALK_START);
});
it("normalizes diagonal speed and clamps long frame intervals and look pitch", () => {
  const tiles = map().walkTiles,
    a = new IslandWalker(tiles, []),
    b = new IslandWalker(tiles, []);
  a.input("forward", true);
  b.input("forward", true);
  b.input("right", true);
  a.update(0.05);
  b.update(200);
  const distance = (w: IslandWalker) =>
    Math.hypot(w.view.x - WALK_START.x, w.view.z - WALK_START.z);
  expect(distance(a)).toBeCloseTo(distance(b));
  b.look(10000, 10000);
  expect(Math.abs(b.view.yaw)).toBeLessThanOrEqual(Math.PI);
  expect(b.view.pitch).toBe(-0.8);
});
it("shares only finite walking coordinates; classic and invalid links ignore walking", () => {
  const snapshot = {
    hour: 12,
    season: "spring",
    walkView: WALK_START,
    event: null,
  } as SceneSnapshot;
  const url = buildSceneLink(
    "https://example.com/?letter=secret#secret",
    snapshot,
  );
  expect(url).not.toContain("secret");
  expect(url).not.toContain("cam=");
  expect(parseSceneLink(new URL(url).search).walkView).toEqual(WALK_START);
  for (const query of [
    "?walk=Infinity,0,0,0",
    "?walk=40,0,0,0",
    "?walk=0,0,0",
    "?walk=0,0,0,2",
    "?classic=1&walk=0,0,0,0",
  ])
    expect(parseSceneLink(query).walkView).toBeNull();
});
