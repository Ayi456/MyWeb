import { useEffect, useRef, useState } from "react";
import { STAMPS } from "../scene/systems/postcards";
import type { StampId } from "../scene/systems/postcards";
import type { SeasonName } from "../scene/systems/season";
import { SEASON_LABELS } from "../scene/systems/season";

export interface Reply {
  text: string;
  season: SeasonName;
  at: number;
}
export function PostcardPanel({
  replies,
  oldReplies,
  stamps,
  totalSent,
  onClear,
  onClose,
}: {
  replies: Reply[];
  oldReplies: Reply[];
  stamps: StampId[];
  totalSent: number;
  onClear: () => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [confirmClear, setConfirmClear] = useState(false);
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
        <p className="collection-count">累计放飞 {totalSent} 封心意</p>
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
        <h3>本次收到的回信</h3>
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
        {oldReplies.length > 0 && (
          <>
            <h3>以前收到的回信</h3>
            <ul className="reply-list">
              {[...oldReplies].reverse().map((r, i) => (
                <li key={`old-${r.at}-${i}`}>
                  <span className="reply-season">
                    {SEASON_LABELS[r.season]}
                  </span>
                  {r.text}
                </li>
              ))}
            </ul>
          </>
        )}
        <div className="fine">
          邮戳、回信和累计计数保存在此设备。寄出的信件文字不会保存。
        </div>
        <div className="collection-actions">
          {confirmClear ? (
            <>
              <button
                type="button"
                onClick={() => {
                  onClear();
                  setConfirmClear(false);
                }}
              >
                确认清空收藏
              </button>
              <button type="button" onClick={() => setConfirmClear(false)}>
                取消
              </button>
            </>
          ) : (
            <button type="button" onClick={() => setConfirmClear(true)}>
              清空收藏
            </button>
          )}
        </div>
      </section>
    </dialog>
  );
}
