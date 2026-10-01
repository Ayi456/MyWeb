import * as T from "three";

/**
 * Creates an enhanced material with procedural normal mapping
 * for subtle surface detail on voxel geometry.
 *
 * The normal map adds micro-variations that catch light differently,
 * giving flat voxel surfaces a hand-crafted, slightly irregular feel
 * without adding geometry complexity.
 */
export function createEnhancedMaterial(
  color: string | number,
  roughness = 0.94,
  normalStrength = 0.15,
) {
  // Generate procedural normal map for subtle surface variation
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(size, size);

  // Fill with noise-based normals
  for (let i = 0; i < size * size * 4; i += 4) {
    const noise = Math.random() * 20 + 117; // 127 ± 10
    imageData.data[i] = noise; // R (normal.x)
    imageData.data[i + 1] = noise; // G (normal.y)
    imageData.data[i + 2] = 255; // B (normal.z, pointing up)
    imageData.data[i + 3] = 255; // A
  }
  ctx.putImageData(imageData, 0, 0);

  const normalMap = new T.CanvasTexture(canvas);
  normalMap.wrapS = normalMap.wrapT = T.RepeatWrapping;
  normalMap.repeat.set(4, 4); // Tile for more detail variation

  return new T.MeshStandardMaterial({
    color,
    roughness,
    normalMap,
    normalScale: new T.Vector2(normalStrength, normalStrength),
  });
}

/**
 * Creates a material with animated emissive intensity
 * for glowing elements like windows and lamps.
 */
export function createGlowMaterial(
  color: string | number,
  emissiveColor: string | number,
  emissiveIntensity = 0.8,
) {
  return new T.MeshStandardMaterial({
    color,
    emissive: emissiveColor,
    emissiveIntensity,
    roughness: 0.85,
  });
}
