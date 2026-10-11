// The fabric on screen at its real size (acil toplantı, 11 Oct). A screen does
// not report its physical size, so the visitor sets it once against a bank
// card: every bank card is ISO/IEC 7810 ID-1, 85.60 × 53.98 mm.
// Shared with the panel's flat check (same key), so one setting serves both.

export const CARD_MM = { w: 85.6, h: 53.98 } as const;
export const SCALE_KEY = "ormen_cm_px";
/** CSS reference pixel: most screens are close, few are exact. */
export const DEFAULT_PX_PER_CM = 96 / 2.54;

/** Pixels per centimetre from the on-screen width that matched the card. */
export function pxPerCmFromCard(cardWidthPx: number): number {
  return cardWidthPx / (CARD_MM.w / 10);
}

/** A stored value, or null when none was set (or it is not believable). */
export function readStoredScale(): number | null {
  try {
    const v = Number(localStorage.getItem(SCALE_KEY));
    return v > 10 && v < 200 ? v : null;
  } catch {
    return null;
  }
}

export function storeScale(v: number): void {
  try {
    localStorage.setItem(SCALE_KEY, String(v));
  } catch {
    /* private mode: the setting lasts for this page only */
  }
}
