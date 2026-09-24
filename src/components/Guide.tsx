import type { GuideStep } from "./guideState";

export function Guide({
  step,
  onSkip,
  onWrite,
}: {
  step: GuideStep;
  onSkip: () => void;
  onWrite: () => void;
}) {
  const number = step === "tree" ? 1 : step === "drag" ? 2 : 3;
  return (
    <aside className="guide" role="status" aria-live="polite">
      <div className="guide-count">小小的岛屿指南 · {number} / 3</div>
      <p>
        {step === "tree" ? (
          "点一点樱花树，看看它怎么回应。"
        ) : step === "drag" ? (
          <>
            <span className="guide-pointer">拖一拖，看看灯塔那边。</span>
            <span className="guide-touch">滑一滑，看看灯塔那边。</span>
          </>
        ) : (
          "寄一封春天，让飞艇捎走你的心意。"
        )}
      </p>
      <div className="guide-actions">
        {step === "send" && (
          <button type="button" onClick={onWrite}>
            去写信
          </button>
        )}
        <button type="button" onClick={onSkip}>
          跳过引导
        </button>
      </div>
    </aside>
  );
}
