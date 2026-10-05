import { TAG, type Source } from "@/lib/events";
import { foldTr } from "@/lib/i18n/tr";

// Where a visit came from, for the panel report. Read once from the address a
// visitor arrived at, never from anything about the visitor:
//   ?kiosk     the showroom screen
//   ?q         a printed QR (firm QR codes and the A6 card carry it)
//   /p/…       a shared combination link
//   referrer   another website (only "was it another site", not which one)
// plus an optional branch/campaign label ?e=ankara-1 that ORMEN puts on links.

export interface VisitSource {
  source: Source;
  tag: string | null;
}

export function detectSource(at: { search: string; pathname: string; referrer: string; host: string }): VisitSource {
  const q = new URLSearchParams(at.search);
  const tag = cleanTag(q.get("e"));
  let referrerHost = "";
  try {
    referrerHost = at.referrer ? new URL(at.referrer).host : "";
  } catch {
    referrerHost = "";
  }
  const source: Source = q.has("kiosk")
    ? "kiosk"
    : q.has("q")
      ? "qr"
      : at.pathname.startsWith("/p/") || at.pathname.startsWith("/s/")
        ? "paylasim"
        : referrerHost && referrerHost !== at.host
          ? "site"
          : "dogrudan";
  return { source, tag };
}

/** "Ankara Şube 1" → "ankara-sube-1"; null when nothing usable is left. */
export function cleanTag(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const t = foldTr(raw.trim().toLocaleLowerCase("tr-TR"))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
    .replace(/-+$/, "");
  return TAG.test(t) ? t : null;
}

/** A firm link with its source markers: ?q for printed QR codes, ?kiosk for the showroom screen, ?e= for a label. */
export function markedPath(path: string, opts: { qr?: boolean; kiosk?: boolean; tag?: string | null } = {}): string {
  const parts: string[] = [];
  if (opts.kiosk) parts.push("kiosk");
  if (opts.qr) parts.push("q");
  if (opts.tag) parts.push(`e=${opts.tag}`);
  return parts.length ? `${path}?${parts.join("&")}` : path;
}
