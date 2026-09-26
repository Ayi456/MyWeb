import {
  emptyTreasure,
  validateTreasure,
  type TreasureProgress,
} from "../content/treasure";

const KEY = "spring-post-office:v1:treasure";

export function loadTreasure(date = new Date()) {
  try {
    return validateTreasure(
      JSON.parse(localStorage.getItem(KEY) ?? "null"),
      date,
    );
  } catch {
    return emptyTreasure(date);
  }
}

export function saveTreasure(progress: TreasureProgress, date = new Date()) {
  try {
    localStorage.setItem(KEY, JSON.stringify(validateTreasure(progress, date)));
  } catch {
    // A blocked or full store still allows this visit's hunt to continue.
  }
}
