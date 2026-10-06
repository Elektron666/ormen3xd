// Validation and parsing for fabric records entered in the panel (single
// form or bulk CSV). Shared by the browser and the server action.

import { COLOR_FAMILIES, FABRIC_TYPES, type ColorFamily, type FabricType } from "@/lib/types";
import { COLOR_FAMILY_LABELS, FABRIC_TYPE_LABELS, codeUpper, foldTr } from "@/lib/i18n/tr";

export interface FabricFields {
  code: string;
  series: string;
  colorName: string;
  colorFamily: ColorFamily | "";
  type: FabricType | "";
  composition?: string;
  widthCm?: number;
  pattern?: "duz" | "desenli";
  patternW?: number;
  patternH?: number;
  cutDirection?: "cift" | "tek";
  weightGsm?: number;
  martindale?: number;
  fireRating?: string;
  description?: string;
  repeatW: number;
  repeatH: number;
  isActive: boolean;
}

export type FabricFieldErrors = Partial<Record<keyof FabricFields | "photo", string>>;

export const CODE_PATTERN = /^[A-ZÇĞİÖŞÜ0-9-]{2,24}$/;

export function normaliseCode(s: string): string {
  return codeUpper(s.trim()).replace(/\s+/g, "-");
}

/** Accepts "12,5", "12.5", "12 cm" … ; empty → undefined. */
export function parseNumber(s: string | number | undefined | null): number | undefined {
  if (s === undefined || s === null) return undefined;
  if (typeof s === "number") return Number.isFinite(s) ? s : undefined;
  const t = s.replace(/[^\d.,-]/g, "").replace(",", ".");
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : undefined;
}

/** "Şönil", "sonil", "SÖNİL" → "sonil"; unknown → "". */
export function parseFabricType(s: string): FabricType | "" {
  const f = foldTr(s.trim());
  return FABRIC_TYPES.find((t) => t === f || foldTr(FABRIC_TYPE_LABELS[t]) === f) ?? "";
}

/** "Bej ve kum", "bej-kum", "bej" → "bej-kum"; unknown → "". */
export function parseColorFamily(s: string): ColorFamily | "" {
  const f = foldTr(s.trim());
  if (!f) return "";
  return (
    COLOR_FAMILIES.find((c) => c === f || foldTr(COLOR_FAMILY_LABELS[c]) === f) ??
    COLOR_FAMILIES.find((c) => c.split("-").includes(f)) ??
    ""
  );
}

export function validateFabricFields(v: FabricFields): FabricFieldErrors {
  const e: FabricFieldErrors = {};
  if (!CODE_PATTERN.test(v.code)) e.code = "Kod büyük harf, rakam ve tire içermeli (ör. SIENA-04).";
  if (!v.series.trim()) e.series = "Seri adını yazın.";
  if (!v.colorName.trim()) e.colorName = "Renk adını yazın.";
  if (!v.colorFamily) e.colorFamily = "Renk ailesini seçin.";
  if (!v.type) e.type = "Kumaş tipini seçin.";
  if (!(v.repeatW > 0 && v.repeatW <= 300)) e.repeatW = "Fotoğraftaki alanın enini cm olarak yazın (0–300).";
  if (!(v.repeatH > 0 && v.repeatH <= 300)) e.repeatH = "Fotoğraftaki alanın boyunu cm olarak yazın (0–300).";
  const positive = (n: number | undefined) => n === undefined || n > 0;
  if (!positive(v.widthCm)) e.widthCm = "En pozitif bir sayı olmalı.";
  // a patterned fabric needs its repeat from the technical sheet; nothing is guessed
  const repeatOk = (n: number | undefined) => n !== undefined && n > 0 && n <= 300;
  if (v.pattern === "desenli" && !(repeatOk(v.patternW) && repeatOk(v.patternH))) e.patternW = "Desenli kumaşta desen raporunun enini ve boyunu teknik föyden yazın (cm).";
  if (!positive(v.weightGsm)) e.weightGsm = "Gramaj pozitif bir sayı olmalı.";
  if (!(v.martindale === undefined || (Number.isInteger(v.martindale) && v.martindale > 0))) e.martindale = "Martindale tam sayı olmalı.";
  return e;
}

/** Column names of the bulk upload template, in order. */
export const CSV_COLUMNS = [
  "kod",
  "seri",
  "renk",
  "renk_ailesi",
  "tip",
  "kompozisyon",
  "en_cm",
  "gramaj",
  "martindale",
  "yanmazlik",
  "aciklama",
  "desen",
  "desen_en_cm",
  "desen_boy_cm",
  "kesim_yonu",
  "tekrar_en_cm",
  "tekrar_boy_cm",
  "fotograf",
] as const;

export const CSV_EXAMPLE = [
  "SIENA-07",
  "SIENA",
  "Taş Grisi",
  "gri",
  "dokuma",
  "%100 polyester",
  "140",
  "480",
  "50000",
  "",
  "",
  "düz",
  "",
  "",
  "çift",
  "10",
  "",
  "SIENA-07.jpg",
];

/** "düz", "duz", "desensiz" → "duz"; "desenli" → "desenli"; anything else → not known. */
export function parsePattern(s: string | undefined): FabricFields["pattern"] {
  const f = foldTr((s ?? "").trim());
  if (f === "duz" || f === "desensiz") return "duz";
  if (f === "desenli") return "desenli";
  return undefined;
}

/** "tek", "tek yön" → "tek"; "çift", "cift yon" → "cift"; anything else → not known. */
export function parseCutDirection(s: string | undefined): FabricFields["cutDirection"] {
  const f = foldTr((s ?? "").trim()).split(/\s+/)[0];
  if (f === "tek") return "tek";
  if (f === "cift") return "cift";
  return undefined;
}

/** One CSV row → form fields (+ the photo file name it refers to). */
export function fieldsFromCsv(row: Record<string, string>): { fields: FabricFields; photo: string } {
  const repeatW = parseNumber(row.tekrar_en_cm) ?? 0;
  return {
    photo: row.fotograf ?? "",
    fields: {
      code: normaliseCode(row.kod ?? ""),
      series: codeUpper((row.seri ?? "").trim()),
      colorName: (row.renk ?? "").trim(),
      colorFamily: parseColorFamily(row.renk_ailesi ?? ""),
      type: parseFabricType(row.tip ?? ""),
      composition: row.kompozisyon || undefined,
      widthCm: parseNumber(row.en_cm),
      pattern: parsePattern(row.desen),
      patternW: parseNumber(row.desen_en_cm),
      patternH: parseNumber(row.desen_boy_cm),
      cutDirection: parseCutDirection(row.kesim_yonu),
      weightGsm: parseNumber(row.gramaj),
      martindale: parseNumber(row.martindale),
      fireRating: row.yanmazlik || undefined,
      description: row.aciklama || undefined,
      repeatW,
      repeatH: parseNumber(row.tekrar_boy_cm) ?? 0,
      isActive: true,
    },
  };
}
