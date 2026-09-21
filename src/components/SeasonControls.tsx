import type { SceneSnapshot } from "../scene/types";
import { SEASONS, SEASON_LABELS } from "../scene/systems/season";
const ICONS = { spring: "✿", summer: "☼", autumn: "❦", winter: "❄" } as const;
export function SeasonControls({
  snapshot,
  onSeason,
}: {
  snapshot: SceneSnapshot | null;
  onSeason: (index: number) => void;
}) {
  const current = snapshot?.season ?? "spring";
  return (
    <div className="seasons" role="group" aria-label="季节">
      {SEASONS.map((name, i) => (
        <button
          key={name}
          aria-label={`切换到${SEASON_LABELS[name]}天`}
          aria-pressed={current === name}
          disabled={!snapshot?.ready}
          title={`${SEASON_LABELS[name]}天`}
          onClick={() => onSeason(i)}
        >
          <span aria-hidden="true">{ICONS[name]}</span>
          {SEASON_LABELS[name]}
        </button>
      ))}
      <span className="season-track" aria-hidden="true">
        <i
          style={{
            width: `${Math.round((snapshot?.seasonProgress ?? 0) * 100)}%`,
          }}
        />
      </span>
    </div>
  );
}
