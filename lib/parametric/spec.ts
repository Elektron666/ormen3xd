// Parametric upholstered furniture: a workshop describes its model with a few
// choices (type, arms, back, legs, sizes) instead of sending a 3D file. The
// piece is then built from code, so ORMEN fabrics sit on it at true scale.
//
// This file is the pure description (no three.js): labels, limits, defaults,
// validation, the resulting outer dimensions and a compact link encoding.

export const TIPLER = ["ikili", "uclu", "dortlu", "kose", "berjer", "puf"] as const;
export type Tip = (typeof TIPLER)[number];
export const KOLLAR = ["ince", "kalin", "yuvarlak", "kivrik", "yok"] as const;
export type Kol = (typeof KOLLAR)[number];
export const SIRTLAR = ["alcak", "orta", "yuksek"] as const;
export type Sirt = (typeof SIRTLAR)[number];
export const AYAKLAR = ["konik", "metal", "gizli"] as const;
export type Ayak = (typeof AYAKLAR)[number];
/** Loose back cushions, or a fixed upholstered back (common on modern and Chester-style pieces). */
export const SIRT_TIPLERI = ["minderli", "sabit", "kapitone"] as const;
export type SirtTipi = (typeof SIRT_TIPLERI)[number];
/** One cushion per seat, or one long bench cushion per straight run. */
export const OTURUM_TIPLERI = ["ayri", "tek"] as const;
export type OturumTipi = (typeof OTURUM_TIPLERI)[number];
/** What a corner/modular set ends with on each side, seen from the front. */
export const UCLAR = ["kol", "kose", "sezlong"] as const;
export type Uc = (typeof UCLAR)[number];

export interface ParametricParams {
  tip: Tip;
  kol: Kol;
  sirt: Sirt;
  ayak: Ayak;
  /** Overall width, cm (for a corner sofa: along the back wall). */
  genislikCm: number;
  /** Seat depth incl. back, cm. */
  derinlikCm: number;
  /**
   * Corner / modular set only. Each end is an arm, a corner with a return
   * along the side wall, or a chaise (şezlong). Both corners make a U.
   */
  solUc?: Uc;
  sagUc?: Uc;
  /** Overall length of that end's return or chaise, from the back wall forward, cm. */
  solBoyCm?: number;
  sagBoyCm?: number;
  /** Fixed back instead of loose cushions; missing = loose cushions. */
  sirtTipi?: SirtTipi;
  /** Armchair only: wings rising over the arms beside the back (kulaklı berjer). */
  kulak?: boolean;
  /** One bench cushion per run; missing = one per seat. */
  oturumTipi?: OturumTipi;
  /**
   * The firm's real overall height, cm (top of the back; for a pouf, its top).
   * Missing = the height of the chosen back preset.
   */
  yukseklikCm?: number;
}

export const TIP_LABELS: Record<Tip, string> = {
  ikili: "İkili kanepe",
  uclu: "Üçlü kanepe",
  dortlu: "Dörtlü kanepe",
  kose: "Köşe / modüler takım",
  berjer: "Berjer",
  puf: "Puf",
};
export const KOL_LABELS: Record<Kol, string> = { ince: "İnce", kalin: "Kalın", yuvarlak: "Yuvarlak", kivrik: "Kıvrık (Chester)", yok: "Kolsuz" };
export const SIRT_LABELS: Record<Sirt, string> = { alcak: "Alçak", orta: "Orta", yuksek: "Yüksek" };
export const AYAK_LABELS: Record<Ayak, string> = { konik: "Ahşap konik", metal: "İnce metal", gizli: "Gizli kaide" };
export const SIRT_TIPI_LABELS: Record<SirtTipi, string> = { minderli: "Ayrı minderli", sabit: "Sabit (tek parça)", kapitone: "Kapitone (düğmeli)" };
export const OTURUM_TIPI_LABELS: Record<OturumTipi, string> = { ayri: "Her kişiye ayrı minder", tek: "Tek parça minder" };
export const UC_LABELS: Record<Uc, string> = { kol: "Kol", kose: "Köşe", sezlong: "Şezlong" };

/** Chaise module width (m in the builder, cm here). */
export const SEZLONG_EN_CM = 90;

/** Allowed ranges, cm. Wide enough for real Turkish models, narrow enough to stay believable. */
export const LIMITS: Record<Tip, { w: [number, number]; d: [number, number]; boy?: [number, number] }> = {
  ikili: { w: [130, 210], d: [75, 115] },
  uclu: { w: [180, 270], d: [75, 115] },
  dortlu: { w: [240, 340], d: [80, 120] },
  kose: { w: [200, 420], d: [80, 115], boy: [130, 320] },
  berjer: { w: [65, 105], d: [70, 105] },
  puf: { w: [40, 140], d: [40, 120] },
};

export const DEFAULTS: Record<Tip, ParametricParams> = {
  ikili: { tip: "ikili", kol: "kalin", sirt: "orta", ayak: "konik", genislikCm: 170, derinlikCm: 92 },
  uclu: { tip: "uclu", kol: "kalin", sirt: "orta", ayak: "konik", genislikCm: 225, derinlikCm: 95 },
  dortlu: { tip: "dortlu", kol: "ince", sirt: "orta", ayak: "metal", genislikCm: 290, derinlikCm: 100 },
  kose: { tip: "kose", kol: "kalin", sirt: "orta", ayak: "gizli", genislikCm: 290, derinlikCm: 95, solUc: "kol", sagUc: "kose", solBoyCm: 160, sagBoyCm: 220 },
  berjer: { tip: "berjer", kol: "ince", sirt: "yuksek", ayak: "konik", genislikCm: 80, derinlikCm: 85 },
  puf: { tip: "puf", kol: "yok", sirt: "alcak", ayak: "konik", genislikCm: 70, derinlikCm: 70 },
};

/** Overall heights, cm. Seats are 44 cm high on every type. */
export const BACK_HEIGHT_CM: Record<Sirt, number> = { alcak: 72, orta: 82, yuksek: 95 };
export const SEAT_HEIGHT_CM = 44;
/** Real heights a firm may enter, cm: a back clears the seat by 20 cm at least. */
export const HEIGHT_LIMITS = { koltuk: [65, 110] as [number, number], puf: [30, 55] as [number, number] };

/** Overall height in cm: the firm's own figure when entered, else the preset's. */
export function heightCm(p: ParametricParams): number {
  return p.yukseklikCm ?? (p.tip === "puf" ? SEAT_HEIGHT_CM : BACK_HEIGHT_CM[p.sirt]);
}

/** A back counts as low (no cushion rising over the frame) up to the low preset's height. */
export function lowBack(p: ParametricParams): boolean {
  return p.yukseklikCm !== undefined ? p.yukseklikCm <= BACK_HEIGHT_CM.alcak + 3 : p.sirt === "alcak";
}

/** How many seat cushions a straight run of the given type and length gets. */
export function seatCount(tip: Tip, runCm: number): number {
  if (tip === "ikili") return 2;
  if (tip === "uclu") return 3;
  if (tip === "dortlu") return 4;
  if (tip === "berjer" || tip === "puf") return 1;
  return Math.max(1, Math.round(runCm / 65));
}

export type ParamErrors = Partial<Record<"genislikCm" | "derinlikCm" | "yukseklikCm" | "solBoyCm" | "sagBoyCm" | "uclar", string>>;

/** Width the end takes from the back-wall run, cm (an arm is part of the run). */
function endWidthCm(p: ParametricParams, uc: Uc | undefined): number {
  return uc === "kose" ? p.derinlikCm : uc === "sezlong" ? SEZLONG_EN_CM : 0;
}

export function validateParams(p: ParametricParams): ParamErrors {
  const e: ParamErrors = {};
  const lim = LIMITS[p.tip];
  const range = (v: number | undefined, [lo, hi]: [number, number]) => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
  if (!range(p.genislikCm, lim.w)) e.genislikCm = `Genişlik ${lim.w[0]}–${lim.w[1]} cm arasında olmalı.`;
  if (!range(p.derinlikCm, lim.d)) e.derinlikCm = `Derinlik ${lim.d[0]}–${lim.d[1]} cm arasında olmalı.`;
  if (p.yukseklikCm !== undefined) {
    const hl = HEIGHT_LIMITS[p.tip === "puf" ? "puf" : "koltuk"];
    if (!range(p.yukseklikCm, hl)) e.yukseklikCm = `Yükseklik ${hl[0]}–${hl[1]} cm arasında olmalı.`;
  }
  if (p.tip === "kose") {
    const sol = p.solUc ?? "kol";
    const sag = p.sagUc ?? "kol";
    if (sol === "kol" && sag === "kol") e.uclar = "En az bir uç köşe ya da şezlong olmalı; düz kanepe için ikili/üçlü/dörtlü seçin.";
    for (const [uc, key] of [[sol, "solBoyCm"], [sag, "sagBoyCm"]] as const) {
      if (uc === "kol") continue;
      const v = p[key];
      const lo = uc === "sezlong" ? 130 : lim.boy![0];
      const hi = uc === "sezlong" ? 200 : lim.boy![1];
      if (!range(v, [lo, hi])) e[key] = `${uc === "sezlong" ? "Şezlong" : "Köşe"} boyu ${lo}–${hi} cm arasında olmalı.`;
      // a return/chaise must reach clearly past the seat depth
      else if (v! < p.derinlikCm + (uc === "sezlong" ? 30 : 50)) e[key] = `Boy, derinlikten en az ${uc === "sezlong" ? 30 : 50} cm fazla olmalı.`;
    }
    // at least one seat (60 cm) between the ends
    const need = endWidthCm(p, sol) + endWidthCm(p, sag) + 60;
    if (p.genislikCm < need && !e.genislikCm) e.genislikCm = `Bu uçlarla genişlik en az ${need} cm olmalı.`;
  }
  return e;
}

/** Bounding box (cm) as used for the room layout and the plan. */
export function paramDimensions(p: ParametricParams): { w: number; d: number; h: number } {
  const h = heightCm(p);
  const d =
    p.tip === "kose"
      ? Math.max(p.derinlikCm, p.solUc && p.solUc !== "kol" ? (p.solBoyCm ?? 0) : 0, p.sagUc && p.sagUc !== "kol" ? (p.sagBoyCm ?? 0) : 0)
      : p.derinlikCm;
  return { w: Math.round(p.genislikCm), d: Math.round(d), h };
}

/** A rectangle on the floor, cm, relative to the piece's centre; z grows towards the front. */
export interface FloorRect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

/**
 * The real floor shape of a corner/modular set as rectangles (the back-wall run
 * plus each corner or chaise end), centred like its bounding box. Other types
 * fill their box, so they return null. Mirrors buildParametric's layout.
 */
export function paramFloorRects(p: ParametricParams): FloorRect[] | null {
  if (p.tip !== "kose") return null;
  const { w, d } = paramDimensions(p);
  const D = p.derinlikCm;
  const back = -d / 2;
  const sol = p.solUc ?? "kol";
  const sag = p.sagUc ?? "kol";
  const xl = -w / 2 + endWidthCm(p, sol);
  const xr = w / 2 - endWidthCm(p, sag);
  const rects: FloorRect[] = [{ x0: xl, x1: xr, z0: back, z1: back + D }];
  if (sol !== "kol") rects.push({ x0: -w / 2, x1: xl, z0: back, z1: back + (p.solBoyCm ?? D) });
  if (sag !== "kol") rects.push({ x0: xr, x1: w / 2, z0: back, z1: back + (p.sagBoyCm ?? D) });
  return rects;
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
    if (r.solUc === undefined && r.sagUc === undefined && (r.koseYonu === "sol" || r.koseYonu === "sag")) {
      // first version stored one corner as koseYonu + koseBoyCm
      const boy = num(r.koseBoyCm, base.sagBoyCm!);
      p.solUc = r.koseYonu === "sol" ? "kose" : "kol";
      p.sagUc = r.koseYonu === "sag" ? "kose" : "kol";
      p.solBoyCm = r.koseYonu === "sol" ? boy : base.solBoyCm;
      p.sagBoyCm = r.koseYonu === "sag" ? boy : base.sagBoyCm;
    } else {
      p.solUc = pick(r.solUc, UCLAR, base.solUc!);
      p.sagUc = pick(r.sagUc, UCLAR, base.sagUc!);
      p.solBoyCm = num(r.solBoyCm, base.solBoyCm!);
      p.sagBoyCm = num(r.sagBoyCm, base.sagBoyCm!);
    }
  }
  // newer, optional choices: stored only when set, so older models keep their exact data
  if (p.tip !== "puf" && SIRT_TIPLERI.includes(r.sirtTipi as SirtTipi) && r.sirtTipi !== "minderli") p.sirtTipi = r.sirtTipi as SirtTipi;
  if (p.tip === "berjer" && r.kulak === true) p.kulak = true;
  if (p.tip !== "puf" && p.tip !== "berjer" && OTURUM_TIPLERI.includes(r.oturumTipi as OturumTipi) && r.oturumTipi !== "ayri") p.oturumTipi = r.oturumTipi as OturumTipi;
  if (typeof r.yukseklikCm === "number" && Number.isFinite(r.yukseklikCm)) p.yukseklikCm = Math.round(r.yukseklikCm);
  return p;
}

/** Everyday name of a corner/modular set from its two ends. */
export function shapeName(p: ParametricParams): string {
  if (p.tip === "berjer" && p.kulak) return "Kulaklı berjer";
  if (p.tip !== "kose") return TIP_LABELS[p.tip];
  const ends = [p.solUc ?? "kol", p.sagUc ?? "kol"];
  const corners = ends.filter((u) => u === "kose").length;
  const chaises = ends.filter((u) => u === "sezlong").length;
  if (corners === 2) return "U koltuk";
  if (corners === 1 && chaises === 1) return "Şezlonglu köşe takımı";
  if (corners === 1) return "Köşe takımı";
  return "Şezlonglu kanepe";
}

/** Short human description, e.g. "Köşe takımı · 290 × 220 cm · kalın kol · köşe sağda". */
export function describeParams(p: ParametricParams): string {
  const d = paramDimensions(p).d;
  const size = p.tip === "kose" ? `${p.genislikCm} × ${d} cm` : `${p.genislikCm} × ${p.derinlikCm} cm`;
  const parts = [shapeName(p), size];
  if (p.tip !== "puf") parts.push(p.kol === "yok" ? "kolsuz" : `${KOL_LABELS[p.kol].toLocaleLowerCase("tr-TR")} kol`);
  if (p.sirtTipi === "sabit") parts.push("sabit sırt");
  if (p.sirtTipi === "kapitone") parts.push("kapitone sırt");
  if (p.oturumTipi === "tek") parts.push("tek parça oturum");
  if (p.tip === "kose") {
    const side = (uc: Uc | undefined, where: string) => (uc === "kose" ? `köşe ${where}` : uc === "sezlong" ? `şezlong ${where}` : null);
    parts.push(...[side(p.solUc, "solda"), side(p.sagUc, "sağda")].filter((x): x is string => !!x));
  }
  return parts.join(" · ");
}
