import { useEffect, useRef, useState } from "react";

export function PhotoDialog({
  hasLetter,
  onClose,
  onExport,
}: {
  hasLetter: boolean;
  onClose: () => void;
  onExport: (includeLetter: boolean) => Promise<void>;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [includeLetter, setIncludeLetter] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    const previous =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const node = dialog.current;
    node?.showModal();
    return () => {
      node?.close();
      if (previous?.isConnected) previous.focus({ preventScroll: true });
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="letter-dialog photo-dialog"
      aria-labelledby="photo-title"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <section className="letter-card photo-card">
        <button
          className="close"
          aria-label="关闭拍照窗口"
          disabled={busy}
          onClick={onClose}
        >
          ×
        </button>
        <div className="eyebrow">A MOMENT TO KEEP</div>
        <h2 id="photo-title">拍下此刻的邮局</h2>
        <p>照片会保留当前画面，再加上季节邮框、日期与邮戳。</p>
        <label className="photo-letter-option">
          <input
            type="checkbox"
            checked={includeLetter}
            disabled={!hasLetter || busy}
            onChange={(event) => setIncludeLetter(event.target.checked)}
          />
          在图片中加入最近一封信的文字
        </label>
        <p className="fine">
          {hasLetter
            ? "此选项每次默认关闭。勾选后，文字会印在这次导出的图片中，也可能随图片分享。"
            : "寄出一封信后，才能选择把信中文字印上图片。"}
        </p>
        {error && <p role="alert">{error}</p>}
        <button
          className="action primary submit"
          disabled={busy}
          onClick={() => {
            setBusy(true);
            setError("");
            void onExport(includeLetter)
              .then(onClose)
              .catch((reason) => {
                setError(
                  reason instanceof Error
                    ? reason.message
                    : "明信片导出失败，请重试。",
                );
                setBusy(false);
              });
          }}
        >
          {busy ? "正在制作明信片…" : "导出 PNG / 分享"}
        </button>
      </section>
    </dialog>
  );
}
