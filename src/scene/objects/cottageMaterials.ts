import * as T from "three";

type Surface = "plaster" | "wood" | "terracotta" | "stone";

/** Small deterministic surface maps, generated once and owned by the scene. */
export function cottageMaterial(surface: Surface) {
  const size = 128;
  const pixels = new Uint8Array(size * size * 4);
  const heights = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 2;
      const v = (y / size) * Math.PI * 2;
      const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
      const grain = (n - Math.floor(n)) * 2 - 1;
      const mottling =
        Math.sin(u * 3 + Math.sin(v * 2)) * 0.5 +
        Math.cos(v * 5 - Math.cos(u * 2)) * 0.25;
      const veins = Math.sin(u * 19 + Math.sin(v * 2) * 1.3 + Math.sin(u * 3));
      const detail =
        surface === "wood"
          ? veins * 0.52 + grain * 0.16 + mottling * 0.3
          : mottling * 0.5 + grain * (surface === "plaster" ? 0.35 : 0.22);
      const index = (y * size + x) * 4;
      const shade = Math.round(242 + detail * 12);
      const height = Math.round(128 + detail * 62);
      pixels.set([shade, shade, shade, 255], index);
      heights.set([height, height, height, 255], index);
    }
  }
  const map = new T.DataTexture(pixels, size, size);
  const bumpMap = new T.DataTexture(heights, size, size);
  for (const texture of [map, bumpMap]) {
    texture.wrapS = texture.wrapT = T.RepeatWrapping;
    texture.magFilter = T.LinearFilter;
    texture.minFilter = T.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.anisotropy = 4;
    texture.needsUpdate = true;
  }
  map.colorSpace = T.SRGBColorSpace;
  return new T.MeshStandardMaterial({
    map,
    bumpMap,
    bumpScale: surface === "wood" ? 0.006 : 0.012,
    roughness: surface === "terracotta" ? 0.83 : 0.94,
    metalness: 0,
  });
}

/** Closed curved tile, with its long axis along x and an actual thin edge. */
export function curvedRoofTile() {
  const section = new T.Shape();
  for (let i = 0; i <= 8; i++) {
    const z = i / 8 - 0.5;
    const y = Math.cos(z * Math.PI) * 0.13;
    if (i === 0) section.moveTo(z, y);
    else section.lineTo(z, y);
  }
  for (let i = 8; i >= 0; i--) {
    const z = i / 8 - 0.5;
    section.lineTo(z, Math.cos(z * Math.PI) * 0.13 - 0.035);
  }
  section.closePath();
  const geometry = new T.ExtrudeGeometry(section, {
    depth: 1,
    bevelEnabled: false,
    steps: 1,
  });
  geometry.rotateY(Math.PI / 2);
  geometry.translate(-0.5, 0, 0);
  return geometry;
}
