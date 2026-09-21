import type { SeasonalCell } from "../utils/voxelBatch";

/** Shared four-season colour sets: spring, summer, autumn, winter. */
export const GRASS: SeasonalCell[] = [
  { colors: ["#78a884", "#5f9a6a", "#b3a35e", "#eef0f4"] },
  { colors: ["#89b78d", "#6ba86f", "#c2ad66", "#f6f7fa"] },
  { colors: ["#a0c295", "#7fb377", "#a89a5c", "#e4e8ee"] },
  { colors: ["#73a080", "#5a9163", "#9c8f55", "#f0f2f6"] },
];
export const GRASS_RIM: SeasonalCell = {
  colors: ["#698d77", "#517f5c", "#8f8452", "#dfe3ea"],
};
export const ISLET_GRASS: SeasonalCell[] = [
  { colors: ["#88aa8d", "#6a9e70", "#b7a763", "#eef0f4"] },
  { colors: ["#a8bf98", "#84b27d", "#c7b26c", "#f6f7fa"] },
  { colors: ["#9ab58e", "#74a86f", "#ad9c5c", "#e4e8ee"] },
];
export const LEAF: SeasonalCell[] = [
  { colors: ["#9abc87", "#6ea86e", "#d09a55", "#e6e9ef"] },
  { colors: ["#7da280", "#5b9463", "#b96f45", "#d9dde6"] },
];
/** Flower heads: winter hides them, autumn fades and shrinks. */
export function flowerHead(color: string): SeasonalCell {
  return {
    colors: [color, color, "#d8b27f", "#ffffff"],
    scales: [1, 1.05, 0.72, 0],
  };
}
export const FLOWER_STEM: SeasonalCell = {
  colors: ["#638976", "#4f8064", "#9a8a4c", "#ffffff"],
  scales: [1, 1, 0.9, 0],
};
export const FLOWER_LEAF: SeasonalCell = {
  colors: ["#8daf83", "#6ea36e", "#c19a54", "#ffffff"],
  scales: [1, 1, 0.9, 0],
};
export const FLOWER_CENTER: SeasonalCell = {
  colors: ["#d7ad6e", "#e3b04f", "#a8834d", "#ffffff"],
  scales: [1, 1, 0.7, 0],
};
/** Cherry crown voxels: pink, leafy green, fiery orange, then snow clumps. */
export function blossom(spring: string, snow: boolean): SeasonalCell {
  const summer = ["#7fae74", "#94bd82", "#a9c98b", "#6f9d6a"],
    autumn = ["#e3924f", "#d8703f", "#efb45a", "#c95a3c"];
  const pick = spring.charCodeAt(2) + spring.charCodeAt(5);
  return {
    colors: [spring, summer[pick % 4], autumn[(pick >> 1) % 4], "#f5f3f8"],
    scales: [1, 0.96, 0.9, snow ? 0.62 : 0],
  };
}
export function fallenPetal(spring: string): SeasonalCell {
  return {
    colors: [spring, "#8ab27c", "#d87f45", "#f7f6fa"],
    scales: [1, 0, 1.25, 1.1],
  };
}
/** Maple crowns on the far islands: fresh, deep green, crimson, bare snow. */
export function maple(shade: number): SeasonalCell {
  const spring = ["#b8d59a", "#a6cc8d", "#c8dfa4"],
    summer = ["#4f8f5a", "#5f9d64", "#437f4f"],
    autumn = ["#d94b3a", "#e0663f", "#c33c33"];
  return {
    colors: [
      spring[shade % 3],
      summer[shade % 3],
      autumn[shade % 3],
      "#f3f1f7",
    ],
    scales: [0.92, 1, 1, shade % 2 ? 0.55 : 0],
  };
}
/** Tea rows keep colour in all seasons but frost over in winter. */
export const TEA: SeasonalCell[] = [
  { colors: ["#6fa86d", "#5c9a5f", "#7c9c58", "#cfd9d3"] },
  { colors: ["#86b978", "#6ba86a", "#98a95f", "#e2e9e4"] },
];
