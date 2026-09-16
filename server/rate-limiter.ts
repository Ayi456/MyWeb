// Simple in-memory rate limiter for serverless functions
interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries on-demand (serverless-friendly)
function cleanupExpired() {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) store.delete(key);
  }
}

export function checkRateLimit(
  identifier: string,
  maxRequests = 30,
  windowMs = 60_000,
): { allowed: boolean; remaining: number; resetAt: number } {
  // Lazy cleanup on each check (serverless-friendly)
  if (store.size > 1000) cleanupExpired();

  const now = Date.now();
  const entry = store.get(identifier);

  if (!entry || entry.resetAt < now) {
    const resetAt = now + windowMs;
    store.set(identifier, { count: 1, resetAt });
    return { allowed: true, remaining: maxRequests - 1, resetAt };
  }

  if (entry.count >= maxRequests) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count++;
  return {
    allowed: true,
    remaining: maxRequests - entry.count,
    resetAt: entry.resetAt,
  };
}

export function getClientIdentifier(
  ip?: string | string[],
  userAgent?: string,
): string {
  const ipAddr = Array.isArray(ip) ? ip[0] : ip || "unknown";
  const ua = userAgent || "unknown";
  return `${ipAddr}:${ua.slice(0, 50)}`;
}
