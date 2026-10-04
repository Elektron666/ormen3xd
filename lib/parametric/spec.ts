// Parametric upholstered furniture: a workshop describes its model with a few
// choices (type, arms, back, legs, sizes) instead of sending a 3D file. The
// piece is then built from code, so ORMEN fabrics sit on it at true scale.
//
// This file is the pure description (no three.js): labels, limits, defaults,
// validation, the resulting outer dimensions and a compact link encoding.

export const TIPLER = ["ikili", "uclu", "dortlu", "kose", "berjer", "puf"] as const;
export type Tip = (typeof TIPLER)[number];
export const KOLLAR = ["ince", "kalin", "yuvarlak", "yok"] as const;
export type Kol = (typeof KOLLAR)[number];
export const SIRTLAR = ["alcak", "orta", "yuksek"] as const;
export type Sirt = (typeof SIRTLAR)[number];
export const AYAKLAR = ["konik", "metal", "gizli"] as const;
export type Ayak = (typeof AYAKLAR)[number];
export type KoseYonu = "sol" | "sag";

export interface ParametricParams {
  tip: Tip;
  kol: Kol;
  sirt: Sirt;
  ayak: Ayak;
  /** Overall width, cm (for a corner sofa: along the back wall). */
  genislikCm: number;
  /** Seat depth incl. back, cm. */
  derinlikCm: number;
  /** Corner sofa only: which side the return goes, seen from the front. */
  koseYonu?: KoseYonu;
  /** Corner sofa only: overall length of the return (along the side wall), cm. */
  koseBoyCm?: number;
}

export const TIP_LABELS: Record<Tip, string> = {
  ikili: "İkili kanepe",
  uclu: "Üçlü kanepe",
  dortlu: "Dörtlü kanepe",
  kose: "Köşe takımı",
  berjer: "Berjer",
  puf: "Puf",
};
export const KOL_LABELS: Record<Kol, string> = { ince: "İnce", kalin: "Kalın", yuvarlak: "Yuvarlak", yok: "Kolsuz" };
export const SIRT_LABELS: Record<Sirt, string> = { alcak: "Alçak", orta: "Orta", yuksek: "Yüksek" };
export const AYAK_LABELS: Record<Ayak, string> = { konik: "Ahşap konik", metal: "İnce metal", gizli: "Gizli kaide" };

/** Allowed ranges, cm. Wide enough for real Turkish models, narrow enough to stay believable. */
export const LIMITS: Record<Tip, { w: [number, number]; d: [number, number]; boy?: [number, number] }> = {
  ikili: { w: [130, 210], d: [75, 115] },
  uclu: { w: [180, 270], d: [75, 115] },
  dortlu: { w: [240, 340], d: [80, 120] },
  kose: { w: [200, 380], d: [80, 115], boy: [150, 320] },
  berjer: { w: [65, 105], d: [70, 105] },
  puf: { w: [40, 140], d: [40, 120] },
};

export const DEFAULTS: Record<Tip, ParametricParams> = {
  ikili: { tip: "ikili", kol: "kalin", sirt: "orta", ayak: "konik", genislikCm: 170, derinlikCm: 92 },
  uclu: { tip: "uclu", kol: "kalin", sirt: "orta", ayak: "konik", genislikCm: 225, derinlikCm: 95 },
  dortlu: { tip: "dortlu", kol: "ince", sirt: "orta", ayak: "metal", genislikCm: 290, derinlikCm: 100 },
  kose: { tip: "kose", kol: "kalin", sirt: "orta", ayak: "gizli", genislikCm: 290, derinlikCm: 95, koseYonu: "sag", koseBoyCm: 220 },
  berjer: { tip: "berjer", kol: "ince", sirt: "yuksek", ayak: "konik", genislikCm: 80, derinlikCm: 85 },
  puf: { tip: "puf", kol: "yok", sirt: "alcak", ayak: "konik", genislikCm: 70, derinlikCm: 70 },
};

/** Overall heights, cm. Seats are 44 cm high on every type. */
export const BACK_HEIGHT_CM: Record<Sirt, number> = { alcak: 72, orta: 82, yuksek: 95 };
export const SEAT_HEIGHT_CM = 44;

/** How many seat cushions a straight run of the given type and length gets. */
export function seatCount(tip: Tip, runCm: number): number {
  if (tip === "ikili") return 2;
  if (tip === "uclu") return 3;
  if (tip === "dortlu") return 4;
  if (tip === "berjer" || tip === "puf") return 1;
  return Math.max(1, Math.round(runCm / 65));
}

export type ParamErrors = Partial<Record<"genislikCm" | "derinlikCm" | "koseBoyCm", string>>;

export function validateParams(p: ParametricParams): ParamErrors {
  const e: ParamErrors = {};
  const lim = LIMITS[p.tip];
  const range = (v: number | undefined, [lo, hi]: [number, number]) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
  if (!range(p.genislikCm, lim.w)) e.genislikCm = `Genişlik ${lim.w[0]}–${lim.w[1]} cm arasında olmalı.`;
  if (!range(p.derinlikCm, lim.d)) e.derinlikCm = `Derinlik ${lim.d[0]}–${lim.d[1]} cm arasında olmalı.`;
  if (p.tip === "kose") {
    if (!range(p.koseBoyCm, lim.boy!)) e.koseBoyCm = `Köşe boyu ${lim.boy![0]}–${lim.boy![1]} cm arasında olmalı.`;
    // the return must be longer than the seat depth, or there is no return
    else if (p.koseBoyCm! < p.derinlikCm + 50) e.koseBoyCm = "Köşe boyu, derinlikten en az 50 cm fazla olmalı.";
    if (p.genislikCm < p.derinlikCm + 100 && !e.genislikCm) e.genislikCm = "Genişlik, derinlikten en az 100 cm fazla olmalı.";
  }
  return e;
}

/** Bounding box (cm) as used for the room layout and the plan. */
export function paramDimensions(p: ParametricParams): { w: number; d: number; h: number } {
  const h = p.tip === "puf" ? SEAT_HEIGHT_CM : BACK_HEIGHT_CM[p.sirt];
  const d = p.tip === "kose" ? (p.koseBoyCm ?? p.derinlikCm) : p.derinlikCm;
  return { w: Math.round(p.genislikCm), d: Math.round(d), h };
}

/** Keeps only known values; unknown or missing ones fall back to the type's defaults. */
export function normaliseParams(raw: unknown): ParametricParams | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!TIPLER.includes(r.tip as Tip)) return null;
  const base = DEFAULTS[r.tip as Tip];
  const pick = <T extends string>(v: unknown, list: readonly T[], fallback: T) => (list.includes(v as T) ? (v as T) : fallback);
  const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? Math.round(v) : fallback);
  const p: ParametricParams = {
    tip: base.tip,
    kol: base.tip === "puf" ? "yok" : pick(r.kol, KOLLAR, base.kol),
    sirt: pick(r.sirt, SIRTLAR, base.sirt),
    ayak: pick(r.ayak, AYAKLAR, base.ayak),
    genislikCm: num(r.genislikCm, base.genislikCm),
    derinlikCm: num(r.derinlikCm, base.derinlikCm),
  };
  if (p.tip === "kose") {
    p.koseYonu = r.koseYonu === "sol" ? "sol" : "sag";
    p.koseBoyCm = num(r.koseBoyCm, base.koseBoyCm!);
  }
  return p;
}

/** Short human description, e.g. "Köşe takımı · 290 × 220 cm · kalın kol". */
export function describeParams(p: ParametricParams): string {
  const size = p.tip === "kose" ? `${p.genislikCm} × ${p.koseBoyCm} cm` : `${p.genislikCm} × ${p.derinlikCm} cm`;
  const parts = [TIP_LABELS[p.tip], size];
  if (p.tip !== "puf") parts.push(p.kol === "yok" ? "kolsuz" : `${KOL_LABELS[p.kol].toLocaleLowerCase("tr-TR")} kol`);
  if (p.tip === "kose") parts.push(p.koseYonu === "sol" ? "köşe solda" : "köşe sağda");
  return parts.join(" · ");
}
