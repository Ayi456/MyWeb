import * as T from "three";

type Cell = [
  number,
  number,
  number,
  number,
  number,
  number,
  T.ColorRepresentation,
  number,
  number,
  number,
];
/** Four colours (spring, summer, autumn, winter) and optional per-season scale. */
export type SeasonalCell = {
  colors: readonly T.ColorRepresentation[];
  scales?: readonly number[];
};
/** Per-instance seasonal palette data, packed for cheap CPU blending. */
export interface SeasonalData {
  mesh: T.InstancedMesh;
  /** n × 4 seasons × rgb (linear). */
  colors: Float32Array;
  /** n × 4 seasons; undefined when every instance keeps scale 1. */
  scales?: Float32Array;
  /** Copy of the built instance matrices, used as the scale baseline. */
  base?: Float32Array;
}
/** Shared geometry/material ownership belongs to the scene, not each batch. */
export class VoxelBatch {
  readonly cells: Cell[] = [];
  private seasonal = new Map<number, SeasonalCell>();
  /** Set by the scene context so seasonal batches register themselves. */
  onSeasonal?: (data: SeasonalData) => void;
  constructor(
    private parent: T.Object3D,
    private mat: T.Material,
    private cube: T.BufferGeometry,
  ) {}
  add(
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    c: T.ColorRepresentation,
    rx = 0,
    ry = 0,
    rz = 0,
  ) {
    this.cells.push([x, y, z, sx, sy, sz, c, rx, ry, rz]);
    return this;
  }
  /** A voxel whose colour (and optionally size) follows the season. */
  addSeasonal(
    x: number,
    y: number,
    z: number,
    sx: number,
    sy: number,
    sz: number,
    seasonal: SeasonalCell,
    rx = 0,
    ry = 0,
    rz = 0,
  ) {
    this.seasonal.set(this.cells.length, seasonal);
    return this.add(x, y, z, sx, sy, sz, seasonal.colors[0], rx, ry, rz);
  }
  build(cast = true) {
    const m = new T.InstancedMesh(this.cube, this.mat, this.cells.length);
    const dummy = new T.Object3D(),
      color = new T.Color();
    this.cells.forEach((v, i) => {
      dummy.position.set(v[0], v[1], v[2]);
      dummy.scale.set(v[3], v[4], v[5]);
      dummy.rotation.set(v[7], v[8], v[9]);
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, color.set(v[6]));
    });
    m.castShadow = cast;
    m.receiveShadow = true;
    // Some batches receive GPU displacement. Their explicit no-cull policy avoids popping.
    m.frustumCulled = false;
    this.parent.add(m);
    if (this.seasonal.size && this.onSeasonal) this.onSeasonal(this.pack(m));
    return m;
  }
  private pack(mesh: T.InstancedMesh): SeasonalData {
    const n = this.cells.length,
      colors = new Float32Array(n * 12),
      color = new T.Color();
    let scales: Float32Array | undefined;
    for (let i = 0; i < n; i++) {
      const entry = this.seasonal.get(i);
      for (let k = 0; k < 4; k++) {
        color.set(entry ? entry.colors[k] : this.cells[i][6]);
        colors.set([color.r, color.g, color.b], i * 12 + k * 3);
        const s = entry?.scales?.[k] ?? 1;
        if (s !== 1 && !scales) scales = new Float32Array(n * 4).fill(1);
        if (scales) scales[i * 4 + k] = s;
      }
    }
    return {
      mesh,
      colors,
      scales,
      base: scales ? Float32Array.from(mesh.instanceMatrix.array) : undefined,
    };
  }
}
