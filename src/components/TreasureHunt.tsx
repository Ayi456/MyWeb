import {
  treasureRoute,
  TREASURE_STOPS,
  type TreasureProgress,
} from "../content/treasure";
import type { CameraPreset } from "../scene/types";

export function TreasureHunt({
  progress,
  date,
  onStart,
  onVisit,
}: {
  progress: TreasureProgress;
  date: Date;
  onStart: () => void;
  onVisit: (preset: CameraPreset) => void;
}) {
  const clue = treasureRoute(date)[progress.found];
  return (
    <section className="treasure-hunt" aria-labelledby="treasure-title">
      <h3 id="treasure-title">本周群岛寻宝</h3>
      <p className="fine">{progress.week} 这一周 · 每周一换一条邮路</p>
      {!progress.started ? (
        <>
          <p>循着四张线索拜访群岛，找齐后留下一枚寻宝邮戳。</p>
          <button type="button" className="guide-restart" onClick={onStart}>
            开始本周寻宝
          </button>
        </>
      ) : (
        <>
          <p className="treasure-progress">
            已找到 {progress.found} / {TREASURE_STOPS.length} 处
          </p>
          {clue ? (
            <>
              <p className="treasure-clue">{clue.clue}</p>
              <button
                type="button"
                className="guide-restart"
                onClick={() => onVisit(clue.view)}
              >
                带我去线索附近
              </button>
              <p className="fine">
                到附近后点一点地标。也可以用上方的热点按钮或数字键回应线索。
              </p>
            </>
          ) : (
            <p className="treasure-clue">
              本周线索已找齐。寻宝邮戳已放进信箱，下周再来走一条新邮路。
            </p>
          )}
        </>
      )}
      <p className="fine">进度只保存在此设备，可在信箱里清空。</p>
    </section>
  );
}
