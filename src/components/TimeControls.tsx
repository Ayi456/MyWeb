import type { SceneSnapshot, Speed } from "../scene/types";
export function TimeControls({
  snapshot,
  onSpeed,
  onHour,
}: {
  snapshot: SceneSnapshot | null;
  onSpeed: (v: Speed) => void;
  onHour: (v: number) => void;
}) {
  const hour = snapshot?.hour ?? 16.33,
    speed = snapshot?.speed ?? 1;
  const phase =
    hour >= 5 && hour < 9
      ? "黎明"
      : hour >= 9 && hour < 16
        ? "晴日"
        : hour >= 16 && hour < 20
          ? "黄昏"
          : "星夜";
  const time = `${Math.floor(hour).toString().padStart(2, "0")}:${Math.floor(
    (hour % 1) * 60,
  )
    .toString()
    .padStart(2, "0")}`;
  return (
    <section className="time-panel" aria-label="时间控制">
      <div className="time-top">
        <span className="phase-icon" aria-hidden="true">
          {(snapshot?.night ?? 0) > 0.65 ? "☾" : "☀"}
        </span>
        <span>{phase}</span>
        <time className="clock">{time}</time>
      </div>
      <div className="speeds" role="group" aria-label="时间流速">
        <span>TIME LAPSE</span>
        {([1, 4, 12, 0] as const).map((v) => (
          <button
            key={v}
            aria-label={v === 0 ? "暂停" : `时间倍率 ${v}`}
            aria-pressed={speed === v}
            disabled={!snapshot?.ready}
            onClick={() => onSpeed(v)}
          >
            {v === 0 ? "Ⅱ" : `×${v}`}
          </button>
        ))}
      </div>
      <input
        type="range"
        min="0"
        max="24"
        step="0.01"
        value={hour}
        disabled={!snapshot?.ready}
        aria-label="一天中的时间"
        aria-valuetext={`${phase} ${time}`}
        onChange={(e) => onHour(Number(e.target.value))}
      />
    </section>
  );
}
