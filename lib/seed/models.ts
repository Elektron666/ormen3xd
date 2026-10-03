import type { Firm, FurnitureModel } from "@/lib/types";
import { FABRIC_MATERIAL } from "@/lib/three/constants";

export const SEED_MODELS: FurnitureModel[] = [
  {
    id: "seed-model-kanepe",
    slug: "moduler-kanepe",
    name: "Modüler Kanepe",
    firmId: null,
    source: { kind: "procedural", generator: "modular-sofa" },
    fabricMaterialNames: [FABRIC_MATERIAL],
    dimensionsCm: { w: 236, d: 95, h: 82 },
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
    dimensionsCm: { w: 80, d: 84, h: 91 },
    defaultFabricCode: "SIENA-04",
    isActive: true,
    sortOrder: 1,
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
