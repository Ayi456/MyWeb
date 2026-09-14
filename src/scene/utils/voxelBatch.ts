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
/** Shared cube/material ownership belongs to the scene, not each batch. */
export class VoxelBatch {
  readonly cells: Cell[] = [];
  constructor(
    private parent: T.Object3D,
    private mat: T.Material,
    private cube: T.BoxGeometry,
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
    return m;
  }
}
