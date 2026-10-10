import type { FurnitureModel, ModelSource } from "@/lib/types";
import { FABRIC_MATERIAL } from "@/lib/three/constants";
import { DEFAULTS, applyStil, paramDimensions, type ParametricParams } from "@/lib/parametric/spec";

// ORMEN showcase models built with "Seçerek oluştur" (10 Oct): Fatih Bey
// looked for the Chester options on the home page, where only the three
// sample models were. Added to the live database with supabase/modeller-chester.sql.

const chesterSofa: ParametricParams = { ...applyStil(DEFAULTS.uclu, "chester"), genislikCm: 220, derinlikCm: 92, yukseklikCm: 76 };
const wingback: ParametricParams = { ...applyStil(DEFAULTS.berjer, "chester"), genislikCm: 82, derinlikCm: 88, yukseklikCm: 104 };

const model = (slug: string, name: string, params: ParametricParams, fabric: string, sortOrder: number): FurnitureModel => ({
  id: `seed-model-${slug}`,
  slug,
  name,
  firmId: null,
  source: { kind: "parametric", params } satisfies ModelSource,
  fabricMaterialNames: [FABRIC_MATERIAL],
  dimensionsCm: paramDimensions(params),
  defaultFabricCode: fabric,
  isActive: true,
  sortOrder,
});

export const SHOWCASE_MODELS: FurnitureModel[] = [
  model("chester-kanepe", "Chester Kanepe", chesterSofa, "MISSO-06", 3),
  model("chester-berjer", "Kulaklı Chester Berjer", wingback, "MISSO-03", 4),
];
