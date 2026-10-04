import type { Firm, FurnitureModel } from "@/lib/types";
import { FABRIC_MATERIAL } from "@/lib/three/constants";
import { DEFAULTS, paramDimensions } from "@/lib/parametric/spec";

export const SEED_MODELS: FurnitureModel[] = [
  {
    id: "seed-model-kanepe",
    slug: "moduler-kanepe",
    name: "Modüler Kanepe",
    firmId: null,
    source: { kind: "procedural", generator: "modular-sofa" },
    fabricMaterialNames: [FABRIC_MATERIAL],
    dimensionsCm: { w: 238, d: 96, h: 85 },
    defaultFabricCode: "LUMA-02",
    isActive: true,
    sortOrder: 0,
  },
  {
    id: "seed-model-berjer",
    slug: "berjer",
    name: "Berjer",
    firmId: null,
    source: { kind: "procedural", generator: "armchair" },
    fabricMaterialNames: [FABRIC_MATERIAL],
    dimensionsCm: { w: 81, d: 84, h: 94 },
    defaultFabricCode: "SIENA-04",
    isActive: true,
    sortOrder: 1,
  },
  {
    // a parametric model, as a workshop would describe it in the panel
    id: "seed-model-kose",
    slug: "kose-takimi",
    name: "Köşe Takımı",
    firmId: null,
    source: { kind: "parametric", params: DEFAULTS.kose },
    fabricMaterialNames: [FABRIC_MATERIAL],
    dimensionsCm: paramDimensions(DEFAULTS.kose),
    defaultFabricCode: "LUMA-03",
    isActive: true,
    sortOrder: 2,
  },
];

export const SEED_FIRMS: Firm[] = [
  {
    id: "seed-firm-ornek",
    name: "Örnek Mobilya",
    slug: "ornek-mobilya",
    logoUrl: "/seed/firms/ornek-mobilya.svg",
    accentColor: "#1F4E4A",
    isActive: true,
  },
];
