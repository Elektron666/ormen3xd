import type { ColorFamily, Fabric, FabricType } from "@/lib/types";

// Placeholder catalogue. Series names SIENA and PIETRA were given as
// placeholders by ORMEN; LUMA and VERSO are neutral invented names.
// Technical fields (composition, Martindale, width…) are intentionally left
// empty: we never invent values for a real product sheet.

export type SeedPattern = "boucle" | "plain" | "herringbone" | "nubuck";

export interface SeedSeries {
  series: string;
  type: FabricType;
  pattern: SeedPattern;
  /** Physical size of one generated tile, cm (square). */
  tileCm: number;
  description: string;
  colors: { name: string; family: ColorFamily; hex: string }[];
}

export const SEED_SERIES: SeedSeries[] = [
  {
    series: "LUMA",
    type: "bukle",
    pattern: "boucle",
    tileCm: 12,
    description: "İri ilmekli, yumuşak tutumlu bukle.",
    colors: [
      { name: "Kırık Beyaz", family: "beyaz-krem", hex: "#E6DFD1" },
      { name: "Kum", family: "bej-kum", hex: "#C9B597" },
      { name: "Vizon", family: "bej-kum", hex: "#9D8C7B" },
      { name: "Adaçayı", family: "yesil", hex: "#8C957F" },
      { name: "Karamel", family: "kahve", hex: "#A47248" },
      { name: "Antrasit", family: "antrasit-siyah", hex: "#4A4844" },
    ],
  },
  {
    series: "SIENA",
    type: "dokuma",
    pattern: "plain",
    tileCm: 8,
    description: "Melanj iplikli, düz örgü dokuma.",
    colors: [
      { name: "Krem", family: "beyaz-krem", hex: "#E2D9C7" },
      { name: "Taş", family: "gri", hex: "#B1A898" },
      { name: "Zeytin", family: "yesil", hex: "#6B6A45" },
      { name: "Hardal", family: "sari-hardal", hex: "#BA8D36" },
      { name: "Kiremit", family: "turuncu-kiremit", hex: "#A3583A" },
      { name: "Lacivert", family: "mavi", hex: "#2F3A50" },
    ],
  },
  {
    series: "PIETRA",
    type: "nubuk",
    pattern: "nubuck",
    tileCm: 15,
    description: "Mat, ince tüylü nubuk dokulu kumaş.",
    colors: [
      { name: "Kum", family: "bej-kum", hex: "#C7AF90" },
      { name: "Pudra", family: "pembe", hex: "#CFAEA2" },
      { name: "Toprak", family: "kahve", hex: "#7A5540" },
      { name: "Füme", family: "gri", hex: "#5F5E5A" },
      { name: "Bordo", family: "kirmizi-bordo", hex: "#6B2B2F" },
      { name: "Gece Mavisi", family: "mavi", hex: "#2C3444" },
    ],
  },
  {
    series: "VERSO",
    type: "dokuma",
    pattern: "herringbone",
    tileCm: 9.6,
    description: "İki renk iplikle balıksırtı örgü.",
    colors: [
      { name: "Ekru", family: "beyaz-krem", hex: "#D9D0BE" },
      { name: "Gri", family: "gri", hex: "#8D8B86" },
      { name: "Kahve", family: "kahve", hex: "#5E4636" },
      { name: "Orman", family: "yesil", hex: "#3F4C3B" },
      { name: "Antrasit", family: "antrasit-siyah", hex: "#3A3937" },
    ],
  },
];

export const SEED_TEXTURE_ROOT = "/seed/fabrics";

export function seedCode(series: string, index: number): string {
  return `${series}-${String(index + 1).padStart(2, "0")}`;
}

export function seedTexturePaths(series: string, code: string) {
  const dir = `${SEED_TEXTURE_ROOT}/${series.toLowerCase()}`;
  const c = code.toLowerCase();
  return {
    albedo: { "1k": `${dir}/${c}-albedo-1k.webp`, "2k": `${dir}/${c}-albedo-2k.webp` },
    normal: { "1k": `${dir}/normal-1k.webp`, "2k": `${dir}/normal-2k.webp` },
    roughness: { "1k": `${dir}/roughness-1k.webp`, "2k": `${dir}/roughness-2k.webp` },
    thumb: `${dir}/${c}-thumb.webp`,
  };
}

export function buildSeedFabrics(): Fabric[] {
  const out: Fabric[] = [];
  let order = 0;
  for (const s of SEED_SERIES) {
    s.colors.forEach((color, i) => {
      const code = seedCode(s.series, i);
      const p = seedTexturePaths(s.series, code);
      out.push({
        id: `seed-${code.toLowerCase()}`,
        code,
        series: s.series,
        colorName: color.name,
        colorFamily: color.family,
        type: s.type,
        description: s.description,
        isActive: true,
        isPlaceholder: true,
        sortOrder: order++,
        texture: {
          maps: { albedo: p.albedo, normal: p.normal, roughness: p.roughness },
          repeatCm: { w: s.tileCm, h: s.tileCm },
          thumbUrl: p.thumb,
          avgColor: color.hex,
        },
      });
    });
  }
  return out;
}
