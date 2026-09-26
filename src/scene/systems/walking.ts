import * as T from "three";
import type { WalkView, WalkDirection } from "../types";
import type { WorldObjects } from "../objects/createWorld";

export interface WalkTile {
  x: number;
  z: number;
  y: number;
}
export interface WalkObstacle {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  minY: number;
  maxY: number;
}
export const WALK_START: WalkView = { x: 0.1, z: 1.65, yaw: 0, pitch: 0 };
const RADIUS = 0.13,
  EYE = 0.72;

/** Static voxel bounds are captured once; animated leaves above rabbit height do not block paths. */
export function walkingObstacles(o: WorldObjects): WalkObstacle[] {
  const result: WalkObstacle[] = [],
    matrix = new T.Matrix4();
  for (const root of [
    o.house,
    o.tree,
    o.bench,
    o.swing,
    o.mailbox,
    o.fenceMesh,
  ]) {
    root.updateWorldMatrix(true, true);
    root.traverse((node) => {
      if (!(node instanceof T.InstancedMesh)) return;
      for (let i = 0; i < node.count; i++) {
        node.getMatrixAt(i, matrix);
        matrix.premultiply(node.matrixWorld);
        const box = new T.Box3(
          new T.Vector3(-0.5, -0.5, -0.5),
          new T.Vector3(0.5, 0.5, 0.5),
        ).applyMatrix4(matrix);
        if (box.min.y > 2.3 || box.max.y < 1.1) continue;
        result.push({
          minX: box.min.x,
          maxX: box.max.x,
          minZ: box.min.z,
          maxZ: box.max.z,
          minY: box.min.y,
          maxY: box.max.y,
        });
      }
    });
  }
  // The water and spillway have no safe walking surface, including when frozen.
  result.push({
    minX: -3.75,
    maxX: -2.06,
    minZ: 0.83,
    maxZ: 2.05,
    minY: 0,
    maxY: 3,
  });
  return result;
}

export class IslandWalker {
  private tiles = new Map<string, WalkTile>();
  private held = new Set<WalkDirection>();
  view: WalkView = { ...WALK_START };
  constructor(
    tiles: WalkTile[],
    private obstacles: WalkObstacle[],
  ) {
    for (const tile of tiles) this.tiles.set(this.key(tile.x, tile.z), tile);
  }
  private key(x: number, z: number) {
    return `${Math.round((x + 4.1) / 0.29)},${Math.round((z + 3.04) / 0.29)}`;
  }
  height(x: number, z: number): number | null {
    if (!Number.isFinite(x) || !Number.isFinite(z)) return null;
    const tile = this.tiles.get(this.key(x, z));
    return tile &&
      Math.abs(tile.x - x) <= 0.148 &&
      Math.abs(tile.z - z) <= 0.148
      ? tile.y
      : null;
  }
  canStand(x: number, z: number) {
    const y = this.height(x, z);
    if (y === null) return false;
    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      if (
        this.height(
          x + Math.cos(angle) * RADIUS,
          z + Math.sin(angle) * RADIUS,
        ) === null
      )
        return false;
    }
    return !this.obstacles.some(
      (b) =>
        b.maxY > y + 0.08 &&
        b.minY < y + 0.95 &&
        x + RADIUS > b.minX &&
        x - RADIUS < b.maxX &&
        z + RADIUS > b.minZ &&
        z - RADIUS < b.maxZ,
    );
  }
  reset(view: WalkView = WALK_START) {
    this.clear();
    this.view =
      this.canStand(view.x, view.z) &&
      Object.values(view).every(Number.isFinite)
        ? {
            ...view,
            yaw: Math.atan2(Math.sin(view.yaw), Math.cos(view.yaw)),
            pitch: Math.max(-0.8, Math.min(0.8, view.pitch)),
          }
        : { ...WALK_START };
  }
  input(direction: WalkDirection, on: boolean) {
    if (on) this.held.add(direction);
    else this.held.delete(direction);
  }
  clear() {
    this.held.clear();
  }
  look(dx: number, dy: number) {
    this.view.yaw = Math.atan2(
      Math.sin(this.view.yaw - dx * 0.004),
      Math.cos(this.view.yaw - dx * 0.004),
    );
    this.view.pitch = Math.max(
      -0.8,
      Math.min(0.8, this.view.pitch - dy * 0.004),
    );
  }
  update(dt: number) {
    if (!Number.isFinite(dt) || dt <= 0) return;
    const forward =
      Number(this.held.has("forward")) - Number(this.held.has("back"));
    const side = Number(this.held.has("right")) - Number(this.held.has("left"));
    const length = Math.hypot(forward, side);
    if (!length) return;
    const distance = (Math.min(dt, 0.05) * 1.1) / length;
    const dx =
      (Math.sin(this.view.yaw) * forward + Math.cos(this.view.yaw) * side) *
      distance;
    const dz =
      (-Math.cos(this.view.yaw) * forward + Math.sin(this.view.yaw) * side) *
      distance;
    if (this.canStand(this.view.x + dx, this.view.z)) this.view.x += dx;
    if (this.canStand(this.view.x, this.view.z + dz)) this.view.z += dz;
  }
  get eye(): [number, number, number] {
    return [
      this.view.x,
      (this.height(this.view.x, this.view.z) ?? 1.1) + EYE,
      this.view.z,
    ];
  }
}
