import { useEffect, useRef, useState } from "react";
export function LetterDialog({
  onClose,
  onSend,
  paused,
}: {
  onClose: () => void;
  onSend: (message: string) => boolean;
  paused: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null),
    input = useRef<HTMLTextAreaElement>(null);
  const [text, setText] = useState(""),
    [error, setError] = useState("");
  const composing = useRef(false);
  const count = Array.from(text).length;
  useEffect(() => {
    const lastFocus =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const node = dialog.current;
    node?.showModal();
    input.current?.focus();
    return () => {
      node?.close();
      if (lastFocus?.isConnected) lastFocus.focus({ preventScroll: true });
    };
  }, []);
  function limit(value: string) {
    return Array.from(value).slice(0, 80).join("");
  }
  return (
    <dialog
      ref={dialog}
      className="letter-dialog"
      aria-labelledby="letter-title"
      aria-describedby="letter-description privacy-note"
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const controls = Array.from(
          e.currentTarget.querySelectorAll<HTMLElement>(
            'button:not(:disabled),textarea,input,select,[tabindex="0"]',
          ),
        );
        const first = controls[0],
          last = controls[controls.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section className="letter-card">
        <button className="close" aria-label="关闭写信窗口" onClick={onClose}>
          ×
        </button>
        <div className="eyebrow">A LITTLE NOTE, A LONG WAY HOME</div>
        <h2 id="letter-title">寄一封春天</h2>
        <p id="letter-description">
          写给想念的人，
          <br />
          也可以写给未来的自己。
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (composing.current || !text.trim() || count > 80) return;
            if (onSend(text.trim())) {
              setText("");
              onClose();
            } else setError("邮路有些热闹，请等几封信送达后再寄出。");
          }}
        >
          <label htmlFor="letter-text">想随春风寄出的话</label>
          <textarea
            id="letter-text"
            ref={input}
            rows={3}
            value={text}
            placeholder="愿你每一天，都有一点小小的开心。"
            required
            aria-describedby="letter-counter privacy-note"
            onCompositionStart={() => {
              composing.current = true;
            }}
            onCompositionEnd={(e) => {
              composing.current = false;
              setText(limit(e.currentTarget.value));
            }}
            onChange={(e) =>
              setText(
                composing.current ? e.target.value : limit(e.target.value),
              )
            }
          />
          <div className="letter-counter" id="letter-counter">
            {count} / 80 字
          </div>
          {paused && (
            <p className="paused-note">
              时间已暂停，恢复播放后信封才会继续移动。
            </p>
          )}
          {error && <p role="alert">{error}</p>}
          <button
            className="action primary submit"
            type="submit"
            disabled={!text.trim() || count > 80}
          >
            让心意随风出发 ↗
          </button>
        </form>
        <div className="fine" id="privacy-note">
          这是虚拟邮局，文字不会发送到外部服务。
          <br />
          仅留在当前页面内存中，刷新后清空。
        </div>
      </section>
    </dialog>
  );
}
