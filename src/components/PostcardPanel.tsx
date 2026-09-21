import { useEffect, useRef } from "react";
import { STAMPS } from "../scene/systems/postcards";
import type { StampId } from "../scene/systems/postcards";
import type { SeasonName } from "../scene/systems/season";
import { SEASON_LABELS } from "../scene/systems/season";

export interface Reply {
  text: string;
  season: SeasonName;
  at: number;
}
/** Replies and stamps live only in React state for this page load. */
export function PostcardPanel({
  replies,
  stamps,
  onClose,
}: {
  replies: Reply[];
  stamps: StampId[];
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const node = dialog.current,
      lastFocus =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    node?.showModal();
    return () => {
      node?.close();
      if (lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="letter-dialog"
      aria-labelledby="postcard-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className="letter-card postcard-card">
        <button className="close" aria-label="关闭信箱" onClick={onClose}>
          ×
        </button>
        <div className="eyebrow">POSTCARDS FROM AFAR</div>
        <h2 id="postcard-title">信箱与集章</h2>
        <div className="stamp-grid" role="list" aria-label="邮戳收集">
          {STAMPS.map((s) => {
            const got = stamps.includes(s.id);
            return (
              <div
                key={s.id}
                role="listitem"
                className={`stamp-slot ${got ? "earned" : ""}`}
                title={got ? s.title : `未获得 · ${s.hint}`}
              >
                <b aria-hidden="true">{got ? s.label : "·"}</b>
                <span>{got ? s.title : s.hint}</span>
              </div>
            );
          })}
        </div>
        <h3>收到的回信</h3>
        {replies.length ? (
          <ul className="reply-list">
            {[...replies].reverse().map((r, i) => (
              <li key={`${r.at}-${i}`}>
                <span className="reply-season">{SEASON_LABELS[r.season]}</span>
                {r.text}
              </li>
            ))}
          </ul>
        ) : (
          <p className="reply-empty">
            还没有回信。寄出一封信，等飞艇从灯塔回来，
            <br />
            邮筒里就会多一张明信片。
          </p>
        )}
        <div className="fine">回信与邮戳只保存在当前页面，刷新后清空。</div>
      </section>
    </dialog>
  );
}
