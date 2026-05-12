// IP 기반 인메모리 슬라이딩 윈도우 레이트 리미터 — API 라우트 남용 방지용
interface RateLimitConfig {
  /** Max requests allowed within the window */
  limit: number;
  /** Window duration in ms */
  windowMs: number;
}

interface BucketEntry {
  timestamps: number[];
  cleanedAt: number;
}

// In-memory store — persists across requests on the same Fluid Compute instance.
// Not distributed: one instance = one bucket. Good enough for abuse prevention
// on a single-region deployment; swap for Upstash/Redis if multi-region needed.
const store = new Map<string, BucketEntry>();

// Prevent unbounded growth: evict buckets idle for >2× their window.
function cleanup(key: string, windowMs: number) {
  const now = Date.now();
  const entry = store.get(key);
  if (!entry) return;
  if (now - entry.cleanedAt > windowMs * 2) {
    store.delete(key);
  }
}

export function checkRateLimit(
  ip: string,
  route: string,
  config: RateLimitConfig
): { allowed: boolean; remaining: number; resetAt: number } {
  const key = `${route}:${ip}`;
  const now = Date.now();
  const windowStart = now - config.windowMs;

  cleanup(key, config.windowMs);

  const entry = store.get(key) ?? { timestamps: [], cleanedAt: now };
  // Keep only timestamps within the current window
  entry.timestamps = entry.timestamps.filter((t) => t > windowStart);
  entry.timestamps.push(now);
  entry.cleanedAt = now;
  store.set(key, entry);

  const count = entry.timestamps.length;
  const allowed = count <= config.limit;
  const remaining = Math.max(0, config.limit - count);
  // When does the oldest request fall out of the window?
  const oldest = entry.timestamps[0] ?? now;
  const resetAt = oldest + config.windowMs;

  return { allowed, remaining, resetAt };
}

// Per-route configs
export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  "generate-questions":  { limit: 10,  windowMs: 60 * 60 * 1000 },
  "evaluate-answer":     { limit: 50,  windowMs: 60 * 60 * 1000 },
  "generate-feedback":   { limit: 10,  windowMs: 60 * 60 * 1000 },
  "parse-pdf":           { limit: 10,  windowMs: 60 * 60 * 1000 },
  "parse-job-posting":   { limit: 15,  windowMs: 60 * 60 * 1000 },
  "analyze-resume":      { limit: 5,   windowMs: 60 * 60 * 1000 },
  "generate-resume":     { limit: 5,   windowMs: 60 * 60 * 1000 },
  "generate-career":     { limit: 5,   windowMs: 60 * 60 * 1000 },
  "generate-resume-doc": { limit: 5,   windowMs: 60 * 60 * 1000 },
  "generate-answers":    { limit: 3,   windowMs: 60 * 60 * 1000 },
};
