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

const nf = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 });

/** Zones the firm can give its own figure for (piping is cut from the leftovers; the upholsterer's call). */
export const METERAGE_ZONES = ["govde", "kol", "oturak", "sirt"] as const;
export type MeterageZone = (typeof METERAGE_ZONES)[number];

export interface ModelMeterage {
  /** Metres of fabric the firm's upholsterer uses for one piece of this model. */
  metres: number;
  /** Fabric width that figure is for, cm. */
  refWidthCm: number;
  /**
   * The same figure split by zone (meeting of 10 Oct, Hüseyin Usta: "oturak
   * 2,5 m, kasa 6 m"), same width. A zone left out is one the model does not
   * have; with no split at all, a piece in several fabrics stays the upholsterer's call.
   */
  zones?: Partial<Record<MeterageZone, number>>;
}

export const METERAGE_LIMITS = { metres: [0.5, 60] as const, refWidthCm: [100, 340] as const, zone: [0.1, 40] as const };

export function validateMeterage(m: Partial<ModelMeterage> | null | undefined): string | null {
  if (!m || (m.metres === undefined && m.refWidthCm === undefined)) return null;
  const [lo, hi] = METERAGE_LIMITS.metres;
  const [wlo, whi] = METERAGE_LIMITS.refWidthCm;
  if (m.metres === undefined || !(m.metres >= lo && m.metres <= hi)) return `Metraj ${lo}–${hi} m arasında olmalı.`;
  if (m.refWidthCm === undefined || !(m.refWidthCm >= wlo && m.refWidthCm <= whi)) return `Metrajın geçerli olduğu kumaş enini yazın (${wlo}–${whi} cm).`;
  if (m.zones) {
    const [zlo, zhi] = METERAGE_LIMITS.zone;
    if (Object.keys(m.zones).some((k) => !(METERAGE_ZONES as readonly string[]).includes(k))) return "Bilinmeyen bölge.";
    const values = Object.values(m.zones).filter((v): v is number => v !== undefined);
    if (values.some((v) => !(v >= zlo && v <= zhi))) return `Bölge metrajı ${nf.format(zlo)}–${zhi} m arasında olmalı.`;
    // the parts can carry a little more waste than the whole, not much more
    if (values.reduce((a, b) => a + b, 0) > m.metres * 1.1 + 1e-9) return "Bölge metrajlarının toplamı bir adetin metrajını geçiyor.";
  }
  return null;
}

export type Estimate = { kind: "metre"; metres: number } | { kind: "usta"; reason: string };

/** The firm's figure for part of a piece (the zones one fabric covers), or why there is none. */
function zonedFigure(m: ModelMeterage, zones: readonly string[]): Estimate {
  if (!m.zones || !Object.keys(m.zones).length) return { kind: "usta", reason: ZONED_REASON };
  const figures = METERAGE_ZONES.filter((z) => zones.includes(z) && m.zones![z] !== undefined).map((z) => m.zones![z]!);
  if (!figures.length) return { kind: "usta", reason: zones.includes("biye") ? "Biye kumaşını usta hesaplar." : ZONED_REASON };
  return { kind: "metre", metres: figures.reduce((a, b) => a + b, 0) };
}

/**
 * The firm's figure for a piece, or for the zones of it one fabric covers
 * (`zones`, when the piece wears more than one fabric), if the fabric is the
 * case it holds for.
 */
export function estimate(model: Pick<FurnitureModel, "meterage">, fabric: Pick<Fabric, "widthCm" | "pattern" | "cutDirection">, zones?: readonly string[]): Estimate {
  const m = model.meterage;
  if (!m) return { kind: "usta", reason: zones ? ZONED_REASON : "Bu model için firmanın metrajı girilmemiş." };
  const figure = zones ? zonedFigure(m, zones) : ({ kind: "metre", metres: m.metres } as const);
  if (figure.kind === "usta") return figure;
  if (!fabric.widthCm) return { kind: "usta", reason: "Kumaşın eni bilinmiyor." };
  if (fabric.widthCm !== m.refWidthCm) return { kind: "usta", reason: `Kumaşın eni ${fabric.widthCm} cm; metraj ${m.refWidthCm} cm en için girilmiş.` };
  if (!fabric.pattern) return { kind: "usta", reason: "Kumaşın desen bilgisi girilmemiş." };
  if (fabric.pattern === "desenli") return { kind: "usta", reason: "Desenli kumaş: desen eşleştirme payını usta hesaplar." };
  if (!fabric.cutDirection) return { kind: "usta", reason: "Kumaşın kesim yönü bilinmiyor." };
  if (fabric.cutDirection === "tek") return { kind: "usta", reason: "Tek yönlü kumaş: parçalar döndürülemez, fire artar; usta hesaplar." };
  return { kind: "metre", metres: Math.round(figure.metres * 10) / 10 };
}

export const formatMetres = (m: number) => `${nf.format(m)} m`;

/** No zone figures from the firm: split over zones, the metres are the upholsterer's call. */
export const ZONED_REASON = "Bölgelere farklı kumaş seçildi; bu model için bölge metrajı girilmemiş, usta hesaplar.";

/** Railroaded fabric is cut across the roll: the firm's figure (cut along it) does not hold. */
export const TURNED_REASON = "Kumaş dönük (yan çevrilmiş) kesilecek; metrajı usta hesaplar.";

/** The figure for one row of the sheet: a piece, or the zones of it one fabric covers. */
export function rowEstimate(p: { model: Pick<FurnitureModel, "meterage">; fabric: Pick<Fabric, "widthCm" | "pattern" | "cutDirection">; zones?: readonly string[]; turned?: boolean }): Estimate {
  return p.turned ? { kind: "usta", reason: TURNED_REASON } : estimate(p.model, p.fabric, p.zones);
}

/**
 * Metres per fabric for a whole layout. A fabric gets a total only when every
 * piece in it has a figure; otherwise the reasons are listed and no partial
 * sum is shown (a partial sum reads like the answer).
 */
export function meterageByFabric(pieces: { model: Pick<FurnitureModel, "meterage" | "name">; fabric: Fabric; zones?: readonly string[]; turned?: boolean }[]): {
  fabric: Fabric;
  pieces: number;
  total: number | null;
  reasons: string[];
}[] {
  const groups = new Map<string, { fabric: Fabric; estimates: Estimate[]; names: string[] }>();
  for (const p of pieces) {
    const g = groups.get(p.fabric.code) ?? { fabric: p.fabric, estimates: [], names: [] };
    g.estimates.push(rowEstimate(p));
    g.names.push(p.model.name);
    groups.set(p.fabric.code, g);
  }
  return [...groups.values()].map(({ fabric, estimates, names }) => {
    const missing = estimates.flatMap((e, i) => (e.kind === "usta" ? [`${names[i]}: ${e.reason}`] : []));
    const total = missing.length ? null : Math.round(estimates.reduce((s, e) => s + (e.kind === "metre" ? e.metres : 0), 0) * 10) / 10;
    return { fabric, pieces: estimates.length, total, reasons: [...new Set(missing)] };
  });
}
