import type { FurnitureModel, ModelSource } from "@/lib/types";
import { FABRIC_MATERIAL } from "@/lib/three/constants";
import { DEFAULTS, applyStil, paramDimensions, type ParametricParams } from "@/lib/parametric/spec";

// ORMEN showcase models built with "Seçerek oluştur" (10 Oct): Fatih Bey
// looked for the Chester options on the home page, where only the three
// sample models were, and asked for a few more models. Added to the live
// database with supabase/modeller-vitrin.sql.

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
const lKose: ParametricParams = { ...applyStil(DEFAULTS.kose, "modern"), genislikCm: 286, derinlikCm: 98, solUc: "kol", sagUc: "sezlong", sagBoyCm: 168, yukseklikCm: 80 };
const uKoltuk: ParametricParams = { ...applyStil(DEFAULTS.kose, "blok"), genislikCm: 340, derinlikCm: 100, solUc: "kose", sagUc: "kose", solBoyCm: 230, sagBoyCm: 230, yukseklikCm: 78 };
const blokDortlu: ParametricParams = { ...applyStil(DEFAULTS.dortlu, "blok"), genislikCm: 300, derinlikCm: 104, yukseklikCm: 74 };
const puf: ParametricParams = { ...DEFAULTS.puf, genislikCm: 90, derinlikCm: 60, yukseklikCm: 42 };

export const SHOWCASE_MODELS: FurnitureModel[] = [
  model("chester-kanepe", "Chester Kanepe", chesterSofa, "MISSO-06", 3),
  model("chester-berjer", "Kulaklı Chester Berjer", wingback, "MISSO-03", 4),
  model("modern-uclu", "Modern Üçlü", modernUclu, "SIENA-02", 5),
  model("iskandinav-ikili", "İskandinav İkili", iskandinavIkili, "LUMA-04", 6),
  model("sezlonglu-kose", "Şezlonglu L Köşe", lKose, "PIETRA-04", 7),
  model("u-koltuk", "U Koltuk", uKoltuk, "LUMA-02", 8),
  model("blok-dortlu", "Blok Dörtlü Kanepe", blokDortlu, "VERSO-03", 9),
  model("puf", "Puf", puf, "SIENA-05", 10),
];
