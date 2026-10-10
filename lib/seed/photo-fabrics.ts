import type { ColorFamily, Fabric } from "@/lib/types";

// ORMEN fabrics prepared from photos sent by Fatih Bey (10 Oct): the MISSO
// zigzag jacquards. Textures were made with scripts/prepare-photo-fabric.ts
// (levelled, cut at the pattern's own repeat, lighting flattened, only thin
// edge bands cross-faded) and are served from /seed/fabrics/misso.
//
// Scale is measured, not assumed: one photo (MISSO-05) has a ruler in it,
// 14.25 px per cm, which makes one zigzag tooth 4.6 cm. The other colourways
// are the same weave and take the same tooth size. Each tile is a strip of
// exactly four teeth from the centre of its photo (where the phone's slant
// distorts least), so it meets itself side by side without blending. MISSO-01, 02, 04, 05 and
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
  { colorName: "Mercan Çok Renkli", family: "kirmizi-bordo", repeatCm: { w: 18.4, h: 112.5 }, avgColor: "#A8998D" },
  { colorName: "Gri Bej", family: "gri", repeatCm: { w: 18.4, h: 87.2 }, avgColor: "#A59A91" },
  { colorName: "Siyah Pembe", family: "pembe", repeatCm: { w: 18.4, h: 26.8 }, avgColor: "#8A6864" },
  { colorName: "Kahve Altın", family: "kahve", repeatCm: { w: 18.4, h: 99.4 }, avgColor: "#7E736B" },
  { colorName: "Gri Pastel", family: "gri", repeatCm: { w: 18.4, h: 91.5 }, avgColor: "#A18C78" },
  { colorName: "Gri Siyah", family: "gri", repeatCm: { w: 18.4, h: 112.5 }, avgColor: "#A19991" },
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
