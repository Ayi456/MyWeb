import type { useWindInput } from "../hooks/useWindInput";
export function ActionControls({
  onWrite,
  wind,
  disabled,
}: {
  onWrite: () => void;
  wind: ReturnType<typeof useWindInput>;
  disabled: boolean;
}) {
  return (
    <div className="actions">
      <button className="action primary" onClick={onWrite} disabled={disabled}>
        <svg className="icon" viewBox="0 0 20 20" aria-hidden="true">
          <rect x="2" y="4" width="16" height="12" rx="1.5" />
          <path d="m2 5 8 6 8-6" />
        </svg>
        寄一封春天
      </button>
      <button
        className={`action breeze ${wind.active ? "active" : ""}`}
        aria-label="唤起春风：按住空格或长按；Enter 切换持续春风"
        aria-pressed={wind.active}
        disabled={disabled}
        onPointerDown={(e) => {
          e.preventDefault();
          e.currentTarget.focus();
          e.currentTarget.setPointerCapture(e.pointerId);
          wind.pointer(true);
        }}
        onPointerUp={() => wind.pointer(false)}
        onPointerCancel={() => wind.pointer(false)}
        onLostPointerCapture={() => wind.pointer(false)}
        onKeyDown={(e) => {
          if (e.code === "Space") {
            e.preventDefault();
            wind.key(true);
          }
          if (e.code === "Enter" && !e.repeat) {
            e.preventDefault();
            wind.toggle();
          }
        }}
        onKeyUp={(e) => {
          if (e.code === "Space") {
            e.preventDefault();
            wind.key(false);
          }
        }}
        onBlur={wind.reset}
        onClick={(e) => {
          if (e.detail === 0) wind.toggle();
        }}
      >
        <span className="key">SPACE</span>唤起春风
      </button>
    </div>
  );
}
