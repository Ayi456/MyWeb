import * as T from "three";
import { type Point3, TAU } from "../core/context";
import { seededRandom } from "../utils/seededRandom";

/** Bark pixels are deterministic and need no canvas or external image asset. */
export function createBarkTexture() {
  const width = 128,
    height = 256;
  const pixels = new Uint8Array(width * height * 4);
  const random = seededRandom(74832);
  const scars = Array.from({ length: 64 }, () => ({
    x: random() * width,
    y: random() * height,
    length: 4 + random() * 24,
    thickness: 0.5 + random() * 1.2,
  }));
  for (let y = 0; y < height; y++) {
    const grainBend = Math.sin(y * 0.048) * 1.2;
    const seamBend = Math.sin(y * 0.023) * 0.9;
    // A scar touches only a few rows. Preserve scar order and shading while
    // avoiding a full 64-scar scan for every pixel.
    const rowScars = scars
      .filter((scar) => Math.abs(y - scar.y) < scar.thickness + 1)
      .map((scar) => ({
        ...scar,
        inside: Math.abs(y - scar.y) < scar.thickness,
      }));
    for (let x = 0; x < width; x++) {
      const grain =
        Math.sin(x * 0.63 + grainBend) * 5 + Math.sin(x * 1.8 + y * 0.04) * 2;
      const seam =
        Math.pow(Math.max(0, Math.cos(x * 0.26 + seamBend)), 22) * 17;
      let shade = grain - seam + (random() - 0.5) * 13;
      for (const scar of rowScars) {
        const dx = Math.abs(x - scar.x);
        if (dx >= scar.length) continue;
        if (scar.inside) shade += 31 * (1 - dx / scar.length);
        else shade -= 13;
      }
      const offset = (y * width + x) * 4;
      pixels[offset] = 111 + shade;
      pixels[offset + 1] = 89 + shade;
      pixels[offset + 2] = 80 + shade;
      pixels[offset + 3] = 255;
    }
  }
  const texture = new T.DataTexture(pixels, width, height);
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.magFilter = T.LinearFilter;
  texture.minFilter = T.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.needsUpdate = true;
  return texture;
}

export function taperedBranch(points: Point3[], start: number, end: number) {
  const curve = new T.CatmullRomCurve3(
    points.map((point) => new T.Vector3(...point)),
  );
  const length = curve.getLength();
  const segments = Math.max(3, Math.ceil(length * 8));
  const sides = start > 0.075 ? 9 : 5;
  const geometry = new T.TubeGeometry(curve, segments, 1, sides, false);
  const position = geometry.getAttribute("position"),
    uv = geometry.getAttribute("uv");
  const colors = new Float32Array(position.count * 3);
  const vertex = new T.Vector3(),
    center = new T.Vector3();
  // TubeGeometry stores each cross-section consecutively. All its vertices
  // share the same curve sample and taper.
  for (let ring = 0; ring < position.count; ring += sides + 1) {
    const t = uv.getX(ring);
    curve.getPointAt(t, center);
    const taper = T.MathUtils.lerp(start, end, Math.pow(t, 0.8));
    for (let i = ring; i <= ring + sides; i++) {
      const around = uv.getY(i);
      const radius = taper * (1 + Math.sin(around * TAU * 3 + t * 4) * 0.055);
      vertex
        .fromBufferAttribute(position, i)
        .sub(center)
        .multiplyScalar(radius)
        .add(center);
      position.setXYZ(i, vertex.x, vertex.y, vertex.z);
      uv.setXY(i, around, t * length * 1.9);
      const shade = 0.86 + Math.sin(around * TAU + 0.7) * 0.1;
      colors.set([shade, shade, shade], i * 3);
    }
  }
  geometry.setAttribute("color", new T.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

type GeometryData = { positions: number[]; colors: number[] };
function triangle(
  data: GeometryData,
  a: T.Vector3,
  b: T.Vector3,
  c: T.Vector3,
  shade: number,
) {
  for (const vertex of [a, b, c]) {
    data.positions.push(vertex.x, vertex.y, vertex.z);
    data.colors.push(shade, shade, shade);
  }
}
function finish(data: GeometryData) {
  const geometry = new T.BufferGeometry();
  geometry.setAttribute(
    "position",
    new T.Float32BufferAttribute(data.positions, 3),
  );
  geometry.setAttribute("color", new T.Float32BufferAttribute(data.colors, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** A branch spray of cupped, five-petal flowers in one instanced draw. */
export function createBlossomSpray() {
  const random = seededRandom(39258);
  const data: GeometryData = { positions: [], colors: [] };
  const flowerCount = 52;
  for (let flower = 0; flower < flowerCount; flower++) {
    const azimuth = flower * 2.399963,
      h = 1 - (2 * (flower + 0.5)) / flowerCount;
    const radius = Math.sqrt(1 - h * h) * (0.32 + random() * 0.17);
    const center = new T.Vector3(
      Math.cos(azimuth) * radius,
      h * 0.24,
      Math.sin(azimuth) * radius,
    );
    const rotation = new T.Quaternion().setFromUnitVectors(
      new T.Vector3(0, 0, 1),
      new T.Vector3(
        Math.cos(azimuth) * 0.62,
        0.65 + random() * 0.6,
        Math.sin(azimuth) * 0.62,
      ).normalize(),
    );
    const size = 0.057 + random() * 0.027;
    for (let petal = 0; petal < 5; petal++) {
      const angle = (petal * TAU) / 5 + azimuth;
      const point = (radial: number, sideways: number, cup: number) =>
        new T.Vector3(
          Math.cos(angle) * radial - Math.sin(angle) * sideways,
          Math.sin(angle) * radial + Math.cos(angle) * sideways,
          cup,
        )
          .applyQuaternion(rotation)
          .add(center);
      const root = point(size * 0.1, 0, -size * 0.14);
      const rim = [
        point(size * 0.35, -size * 0.27, 0),
        point(size * 0.77, -size * 0.37, size * 0.15),
        point(size, -size * 0.16, size * 0.23),
        point(size * 0.92, 0, size * 0.2),
        point(size, size * 0.16, size * 0.23),
        point(size * 0.77, size * 0.37, size * 0.15),
        point(size * 0.35, size * 0.27, 0),
      ];
      for (let i = 0; i < rim.length - 1; i++)
        triangle(data, root, rim[i], rim[i + 1], 0.83 + random() * 0.17);
    }
    const centerRadius = size * 0.14;
    for (let i = 0; i < 5; i++) {
      const a = (i * TAU) / 5,
        b = ((i + 1) * TAU) / 5;
      const offset = (angle: number) =>
        new T.Vector3(
          Math.cos(angle) * centerRadius,
          Math.sin(angle) * centerRadius,
          0.002,
        )
          .applyQuaternion(rotation)
          .add(center);
      triangle(data, center, offset(a), offset(b), 0.59);
    }
  }
  return finish(data);
}

/** Folded oval leaves with a central ridge give summer a leafy silhouette. */
export function createLeafSpray() {
  const random = seededRandom(67312);
  const data: GeometryData = { positions: [], colors: [] };
  const leafCount = 64;
  for (let i = 0; i < leafCount; i++) {
    const angle = i * 2.399963,
      height = 1 - (2 * (i + 0.5)) / leafCount;
    const radial = Math.sqrt(1 - height * height) * (0.3 + random() * 0.15);
    const center = new T.Vector3(
      Math.cos(angle) * radial,
      height * 0.26,
      Math.sin(angle) * radial,
    );
    const q = new T.Quaternion().setFromEuler(
      new T.Euler(random() * 1.1 - 0.4, angle, random() * 0.5 - 0.25),
    );
    const length = 0.12 + random() * 0.09,
      width = length * 0.33;
    const point = (x: number, y: number, z: number) =>
      new T.Vector3(x, y, z).applyQuaternion(q).add(center);
    for (let segment = 0; segment < 4; segment++) {
      const a = segment / 4,
        b = (segment + 1) / 4;
      const ridgeA = point(
        (a - 0.5) * length,
        Math.sin(a * Math.PI) * 0.014,
        0,
      );
      const ridgeB = point(
        (b - 0.5) * length,
        Math.sin(b * Math.PI) * 0.014,
        0,
      );
      for (const side of [-1, 1]) {
        const edgeA = point(
          (a - 0.5) * length,
          0,
          Math.sin(a * Math.PI) * width * side,
        );
        const edgeB = point(
          (b - 0.5) * length,
          0,
          Math.sin(b * Math.PI) * width * side,
        );
        triangle(data, ridgeA, edgeA, edgeB, side < 0 ? 0.84 : 1);
        triangle(data, ridgeA, edgeB, ridgeB, side < 0 ? 0.84 : 1);
      }
    }
  }
  return finish(data);
}
