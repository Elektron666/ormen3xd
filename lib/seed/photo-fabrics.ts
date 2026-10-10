import type { ColorFamily, Fabric } from "@/lib/types";

// ORMEN fabrics prepared from photos sent by Fatih Bey (10 Oct): the MISSO
// zigzag jacquards. Textures were made with scripts/prepare-photo-fabric.ts
// (levelled, cut to whole teeth, lighting flattened, edges cross-faded) and
// are served from /seed/fabrics/misso.
//
// Open items, deliberately not invented:
//   - codes MISSO-01…05 follow the order the photos were sent in;
//   - colour names are descriptive placeholders until ORMEN names them;
//   - the scale assumes one zigzag tooth is 6 cm wide (PROVISIONAL_TOOTH_CM):
//     measure a tooth on the fabric and re-run the script with --tooth-cm;
//   - width, pattern repeat and cut direction are unknown and left empty.

export const PROVISIONAL_TOOTH_CM = 6;

// colour family by the dominant colour: the average of a multicoloured fabric comes out grey
const MISSO: { colorName: string; family: ColorFamily; repeatCm: { w: number; h: number }; avgColor: string }[] = [
  { colorName: "Mercan Çok Renkli", family: "kirmizi-bordo", repeatCm: { w: 22.8, h: 22.8 }, avgColor: "#A7988F" },
  { colorName: "Gri Bej", family: "gri", repeatCm: { w: 23.7, h: 26.3 }, avgColor: "#9E9692" },
  { colorName: "Siyah Pembe", family: "pembe", repeatCm: { w: 43.1, h: 37.3 }, avgColor: "#8B6B66" },
  { colorName: "Kahve Altın", family: "kahve", repeatCm: { w: 34.2, h: 32.7 }, avgColor: "#7B695D" },
  { colorName: "Gri Pastel", family: "gri", repeatCm: { w: 44.2, h: 55.5 }, avgColor: "#98857E" },
];

export function buildPhotoFabrics(startOrder = 100): Fabric[] {
  return MISSO.map((f, i) => {
    const code = `MISSO-${String(i + 1).padStart(2, "0")}`;
    const base = `/seed/fabrics/misso/${code.toLowerCase()}`;
    const maps = (kind: string) => ({ "1k": `${base}-${kind}-1k.webp`, "2k": `${base}-${kind}-2k.webp` });
    return {
      id: `foto-${code.toLowerCase()}`,
      code,
      series: "MISSO",
      colorName: f.colorName,
      colorFamily: f.family,
      type: "jakar",
      description: "Çok renkli zikzak desenli jakar.",
      pattern: "desenli",
      isActive: true,
      isPlaceholder: false,
      sortOrder: startOrder + i,
      texture: {
        maps: { albedo: maps("albedo"), normal: maps("normal"), roughness: maps("roughness") },
        repeatCm: f.repeatCm,
        thumbUrl: `${base}-thumb.webp`,
        avgColor: f.avgColor,
      },
    } satisfies Fabric;
  });
}
