export type NoticeKind = "tap" | "event" | "keep";
export type NoticeAction = "mailbox" | "ride";
export interface QueuedNotice {
  key: number;
  kind: NoticeKind;
  text: string;
  /** Extra class for the postcard / stamp styling. */
  tone?: "reply" | "stamp";
  action?: NoticeAction;
  until: number;
}

export const NOTICE_LIMIT = 2;
const DURATION: Record<NoticeKind, number> = {
  tap: 4000,
  event: 5000,
  keep: 8000,
};

let nextKey = 1;

/**
 * Taps replace each other; everything else stacks. Only the newest
 * NOTICE_LIMIT stay visible, so a reply and the stamp it grants no longer
 * overwrite one another.
 */
export function pushNotice(
  list: QueuedNotice[],
  notice: Omit<QueuedNotice, "key" | "until">,
  now: number,
): QueuedNotice[] {
  const item = {
    ...notice,
    key: nextKey++,
    until: now + DURATION[notice.kind],
  };
  const kept = list.filter(
    (n) => n.until > now && !(notice.kind === "tap" && n.kind === "tap"),
  );
  return [...kept, item].slice(-NOTICE_LIMIT);
}

export function pruneNotices(list: QueuedNotice[], now: number) {
  const kept = list.filter((n) => n.until > now);
  return kept.length === list.length ? list : kept;
}
