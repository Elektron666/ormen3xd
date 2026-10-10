// Fabric metres for the cutter's sheet (2nd meeting, "kesim masası").
//
// We never invent the number. The firm enters what its own upholsterer uses
// for a model ("8 m of 140 cm plain fabric") and the sheet repeats it only
// when the chosen ORMEN fabric is the same case: same width, plain, and
// cuttable both ways. Anything else (another width, a pattern to match, a
// one-way pile, unknown data) shows no number, only the reason, and leaves
// the call to the upholsterer. Once real cuts have been collected, a
// calculation can replace this, but only if it holds for most of them.

import type { Fabric, FurnitureModel } from "@/lib/types";

export interface ModelMeterage {
  /** Metres of fabric the firm's upholsterer uses for one piece of this model. */
  metres: number;
  /** Fabric width that figure is for, cm. */
  refWidthCm: number;
}

export const METERAGE_LIMITS = { metres: [0.5, 60] as const, refWidthCm: [100, 340] as const };

export function validateMeterage(m: Partial<ModelMeterage> | null | undefined): string | null {
  if (!m || (m.metres === undefined && m.refWidthCm === undefined)) return null;
  const [lo, hi] = METERAGE_LIMITS.metres;
  const [wlo, whi] = METERAGE_LIMITS.refWidthCm;
  if (m.metres === undefined || !(m.metres >= lo && m.metres <= hi)) return `Metraj ${lo}–${hi} m arasında olmalı.`;
  if (m.refWidthCm === undefined || !(m.refWidthCm >= wlo && m.refWidthCm <= whi)) return `Metrajın geçerli olduğu kumaş enini yazın (${wlo}–${whi} cm).`;
  return null;
}

export type Estimate = { kind: "metre"; metres: number } | { kind: "usta"; reason: string };

export function estimate(model: Pick<FurnitureModel, "meterage">, fabric: Pick<Fabric, "widthCm" | "pattern" | "cutDirection">): Estimate {
  const m = model.meterage;
  if (!m) return { kind: "usta", reason: "Bu model için firmanın metrajı girilmemiş." };
  if (!fabric.widthCm) return { kind: "usta", reason: "Kumaşın eni bilinmiyor." };
  if (fabric.widthCm !== m.refWidthCm) return { kind: "usta", reason: `Kumaşın eni ${fabric.widthCm} cm; metraj ${m.refWidthCm} cm en için girilmiş.` };
  if (!fabric.pattern) return { kind: "usta", reason: "Kumaşın desen bilgisi girilmemiş." };
  if (fabric.pattern === "desenli") return { kind: "usta", reason: "Desenli kumaş: desen eşleştirme payını usta hesaplar." };
  if (!fabric.cutDirection) return { kind: "usta", reason: "Kumaşın kesim yönü bilinmiyor." };
  if (fabric.cutDirection === "tek") return { kind: "usta", reason: "Tek yönlü kumaş: parçalar döndürülemez, fire artar; usta hesaplar." };
  return { kind: "metre", metres: m.metres };
}

const nf = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });
export const formatMetres = (m: number) => `${nf.format(m)} m`;

/**
 * Metres per fabric for a whole layout. A fabric gets a total only when every
 * piece in it has a figure; otherwise the reasons are listed and no partial
 * sum is shown (a partial sum reads like the answer).
 */
/** The firm's figure is for the whole piece in one fabric; split over zones it is the upholsterer's call. */
export const ZONED_REASON = "Bölgelere farklı kumaş seçildi; hangi kumaştan kaç metre gideceğini usta hesaplar.";

/** Railroaded fabric is cut across the roll: the firm's figure (cut along it) does not hold. */
export const TURNED_REASON = "Kumaş dönük (yan çevrilmiş) kesilecek; metrajı usta hesaplar.";

export function meterageByFabric(pieces: { model: Pick<FurnitureModel, "meterage" | "name">; fabric: Fabric; zoned?: boolean; turned?: boolean }[]): {
  fabric: Fabric;
  pieces: number;
  total: number | null;
  reasons: string[];
}[] {
  const groups = new Map<string, { fabric: Fabric; estimates: Estimate[]; names: string[] }>();
  for (const p of pieces) {
    const g = groups.get(p.fabric.code) ?? { fabric: p.fabric, estimates: [], names: [] };
    g.estimates.push(p.zoned ? { kind: "usta", reason: ZONED_REASON } : p.turned ? { kind: "usta", reason: TURNED_REASON } : estimate(p.model, p.fabric));
    g.names.push(p.model.name);
    groups.set(p.fabric.code, g);
  }
  return [...groups.values()].map(({ fabric, estimates, names }) => {
    const missing = estimates.flatMap((e, i) => (e.kind === "usta" ? [`${names[i]}: ${e.reason}`] : []));
    const total = missing.length ? null : Math.round(estimates.reduce((s, e) => s + (e.kind === "metre" ? e.metres : 0), 0) * 10) / 10;
    return { fabric, pieces: estimates.length, total, reasons: [...new Set(missing)] };
  });
}
