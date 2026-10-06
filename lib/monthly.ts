// Monthly one-page summary for a firm (1st meeting, Selin and Ece): what was
// tried most in its showroom, for ORMEN's salesperson to hand over on a visit.
// Below 30 visits no ranking is shown: with so little data it misleads.

export const MIN_VISITS = 30;

/** "2026-10" → the month's bounds in Istanbul time (UTC+3, no DST since 2016). */
export function monthRange(ym: string): { from: Date; to: Date; label: string } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return null;
  const y = Number(m[1]), mo = Number(m[2]);
  if (mo < 1 || mo > 12 || y < 2026 || y > 2100) return null;
  const from = new Date(Date.UTC(y, mo - 1, 1, -3));
  const to = new Date(Date.UTC(y, mo, 1, -3) - 1);
  const label = new Date(Date.UTC(y, mo - 1, 15)).toLocaleDateString("tr-TR", { month: "long", year: "numeric", timeZone: "UTC" });
  return { from, to, label };
}

/** The last n months as "YYYY-MM", newest first, counted from the given day (Istanbul). */
export function recentMonths(n: number, now = new Date()): string[] {
  const ist = new Date(now.getTime() + 3 * 3_600_000);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const d = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth() - i, 1));
    out.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  }
  return out;
}
