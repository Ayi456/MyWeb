import type { SceneSnapshot, Speed } from "../scene/types";
export function TimeControls({
  snapshot,
  collapsed,
  onToggle,
  onSpeed,
  onHour,
  onRealTime,
  classic,
}: {
  snapshot: SceneSnapshot | null;
  collapsed: boolean;
  onToggle: () => void;
  onSpeed: (v: Speed) => void;
  onHour: (v: number) => void;
  onRealTime: (on: boolean) => void;
  classic: boolean;
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
    <section
      className={`time-panel ${collapsed ? "time-panel-collapsed" : ""}`}
      aria-label="时间控制"
    >
      <button
        className="time-toggle"
        aria-label={collapsed ? "显示时间卡片" : "隐藏时间卡片"}
        title={collapsed ? "显示时间卡片" : "隐藏时间卡片"}
        aria-expanded={!collapsed}
        aria-controls="time-panel-content"
        onClick={onToggle}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          {collapsed ? (
            <>
              <circle cx="12" cy="12" r="8" />
              <path d="M12 7v5l3 2" />
            </>
          ) : (
            <path d="m8 10 4 4 4-4" />
          )}
        </svg>
      </button>
      <div id="time-panel-content" hidden={collapsed}>
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
        {!classic && (
          <label className="real-time-toggle">
            <input
              type="checkbox"
              checked={snapshot?.realTime ?? false}
              disabled={!snapshot?.ready}
              onChange={(e) => onRealTime(e.target.checked)}
            />
            跟随现实时间与季节
          </label>
        )}
      </div>
    </section>
  );
}
