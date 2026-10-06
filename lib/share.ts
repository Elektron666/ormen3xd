// Share links: the whole combination (layout, room, view) is packed into the
// link itself, so /p/<id> works without a database and never expires.
// The id is base64url of a tiny query string, e.g. "y=…&oda=koyu-salon&g=plan".
// "f" is the firm slug when the combination was made on a firm's page.

const KEYS = ["y", "oda", "g", "f"] as const;
export type ShareState = Partial<Record<(typeof KEYS)[number], string>>;

export function toBase64Url(s: string): string {
  const bytes = new TextEncoder().encode(s);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function fromBase64Url(s: string): string {
  const b64 = s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4);
  const bin = atob(b64);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

export function encodeShare(state: ShareState): string {
  const q = new URLSearchParams();
  for (const k of KEYS) if (state[k]) q.set(k, state[k]!);
  return toBase64Url(q.toString());
}

export function decodeShare(id: string): ShareState | null {
  if (!/^[A-Za-z0-9_-]{4,1200}$/.test(id)) return null;
  try {
    const q = new URLSearchParams(fromBase64Url(id));
    const out: ShareState = {};
    for (const k of KEYS) {
      const v = q.get(k);
      if (v) out[k] = v;
    }
    return out.y ? out : null;
  } catch {
    return null;
  }
}
