import type { ColorFamily, Fabric } from "@/lib/types";

// ORMEN fabrics prepared from photos sent by Fatih Bey (10 Oct): the MISSO
// zigzag jacquards. Textures were made with scripts/prepare-photo-fabric.ts
// (levelled, cut at the pattern's own repeat, lighting flattened, only thin
// edge bands cross-faded) and are served from /seed/fabrics/misso.
//
// Scale is measured, not assumed: one photo (MISSO-05) has a ruler in it,
// 14.25 px per cm; its tile is 52.5 cm wide and holds 11.4 teeth, so one
// zigzag tooth is 4.6 cm. The other colourways are the same weave and take the
// same tooth size; their teeth are counted in the finished tile (an earlier
// count from the photos was a quarter off and drew them too fine). MISSO-01, 02, 04, 05 and
// 06 come from photos taken flat from above; MISSO-03 still from a photo on
// the roll (a flat one was sent but did not arrive as a file).
//
// Open items, deliberately not invented:
//   - codes MISSO-01…06 are ours (photo order; 06 is the grey-black one that
//     arrived later);
//   - colour names are descriptive placeholders until ORMEN names them;
//   - width, pattern repeat and cut direction are unknown and left empty.

export const TOOTH_CM = 4.6;

// colour family by the dominant colour: the average of a multicoloured fabric comes out grey
const MISSO: { colorName: string; family: ColorFamily; repeatCm: { w: number; h: number }; avgColor: string }[] = [
  { colorName: "Mercan Çok Renkli", family: "kirmizi-bordo", repeatCm: { w: 88.3, h: 79.4 }, avgColor: "#A8998E" },
  { colorName: "Gri Bej", family: "gri", repeatCm: { w: 69, h: 71.9 }, avgColor: "#A49A93" },
  { colorName: "Siyah Pembe", family: "pembe", repeatCm: { w: 28.5, h: 24.7 }, avgColor: "#8B6B66" },
  { colorName: "Kahve Altın", family: "kahve", repeatCm: { w: 69.5, h: 106.4 }, avgColor: "#80766E" },
  { colorName: "Gri Pastel", family: "gri", repeatCm: { w: 52.5, h: 91.3 }, avgColor: "#A18D79" },
  { colorName: "Gri Siyah", family: "gri", repeatCm: { w: 85.6, h: 83.1 }, avgColor: "#A29992" },
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
