// Finish of the wooden legs (Fatih Bey, 10 Oct: "koltuğu daha fazla
// özelleştirelim"). Only the turned wooden legs of the models built from
// code take it; metal legs and hidden plinths stay as they are.

import type { FurnitureModel } from "@/lib/types";

export const LEG_FINISHES = ["ceviz", "mese", "dogal", "siyah"] as const;
export type LegFinish = (typeof LEG_FINISHES)[number];
export const DEFAULT_LEG: LegFinish = "ceviz";

export const LEG_LABELS: Record<LegFinish, string> = { ceviz: "Ceviz", mese: "Meşe", dogal: "Doğal ahşap", siyah: "Siyah" };
/** Base colour of the lacquered wood (sRGB). Ceviz is the colour the models were drawn with. */
export const LEG_COLORS: Record<LegFinish, string> = { ceviz: "#4A3022", mese: "#9C7448", dogal: "#C7A57A", siyah: "#1D1B19" };

export function isLegFinish(v: unknown): v is LegFinish {
  return LEG_FINISHES.includes(v as LegFinish);
}

/** Whether the model has turned wooden legs whose finish can be chosen. */
export function hasWoodLegs(model: Pick<FurnitureModel, "source">): boolean {
  const s = model.source;
  return s.kind === "procedural" || (s.kind === "parametric" && s.params.ayak === "konik");
}
