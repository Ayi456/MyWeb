import {
  ReplyLedger,
  StampBook,
  encodeReply,
  type StampId,
  type StoredReply,
} from "../scene/systems/postcards";

const PREFIX = "spring-post-office:v1:";
export interface Collection {
  stamps: StampId[];
  replies: StoredReply[];
  totalSent: number;
}
export function emptyCollection(): Collection {
  return { stamps: [], replies: [], totalSent: 0 };
}
export function readPreference(name: string, legacyKey?: string) {
  try {
    const current = localStorage.getItem(`${PREFIX}${name}`);
    return (
      (current ?? (legacyKey ? localStorage.getItem(legacyKey) : null)) ===
      "true"
    );
  } catch {
    return false;
  }
}
export function writePreference(name: string, value: boolean) {
  try {
    localStorage.setItem(`${PREFIX}${name}`, String(value));
  } catch {
    // Browsers may disable storage; controls still work this visit.
  }
}
export function validateCollection(value: unknown): Collection {
  if (!value || typeof value !== "object") return emptyCollection();
  const source = value as Record<string, unknown>;
  const stamps = new StampBook().from(source.stamps);
  const replies = new ReplyLedger().restore(source.replies);
  const count = source.totalSent;
  return {
    stamps,
    replies: replies.flatMap((reply) => {
      const encoded = encodeReply(reply);
      return encoded ? [encoded] : [];
    }),
    totalSent:
      typeof count === "number" &&
      Number.isSafeInteger(count) &&
      count >= 0 &&
      count <= 10_000_000
        ? count
        : 0,
  };
}
export function loadCollection(): Collection {
  try {
    const raw = localStorage.getItem(`${PREFIX}collection`);
    return raw ? validateCollection(JSON.parse(raw)) : emptyCollection();
  } catch {
    return emptyCollection();
  }
}
export function saveCollection(collection: Collection) {
  try {
    localStorage.setItem(
      `${PREFIX}collection`,
      JSON.stringify(validateCollection(collection)),
    );
  } catch {
    // Saving is optional; the current visit remains usable.
  }
}
