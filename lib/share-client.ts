"use client";

/**
 * Asks for a short link (/s/…) for a share id. Resolves to the absolute short
 * URL, or null when it takes too long or fails; the caller then keeps the
 * long /p/… link, which always works.
 */
export async function shortenShare(id: string, timeoutMs = 2500): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch("/api/paylas", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }), signal: ctrl.signal });
    if (!res.ok) return null;
    const { path } = (await res.json()) as { path?: string };
    return path && /^\/s\/[0-9A-Za-z]{8,10}$/.test(path) ? `${window.location.origin}${path}` : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
