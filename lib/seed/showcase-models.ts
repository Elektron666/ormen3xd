import type { FurnitureModel, ModelSource } from "@/lib/types";
import { FABRIC_MATERIAL } from "@/lib/three/constants";
import { DEFAULTS, applyStil, paramDimensions, type ParametricParams } from "@/lib/parametric/spec";

// ORMEN showcase models built with "Seçerek oluştur" (10 Oct): Fatih Bey
// looked for the Chester options on the home page, where only the three
// sample models were, and asked for a few more models. Added to the live
// database with supabase/veri/3-modeller-vitrin.sql.

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

// a range of everyday looks, so a visitor finds something close to their own sofa
const modernUclu: ParametricParams = { ...applyStil(DEFAULTS.uclu, "modern"), genislikCm: 232, derinlikCm: 96, yukseklikCm: 80 };
const iskandinavIkili: ParametricParams = { ...applyStil(DEFAULTS.ikili, "iskandinav"), genislikCm: 176, derinlikCm: 88, yukseklikCm: 84 };
const blokDortlu: ParametricParams = { ...applyStil(DEFAULTS.dortlu, "blok"), genislikCm: 300, derinlikCm: 104, yukseklikCm: 74 };
const puf: ParametricParams = { ...DEFAULTS.puf, genislikCm: 90, derinlikCm: 60, yukseklikCm: 42 };
const yuvarlakPuf: ParametricParams = { ...DEFAULTS.puf, form: "yuvarlak", genislikCm: 60, derinlikCm: 60, yukseklikCm: 44 };

export const SHOWCASE_MODELS: FurnitureModel[] = [
  // a Chesterfield is shown in the matte nubuck, closest to its usual leather look
  model("chester-kanepe", "Chester Kanepe", chesterSofa, "PIETRA-05", 3),
  model("chester-berjer", "Kulaklı Chester Berjer", wingback, "PIETRA-03", 4),
  model("modern-uclu", "Modern Üçlü", modernUclu, "SIENA-02", 5),
  model("iskandinav-ikili", "İskandinav İkili", iskandinavIkili, "LUMA-04", 6),
  model("blok-dortlu", "Blok Dörtlü Kanepe", blokDortlu, "VERSO-03", 7),
  model("puf", "Puf", puf, "SIENA-05", 8),
  model("yuvarlak-puf", "Yuvarlak Puf", yuvarlakPuf, "LUMA-05", 9),
];

/** Taken off the showcase (Fatih Bey, 11 Oct); the SQL file switches them off in the live database. */
export const RETIRED_SHOWCASE_SLUGS = ["sezlonglu-kose", "u-koltuk"];
