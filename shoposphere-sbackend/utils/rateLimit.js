const store = new Map();

const DEFAULT_WINDOW_MS = 60 * 1000;
const DEFAULT_MAX_REQUESTS = 60;

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}

export function createRateLimiter({
  windowMs = DEFAULT_WINDOW_MS,
  maxRequests = DEFAULT_MAX_REQUESTS,
  keyGenerator,
  message = "Too many requests. Please try again later.",
} = {}) {
  return function rateLimiter(req, res, next) {
    const now = Date.now();
    const key = typeof keyGenerator === "function" ? keyGenerator(req) : getClientIp(req);
    const bucketKey = `${req.method}:${req.baseUrl || ""}:${req.path || ""}:${key}`;
    const existing = store.get(bucketKey);

    if (!existing || existing.resetAt <= now) {
      const resetAt = now + windowMs;
      store.set(bucketKey, { count: 1, resetAt });
      res.setHeader("RateLimit-Limit", String(maxRequests));
      res.setHeader("RateLimit-Remaining", String(Math.max(0, maxRequests - 1)));
      res.setHeader("RateLimit-Reset", String(Math.ceil(resetAt / 1000)));
      return next();
    }

    if (existing.count >= maxRequests) {
      const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
      res.setHeader("RateLimit-Limit", String(maxRequests));
      res.setHeader("RateLimit-Remaining", "0");
      res.setHeader("RateLimit-Reset", String(Math.ceil(existing.resetAt / 1000)));
      res.setHeader("Retry-After", String(retryAfterSec));
      return res.status(429).json({
        error: message,
        retryAfter: retryAfterSec,
      });
    }

    existing.count += 1;
    store.set(bucketKey, existing);
    res.setHeader("RateLimit-Limit", String(maxRequests));
    res.setHeader("RateLimit-Remaining", String(Math.max(0, maxRequests - existing.count)));
    res.setHeader("RateLimit-Reset", String(Math.ceil(existing.resetAt / 1000)));
    return next();
  };
}

function getUserKey(req) {
  return req.user?.id != null ? `user:${req.user.id}` : getClientIp(req);
}

// Periodically remove expired buckets to prevent unbounded memory growth.
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of store.entries()) {
    if (!value || value.resetAt <= now) {
      store.delete(key);
    }
  }
}, 60 * 1000).unref();

export const productListRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  message: "Too many product list requests. Please slow down and try again.",
});

export const publicBrowseRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 60,
  message: "Too many requests. Please slow down and try again.",
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  maxRequests: 10,
  message: "Too many authentication attempts. Please try again later.",
});

export const formSubmissionRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
  message: "Too many submissions. Please try again later.",
});

export const publicChatRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  maxRequests: 10,
  message: "Too many chat requests. Please try again later.",
});

export const adminWriteRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 30,
  keyGenerator: getUserKey,
  message: "Too many admin actions. Please slow down and try again.",
});
