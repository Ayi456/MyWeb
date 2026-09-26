import type { WalkDirection } from "../scene/types";
export function WalkControls({
  onInput,
  onExit,
}: {
  onInput: (direction: WalkDirection, on: boolean) => void;
  onExit: () => void;
}) {
  return (
    <section className="walk-controls" aria-label="岛上散步">
      <p>小兔的散步时间</p>
      <small>WASD / 方向键移动 · 拖动看四周</small>
      <div role="group" aria-label="散步方向">
        {(
          [
            ["forward", "向前走", "↑"],
            ["left", "向左走", "←"],
            ["back", "向后走", "↓"],
            ["right", "向右走", "→"],
          ] as const
        ).map(([direction, label, arrow]) => (
          <button
            key={direction}
            className={`walk-${direction}`}
            type="button"
            aria-label={label}
            onPointerDown={(e) => {
              e.preventDefault();
              e.currentTarget.setPointerCapture(e.pointerId);
              onInput(direction, true);
            }}
            onPointerUp={() => onInput(direction, false)}
            onPointerCancel={() => onInput(direction, false)}
            onLostPointerCapture={() => onInput(direction, false)}
            onKeyDown={(e) => {
              if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                onInput(direction, true);
              }
            }}
            onKeyUp={(e) => {
              if (e.key === " " || e.key === "Enter") onInput(direction, false);
            }}
            onBlur={() => onInput(direction, false)}
          >
            {arrow}
          </button>
        ))}
      </div>
      <button className="walk-exit" type="button" onClick={onExit}>
        结束散步
      </button>
    </section>
  );
}
