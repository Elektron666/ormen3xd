// A small in-memory limit per caller, to stop a script from flooding a form.
// The key (a hash of the address) lives only in this server instance's
// memory for the window and is never written anywhere. On a serverless host
// each instance keeps its own count: a brake, not a guarantee.

import { createHash } from "node:crypto";

const buckets = new Map<string, number[]>();

/**
 * The caller, hashed. Null off Vercel (a local server, the tests: one
 * machine, nothing to tell callers apart) or when no address came with the
 * request; then nothing is limited.
 */
export function callerKey(headers: Headers, onVercel = !!process.env.VERCEL): string | null {
  if (!onVercel) return null;
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

/** For guessing (passwords, codes): blocked once `max` failures fell within the window. Only failures count. */
export function blocked(scope: string, key: string | null, max: number, windowMs: number, now = Date.now()): boolean {
  if (key === null) return false;
  const recent = (buckets.get(`${scope}:${key}`) ?? []).filter((t) => now - t < windowMs);
  return recent.length >= max;
}

export function recordFailure(scope: string, key: string | null, now = Date.now()): void {
  if (key === null) return;
  const k = `${scope}:${key}`;
  buckets.set(k, [...(buckets.get(k) ?? []), now]);
}

