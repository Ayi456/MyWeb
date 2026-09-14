export function seededRandom(initialSeed: number) {
  let seed = initialSeed >>> 0;
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
export function hash(x: number, z: number) {
  const q = Math.sin(x * 127.1 + z * 311.7) * 43758.5453;
  return q - Math.floor(q);
}
