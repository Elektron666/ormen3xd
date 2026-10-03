import type { ColorFamily, FabricType } from "@/lib/types";

/** Turkish-aware upper-casing (i → İ, ı → I). */
export function trUpper(s: string): string {
  return s.toLocaleUpperCase("tr-TR");
}

export const FABRIC_TYPE_LABELS: Record<FabricType, string> = {
  bukle: "Bukle",
  dokuma: "Dokuma",
  nubuk: "Nubuk",
  kadife: "Kadife",
  sonil: "Şönil",
  "keten-gorunumlu": "Keten görünümlü",
  jakar: "Jakar",
};

export const COLOR_FAMILY_LABELS: Record<ColorFamily, string> = {
  "beyaz-krem": "Beyaz ve krem",
  "bej-kum": "Bej ve kum",
  kahve: "Kahve",
  gri: "Gri",
  "antrasit-siyah": "Antrasit ve siyah",
  yesil: "Yeşil",
  mavi: "Mavi",
  "kirmizi-bordo": "Kırmızı ve bordo",
  "sari-hardal": "Sarı ve hardal",
  "turuncu-kiremit": "Turuncu ve kiremit",
  pembe: "Pembe",
  mor: "Mor",
};

/** Representative swatch colour for each family filter chip. */
export const COLOR_FAMILY_SWATCH: Record<ColorFamily, string> = {
  "beyaz-krem": "#EFE9DD",
  "bej-kum": "#CDBA9A",
  kahve: "#6E4B34",
  gri: "#9A9893",
  "antrasit-siyah": "#33322F",
  yesil: "#6B7A57",
  mavi: "#3E5470",
  "kirmizi-bordo": "#7A2E2E",
  "sari-hardal": "#C29A3B",
  "turuncu-kiremit": "#B0603C",
  pembe: "#D2A1A0",
  mor: "#5E4A66",
};

export const t = {
  brand: "ORMEN TEKSTİL",
  atelier: "Atelier",
  signature: "Kumaşlar: ORMEN TEKSTİL",
  fabrics: "Kumaşlar",
  search: "Kod ya da renk ara",
  allTypes: "Tümü",
  colorFamily: "Renk",
  noResults: "Bu filtrede kumaş yok.",
  clearFilters: "Filtreleri temizle",
  copy: "Kopyala",
  copied: "Kopyalandı",
  series: "Seri",
  color: "Renk",
  type: "Tip",
  composition: "Kompozisyon",
  martindale: "Martindale",
  width: "En",
  weight: "Gramaj",
  fireRating: "Yanmazlık",
  placeholder: "Yer tutucu",
  colorDisclaimer:
    "Ekran renkleri gerçek kumaştan farklı görünebilir. Karar öncesi numune isteyin.",
  loadingFabric: "Kumaş hazırlanıyor",
  dragHint: "Kumaşları görmek için yukarı kaydırın",
  showFabrics: "Kumaşları göster",
  hideFabrics: "Kumaş panelini küçült",
  rotateHint: "Döndürmek için sürükleyin",
} as const;

/**
 * Folds text for forgiving search: Turkish-aware lower-casing, then dotted
 * and dotless i and the other Turkish letters mapped to plain ASCII so that
 * "siena", "SİENA" and "Sıena" all match.
 */
export function foldTr(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}
