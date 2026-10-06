// Ready-made scenes on a firm's page (1st meeting, Deniz): 3–6 combinations
// (pieces, fabrics, room) the salesperson starts from with one tap instead of
// an empty tool. ORMEN builds a scene in the configurator, shares it and
// pastes the link with a name in the panel; the scene is the share id.

import { decodeShare } from "@/lib/share";

export interface FirmPreset {
  name: string;
  /** Share id (the part after /p/). */
  id: string;
}

export const MAX_PRESETS = 6;

/** "https://…/p/<id>", "/p/<id>" or the bare id → the id; "/s/<code>" → { short } to resolve. */
export function parsePresetLink(raw: string): { id: string } | { short: string } | null {
  const t = raw.trim();
  const m = /(?:^|\/)p\/([A-Za-z0-9_-]{4,1200})(?:[?#].*)?$/.exec(t) ?? /^([A-Za-z0-9_-]{12,1200})$/.exec(t);
  if (m && decodeShare(m[1])) return { id: m[1] };
  const s = /(?:^|\/)s\/([0-9A-Za-z]{8})(?:[?#].*)?$/.exec(t);
  return s ? { short: s[1] } : null;
}

/** Names trimmed to 2–40 characters, valid ids only, at most six, no duplicates. */
export function cleanPresets(raw: unknown): FirmPreset[] {
  if (!Array.isArray(raw)) return [];
  const out: FirmPreset[] = [];
  for (const p of raw as Partial<FirmPreset>[]) {
    const name = typeof p?.name === "string" ? p.name.trim().replace(/\s+/g, " ") : "";
    if (name.length < 2 || name.length > 40 || typeof p.id !== "string" || !decodeShare(p.id)) continue;
    if (out.some((o) => o.id === p.id)) continue;
    out.push({ name, id: p.id });
    if (out.length === MAX_PRESETS) break;
  }
  return out;
}

/** The page address that opens a scene (keeps ?kiosk and the like that the visit came with). */
export function presetHref(path: string, id: string, keep: URLSearchParams): string {
  const state = decodeShare(id);
  const q = new URLSearchParams();
  for (const k of ["kiosk", "q", "e"]) if (keep.has(k)) q.set(k, keep.get(k) ?? "");
  if (state?.y) q.set("y", state.y);
  if (state?.oda) q.set("oda", state.oda);
  if (state?.g) q.set("g", state.g);
  // "kiosk" and "q" are flags: written without "="
  return `${path}?${q.toString().replace(/(^|&)(kiosk|q)=(?=&|$)/g, "$1$2")}`;
}
