// A small in-memory limit per caller, to stop a script from flooding a form.
// The key (a hash of the address) lives only in this server instance's
// memory for the window and is never written anywhere. On a serverless host
// each instance keeps its own count: a brake, not a guarantee.

import { createHash } from "node:crypto";

const buckets = new Map<string, number[]>();

/**
 * The caller, hashed. Null when the request carries no forwarded address:
 * a local server (development, tests) with nothing to tell callers apart.
 * Vercel always sets it.
 */
export function callerKey(headers: Headers): string | null {
  const ip = headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip");
  return ip ? createHash("sha256").update(ip).digest("base64url").slice(0, 16) : null;
}

/** True if this call is within `max` calls per `windowMs` for the key; records it. No key, no limit. */
export function allow(scope: string, key: string | null, max: number, windowMs: number, now = Date.now()): boolean {
  if (key === null) return true;
  const k = `${scope}:${key}`;
  const recent = (buckets.get(k) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    buckets.set(k, recent);
    return false;
  }
  recent.push(now);
  buckets.set(k, recent);
  if (buckets.size > 10_000) for (const [bk, ts] of buckets) if (!ts.some((t) => now - t < windowMs)) buckets.delete(bk);
  return true;
}
