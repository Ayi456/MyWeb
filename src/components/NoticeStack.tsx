import type { NoticeAction, QueuedNotice } from "./noticeQueue";

const ACTION_LABEL: Record<NoticeAction, string> = {
  mailbox: "打开信箱",
  ride: "登船跟随",
};

export function NoticeStack({
  notices,
  onAction,
}: {
  notices: QueuedNotice[];
  onAction: (action: NoticeAction) => void;
}) {
  return (
    <div className="hint notice-stack" role="status" aria-live="polite">
      {notices.map(({ key, tone, text, action }) => (
        <p key={key} className={`notice ${tone ? `notice-${tone}` : ""}`}>
          {text}
          {action && (
            <button type="button" onClick={() => onAction(action)}>
              {ACTION_LABEL[action]}
            </button>
          )}
        </p>
      ))}
    </div>
  );
}
