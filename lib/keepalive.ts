// Keeps the free Supabase project awake: it pauses after a week with no
// requests, and a paused project means a closed site on a Monday morning.
// Vercel's daily cron calls /api/canli-tut, which reads one row.

/**
 * Vercel sends "Authorization: Bearer <CRON_SECRET>" when CRON_SECRET is set.
 * Without the secret the call is still harmless (one row of the public
 * catalogue), so it is allowed; with it, only Vercel gets in.
 */
export function cronAllowed(authorization: string | null, secret: string | undefined): boolean {
  return !secret || authorization === `Bearer ${secret}`;
}
