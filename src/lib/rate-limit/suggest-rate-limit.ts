const WINDOW_MS = 60_000;
const MAX_REQUESTS = 60;

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

function pruneExpired(now: number) {
  if (buckets.size < 500) return;
  for (const [key, bucket] of buckets) {
    if (now >= bucket.resetAt) buckets.delete(key);
  }
}

/** Prosty limiter in-memory (wystarczający przy minInstances=1). */
export function checkSuggestRateLimit(clientKey: string): boolean {
  const now = Date.now();
  pruneExpired(now);

  const bucket = buckets.get(clientKey);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(clientKey, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (bucket.count >= MAX_REQUESTS) return false;
  bucket.count += 1;
  return true;
}

export function clientKeyFromRequest(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return request.headers.get("x-real-ip") ?? "unknown";
}
