// Showroom kiosk: the configurator on a touch screen in a furniture shop.
// Opened with ?kiosk (90 s idle) or ?kiosk=<seconds> on any configurator page.

export const KIOSK_DEFAULT_IDLE = 90;
export const KIOSK_WARNING = 10; // seconds of "Hâlâ burada mısınız?" before the reset

export interface KioskOptions {
  idleSeconds: number;
}

export function parseKiosk(params: Record<string, string | string[] | undefined>): KioskOptions | null {
  const v = params.kiosk;
  if (v === undefined) return null;
  const raw = Array.isArray(v) ? v[0] : v;
  const n = Number(raw);
  // "", "1", "evet" → default; a number of seconds is clamped to 30 s – 10 min
  const idleSeconds = Number.isFinite(n) && n >= 30 ? Math.min(600, Math.round(n)) : KIOSK_DEFAULT_IDLE;
  return { idleSeconds };
}

/** Seconds left before the reset, and whether the warning should show. */
export function idleState(idleMs: number, idleSeconds: number): { remaining: number; warn: boolean; reset: boolean } {
  const remaining = Math.max(0, Math.ceil(idleSeconds - idleMs / 1000));
  return { remaining, warn: remaining > 0 && remaining <= KIOSK_WARNING, reset: remaining === 0 };
}

// Showroom loop (acil toplantı, 11 Oct): while the welcome screen waits for
// someone, the sofa turns slowly and wears ORMEN's real fabrics in turn, so
// the screen draws people in. Placeholders never take part: the shop window
// shows only what can be ordered.

export const ATTRACT_STEP_SECONDS = 6;
export const ATTRACT_MAX = 12;

/** The fabrics the loop goes through, or none when fewer than two real ones exist. */
export function attractFabrics<T extends { code: string; isPlaceholder: boolean }>(fabrics: T[]): T[] {
  const real = fabrics.filter((f) => !f.isPlaceholder).slice(0, ATTRACT_MAX);
  return real.length >= 2 ? real : [];
}

/** The fabric after `current` in the loop (the first one when `current` is not in it). */
export function nextAttract<T extends { code: string }>(list: T[], current: string): T | undefined {
  if (!list.length) return undefined;
  const i = list.findIndex((f) => f.code === current);
  return list[(i + 1) % list.length];
}
