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
